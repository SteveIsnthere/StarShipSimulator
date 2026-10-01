/**
 * FROZEN: the 2021 quadrant ladders, verbatim, that the collapsed trig in
 * src/core/physics/components.ts and getEffectiveVerticalMaxThrust in
 * src/core/control/primitives.ts were proved against
 * (tests/proofs/trig-collapse.test.ts, tests/core/collapsed-trig.test.ts).
 * Moved out of shipped code in Phase 6; never edit them, they are the "before".
 */
import { getTotalMaxThrust } from '$core/physics/engines';
import type { Rad } from '$core/units';

const HALF_PI = Math.PI / 2;


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

/** physics.js:477 verbatim — the 2021 quadrant ladder of getEffectiveVerticalMaxThrust. */
export function legacyEffectiveVerticalMaxThrust(
  running: readonly boolean[],
  gimbalPointingDirection: Rad,
  ambientPressureKPa: number,
): number {
  // M11.2: the same pressure-dependent thrust as the collapsed form, so the
  // two still differ ONLY in the trig — which is what collapsed-trig proves.
  const maxThrust = getTotalMaxThrust(running, ambientPressureKPa);

  let coefficient: number;
  if (0 <= gimbalPointingDirection && gimbalPointingDirection <= Math.PI / 2) {
    coefficient = Math.cos(gimbalPointingDirection);
  } else if (Math.PI / 2 < gimbalPointingDirection && gimbalPointingDirection <= Math.PI) {
    coefficient = -Math.sin(gimbalPointingDirection - Math.PI / 2);
  } else if (-Math.PI / 2 <= gimbalPointingDirection && gimbalPointingDirection < 0) {
    coefficient = Math.cos(gimbalPointingDirection);
  } else {
    coefficient = Math.sin(gimbalPointingDirection + Math.PI / 2);
  }

  return maxThrust * coefficient;
}

