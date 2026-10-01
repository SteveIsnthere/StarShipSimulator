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
import { heatLimit, vehicleHeight } from '$core/constants';
import type { ViewApp } from '$view/app';
import { worldToScreen } from '$view/camera';
import { loadTextures, STARSHIP_TEXTURE } from '$view/assets';
import { createWorld } from '$view/world';
import { createTerrainTextures } from '$view/terrain';
import { createDistantEarth } from '$view/distant-earth';
import { createFlightPathMarker } from '$view/motion-cues';
import { createCloudDeck } from '$view/clouds';
import { createVehicle } from '$view/vehicle';
import { createParticleSystem, createParticleTextures } from '$view/particles';
import { createEffectDriver } from '$view/effects';
import { createSky } from '$view/sky';
import { createSunLight, writeSun } from '$view/sun';
import { createVehicleLighting } from '$view/lighting';
import { createOnboardInset, createSheath, windwardInHull } from '$view/reentry';
import { plasmaIntensity } from '$view/atmosphere-look';
import { bloomIntensity, createPostPass, heatIntensity } from '$view/post';

export interface Scene {
  /** Draw one frame of `state`, `worldDt` simulated seconds after the last. */
  draw(state: SimState, previous: SimState, worldDt: number, preset: ScenarioPreset): void;
  /** Match the viewport to the window. */
  resize(width: number, height: number): void;
  destroy(): void;
}

/** Engines lit, counted without allocating (the per-frame path). */
function litEngines(state: SimState): number {
  const r = state.engines.running;
  return (r[0] ? 1 : 0) + (r[1] ? 1 : 0) + (r[2] ? 1 : 0);
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
  const hullTexture = textures.get(STARSHIP_TEXTURE);
  const lighting = hullTexture ? createVehicleLighting(hullTexture) : undefined;
  const vehicle = createVehicle(textures, lighting);

  // Re-entry: the sheath on the hull and the onboard inset, from the same
  // strength the plasma trail and the heat readout use.
  const sheath = createSheath();
  vehicle.container.addChild(sheath.mesh);
  const inset = createOnboardInset(textures, lighting);
  const windward = { x: 0, y: 1 };
  const insetState = {
    altitude: 0,
    downRangeDistance: 0,
    pitch: 0,
    angleOfAttack: 0,
    frontFinExtension: 0,
    aftFinExtension: 0,
  };
  const vehicleState = {
    altitude: 0,
    downRangeDistance: 0,
    pitch: 0,
    frontFinExtension: 0,
    aftFinExtension: 0,
  };
  const noseUv = { x: 0, y: 0 };

  // One atlas for the particles and the cloud puffs.
  const particleTextures = createParticleTextures(view.app.renderer);

  // Depth, back to front: the distant earth, the cloud deck, the true ground.
  const distantEarth = createDistantEarth(terrain);
  view.layers.far.addChild(distantEarth.container);
  const clouds = createCloudDeck(particleTextures.wisp);
  view.layers.far.addChild(clouds.container);
  view.layers.world.addChild(world.container);
  view.layers.vehicle.addChild(vehicle.container);

  const sky = createSky(view.app.renderer);
  view.layers.sky.addChild(sky.container);

  const particles = createParticleSystem(particleTextures);
  const effects = createEffectDriver();
  view.layers.effectsBehind.addChild(particles.container);

  // The flight-path marker is an instrument: in front of everything.
  const flightPath = createFlightPathMarker();
  view.layers.effectsFront.addChild(flightPath.container);
  view.layers.effectsFront.addChild(inset.container);

  const post = createPostPass(
    view.layers.effectsBehind,
    view.layers.vehicle,
    view.viewport.width,
    view.viewport.height,
  );
  let elapsed = 0;

  return {
    draw(s, previous, worldDt, preset) {
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

      vehicleState.altitude = s.kinematics.altitude;
      vehicleState.downRangeDistance = s.kinematics.downRangeDistance;
      vehicleState.pitch = s.kinematics.pitch;
      vehicleState.frontFinExtension = s.vehicle.frontFinExtension;
      vehicleState.aftFinExtension = s.vehicle.aftFinExtension;
      vehicle.update(view.camera, view.viewport, vehicleState, sun);

      effects.update(particles, view.camera, view.viewport, s, previous, worldDt);

      const strength = plasmaIntensity(s.forces.thermalPower, heatLimit);
      windwardInHull(s.kinematics.angleOfAttack, windward);
      sheath.place(vehicleHeight * view.viewport.scale);
      sheath.set(strength, windward.x, windward.y, elapsed);
      insetState.altitude = s.kinematics.altitude;
      insetState.downRangeDistance = s.kinematics.downRangeDistance;
      insetState.pitch = s.kinematics.pitch;
      insetState.angleOfAttack = s.kinematics.angleOfAttack;
      insetState.frontFinExtension = s.vehicle.frontFinExtension;
      insetState.aftFinExtension = s.vehicle.aftFinExtension;
      inset.update(view.viewport, insetState, strength, sun, elapsed);

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
    destroy() {
      // Mesh.destroy releases neither the hull shader nor its generated normal map.
      sheath.destroy();
      inset.destroy();
      lighting?.destroy();
    },
  };
}
