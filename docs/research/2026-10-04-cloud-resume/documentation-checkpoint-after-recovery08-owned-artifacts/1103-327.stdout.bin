/**
 * NASA Ames LI900 silica insulation surrogate, not verified V3 tile material.
 * Complete SI source tables, accessed2026-10-03:
 * https://tpsx.arc.nasa.gov/MaterialProperty?id=1&property=9 (specific heat)
 * https://tpsx.arc.nasa.gov/MaterialProperty?id=1&property=4 (through-thickness k)
 * https://tpsx.arc.nasa.gov/Material?id=1 (nominal uncoated density)
 * Temperature interpolation is linear. Log-pressure interpolation and the
 * lowest-pressure hold below10.133Pa are declared engineering assumptions.
 * No TPS erosion, failure, thickness, coverage or thermal evolution is defined.
 */

/** Nominal uncoated LI900 density, kg/m³. */
export const TPS_DENSITY = 144;
/** Independent source-data temperature bounds, K. */
export const TPS_CP_MIN_K = 116.483;
export const TPS_CP_MAX_K = 1922.04;
export const TPS_K_MIN_K = 116.667;
export const TPS_K_MAX_K = 1922.22;
/** Highest measured pressure in the adopted conductivity table, Pa. */
export const TPS_PRESSURE_MAX_PA = 101330;
const REFERENCE_K = 293.15;

// K, J/(kg·K). Source decimals are transcription, not accuracy claims.
const CP_ROWS = [
  [116.483, 293], [172.039, 440], [255.372, 628], [394.261, 879],
  [533.15, 1060], [672.039, 1150], [810.928, 1210], [949.817, 1240],
  [1088.71, 1260], [1199.82, 1260], [1227.59, 1270], [1366.48, 1270],
  [1533.15, 1270], [1922.04, 1270],
] as const;

const K_TEMPERATURES = [116.667, 255.556, 394.444, 533.333, 672.222, 811.111,
  950, 1088.89, 1227.78, 1366.67, 1533.33, 1644.44, 1811.11, 1922.22] as const;
// PressurePa, conductivity W/(m·K) at every K_TEMPERATURES entry.
const K_PRESSURE_ROWS = [
  [10.133, [.00865, .013, .0159, .0216, .0303, .0403, .0533, .072,
    .0981, .127, .167, .201, .267, .329]],
  [101.33, [.013, .0173, .0216, .0289, .0374, .0476, .0606, .0795,
    .106, .135, .177, .213, .280, .339]],
  [1013.3, [.026, .0317, .0389, .0478, .0563, .0679, .0852, .107,
    .133, .163, .201, .241, .312, .379]],
  [10133, [.0374, .0433, .0547, .0692, .0852, .104, .125, .151,
    .183, .220, .268, .310, .384, .454]],
  [101330, [.0403, .0476, .059, .075, .0924, .114, .135, .163,
    .196, .235, .289, .336, .419, .502]],
] as const;

function requireTemperature(temperatureK: number, minimum: number, maximum: number): void {
  if (!Number.isFinite(temperatureK) || temperatureK < minimum || temperatureK > maximum) {
    throw new RangeError('LI900 temperature is outside its material property data domain');
  }
}

function requirePressure(pressurePa: number): void {
  if (!Number.isFinite(pressurePa) || pressurePa < 0 || pressurePa > TPS_PRESSURE_MAX_PA) {
    throw new RangeError('LI900 pressure must be within0–101330Pa');
  }
}

const CP_ENERGY = new Float64Array(CP_ROWS.length);
// Startup-only integrals of the positive piecewise-linear source cp.
for (let index = 1; index < CP_ROWS.length; index++) {
  const previous = CP_ROWS[index - 1]!;
  const current = CP_ROWS[index]!;
  CP_ENERGY[index] = CP_ENERGY[index - 1]!
    + (current[0] - previous[0]) * (previous[1] + current[1]) / 2;
}

function cpCell(temperatureK: number): number {
  for (let index = 1; index < CP_ROWS.length; index++) {
    if (temperatureK < CP_ROWS[index]![0]) return index - 1;
  }
  return CP_ROWS.length - 2;
}

function energyFromLowerBound(temperatureK: number): number {
  const index = cpCell(temperatureK);
  const start = CP_ROWS[index]!;
  const end = CP_ROWS[index + 1]!;
  if (temperatureK === end[0]) return CP_ENERGY[index + 1]!;
  const delta = temperatureK - start[0];
  const slope = (end[1] - start[1]) / (end[0] - start[0]);
  return CP_ENERGY[index]! + start[1] * delta + slope * delta ** 2 / 2;
}

const REFERENCE_ENERGY = energyFromLowerBound(REFERENCE_K);
const MIN_SPECIFIC_ENTHALPY = -REFERENCE_ENERGY;
const MAX_SPECIFIC_ENTHALPY = CP_ENERGY[CP_ROWS.length - 1]! - REFERENCE_ENERGY;

/** Specific heat in J/(kg·K), linearly interpolated from the complete source. */
export function tpsSpecificHeat(temperatureK: number): number {
  requireTemperature(temperatureK, TPS_CP_MIN_K, TPS_CP_MAX_K);
  const index = cpCell(temperatureK);
  const start = CP_ROWS[index]!;
  const end = CP_ROWS[index + 1]!;
  if (temperatureK === end[0]) return end[1];
  const fraction = (temperatureK - start[0]) / (end[0] - start[0]);
  return start[1] + fraction * (end[1] - start[1]);
}

/** Exact integral of the implemented linear cp, J/kg relative to293.15K. */
export function tpsSpecificEnthalpy(temperatureK: number): number {
  requireTemperature(temperatureK, TPS_CP_MIN_K, TPS_CP_MAX_K);
  return energyFromLowerBound(temperatureK) - REFERENCE_ENERGY;
}

/**
 * Monotone enthalpy inverse, K. Binary search is bounded by the14 source knots;
 * the cell's positive linear cp has an analytic quadratic integral. The stable
 * quadratic root also works when the slope is zero and avoids cancellation.
 */
export function tpsTemperatureFromEnthalpy(specificEnthalpy: number): number {
  if (!Number.isFinite(specificEnthalpy)
    || specificEnthalpy < MIN_SPECIFIC_ENTHALPY || specificEnthalpy > MAX_SPECIFIC_ENTHALPY) {
    throw new RangeError('LI900 specific enthalpy is outside the heat-capacity data domain');
  }
  if (specificEnthalpy === 0) return REFERENCE_K;
  if (specificEnthalpy === MIN_SPECIFIC_ENTHALPY) return TPS_CP_MIN_K;
  if (specificEnthalpy === MAX_SPECIFIC_ENTHALPY) return TPS_CP_MAX_K;
  const absoluteEnergy = specificEnthalpy + REFERENCE_ENERGY;
  let lower = 0;
  let upper = CP_ROWS.length - 1;
  while (upper - lower > 1) {
    const middle = Math.floor((lower + upper) / 2);
    if (CP_ENERGY[middle]! <= absoluteEnergy) lower = middle;
    else upper = middle;
  }
  const start = CP_ROWS[lower]!;
  const end = CP_ROWS[lower + 1]!;
  const slope = (end[1] - start[1]) / (end[0] - start[0]);
  const deltaEnergy = absoluteEnergy - CP_ENERGY[lower]!;
  const deltaTemperature = 2 * deltaEnergy
    / (start[1] + Math.sqrt(start[1] ** 2 + 2 * slope * deltaEnergy));
  // Roundoff containment within the proven source cell, not energy saturation.
  return Math.max(start[0], Math.min(end[0], start[0] + deltaTemperature));
}

function pressureConductivity(temperatureIndex: number, pressurePa: number): number {
  const first = K_PRESSURE_ROWS[0];
  // Explicit unresolved-vacuum surrogate: retain measured solid/radiative path.
  if (pressurePa <= first[0]) return first[1][temperatureIndex]!;
  for (let index = 1; index < K_PRESSURE_ROWS.length; index++) {
    const current = K_PRESSURE_ROWS[index]!;
    if (pressurePa === current[0]) return current[1][temperatureIndex]!;
    if (pressurePa < current[0]) {
      const previous = K_PRESSURE_ROWS[index - 1]!;
      const fraction = Math.log(pressurePa / previous[0]) / Math.log(current[0] / previous[0]);
      return previous[1][temperatureIndex]!
        + fraction * (current[1][temperatureIndex]! - previous[1][temperatureIndex]!);
    }
  }
  return K_PRESSURE_ROWS[K_PRESSURE_ROWS.length - 1]![1][temperatureIndex]!;
}

function conductivityUnchecked(temperatureK: number, pressurePa: number): number {
  for (let index = 1; index < K_TEMPERATURES.length; index++) {
    const end = K_TEMPERATURES[index]!;
    if (temperatureK === end) return pressureConductivity(index, pressurePa);
    if (temperatureK < end) {
      const start = K_TEMPERATURES[index - 1]!;
      const first = pressureConductivity(index - 1, pressurePa);
      const last = pressureConductivity(index, pressurePa);
      return first + (temperatureK - start) / (end - start) * (last - first);
    }
  }
  return pressureConductivity(K_TEMPERATURES.length - 1, pressurePa);
}

/** Through-thickness conductivity W/(m·K); linearT/log-pressure bridge. */
export function tpsConductivity(temperatureK: number, pressurePa: number): number {
  requireTemperature(temperatureK, TPS_K_MIN_K, TPS_K_MAX_K);
  requirePressure(pressurePa);
  return conductivityUnchecked(temperatureK, pressurePa);
}

/**
 * Integral mean k over two temperatures, W/(m·K). Exact integration of the
 * piecewise-linear adopted k(T,p) at fixed pressure, crossing all source cells.
 * Symmetric in temperature order; equal temperatures return the local k.
 * This is a material helper, not a transient finite-volume heat solver.
 */
export function tpsMeanConductivity(
  temperatureA: number, temperatureB: number, pressurePa: number,
): number {
  requireTemperature(temperatureA, TPS_K_MIN_K, TPS_K_MAX_K);
  requireTemperature(temperatureB, TPS_K_MIN_K, TPS_K_MAX_K);
  requirePressure(pressurePa);
  if (temperatureA === temperatureB) return conductivityUnchecked(temperatureA, pressurePa);
  const lower = Math.min(temperatureA, temperatureB);
  const upper = Math.max(temperatureA, temperatureB);
  let integral = 0;
  for (let index = 1; index < K_TEMPERATURES.length; index++) {
    const start = Math.max(lower, K_TEMPERATURES[index - 1]!);
    const end = Math.min(upper, K_TEMPERATURES[index]!);
    if (end > start) {
      integral += (end - start) * (conductivityUnchecked(start, pressurePa)
        + conductivityUnchecked(end, pressurePa)) / 2;
    }
  }
  return integral / (upper - lower);
}
