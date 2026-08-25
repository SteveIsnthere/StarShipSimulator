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
import { streakIntensity, streakLength } from './motion-cues';
import { EFFECTS, type ParticleSystem } from './particles';
import { engineDistanceFromCenterOfMass, heatLimit, vehicleHeight } from '$core/constants';
import { plasmaIntensity, plumeScaleFactor, plumeSpreadFactor } from './atmosphere-look';

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
      /*
        THE PLUME EXPANDS AS THE AIR THINS (M6.7).

        The same engine draws a tight pencil at sea level and a wide translucent
        bell in vacuum, because exhaust keeps expanding until its pressure
        matches what is around it. It is the most recognisable thing about
        watching an ascent and the reason T+3 minutes looks nothing like
        T+3 seconds.

        `atmosphere.airPressure` has been in SimState since M1.1 and nothing has
        ever drawn with it. The curves are in view/atmosphere-look.ts so they
        can be pinned by a test rather than eyeballed.
      */
      const running = engines.running.filter(Boolean).length;
      if (running > 0 && forces.thrust > 0) {
        const throttleFraction = vehicle.throttleCurrent / 100;
        const ambient = state.atmosphere.airPressure;
        particles.emit(
          'raptorPlume',
          nozzleX,
          nozzleY,
          downAxis,
          (running / 3) * throttleFraction,
          dt,
          scale * 0.9 * plumeScaleFactor(ambient),
          plumeSpreadFactor(ambient),
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

      // --- re-entry plasma trail --------------------------------------------
      /*
        The wake, as distinct from the glow at the nose above.

        Emitted from the nose but aimed the other way, down the relative wind,
        so it streams BEHIND the vehicle. Intensity is scaled against the
        structural heat limit rather than an arbitrary number, so the trail and
        the HEAT readout share a scale: full brightness is four fifths of the
        limit, the same threshold the readout turns amber at.
      */
      const plasma = plasmaIntensity(forces.thermalPower, heatLimit);
      if (plasma > 0) {
        const noseX = shipScreen.x - Math.cos(downAxis) * vehicleHeight * 0.5 * scale;
        const noseY = shipScreen.y - Math.sin(downAxis) * vehicleHeight * 0.5 * scale;
        particles.emit('plasmaTrail', noseX, noseY, downAxis, plasma, dt, scale * 0.9);
      }

      /* --- velocity streaks (M7.5) -----------------------------------------

        The world blowing past, in screen space, so it works identically at
        100 m and at 100 km — which the two world layers cannot, because above
        the atmosphere there is nothing out there to look at.

        Emitted from a point AHEAD of the vehicle along its velocity and swept
        backwards, which is what makes it read as the frame moving rather than
        as the ship shedding something. The emission point is off the edge of
        the frame at full intensity, so streaks enter from outside rather than
        appearing in mid-air.
      */
      const streak = streakIntensity(kinematics.trueSpeed);
      if (streak > 0.01) {
        // Screen-space direction of travel. World y is up and screen y is down.
        const motionX = kinematics.speedX;
        const motionY = -kinematics.speedY;
        const motion = Math.hypot(motionX, motionY);
        if (motion > 1e-6) {
          const ahead = viewport.height * 0.75;
          const back = Math.atan2(-motionY, -motionX);
          particles.emit(
            'velocityStreak',
            shipScreen.x + (motionX / motion) * ahead,
            shipScreen.y + (motionY / motion) * ahead,
            back,
            streak,
            dt,
            // The streak's own length curve, expressed as the emitter's scale.
            // Divided by the config's start size so the curve owns the number
            // rather than sharing it with a constant in EFFECTS.
            streakLength(streak, viewport.height) / (EFFECTS.velocityStreak.startSize * 9),
          );
        }
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
        // A restart clears the fired markers; allow the effect to fire again.
        showedCrash = false;
        showedBreakUp = false;
      }

      void status;
      particles.update(dt);
    },
  };
}
