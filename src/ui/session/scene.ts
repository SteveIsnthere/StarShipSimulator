/**
 * The world on screen: every PixiJS object the flight draws, built once and
 * drawn once per frame from the simulation's state. Framework-free; the
 * session owns it and the UI framework never sees it.
 *
 * The per-frame path allocates nothing: every object written per frame is
 * built here, once.
 */
import type { SimState } from '$core/state';
import type { ScenarioPreset } from '$core/scenarios';
import { heatLimit } from '$core/constants';
import { getWorkingEngineCount } from '$core/physics/engines';
import type { ViewApp } from '$view/app';
import { worldToScreen } from '$view/camera';
import { loadTextures } from '$view/assets';
import { createWorld } from '$view/world';
import { createTerrainTextures } from '$view/terrain';
import { createDistantEarth } from '$view/distant-earth';
import { createFlightPathMarker } from '$view/motion-cues';
import { createCloudDeck } from '$view/clouds';
import { createParticleTextures } from '$view/particles';
import { createSky } from '$view/sky';
import { createSunLight, writeSun } from '$view/sun';
import { bloomIntensity, createPostPass, heatIntensity } from '$view/post';
import { createSceneVehicles } from './scene-vehicles';
import type { MissionController } from './mission-controller';

export interface Scene {
  /** Draw one frame of `state`, `worldDt` simulated seconds after the last. */
  draw(state: SimState, previous: SimState, worldDt: number, preset: ScenarioPreset, controller: MissionController): void;
  /** Match the viewport to the window. */
  resize(width: number, height: number): void;
  /** Discard effects and emitter history belonging to the preceding flight. */
  resetFlight(): void;
  /** Debug witnesses use the actual rendered nozzle, never a viewport guess. */
  presentation(): { nozzleX: number; nozzleY: number; width: number; height: number;
    worldDt: number; bell: { visibleMounts: number }; particles: readonly Readonly<Record<string, number | string>>[];
    bodies: readonly { id: string; x: number; y: number; rotation: number; width: number; height: number }[] };
  setParticlesVisible(visible: boolean): void;
  destroy(): void;
}

/** Engines lit, counted without allocating (the per-frame path). */
function litEngines(state: SimState): number {
  return getWorkingEngineCount(state.engines.running);
}

/**
 * Build the scene into `view`. Resolves to undefined when `isDisposed()`
 * turns true while textures load, so a page torn down mid-load builds nothing.
 */
export async function createScene(view: ViewApp, isDisposed: () => boolean): Promise<Scene | undefined> {
  const textures = await loadTextures();
  if (isDisposed()) return undefined;

  // Shared by the near ground and the far earth so they are one material.
  const terrain = createTerrainTextures();
  const world = createWorld(textures, terrain);
  const sun = createSunLight();
  const worldLighting = { sun, downRangeDistance: 0, altitude: 0, pitch: 0 };
  const noseUv = { x: 0, y: 0 };

  // One atlas for the particles and the cloud puffs.
  const particleTextures = createParticleTextures(view.app.renderer);

  // Depth, back to front: the distant earth, the cloud deck, the true ground.
  const distantEarth = createDistantEarth(terrain);
  view.layers.far.addChild(distantEarth.container);
  const clouds = createCloudDeck(particleTextures.wisp);
  view.layers.far.addChild(clouds.container);
  view.layers.world.addChild(world.container);

  const sky = createSky(view.app.renderer);
  view.layers.sky.addChild(sky.container);

  const vehicles = createSceneVehicles(view, textures, particleTextures);

  // The flight-path marker is an instrument: in front of everything.
  const flightPath = createFlightPathMarker();
  view.layers.effectsFront.addChildAt(flightPath.container, 0);

  const post = createPostPass(
    view.layers.effectsBehind,
    view.layers.vehicle,
    view.viewport.width,
    view.viewport.height,
  );
  let elapsed = 0;
  let lastWorldDt = 0;

  return {
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

      sky.update(view.camera, view.viewport, s.kinematics.altitude, sun);
      distantEarth.update(view.viewport, s.kinematics.altitude, s.kinematics.speedX, worldDt, sun);
      clouds.update(view.viewport, s.kinematics.altitude, s.kinematics.speedX, worldDt, sun);
      world.update(view.camera, view.viewport, s.kinematics.speedX, s.kinematics.altitude, worldLighting);

      vehicles.draw(s, previous, worldDt, sun, elapsed, controller);

      // Where the vehicle is going, as against where its nose points.
      const at = worldToScreen(view.camera, view.viewport, s.kinematics.downRangeDistance, s.kinematics.altitude);
      flightPath.update(at.x, at.y, s.kinematics.angleOfMotion, s.kinematics.trueSpeed, view.viewport.height);

      elapsed += worldDt;
      noseUv.x = at.x / view.viewport.width;
      noseUv.y = at.y / view.viewport.height;
      post.update(
        bloomIntensity(litEngines(s), s.vehicle.throttleCurrent),
        heatIntensity(s.forces.thermalPower, heatLimit),
        noseUv,
        elapsed,
      );
    },
    resize(width, height) {
      view.resize(width, height);
      sky.resize(view.viewport);
    },
    presentation() {
      return { ...vehicles.presentation(), width: view.viewport.width,
        height: view.viewport.height, worldDt: lastWorldDt };
    },
    setParticlesVisible(visible) {
      vehicles.setParticlesVisible(visible);
    },
    resetFlight() {
      lastWorldDt = 0;
      vehicles.reset();
    },
    destroy() {
      vehicles.destroy();
    },
  };
}
