/**
 * Trajectory predictions used by the autopilot, ported from physics.js.
 */
import * as C from '../constants';

/**
 * physics.js:529 — time to fall from `altitude` to `goalHeight` with drag.
 *
 * The closed form for terminal-velocity fall under quadratic drag, plus a
 * first-order correction for current vertical speed.
 * @returns seconds
 */
export function getFreeFallTimeRemainingPrediction(
  altitude: number,
  goalHeight: number,
  vehicleMass: number,
  speedY: number,
): number {
  return (
    Math.sqrt(vehicleMass / (C.gravity * C.airResistance_k)) *
      Math.asinh(Math.E ** (((altitude - goalHeight) * C.airResistance_k) / vehicleMass)) +
    speedY / C.gravity
  );
}
