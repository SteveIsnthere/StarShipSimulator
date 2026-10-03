/** Startup-owned bodies and exhaust pools. Selection never moves a physical
 * body or transfers its particle history to another vehicle. */
import type { Texture } from 'pixi.js';
import type { SimState } from '$core/state';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { engineDistanceFromCenterOfMass, heatLimit, vehicleHeight } from '$core/constants';
import type { ViewApp } from '$view/app';
import { STARSHIP_TEXTURE } from '$view/assets';
import { createVehicle } from '$view/vehicle';
import { createBoosterVehicle } from '$view/booster';
import { createVehicleLighting } from '$view/lighting';
import { createOnboardInset, createSheath, windwardInHull } from '$view/reentry';
import { createParticleSystem, type createParticleTextures } from '$view/particles';
import { createEffectDriver } from '$view/effects';
import { createEmissiveBell } from '$view/emissive-bell';
import { createEngineGlare } from '$view/engine-glare';
import { plasmaIntensity } from '$view/atmosphere-look';
import { tileGlow } from '$view/heat-look';
import type { SunLight } from '$view/sun';
import type { MissionController } from './mission-controller';

export function createSceneVehicles(view: ViewApp, textures: Map<string, Texture>,
  atlas: ReturnType<typeof createParticleTextures>) {
  const hull = textures.get(STARSHIP_TEXTURE);
  const lighting = hull ? createVehicleLighting(hull) : undefined;
  const ship = createVehicle(textures, lighting);
  const booster = createBoosterVehicle();
  const sheath = createSheath();
  ship.container.addChild(sheath.mesh);
  const inset = createOnboardInset(textures, lighting);
  view.layers.vehicle.addChild(booster.container, ship.container);
  view.layers.effectsFront.addChild(inset.container);

  const shipParticles = createParticleSystem(atlas);
  const boosterParticles = createParticleSystem(atlas);
  const legacyShipEffects = createEffectDriver();
  const missionShipEffects = createEffectDriver(SHIP, SHIP.height / 2);
  const boosterEffects = createEffectDriver(SUPER_HEAVY);
  const shipBell = createEmissiveBell();
  const boosterBell = createEmissiveBell(SUPER_HEAVY);
  const shipGlare = createEngineGlare(atlas.soft);
  const boosterGlare = createEngineGlare(atlas.soft, SUPER_HEAVY);
  view.layers.effectsBehind.addChild(shipGlare.container, shipBell.container, shipParticles.container,
    boosterGlare.container, boosterBell.container, boosterParticles.container);
  const pose = { altitude: 0, downRangeDistance: 0, pitch: 0,
    frontFinExtension: 0, aftFinExtension: 0, angleOfAttack: 0 };
  const windward = { x: 0, y: 1 };
  let selectedBooster = false;
  let missionActive = false;
  let effectsVisible = true;
  let vehiclesVisible = true;

  function writePose(s: SimState) {
    pose.altitude = s.kinematics.altitude;
    pose.downRangeDistance = s.kinematics.downRangeDistance;
    pose.pitch = s.kinematics.pitch;
    pose.frontFinExtension = s.vehicle.frontFinExtension;
    pose.aftFinExtension = s.vehicle.aftFinExtension;
    pose.angleOfAttack = s.kinematics.angleOfAttack;
  }
  return {
    draw(s: SimState, previous: SimState, dt: number, sun: SunLight, elapsed: number, controller: MissionController) {
      selectedBooster = controller.model.id === 'super-heavy';
      const mission = controller.mission;
      const oldMission = controller.previousMission;
      missionActive = !!mission;
      const showShip = !!mission || !selectedBooster;
      const showBooster = !!mission || selectedBooster;
      ship.container.visible = showShip && vehiclesVisible;
      booster.container.visible = showBooster && vehiclesVisible;
      shipParticles.container.visible = shipBell.container.visible = showShip && effectsVisible;
      boosterParticles.container.visible = boosterBell.container.visible = showBooster && effectsVisible;
      shipGlare.container.visible = showShip && effectsVisible;
      boosterGlare.container.visible = showBooster && effectsVisible;
      const groundY = view.viewport.height / 2 + (view.camera.posY + view.camera.shakeY) * view.viewport.scale;
      if (showShip) {
        const state = mission?.ship ?? s;
        writePose(state);
        ship.update(view.camera, view.viewport, pose, sun);
        const effects = mission ? missionShipEffects : legacyShipEffects;
        effects.update(shipParticles, view.camera, view.viewport, state, oldMission?.ship ?? previous, dt);
        shipBell.update(state, view.viewport.scale, effects.nozzle.x, effects.nozzle.y, dt);
        shipGlare.update(state, view.viewport.scale, effects.nozzle.x, effects.nozzle.y, groundY,
          state.kinematics.altitude - Math.cos(state.kinematics.pitch)
            * (mission ? SHIP.height / 2 : engineDistanceFromCenterOfMass));
        const strength = plasmaIntensity(state.forces.thermalPower, heatLimit);
        const surfaceGlow = tileGlow(state.forces.surfaceTemperature);
        windwardInHull(state.kinematics.angleOfAttack, windward);
        sheath.place(vehicleHeight * view.viewport.scale);
        sheath.set(strength, windward.x, windward.y, elapsed, surfaceGlow);
        if (!selectedBooster) inset.update(view.viewport, pose, strength, sun, elapsed, surfaceGlow);
      }
      inset.container.visible = vehiclesVisible && !selectedBooster && inset.container.visible;
      if (showBooster) {
        const state = mission?.booster ?? s;
        writePose(state);
        booster.update(view.camera, view.viewport, pose, sun);
        boosterEffects.update(boosterParticles, view.camera, view.viewport, state, oldMission?.booster ?? previous, dt);
        boosterBell.update(state, view.viewport.scale, boosterEffects.nozzle.x, boosterEffects.nozzle.y, dt);
        boosterGlare.update(state, view.viewport.scale, boosterEffects.nozzle.x, boosterEffects.nozzle.y, groundY,
          state.kinematics.altitude - Math.cos(state.kinematics.pitch) * SUPER_HEAVY.height / 2);
      }
    },
    presentation() {
      const effects = selectedBooster ? boosterEffects : missionActive ? missionShipEffects : legacyShipEffects;
      const bell = selectedBooster ? boosterBell : shipBell;
      const particles = selectedBooster ? boosterParticles : shipParticles;
      return { nozzleX: effects.nozzle.x, nozzleY: effects.nozzle.y,
        bell: { visibleMounts: bell.container.visible ? bell.container.children.filter(child => child.visible).length : 0 },
        particles: particles.inspect(),
        bodies: [ship.container, booster.container].filter(body => body.visible).map(body => ({
          id: body.label, x: body.x, y: body.y, rotation: body.rotation,
          width: body.width, height: body.height,
        })),
      };
    },
    setVehiclesVisible(visible: boolean) {
      vehiclesVisible = visible;
    },
    setParticlesVisible(visible: boolean) {
      effectsVisible = visible;
      shipParticles.container.visible = shipBell.container.visible = ship.container.visible && visible;
      boosterParticles.container.visible = boosterBell.container.visible = booster.container.visible && visible;
      shipGlare.container.visible = ship.container.visible && visible;
      boosterGlare.container.visible = booster.container.visible && visible;
    },
    reset() {
      vehiclesVisible = true;
      shipParticles.clear(); boosterParticles.clear();
      shipBell.reset(); boosterBell.reset();
      shipGlare.reset(); boosterGlare.reset();
      legacyShipEffects.reset(); missionShipEffects.reset(); boosterEffects.reset();
    },
    destroy() {
      shipBell.destroy(); boosterBell.destroy();
      shipGlare.destroy(); boosterGlare.destroy();
      sheath.destroy(); inset.destroy(); lighting?.destroy();
    },
  };
}
