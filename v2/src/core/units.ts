/**
 * Branded angle types.
 *
 * The 2021 tree stored radians everywhere but wrote `getRad(15)` at call sites,
 * so a raw number could be either. Passing degrees where radians are expected
 * must not compile.
 *
 * Every other quantity in the sim is SI and unbranded; units are documented in
 * JSDoc on each SimState field. Angles get types because they are the only unit
 * in this codebase with two live representations.
 */

declare const RAD: unique symbol;
declare const DEG: unique symbol;

/** An angle in radians. */
export type Rad = number & { readonly [RAD]: true };

/** An angle in degrees. */
export type Deg = number & { readonly [DEG]: true };

/** Tag a number that is already in radians. */
export function rad(value: number): Rad {
  return value as Rad;
}

/** Tag a number that is already in degrees. */
export function deg(value: number): Deg {
  return value as Deg;
}

/**
 * Degrees to radians. The port of `getRad` from physics.js:258, which is written
 * `angle / 180 * Math.PI` there. Kept in that exact order: `x / 180 * PI` and
 * `x * (PI / 180)` differ in the last bit for some inputs, and goldens see it.
 */
export function toRad(angle: Deg): Rad {
  return ((angle / 180) * Math.PI) as Rad;
}

/** Radians to degrees. The port of `getAngle` from physics.js:254. */
export function toDeg(angle: Rad): Deg {
  return ((angle / Math.PI) * 180) as Deg;
}

/** Zero radians, for initialisers. */
export const ZERO_RAD = rad(0);
