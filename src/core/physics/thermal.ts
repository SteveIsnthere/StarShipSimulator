/**
 * Re-entry heating — Phase 6, Task 8 (Fidelity).
 *
 * CONVECTIVE FLUX: Sutton & Graves (NASA TR R-376, 1971), q = k v^3 sqrt(rho / R_n)
 * with k = 1.7415e-4 kg^0.5/m for air, giving W/m^2 with v in m/s, rho in
 * kg/m^3 and R_n in m. 2021 used 1.83e-7: the same shape on a scale 951 times
 * smaller, about kW/m^2, which `heatLimit` was calibrated around.
 *
 * THE ATTITUDE. Sutton-Graves is the stagnation POINT of a sphere. Broadside,
 * the Ship is a cylinder in crossflow, and the stagnation LINE of a cylinder
 * receives 1/sqrt(2) of a sphere's flux at the same radius (the 2-D against
 * axisymmetric result; Anderson, Hypersonic and High-Temperature Gas Dynamics).
 * The factor runs from 1 nose-on to 1/sqrt(2) broadside with |sin| of the angle
 * into the wind (a blend, named here as an assumption). R_n is the hull's
 * 4.5 m radius either way.
 *
 * TEMPERATURE: radiative equilibrium, T = (q / (eps sigma))^(1/4), the tile
 * re-radiating what it receives, no soak and no ablation. The failure limit is
 * `C.TILE_LIMIT_KELVIN`; `C.heatLimit` is the flux that holds a tile there.
 */
import * as C from '../constants';

/** Stagnation flux of a sphere of radius R_n, Sutton-Graves. @returns W/m^2 */
export function suttonGravesFlux(trueSpeed: number, airDensity: number, noseRadius: number): number {
  return C.SUTTON_GRAVES_K * trueSpeed ** 3 * Math.sqrt(airDensity / noseRadius);
}

/**
 * The heat flux on the windward hull at its attitude.
 * @param angleInToTheWind rad: 0 nose-on, pi/2 broadside
 * @returns W/m^2
 */
export function getReentryHeatPower(
  trueSpeed: number,
  airDensity: number,
  noseRadius: number,
  angleInToTheWind: number,
): number {
  const broadside = Math.abs(Math.sin(angleInToTheWind));
  const shape = 1 - broadside * (1 - Math.SQRT1_2);
  return suttonGravesFlux(trueSpeed, airDensity, noseRadius) * shape;
}

/** The tile's radiative-equilibrium temperature under a flux. @returns K */
export function surfaceTemperature(heatFlux: number): number {
  return (Math.max(0, heatFlux) / (C.TILE_EMISSIVITY * C.STEFAN_BOLTZMANN)) ** 0.25;
}
