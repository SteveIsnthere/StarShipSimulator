/**
 * Force decomposition into horizontal and vertical components.
 *
 * Ported verbatim from backend/physics.js:99-249, quadrant ladders intact.
 *
 * Each of the six functions below picks a trig expression by which quadrant its
 * angle falls in. All six ladders reduce to a single expression: the branches
 * are trigonometric identities of one another, so `-sin(PI - x)` and `-sin(x)`
 * agree to the last bit over the whole domain. Collapsing them is M1.9, a
 * Refactor-tier change owing a <= 1 ULP proof over >= 4M sampled angles.
 *
 * They are ported unchanged first, so the goldens in M1.8 lock the current
 * behaviour before anything is simplified. That ordering is the point: a
 * refactor is only provable against a fixture that predates it.
 */
import type { Rad } from '../units';

const HALF_PI = Math.PI / 2;

// --- drag ------------------------------------------------------------------

/** physics.js:110 */
export function horizontalDragCoefficient(angleOfMotion: Rad): number {
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
export function verticalDragCoefficient(angleOfMotion: Rad): number {
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

// --- lift ------------------------------------------------------------------

/** physics.js:128 */
export function horizontalLiftCoefficient(angleOfMotion: Rad): number {
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
export function verticalLiftCoefficient(angleOfMotion: Rad): number {
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

// --- thrust ----------------------------------------------------------------

/** physics.js:159 */
export function horizontalThrustCoefficient(gimbalPointingDirection: Rad): number {
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
export function verticalThrustCoefficient(gimbalPointingDirection: Rad): number {
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
 * `-gravity` here is the 2021 flat-earth constant. M2.6 replaces it with
 * -GM*r_hat/r^2 behind a fidelity flag, which is what makes orbits possible.
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
