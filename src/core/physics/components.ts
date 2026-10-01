/**
 * Force decomposition into horizontal and vertical components.
 *
 * THE SHIPPED FORM IS THE COLLAPSED ONE, since M2.10. Each of these six
 * coefficients was a quadrant ladder in backend/physics.js:99-249 — 143 of that
 * file's 539 lines — picking a trig expression by which quadrant its angle
 * falls in. Every ladder reduces to a single expression, because the branches
 * are trigonometric identities of one another:
 *
 *     horizontalDrag(x)    = -sin(x)      verticalDrag(x)    = -cos(x)
 *     horizontalLift(x)    = -cos(x)      verticalLift(x)    =  sin(x)
 *     horizontalThrust(x)  =  sin(x)      verticalThrust(x)  =  cos(x)
 *
 * M1.9 proved that — tests/proofs/trig-collapse.test.ts, max absolute
 * difference 1 unit-ULP over 4,000,001 angles per ladder — and could not apply
 * it as a Refactor, because about a third of angles differ in the last bit and
 * that moves the goldens. It shipped as a fidelity flag, and M2.10 made it
 * unconditional on the owner's instruction.
 *
 * The accuracy claim is real rather than a formality: the ladder computes
 * `sin(PI - a)` where the collapsed form computes `sin(a)`, and for `a` near PI
 * that subtraction cancels leading digits before the sine is taken. Where the
 * two differ, it is the ladder carrying the error.
 *
 * THE LADDERS ARE STILL HERE, as `legacy*Coefficient`. They are what the 2021
 * build does, the parity suite compares against them, and the 1-ULP proof needs
 * both forms to have something to compare. Nothing in the simulation calls
 * them.
 */
import type { Rad } from '../units';

const HALF_PI = Math.PI / 2;

// --- drag ------------------------------------------------------------------

/** physics.js:110, collapsed. */
export function horizontalDragCoefficient(angleOfMotion: Rad): number {
  return -Math.sin(angleOfMotion);
}

/** physics.js:186, collapsed. */
export function verticalDragCoefficient(angleOfMotion: Rad): number {
  return -Math.cos(angleOfMotion);
}

// --- lift ------------------------------------------------------------------

/** physics.js:128, collapsed. */
export function horizontalLiftCoefficient(angleOfMotion: Rad): number {
  return -Math.cos(angleOfMotion);
}

/** physics.js:203, collapsed. */
export function verticalLiftCoefficient(angleOfMotion: Rad): number {
  return Math.sin(angleOfMotion);
}

// --- thrust ----------------------------------------------------------------

/** physics.js:159, collapsed. */
export function horizontalThrustCoefficient(gimbalPointingDirection: Rad): number {
  return Math.sin(gimbalPointingDirection);
}

/** physics.js:230, collapsed. */
export function verticalThrustCoefficient(gimbalPointingDirection: Rad): number {
  return Math.cos(gimbalPointingDirection);
}

// --- the 2021 ladders, kept for parity and for the proof --------------------

/** physics.js:110 */
export function legacyHorizontalDragCoefficient(angleOfMotion: Rad): number {
  if (0 <= angleOfMotion && angleOfMotion <= HALF_PI) {
    return -Math.sin(angleOfMotion);
  } else if (HALF_PI < angleOfMotion && angleOfMotion <= Math.PI) {
    return -Math.sin(Math.PI - angleOfMotion);
  } else if (-HALF_PI <= angleOfMotion && angleOfMotion < 0) {
    return Math.sin(-angleOfMotion);
  } else {
    return Math.sin(angleOfMotion + Math.PI);
  }
}

/** physics.js:186 */
export function legacyVerticalDragCoefficient(angleOfMotion: Rad): number {
  if (0 <= angleOfMotion && angleOfMotion <= HALF_PI) {
    return -Math.cos(angleOfMotion);
  } else if (HALF_PI < angleOfMotion && angleOfMotion <= Math.PI) {
    return Math.cos(Math.PI - angleOfMotion);
  } else if (-HALF_PI <= angleOfMotion && angleOfMotion < 0) {
    return -Math.cos(angleOfMotion);
  } else {
    return Math.cos(angleOfMotion + Math.PI);
  }
}

/** physics.js:128 */
export function legacyHorizontalLiftCoefficient(angleOfMotion: Rad): number {
  if (0 <= angleOfMotion && angleOfMotion <= HALF_PI) {
    return -Math.sin(HALF_PI - angleOfMotion);
  } else if (HALF_PI < angleOfMotion && angleOfMotion < Math.PI) {
    return Math.cos(Math.PI - angleOfMotion);
  } else if (-HALF_PI <= angleOfMotion && angleOfMotion < 0) {
    return -Math.sin(HALF_PI + angleOfMotion);
  } else {
    return Math.sin(-angleOfMotion - HALF_PI);
  }
}

/** physics.js:203 */
export function legacyVerticalLiftCoefficient(angleOfMotion: Rad): number {
  if (0 <= angleOfMotion && angleOfMotion <= HALF_PI) {
    return Math.cos(HALF_PI - angleOfMotion);
  } else if (HALF_PI < angleOfMotion && angleOfMotion <= Math.PI) {
    return Math.sin(Math.PI - angleOfMotion);
  } else if (-HALF_PI <= angleOfMotion && angleOfMotion < 0) {
    return -Math.cos(HALF_PI + angleOfMotion);
  } else {
    return -Math.cos(-angleOfMotion - HALF_PI);
  }
}

/** physics.js:159 */
export function legacyHorizontalThrustCoefficient(gimbalPointingDirection: Rad): number {
  if (0 <= gimbalPointingDirection && gimbalPointingDirection <= HALF_PI) {
    return Math.sin(gimbalPointingDirection);
  } else if (HALF_PI < gimbalPointingDirection && gimbalPointingDirection <= Math.PI) {
    return Math.cos(gimbalPointingDirection - HALF_PI);
  } else if (-HALF_PI <= gimbalPointingDirection && gimbalPointingDirection < 0) {
    return Math.sin(gimbalPointingDirection);
  } else {
    return -Math.cos(gimbalPointingDirection + HALF_PI);
  }
}

/** physics.js:230 */
export function legacyVerticalThrustCoefficient(gimbalPointingDirection: Rad): number {
  if (0 <= gimbalPointingDirection && gimbalPointingDirection <= HALF_PI) {
    return Math.cos(gimbalPointingDirection);
  } else if (HALF_PI < gimbalPointingDirection && gimbalPointingDirection <= Math.PI) {
    return -Math.sin(gimbalPointingDirection - HALF_PI);
  } else if (-HALF_PI <= gimbalPointingDirection && gimbalPointingDirection < 0) {
    return Math.cos(gimbalPointingDirection);
  } else {
    return Math.sin(gimbalPointingDirection + HALF_PI);
  }
}

/**
 * physics.js:145 and :218 — the sign of the lift component flips depending on
 * which side of the airflow the nose is on. Shared by both axes verbatim.
 */
export function liftSignIsInverted(angleOfAttack: Rad): boolean {
  return (
    (0 < angleOfAttack && angleOfAttack < HALF_PI) ||
    (-Math.PI < angleOfAttack && angleOfAttack < -HALF_PI)
  );
}

// --- composition -----------------------------------------------------------

export interface AccelerationInputs {
  angleOfMotion: Rad;
  angleOfAttack: Rad;
  gimbalPointingDirection: Rad;
  /** m/s^2 */
  aerodynamicDragAcceleration: number;
  /** m/s^2 */
  aerodynamicLiftAcceleration: number;
  /** m/s^2 */
  thrustAcceleration: number;
}

/** physics.js:99 — sum of drag, lift and thrust components. @returns m/s^2 */
export function getHorizontalAcceleration(i: AccelerationInputs): number {
  const dragComponent = horizontalDragCoefficient(i.angleOfMotion) * i.aerodynamicDragAcceleration;

  const liftCoefficient = horizontalLiftCoefficient(i.angleOfMotion);
  const liftComponent = liftSignIsInverted(i.angleOfAttack)
    ? -liftCoefficient * i.aerodynamicLiftAcceleration
    : liftCoefficient * i.aerodynamicLiftAcceleration;

  const thrustComponent =
    horizontalThrustCoefficient(i.gimbalPointingDirection) * i.thrustAcceleration;

  // 2021 sums drag + thrust + lift, in that order. Kept: float addition is not
  // associative and the goldens see the difference.
  return dragComponent + thrustComponent + liftComponent;
}

/**
 * physics.js:175 — same, plus gravity.
 *
 * `gravity` is still passed as the 2021 flat-earth constant and still
 * subtracted here; step() then adds it back along with real -GM/r^2 (M2.6).
 * That looks redundant and is deliberate: keeping the ladder's arithmetic in
 * exactly this order is what made the M2.10 unification provably bit-identical
 * to the flag-on path it replaced.
 *
 * @param gravity m/s^2
 * @returns m/s^2
 */
export function getVerticalAcceleration(i: AccelerationInputs, gravity: number): number {
  const dragComponent = verticalDragCoefficient(i.angleOfMotion) * i.aerodynamicDragAcceleration;

  const liftCoefficient = verticalLiftCoefficient(i.angleOfMotion);
  const liftComponent = liftSignIsInverted(i.angleOfAttack)
    ? -liftCoefficient * i.aerodynamicLiftAcceleration
    : liftCoefficient * i.aerodynamicLiftAcceleration;

  const thrustComponent =
    verticalThrustCoefficient(i.gimbalPointingDirection) * i.thrustAcceleration;

  return -gravity + dragComponent + thrustComponent + liftComponent;
}
