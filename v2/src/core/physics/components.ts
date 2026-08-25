/**
 * Force decomposition into horizontal and vertical components.
 *
 * Ported verbatim from backend/physics.js:99-249, quadrant ladders intact.
 *
 * Each of the six functions below picks a trig expression by which quadrant its
 * angle falls in — 143 of physics.js's 539 lines. Every ladder reduces to a
 * single expression, because the branches are trigonometric identities of one
 * another:
 *
 *     horizontalDrag(x)    = -sin(x)      verticalDrag(x)    = -cos(x)
 *     horizontalLift(x)    = -cos(x)      verticalLift(x)    =  sin(x)
 *     horizontalThrust(x)  =  sin(x)      verticalThrust(x)  =  cos(x)
 *
 * M1.9 proved that (tests/proofs/trig-collapse.test.ts: max absolute difference
 * 1 unit-ULP over 4,000,001 angles per ladder) and then could not apply it as a
 * Refactor, because a third of angles differ in the last bit and that moves the
 * goldens. It ships as the `collapsedTrig` fidelity flag instead — off by
 * default, both paths golden-tested. See core/flags.ts for why the accuracy
 * claim the Fidelity tier demands is real here and not a formality.
 *
 * Both forms live side by side on purpose. The ladders are what the 2021 build
 * does and what the default fixtures record; deleting them would make the
 * flag-off path a reconstruction rather than the original.
 */
import type { Rad } from '../units';

const HALF_PI = Math.PI / 2;

/**
 * Whether to use the collapsed single expression.
 *
 * Defaults to false everywhere, so a caller that has not been taught about the
 * flag gets 2021's behaviour rather than a silent change.
 */
type Collapsed = boolean;

// --- drag ------------------------------------------------------------------

/** physics.js:110 */
export function horizontalDragCoefficient(angleOfMotion: Rad, collapsed: Collapsed = false): number {
  if (collapsed) return -Math.sin(angleOfMotion);
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
export function verticalDragCoefficient(angleOfMotion: Rad, collapsed: Collapsed = false): number {
  if (collapsed) return -Math.cos(angleOfMotion);
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
export function horizontalLiftCoefficient(angleOfMotion: Rad, collapsed: Collapsed = false): number {
  if (collapsed) return -Math.cos(angleOfMotion);
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
export function verticalLiftCoefficient(angleOfMotion: Rad, collapsed: Collapsed = false): number {
  if (collapsed) return Math.sin(angleOfMotion);
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
export function horizontalThrustCoefficient(
  gimbalPointingDirection: Rad,
  collapsed: Collapsed = false,
): number {
  if (collapsed) return Math.sin(gimbalPointingDirection);
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
export function verticalThrustCoefficient(
  gimbalPointingDirection: Rad,
  collapsed: Collapsed = false,
): number {
  if (collapsed) return Math.cos(gimbalPointingDirection);
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
  /** M1.9 fidelity flag. Absent means 2021's ladders. */
  collapsedTrig?: boolean;
}

/** physics.js:99 — sum of drag, lift and thrust components. @returns m/s^2 */
export function getHorizontalAcceleration(i: AccelerationInputs): number {
  const collapsed = i.collapsedTrig === true;

  const dragComponent =
    horizontalDragCoefficient(i.angleOfMotion, collapsed) * i.aerodynamicDragAcceleration;

  const liftCoefficient = horizontalLiftCoefficient(i.angleOfMotion, collapsed);
  const liftComponent = liftSignIsInverted(i.angleOfAttack)
    ? -liftCoefficient * i.aerodynamicLiftAcceleration
    : liftCoefficient * i.aerodynamicLiftAcceleration;

  const thrustComponent =
    horizontalThrustCoefficient(i.gimbalPointingDirection, collapsed) * i.thrustAcceleration;

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
  const collapsed = i.collapsedTrig === true;

  const dragComponent =
    verticalDragCoefficient(i.angleOfMotion, collapsed) * i.aerodynamicDragAcceleration;

  const liftCoefficient = verticalLiftCoefficient(i.angleOfMotion, collapsed);
  const liftComponent = liftSignIsInverted(i.angleOfAttack)
    ? -liftCoefficient * i.aerodynamicLiftAcceleration
    : liftCoefficient * i.aerodynamicLiftAcceleration;

  const thrustComponent =
    verticalThrustCoefficient(i.gimbalPointingDirection, collapsed) * i.thrustAcceleration;

  return -gravity + dragComponent + thrustComponent + liftComponent;
}
