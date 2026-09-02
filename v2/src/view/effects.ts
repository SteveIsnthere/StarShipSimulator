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
import {
  plasmaIntensity,
  plumeScaleFactor,
  plumeSpreadFactor,
  shockCellLength,
  shockDiamondStrength,
} from './atmosphere-look';

/**
 * kPa — below this there is not enough air for the fins to shed anything.
 *
 * 2021's number, kept: pixi_setup.js:128 gated at 0.2 and called it psi. The
 * VALUE is right for a gate — 0.2 kPa is reached on 94% of a launch and 100% of
 * an RTLS, which is a fair description of "inside the atmosphere" — and only the
 * unit was wrong. What was not right was the saturation point beside it; see the
 * ramp itself.
 */
export const AERO_TRAIL_MIN_Q = 0.2;

/**
 * kPa — where the fin vortices reach full intensity.
 *
 * Thirty, the same number `view/camera.ts` shakes at full amplitude at and
 * `audio/params.ts` roars at full strength at, because all three are the same
 * physical claim: this is as hard as the air ever tears at this vehicle. The
 * seven goldens peak at 28.6 kPa on the RTLS and 23.6 on the launch.
 *
 * It was 2, which is 4% of the structural limit and 7% of this — see the ramp.
 */
export const AERO_TRAIL_FULL_Q = 30;

/**
 * kPa — the air needed for a transonic shock cone to be visible at all.
 *
 * A gate rather than a ramp, and low on purpose: a descending vehicle goes
 * through Mach 1 in thin air, and a threshold set anywhere near max-Q would mean
 * the effect only ever appeared on the way up. Named here rather than left as a
 * literal so `tests/view/dynamic-pressure.test.ts` can see it — an unnamed
 * threshold is one the range test cannot check.
 */
export const SONIC_BOOM_MIN_Q = 1;

/**
 * How deep the shock banding cuts, as a fraction of a particle's alpha.
 *
 * 0.55 means the bright bands are a little over half again as bright as the
 * troughs rather than a strobe. A shock diamond is a visible brightening of a
 * continuous column, not a row of separate lights, and anything past about 0.7
 * starts to read as the second thing.
 */
export const SHOCK_BAND_DEPTH = 0.55;

/**
 * The least dense the plume gets, however far the throttle is back.
 *
 * A single Raptor at the lower throttle limit is 13% of full power and would
 * emit 13% of the particles over the same length — see the note at the emitter.
 * Just under half is enough that the column stays continuous at every setting
 * the vehicle can fly at.
 */
export const PLUME_DENSITY_FLOOR = 0.45;

/**
 * And how short it gets, which is where the throttle actually shows.
 *
 * A throttled engine is a SMALLER engine, not a fainter one. This scales the
 * emitter, which scales both the particle speed and its drawn size, so backing
 * off the throttle pulls the plume in rather than dimming it.
 */
export const PLUME_REACH_FLOOR = 0.5;

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

      // Screen-space direction the engines point: opposite the nose. Positive
      // pitch is nose-right and Pixi's angles are clockwise, so the tail axis
      // is pitch past straight down — unflipped (M11.5; see vehicle.ts).
      const pitch = kinematics.pitch;
      const downAxis = pitch + Math.PI / 2;
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
        const spread = plumeSpreadFactor(ambient);
        const size = plumeScaleFactor(ambient);

        /*
          DENSITY IS NOT POWER, and conflating them is why the intro landing —
          the sequence CLAUDE.md names as part of the soul — had no visible
          engine. One Raptor at 70% throttle is `(1/3) * 0.7 = 0.23` of full
          power, and `intensity` scales the emission RATE, so the plume kept its
          full length and got a quarter of the particles to fill it with: at the
          landing burn that was thirty-eight particles strung over four hundred
          pixels, one every eleven, which is a dotted line rather than an
          exhaust.

          Power still decides how much plume there is; it decides it through
          `PLUME_REACH` below, which shortens and narrows the thing. What it may
          not do is make the plume TRANSPARENT, because a throttled engine is
          not a faint engine — it is a smaller one.
        */
        const power = (running / 3) * throttleFraction;
        const density = PLUME_DENSITY_FLOOR + (1 - PLUME_DENSITY_FLOOR) * power;
        const reach = PLUME_REACH_FLOOR + (1 - PLUME_REACH_FLOOR) * power;

        /*
          THE PLUME IS THREE THINGS AT ONE POINT (M9.6), and the point is the
          same nozzle it always was.

          The CORE is the inner column, still supersonic and still incandescent:
          fast, near-white, barely spread. The BELL wraps it, translucent and
          wide, and is 2021's single emitter in its new job. The DIAMONDS are
          neither — they are a periodic brightness ALONG the core, because a
          shock train is not made of particles but of the same gas being
          alternately compressed and expanded as it crosses standing shocks.

          All three read the same two ambient curves M6.7 built, because they are
          one physical thing: exhaust expands until its pressure matches the air.
          The core spreads less than the bell does — the `* 0.55` — for the same
          reason it is the core: it is the part the surrounding flow is still
          holding together.
        */
        particles.emit(
          'raptorPlumeCore',
          nozzleX,
          nozzleY,
          downAxis,
          density,
          dt,
          scale * 0.9 * size * reach,
          1 + (spread - 1) * 0.55,
          shockCellLength(ambient) * scale,
          shockDiamondStrength(ambient) * SHOCK_BAND_DEPTH,
        );
        particles.emit(
          'raptorPlume',
          nozzleX,
          nozzleY,
          downAxis,
          density,
          dt,
          scale * 0.9 * size * reach,
          spread,
        );
      }

      // --- engine shutdown: the effect that used to leak -------------------
      for (let i = 0; i < 3; i++) {
        if (previous.engines.running[i] && !engines.running[i]) {
          particles.burst('raptorShutdown', nozzleX, nozzleY, 30, scale * 0.8);
        }
      }

      // --- aerodynamic trail off the fins ----------------------------------
      /*
        THE RAMP, RETUNED (M9.3). 2021 read "above 0.2 psi, ramping to full by
        2 psi" and the port kept both numbers. They are not psi — `dynamicPressure`
        is kPa (see AERO_TRAIL_FULL_Q) — so what shipped was an effect at FULL
        intensity above two kilopascals, which is 85% of a launch, 76% of an
        RTLS and 44% of a re-entry. An effect that is saturated for most of every
        flight it appears in is decoration: it cannot tell a player that the air
        is tearing harder now than it was a moment ago, because it says the same
        thing at 2 kPa and at 28.

        Square root over the whole visited range instead, for the reason
        `audio/params.ts`'s `aeroLevel` gives for the identical quantity: a
        linear map spends almost all of its range in the last few kilopascals,
        where the vehicle is usually already in trouble. The gate stays at
        2021's 0.2, which is simply "there is air out there".

        It costs brightness at low Q and that is the information being restored:
        the intro's landing peaks at 1.7 kPa and drops from 0.84 to 0.24, the
        launch peaks at 23.6 and goes from a flat 1.0 to 0.89 arrived at
        gradually. A landing burn should not shed vortices like a max-Q ascent.
      */
      if (forces.dynamicPressure > AERO_TRAIL_MIN_Q) {
        const intensity = Math.min(Math.sqrt(forces.dynamicPressure / AERO_TRAIL_FULL_Q), 1);
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
      if (
        kinematics.machSpeed > 0.9 &&
        kinematics.machSpeed < 1.3 &&
        forces.dynamicPressure > SONIC_BOOM_MIN_Q
      ) {
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
