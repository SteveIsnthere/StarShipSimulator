/**
 * Re-entry heating, ported verbatim from backend/physics.js:1-4.
 *
 * The Sutton-Graves form: q = k * v^3 * sqrt(rho / R_nose).
 */

/**
 * physics.js:1.
 *
 * @param trueSpeed m/s
 * @param airDensity kg/m^3
 * @param vehicleNoseRadius m — the *radius*, per the parameter's own name.
 *   Every 2021 call site passed `crossSectionalArea` instead, an area in m^2.
 *   M2.2 fixed the call site rather than this function, which was always right:
 *   step() now passes constants.NOSE_RADIUS.
 * @returns arbitrary thermal units, compared against `heatLimit`
 */
export function getReentryHeatPower(
  trueSpeed: number,
  airDensity: number,
  vehicleNoseRadius: number,
): number {
  return 1.83 * 10 ** -7 * trueSpeed ** 3 * Math.sqrt(airDensity / vehicleNoseRadius);
}
