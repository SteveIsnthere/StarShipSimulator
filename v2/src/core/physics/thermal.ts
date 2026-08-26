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
 * @returns a stagnation-point heat flux on an UNRESOLVED SCALE, compared
 *   against `heatLimit`, which is derived from it. M9.4 audited this and could
 *   not name the unit honestly, so it records what is established and what is
 *   not, rather than guessing.
 *
 *   ESTABLISHED: the form is Sutton-Graves, `k * v^3 * sqrt(rho / R_n)`, whose
 *   dimensions are those of a heat flux; and the correlation is commonly
 *   published as `1.83e-8 * v^3 * sqrt(rho / R_n)` for a result in W/cm^2, with
 *   v in m/s, rho in kg/m^3 and R_n in m. The coefficient here is 1.83e-7 —
 *   the same leading digits, one larger in the exponent. On that reading this
 *   returns ten times a flux in W/cm^2: the re-entry preset peaks at 245.9 of
 *   these units, which would be 24.6 W/cm^2, a plausible entry heat flux.
 *
 *   NOT ESTABLISHED: whether that factor of ten is a transcription slip in the
 *   2021 source — the same shape as the 0.0299-for-0.00299 slip M2.1 found in
 *   the upper stratosphere — or a deliberate scaling. Nothing in the source
 *   decides it, and deciding it would change physics, which is a Fidelity-tier
 *   change and needs the owner. `heatLimit` was re-derived against the scale
 *   this actually returns (M2.9(a)), so the two are consistent as they stand.
 */
export function getReentryHeatPower(
  trueSpeed: number,
  airDensity: number,
  vehicleNoseRadius: number,
): number {
  return 1.83 * 10 ** -7 * trueSpeed ** 3 * Math.sqrt(airDensity / vehicleNoseRadius);
}
