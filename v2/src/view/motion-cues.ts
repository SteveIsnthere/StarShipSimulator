/**
 * Screen-space motion cues: velocity streaks, and the flight-path marker.
 *
 * WHY THESE AND NOT MORE WORLD. DEPTH-AND-SPEED-PLAN § 3.3 — the two layers
 * before this one (the distant earth, the cloud deck) both depend on there
 * BEING something out there to look at, and above 100 km there is not. These
 * work identically at 100 m and at 100 km because they are drawn in screen
 * space and driven by the state vector rather than by scenery.
 *
 * THE STREAK DENSITY CURVE IS A COMPRESSION and says so below, per the plan's
 * honesty rule (§ 5). The flight-path marker is NOT: its angle is
 * `angleOfMotion` exactly, straight out of SimState, because it is an
 * instrument and an instrument that lied about where the vehicle was going
 * would be worse than no instrument. That distinction — scenery may be
 * compressed, instruments never — is the whole rule in one file.
 */
import { Container, Graphics } from 'pixi.js';


/**
 * m/s — below this, no streaks at all.
 *
 * A landing hop tops out around 100 m/s and a descent under canopy is slower
 * still; streaking those would mean a gentle touchdown happened in a snowstorm.
 * The threshold is not a fade-in either: it returns exactly zero, so the quiet
 * regime is quiet by construction rather than by being small.
 */
export const STREAK_THRESHOLD = 150;

/**
 * m/s — where the streaks reach full density.
 *
 * Mach 5-ish. Above this the vehicle is in the regime where the § 1.3 problem
 * bites hardest — everything in the world crossing the screen in under three
 * frames — and the streaks are carrying the whole sensation of speed.
 */
export const STREAK_FULL = 2_000;

/**
 * How hard the streaks blow, 0 to 1.
 *
 * THIS IS A COMPRESSION. True scale would put the density and the length in
 * proportion to `speed × viewport.scale`, which at re-entry is 26,280 px/s and
 * a uniform grey wash — the measurement that motivated this milestone. What is
 * drawn instead saturates: from 150 m/s to 2 km/s it climbs, and above that it
 * stops, because there is no visual difference a viewer can extract between
 * "very fast" and "twice as fast" and pretending otherwise just fills the frame.
 *
 * Smoothstep rather than linear, so neither end has a corner: streaks that
 * appeared abruptly at 150 m/s would read as a rendering fault.
 */
export function streakIntensity(trueSpeed: number): number {
  if (!Number.isFinite(trueSpeed)) return 0;
  const speed = Math.abs(trueSpeed);
  if (speed <= STREAK_THRESHOLD) return 0;
  if (speed >= STREAK_FULL) return 1;
  const t = (speed - STREAK_THRESHOLD) / (STREAK_FULL - STREAK_THRESHOLD);
  return t * t * (3 - 2 * t);
}

/*
  A NOTE ON THE VERSION THAT IS NOT HERE.

  This file briefly carried a `streakAirFactor`, thinning the streaks out with
  ambient pressure on the reasonable-sounding ground that a vacuum has nothing
  in it to streak past. Measured over the seven goldens, it did this:

      reentry-autoland: peak 7300 m/s -> streak 0.19

  Which is the milestone defeating itself. Re-entry is the flight with no world
  visible, no scenery to move, and the highest speed in the game — the single
  case these cues exist for — and pressure-thinning switched them off there and
  nowhere else. The plan is explicit (§ 3.3): screen-space cues are the ones
  that work at any scale precisely because "none of which depend on there being
  anything in the world to look at". An air term makes them depend on air.

  So the streaks are a function of SPEED alone. They are speed lines, not dust:
  an abstraction the viewer reads as motion, in the same family as the streaks
  an animator draws behind a thrown punch. Mixing that metaphor with a physical
  one produced something that was neither.
*/


/**
 * px — how long a streak is drawn, given how hard they are blowing.
 *
 * Proportional to the frame rather than absolute, so it means the same thing on
 * a phone and on a desktop — the same reasoning as the camera shake in M7.3.
 */
export function streakLength(intensity: number, viewportHeight: number): number {
  if (intensity <= 0) return 0;
  return viewportHeight * (0.02 + 0.10 * intensity);
}

/**
 * The flight-path marker's rotation, in Pixi's convention.
 *
 * NOT A COMPRESSION — `angleOfMotion` verbatim, negated only because screen y
 * grows downward while world y grows up, exactly as vehicle.ts negates pitch.
 *
 * WHY IT IS WORTH DRAWING. `angleOfMotion` and `pitch` are different numbers,
 * and at high angle of attack they are enormously different: a re-entering
 * Starship is belly-down at 60 degrees to a velocity vector pointing somewhere
 * else entirely. Nothing on screen has ever said so — the ship is drawn at its
 * pitch, and the direction of travel was invisible. This is the standard HUD
 * velocity vector, and the difference between the two marks IS the angle of
 * attack, drawn.
 *
 * @param angleOfMotion rad — from SimState, 0 is straight up
 */
export function flightPathRotation(angleOfMotion: number): number {
  return Number.isFinite(angleOfMotion) ? -angleOfMotion : 0;
}

/**
 * Whether the marker is worth drawing at all.
 *
 * A vehicle that is barely moving has no meaningful direction of travel —
 * `atan2` of two numbers near zero is noise — and a marker spinning on the nose
 * of a landed ship would be an instrument reporting its own rounding error.
 */
export const MARKER_MIN_SPEED = 5;

export function flightPathVisible(trueSpeed: number): boolean {
  return Number.isFinite(trueSpeed) && Math.abs(trueSpeed) >= MARKER_MIN_SPEED;
}

/* ------------------------------------------------------------------------ */

/**
 * The drawn flight-path marker.
 *
 * A ring with three stubs — the standard HUD velocity vector, and deliberately
 * NOT a copy of the attitude chevron in the lower third: the two must be
 * distinguishable at a glance, because the whole point is the angle between
 * where the nose points and where the vehicle is actually going.
 *
 * Built once and transformed thereafter, like everything else in view/.
 */
export interface FlightPathMarker {
  readonly container: Container;
  /**
   * @param screenX px — the vehicle's position on screen
   * @param angleOfMotion rad — from SimState, verbatim
   * @param trueSpeed m/s — used only to decide whether there is a direction at all
   */
  update(
    screenX: number,
    screenY: number,
    angleOfMotion: number,
    trueSpeed: number,
    viewportHeight: number,
  ): void;
}

export function createFlightPathMarker(): FlightPathMarker {
  const container = new Container({ label: 'flightPathMarker' });

  const mark = new Graphics();
  const r = 10;
  mark.circle(0, 0, r);
  mark.stroke({ width: 1.5, color: 0xffffff, alpha: 0.75 });
  // Two side stubs and one on top: aircraft-standard, and it reads as an
  // aiming mark rather than as a second vehicle.
  mark.moveTo(-r, 0);
  mark.lineTo(-r - 7, 0);
  mark.moveTo(r, 0);
  mark.lineTo(r + 7, 0);
  mark.moveTo(0, -r);
  mark.lineTo(0, -r - 6);
  mark.stroke({ width: 1.5, color: 0xffffff, alpha: 0.75 });
  container.addChild(mark);

  return {
    container,
    update(screenX, screenY, angleOfMotion, trueSpeed, viewportHeight) {
      const visible = flightPathVisible(trueSpeed);
      container.visible = visible;
      if (!visible) return;
      container.x = screenX;
      container.y = screenY;
      container.rotation = flightPathRotation(angleOfMotion);
      // Fixed on screen rather than in the world: it is an instrument, and an
      // instrument that shrank with the field of view would be unreadable at
      // exactly the altitudes M7.3 opened up.
      const size = Math.max(0.7, viewportHeight / 800);
      container.scale.set(size, size);
    },
  };
}
