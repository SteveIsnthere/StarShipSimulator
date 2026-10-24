/** Authored exhaust curves, not quantitative nozzle flow or photometry. */
import { RVAC_EXIT_DIAMETER } from '$core/constants';
import { NOZZLE_EXIT_DIAMETER, SEA_LEVEL_PRESSURE, plumeScaleFactor,
  plumeSpreadFactor, shockCellLength, shockDiamondStrength } from './atmosphere-look';

export interface EnginePlumeLook {
  spread: number;
  scale: number;
  diamonds: number;
  cellLength: number;
}

/** Mutates startup-owned output; throttle is percent, pressure is kPa. */
export function enginePlumeLook(
  pressure: number, throttle: number, vacuum: boolean, out: EnginePlumeLook,
): void {
  // Invalid pressure falls back to the pad, never to a fabricated vacuum.
  const ambient = Number.isFinite(pressure) ? Math.max(0, pressure) : SEA_LEVEL_PRESSURE;
  const power = Number.isFinite(throttle) ? Math.max(0, Math.min(1, throttle / 100)) : 0;
  const diameter = vacuum ? RVAC_EXIT_DIAMETER : NOZZLE_EXIT_DIAMETER;
  // Compress the larger RVac silhouette rather than scaling every pixel by
  // diameter. The existing pressure expansion remains the shared base curve.
  const nozzleSize = vacuum ? Math.sqrt(diameter / NOZZLE_EXIT_DIAMETER) : 1;
  out.spread = plumeSpreadFactor(ambient) * (vacuum ? 1.2 : 1);
  out.scale = power > 0 ? plumeScaleFactor(ambient) * nozzleSize * (0.5 + 0.5 * power) : 0;
  out.diamonds = power > 0 ? shockDiamondStrength(ambient) * (vacuum ? 0.35 : 1) : 0;
  out.cellLength = shockCellLength(ambient, diameter) * (vacuum ? diameter / NOZZLE_EXIT_DIAMETER : 1);
}
