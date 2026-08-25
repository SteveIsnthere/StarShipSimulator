/**
 * Driving the particle system from simulation state.
 *
 * The rule that keeps this honest: view/ reads SimState and never writes it.
 * In 2021 the shutdown effect was fired from inside `toggleRaptor1`, which is
 * simulation code — so the renderer and the physics were the same function, and
 * neither could be tested without the other.
 *
 * Here effects are derived from state, and from edges between successive
 * states. `previous` is the last frame's state, which the loop already keeps
 * for interpolation, so detecting "an engine just stopped" costs nothing.
 */
import type { SimState } from '$core/state';
import { worldToScreen, type CameraState, type Viewport } from './camera';
import type { ParticleSystem } from './particles';
import { engineDistanceFromCenterOfMass, vehicleHeight } from '$core/constants';

export interface EffectDriver {
  update(
    particles: ParticleSystem,
    camera: CameraState,
    viewport: Viewport,
    state: SimState,
    previous: SimState,
    dt: number,
  ): void;
  reset(): void;
}

export function createEffectDriver(): EffectDriver {
  // Edge detection state. Not in SimState: these are presentation facts, and
  // core/ must not know that a renderer exists.
  let showedCrash = false;
  let showedBreakUp = false;

  return {
    reset() {
      showedCrash = false;
      showedBreakUp = false;
    },

    update(particles, camera, viewport, state, previous, dt) {
      const { kinematics, forces, engines, vehicle, failures, status } = state;
      const scale = viewport.scale;

      const shipScreen = worldToScreen(
        camera,
        viewport,
        kinematics.downRangeDistance,
        kinematics.altitude,
      );

      // Screen-space direction the engines point: opposite the nose.
      const pitch = kinematics.pitch;
      const downAxis = -pitch + Math.PI / 2;
      const nozzleDistance = engineDistanceFromCenterOfMass * scale;
      const nozzleX = shipScreen.x + Math.cos(downAxis) * nozzleDistance;
      const nozzleY = shipScreen.y + Math.sin(downAxis) * nozzleDistance;

      // --- engine plume ----------------------------------------------------
      const running = engines.running.filter(Boolean).length;
      if (running > 0 && forces.thrust > 0) {
        const throttleFraction = vehicle.throttleCurrent / 100;
        particles.emit(
          'raptorPlume',
          nozzleX,
          nozzleY,
          downAxis,
          (running / 3) * throttleFraction,
          dt,
          scale * 0.9,
        );
      }

      // --- engine shutdown: the effect that used to leak -------------------
      for (let i = 0; i < 3; i++) {
        if (previous.engines.running[i] && !engines.running[i]) {
          particles.burst('raptorShutdown', nozzleX, nozzleY, 30, scale * 0.8);
        }
      }

      // --- aerodynamic trail off the fins ----------------------------------
      // pixi_setup.js:128 — above 0.2 psi, ramping to full by 2 psi.
      if (forces.dynamicPressure > 0.2) {
        const intensity = Math.min(forces.dynamicPressure / 2, 1);
        const finX = shipScreen.x - Math.cos(downAxis) * vehicleHeight * 0.25 * scale;
        const finY = shipScreen.y - Math.sin(downAxis) * vehicleHeight * 0.25 * scale;
        particles.emit('aeroTrail', finX, finY, downAxis, intensity, dt, scale * 0.7);
      }

      // --- ground smoke -----------------------------------------------------
      // pixi_setup.js:145 — only near the pad, only under thrust, only upright.
      if (
        forces.thrust > 0 &&
        kinematics.altitude < 200 &&
        pitch > -Math.PI * 0.15 &&
        pitch < Math.PI * 0.15
      ) {
        const intensity = 1 - kinematics.altitude / 200;
        const ground = worldToScreen(camera, viewport, kinematics.downRangeDistance, 0);
        particles.emit('groundSmoke', ground.x, ground.y, -Math.PI / 2, intensity, dt, scale);
      }

      // --- transonic cone ---------------------------------------------------
      if (kinematics.machSpeed > 0.9 && kinematics.machSpeed < 1.3 && forces.dynamicPressure > 1) {
        const intensity = 1 - Math.abs(kinematics.machSpeed - 1.1) / 0.2;
        particles.emit(
          'sonicBoom',
          shipScreen.x,
          shipScreen.y,
          downAxis + Math.PI,
          Math.max(intensity, 0),
          dt,
          scale,
        );
      }

      // --- re-entry heating -------------------------------------------------
      if (forces.thermalPower > 1) {
        // Ramps in over the first tenth of the structural limit and saturates
        // well before it, so the vehicle looks in trouble before it is.
        const intensity = Math.min(forces.thermalPower / 20, 1);
        const noseX = shipScreen.x - Math.cos(downAxis) * vehicleHeight * 0.5 * scale;
        const noseY = shipScreen.y - Math.sin(downAxis) * vehicleHeight * 0.5 * scale;
        particles.emit(
          'aeroHeat',
          noseX,
          noseY,
          downAxis + Math.PI,
          intensity,
          dt,
          scale * 0.8,
        );
      }

      // --- catastrophe ------------------------------------------------------
      if (failures.crashed && !showedCrash) {
        particles.burst('explosion', shipScreen.x, shipScreen.y, 600, scale);
        showedCrash = true;
      }
      if (failures.inFlightBreakUp && !showedBreakUp) {
        particles.burst('explosion', shipScreen.x, shipScreen.y, 800, scale);
        showedBreakUp = true;
      }
      if (!failures.crashed && !failures.inFlightBreakUp && (showedCrash || showedBreakUp)) {
        // A restart clears the flags; allow the effect to fire again.
        showedCrash = false;
        showedBreakUp = false;
      }

      void status;
      particles.update(dt);
    },
  };
}
