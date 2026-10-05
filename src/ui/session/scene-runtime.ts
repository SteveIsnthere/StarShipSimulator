/**
 * The world on screen: every PixiJS object the flight draws, built once and
 * drawn once per frame from the simulation's state. Framework-free; the
 * session owns it and the UI framework never sees it.
 *
 * The per-frame path allocates nothing: every object written per frame is
 * built here, once.
 */
import { renderQuality, type RenderQualityMode } from '$view/render-quality';
import { RendererType } from 'pixi.js';
import type { SimState } from '$core/state';
import { heatLimit } from '$core/constants';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { damageModelFor } from '$core/physics/damage-model';
import type { ViewApp } from '$view/app';
import { worldToScreen } from '$view/camera';
import { loadTextures } from '$view/assets';
import { createWorld } from '$view/world';
import { createCatchTower } from '$view/catch-tower';
import { createTerrainTextures } from '$view/terrain';
import { createDistantEarth } from '$view/distant-earth';
import { createFlightPathMarker } from '$view/motion-cues';
import { createCloudDeck } from '$view/clouds';
import { createParticleTextures } from '$view/particles';
import { createSky } from '$view/sky';
import { createSunLight, writeSun } from '$view/sun';
import { bloomIntensity, createPostPass, heatIntensity } from '$view/post';
import { createSceneVehiclesRuntime } from './scene-vehicles-runtime';
import type { Scene } from './scene';

/** Engines lit, counted without allocating (the per-frame path). */
function litEngines(state: SimState, supportIndex: number): number {
  if (state.damage && (state.damage.terminal.active || !state.damage.components[supportIndex]!.attached)) return 0;
  let count = 0;
  for (let i = 0; i < state.engines.running.length; i++)
    if (state.engines.running[i] && !state.engines.failed[i]) count++;
  return count;
}

/**
 * Build the scene into `view`. Resolves to undefined when `isDisposed()`
 * turns true while textures load, so a page torn down mid-load builds nothing.
 */
export async function createSceneRuntime(view: ViewApp, isDisposed: () => boolean, initialMode: RenderQualityMode = 'full'): Promise<SceneRuntime | undefined> {
  function selectQuality(mode: RenderQualityMode) {
    if (mode !== 'full' && mode !== 'reduced') throw new RangeError('Unknown render quality mode');
    return renderQuality(view.viewport.width, view.viewport.height, view.app.renderer.view.texture.source.resolution, mode === 'reduced');
  }
  let quality = selectQuality(initialMode);
  const textures = await loadTextures();
  if (isDisposed()) return undefined;

  // Shared by the near ground and the far earth so they are one material.
  const terrain = createTerrainTextures();
  const world = createWorld(textures, terrain);
  const tower = createCatchTower();
  const sun = createSunLight();
  const worldLighting = { sun, downRangeDistance: 0, altitude: 0, pitch: 0, vehicleHeight: 52, vehicleDiameter: 9 };
  const noseUv = { x: 0, y: 0 };

  // One atlas for the particles and the cloud puffs.
  const particleTextures = createParticleTextures(view.app.renderer);

  // Depth, back to front: the distant earth, the cloud deck, the true ground.
  const distantEarth = createDistantEarth(terrain);
  view.layers.far.addChild(distantEarth.container);
  const clouds = createCloudDeck(particleTextures.wisp);
  view.layers.far.addChild(clouds.container);
  view.layers.world.addChild(world.container, tower.container);

  const sky = createSky(view.app.renderer);
  view.layers.sky.addChild(sky.container);

  const vehicles = createSceneVehiclesRuntime(view, particleTextures);
  const shipSupportIndex = damageModelFor(SHIP).partition.components.findIndex(p => p.kind === 'engine-support');
  const boosterSupportIndex = damageModelFor(SUPER_HEAVY).partition.components.findIndex(p => p.kind === 'engine-support');

  // The flight-path marker is an instrument: in front of everything.
  const flightPath = createFlightPathMarker();
  view.layers.effectsFront.addChildAt(flightPath.container, 0);

  const post = createPostPass(
    view.layers.effectsBehind,
    view.layers.vehicle,
    view.viewport.width,
    view.viewport.height,
  );
  vehicles.setHullDetail(quality.hullDetail);
  post.setHeatPostEnabled(quality.heatPost);
  let elapsed = 0;
  let lastWorldDt = 0;

  return {
    witnessSource: { view, vehicles, post, RendererType,
      get quality() { return quality; }, get lastWorldDt() { return lastWorldDt; } },
    draw(s, previous, worldDt, preset, controller) {
      if (worldDt > 0) lastWorldDt = worldDt;
      // The sun from the scenario's hour, the clock and the longitude.
      writeSun(
        sun,
        preset.basedOn ?? preset.id,
        s.world.environmentTime,
        s.kinematics.downRangeDistance,
        preset.launchHour,
      );
      worldLighting.downRangeDistance = s.kinematics.downRangeDistance;
      worldLighting.altitude = s.kinematics.altitude;
      worldLighting.pitch = s.kinematics.pitch;
      worldLighting.vehicleHeight = controller.model.height;
      worldLighting.vehicleDiameter = controller.model.diameter;

      sky.update(view.camera, view.viewport, s.kinematics.altitude, sun);
      distantEarth.update(view.viewport, s.kinematics.altitude, s.kinematics.speedX, worldDt, sun);
      clouds.update(view.viewport, s.kinematics.altitude, s.kinematics.speedX, worldDt, sun);
      world.update(view.camera, view.viewport, s.kinematics.speedX, s.kinematics.altitude, worldLighting);

      tower.update(view.camera, view.viewport, controller.mission?.booster
        ?? (controller.model.id === 'super-heavy' ? s : undefined), sun);
      vehicles.draw(s, previous, worldDt, sun, elapsed, controller);

      // Where the vehicle is going, as against where its nose points.
      const at = worldToScreen(view.camera, view.viewport, s.kinematics.downRangeDistance, s.kinematics.altitude);
      // A disintegrated hull has no single physical flight path or hot nose.
      flightPath.update(at.x, at.y, s.kinematics.angleOfMotion,
        s.damage?.terminal.active ? 0 : s.kinematics.trueSpeed, view.viewport.height);

      elapsed += worldDt;
      noseUv.x = at.x / view.viewport.width;
      noseUv.y = at.y / view.viewport.height;
      post.update(
        bloomIntensity(litEngines(s, controller.model.id === 'ship' ? shipSupportIndex : boosterSupportIndex), s.vehicle.throttleCurrent),
        s.damage?.terminal.active ? 0 : heatIntensity(s.forces.thermalPower, heatLimit),
        noseUv,
        elapsed,
      );
    },
    setRenderQuality(mode) {
      quality = selectQuality(mode);
      vehicles.setHullDetail(quality.hullDetail); post.setHeatPostEnabled(quality.heatPost);
    },
    resize(width, height) {
      view.resize(width, height);
      sky.resize(view.viewport);
    },
    setComponentVisible: vehicles.setComponentVisible,
    setVehiclesVisible: vehicles.setVehiclesVisible,
    setParticlesVisible: vehicles.setParticlesVisible,
    resetFlight() {
      lastWorldDt = 0;
      vehicles.reset();
    },
    destroy: vehicles.destroy,
  };
}

export type SceneRuntime = Omit<Scene, 'presentation'> & {
  readonly witnessSource: {
    readonly RendererType: typeof RendererType;
    readonly view: ViewApp;
    readonly vehicles: ReturnType<typeof createSceneVehiclesRuntime>;
    readonly post: ReturnType<typeof createPostPass>;
    readonly quality: ReturnType<typeof renderQuality>;
    readonly lastWorldDt: number;
  };
};
