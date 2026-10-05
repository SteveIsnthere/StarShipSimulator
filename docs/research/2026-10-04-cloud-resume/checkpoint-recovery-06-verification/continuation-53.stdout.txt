/**
 * Declared 304 stainless surrogate, not proprietary V3 material or fracture data.
 * Thermal fit: NIST, Thermal Performance of Fire Resistive Materials, §3.1.1,
 * printed p7, Figure1 (room–1200°C):
 * https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=860705
 * Cold304 source fits (4–300K):
 * https://trc.nist.gov/cryogenics/materials/304Stainless/304Stainless_rev.htm
 * A declared positive endpoint bridge joins273.15–293.15K; this is an authored
 * fit reconciliation, not extra material data. Cold cp is linearly sampled
 * at startup every0.0625K, with each segment integrated exactly thereafter.
 * Mechanical data: Farmani et al., Fire Testing of Grade304 Stainless Steel
 * Plate Material Under Transient-state Conditions, Table2 (100–900°C):
 * https://researchmgt.monash.edu/ws/portalfiles/portal/383174507/383174382_oa.pdf
 * The tests heat3mm coupons at10°C/min and include implicit creep. Proof stress
 * is not ultimate/fracture stress; this module supplies no wear or failure law.
 */

/** NIST density at23°C, kg/m³; thermal expansion of density is not modeled. */
export const STEEL_DENSITY = 7920;
/** Lower bound of the NIST cryogenic heat-capacity data, K. */
export const MATERIAL_MIN_K = 4;
/** Enthalpy reference and start of the exact hot branch, K. */
export const MATERIAL_REFERENCE_K = 293.15;
/** Upper bound of the NIST Figure1 thermal fit adopted here, K. */
export const MATERIAL_MAX_K = 1473.15;

function requireThermalTemperature(temperatureK: number): void {
  if (!Number.isFinite(temperatureK)
    || temperatureK < MATERIAL_MIN_K || temperatureK > MATERIAL_MAX_K) {
    throw new RangeError('304 thermal temperature must be within4–1473.15K');
  }
}

const COLD_CP_COEFFICIENTS = [22.0061, -127.5528, 303.647, -381.0098,
  274.0328, -112.9212, 24.7593, -2.239153] as const;
const COLD_K_COEFFICIENTS = [-1.4087, 1.3982, 0.2543, -0.6260,
  0.2334, 0.4256, -0.4658, 0.1650, -0.0199] as const;
const BRIDGE_START_K = 273.15;
const BRIDGE_WIDTH_K = MATERIAL_REFERENCE_K - BRIDGE_START_K;
// Numerical refinement only:0.25K missed the fixed0.1% cp bound near4.137K
// where source-fit curvature is strongest. Source coefficients are unchanged.
const COLD_GRID_WIDTH_K = 0.0625;
const COLD_INTERVALS = Math.ceil((BRIDGE_START_K - MATERIAL_MIN_K) / COLD_GRID_WIDTH_K);
const COLD_CP = new Float64Array(COLD_INTERVALS + 1);
const COLD_INTEGRAL = new Float64Array(COLD_INTERVALS + 1);

function logarithmicFit(temperatureK: number, coefficients: readonly number[]): number {
  const x = Math.log10(temperatureK);
  let polynomial = 0;
  for (let index = coefficients.length - 1; index >= 0; index--) {
    polynomial = polynomial * x + coefficients[index]!;
  }
  return 10 ** polynomial;
}

function coldGridTemperature(index: number): number {
  return Math.min(BRIDGE_START_K, MATERIAL_MIN_K + index * COLD_GRID_WIDTH_K);
}

// Only startup allocation/quadrature. Piecewise-linear cp gives an exact
// quadratic implemented enthalpy within every positive-capacity grid cell.
for (let index = 0; index <= COLD_INTERVALS; index++) {
  const temperature = coldGridTemperature(index);
  COLD_CP[index] = logarithmicFit(temperature, COLD_CP_COEFFICIENTS);
  if (index > 0) {
    const width = temperature - coldGridTemperature(index - 1);
    COLD_INTEGRAL[index] = COLD_INTEGRAL[index - 1]!
      + width * (COLD_CP[index - 1]! + COLD_CP[index]!) / 2;
  }
}

function hotSpecificHeat(temperatureK: number): number {
  return 6.683 + 0.04906 * temperatureK + 80.74 * Math.log(temperatureK);
}

function hotConductivity(temperatureK: number): number {
  return 9.705 + 0.0176 * temperatureK - 1.60e-6 * temperatureK ** 2;
}

const BRIDGE_CP_START = COLD_CP[COLD_INTERVALS]!;
const BRIDGE_CP_END = hotSpecificHeat(MATERIAL_REFERENCE_K);
const BRIDGE_K_START = logarithmicFit(BRIDGE_START_K, COLD_K_COEFFICIENTS);
const BRIDGE_K_END = hotConductivity(MATERIAL_REFERENCE_K);
const BRIDGE_ENERGY = BRIDGE_WIDTH_K * (BRIDGE_CP_START + BRIDGE_CP_END) / 2;
const COLD_ENERGY = COLD_INTEGRAL[COLD_INTERVALS]!;
const MIN_SPECIFIC_ENTHALPY = -COLD_ENERGY - BRIDGE_ENERGY;

function coldCellIndex(temperatureK: number): number {
  return Math.min(COLD_INTERVALS - 1,
    Math.floor((temperatureK - MATERIAL_MIN_K) / COLD_GRID_WIDTH_K));
}

function bridgeFraction(temperatureK: number): number {
  return (temperatureK - BRIDGE_START_K) / BRIDGE_WIDTH_K;
}

function smoothEndpointValue(start: number, end: number, fraction: number): number {
  return start + (end - start) * fraction ** 2 * (3 - 2 * fraction);
}

/** Specific heat in J/(kg·K); input temperature in K, without extrapolation. */
export function steelSpecificHeat(temperatureK: number): number {
  requireThermalTemperature(temperatureK);
  if (temperatureK >= MATERIAL_REFERENCE_K) return hotSpecificHeat(temperatureK);
  if (temperatureK >= BRIDGE_START_K) {
    return smoothEndpointValue(BRIDGE_CP_START, BRIDGE_CP_END, bridgeFraction(temperatureK));
  }
  const index = coldCellIndex(temperatureK);
  const fraction = (temperatureK - coldGridTemperature(index))
    / (coldGridTemperature(index + 1) - coldGridTemperature(index));
  return COLD_CP[index]! + fraction * (COLD_CP[index + 1]! - COLD_CP[index]!);
}

/** Thermal conductivity in W/(m·K); input temperature in K. */
export function steelConductivity(temperatureK: number): number {
  requireThermalTemperature(temperatureK);
  if (temperatureK >= MATERIAL_REFERENCE_K) return hotConductivity(temperatureK);
  if (temperatureK >= BRIDGE_START_K) {
    return smoothEndpointValue(BRIDGE_K_START, BRIDGE_K_END, bridgeFraction(temperatureK));
  }
  return logarithmicFit(temperatureK, COLD_K_COEFFICIENTS);
}

function enthalpyPrimitive(temperatureK: number): number {
  return 6.683 * temperatureK + 0.02453 * temperatureK ** 2
    + 80.74 * (temperatureK * Math.log(temperatureK) - temperatureK);
}

const REFERENCE_PRIMITIVE = enthalpyPrimitive(MATERIAL_REFERENCE_K);
const MAX_SPECIFIC_ENTHALPY = enthalpyPrimitive(MATERIAL_MAX_K) - REFERENCE_PRIMITIVE;

function specificEnthalpyUnchecked(temperatureK: number): number {
  if (temperatureK >= MATERIAL_REFERENCE_K) {
    return enthalpyPrimitive(temperatureK) - REFERENCE_PRIMITIVE;
  }
  if (temperatureK >= BRIDGE_START_K) {
    const fraction = bridgeFraction(temperatureK);
    return -BRIDGE_ENERGY + BRIDGE_WIDTH_K * (BRIDGE_CP_START * fraction
      + (BRIDGE_CP_END - BRIDGE_CP_START) * (fraction ** 3 - fraction ** 4 / 2));
  }
  const index = coldCellIndex(temperatureK);
  const delta = temperatureK - coldGridTemperature(index);
  const width = coldGridTemperature(index + 1) - coldGridTemperature(index);
  const slope = (COLD_CP[index + 1]! - COLD_CP[index]!) / width;
  return MIN_SPECIFIC_ENTHALPY + COLD_INTEGRAL[index]!
    + COLD_CP[index]! * delta + slope * delta ** 2 / 2;
}

/**
 * J/kg relative to293.15K, including negative cold energy. Exact hot primitive,
 * exact bridge integral, exact integral of the startup cold cp approximation.
 */
export function steelSpecificEnthalpy(temperatureK: number): number {
  requireThermalTemperature(temperatureK);
  return specificEnthalpyUnchecked(temperatureK);
}

/** The original inverse remains the fallback for every uncertified hint. */
function bisectedTemperature(specificEnthalpy:number):number {
  let lower=MATERIAL_MIN_K,upper=MATERIAL_MAX_K;
  for(let iteration=0;iteration<48;iteration++) {
    const middle=(lower+upper)/2;
    if(specificEnthalpyUnchecked(middle)<specificEnthalpy)lower=middle;
    else upper=middle;
  }
  return (lower+upper)/2;
}

/** These solves provide hints only, never temperature authority. The cold
 * implemented cp is linear per cell, so its energy inverse is quadratic. */
function temperatureHint(specificEnthalpy:number):number {
  if(specificEnthalpy < -BRIDGE_ENERGY) {
    let lower=0,upper=COLD_INTERVALS;
    while(upper-lower>1) {
      const middle=Math.floor((lower+upper)/2);
      if(MIN_SPECIFIC_ENTHALPY+COLD_INTEGRAL[middle]!<=specificEnthalpy)lower=middle;
      else upper=middle;
    }
    const width=coldGridTemperature(lower+1)-coldGridTemperature(lower);
    const cp=COLD_CP[lower]!;
    const slope=(COLD_CP[lower+1]!-cp)/width;
    const energy=specificEnthalpy-(MIN_SPECIFIC_ENTHALPY+COLD_INTEGRAL[lower]!);
    // Rationalized positive root avoids cancellation at near-zero energy.
    const delta=2*energy/(cp+Math.sqrt(cp*cp+2*slope*energy));
    return coldGridTemperature(lower)+delta;
  }
  let lower=specificEnthalpy<0?BRIDGE_START_K:MATERIAL_REFERENCE_K;
  let upper=specificEnthalpy<0?MATERIAL_REFERENCE_K:MATERIAL_MAX_K;
  const lowEnergy=specificEnthalpy<0?-BRIDGE_ENERGY:0;
  const highEnergy=specificEnthalpy<0?0:MAX_SPECIFIC_ENTHALPY;
  let temperature=lower+(upper-lower)*(specificEnthalpy-lowEnergy)/(highEnergy-lowEnergy);
  // A bounded safeguarded Newton hint; all capacity/enthalpy equations are
  // unchanged. No approximate hint can bypass the exact-cell certificate.
  for(let iteration=0;iteration<6;iteration++) {
    const energy=specificEnthalpyUnchecked(temperature);
    if(energy===specificEnthalpy)break;
    if(energy<specificEnthalpy)lower=temperature;else upper=temperature;
    const proposed=temperature-(energy-specificEnthalpy)/steelSpecificHeat(temperature);
    if(proposed===temperature)break;
    temperature=proposed>lower && proposed<upper?proposed:(lower+upper)/2;
  }
  return temperature;
}

/**
 * Inverts J/kg to K with the original48-bisection output, bit for bit.
 * An analytic/Newton hint selects a cell of the same floating midpoint tree
 * using48 cheap comparisons. Positive cp gives monotone energy, so checking
 * H(lower)<requested<=H(upper) certifies every ancestor branch and the exact
 * original result. Rounded cold-energy plateaus or inaccurate hints fall back
 * to the original solver. No new fit, convergence tolerance or energy clipping.
 */
export function steelTemperatureFromEnthalpy(specificEnthalpy: number): number {
  if (!Number.isFinite(specificEnthalpy)
    || specificEnthalpy < MIN_SPECIFIC_ENTHALPY || specificEnthalpy > MAX_SPECIFIC_ENTHALPY) {
    throw new RangeError('304 specific enthalpy is outside the thermal fit domain');
  }
  if (specificEnthalpy === 0) return MATERIAL_REFERENCE_K;
  if (specificEnthalpy === MIN_SPECIFIC_ENTHALPY) return MATERIAL_MIN_K;
  if (specificEnthalpy === MAX_SPECIFIC_ENTHALPY) return MATERIAL_MAX_K;
  const hint=temperatureHint(specificEnthalpy);
  let lower=MATERIAL_MIN_K,upper=MATERIAL_MAX_K;
  let ancestorLower=lower,ancestorUpper=upper;
  for(let iteration=0;iteration<48;iteration++) {
    const middle=(lower+upper)/2;
    if(middle<hint)lower=middle;else upper=middle;
    if(iteration===39) { ancestorLower=lower;ancestorUpper=upper; }
  }
  if(specificEnthalpyUnchecked(lower)<specificEnthalpy
    && specificEnthalpyUnchecked(upper)>=specificEnthalpy)return (lower+upper)/2;
  // A slightly inaccurate hint can still certify the original depth40 cell.
  // Resume the original comparisons from its actual floating-point bounds;
  // neither reconstructing the bounds nor accepting the hint changes authority.
  if(specificEnthalpyUnchecked(ancestorLower)<specificEnthalpy
    && specificEnthalpyUnchecked(ancestorUpper)>=specificEnthalpy) {
    lower=ancestorLower;upper=ancestorUpper;
    for(let iteration=40;iteration<48;iteration++) {
      const middle=(lower+upper)/2;
      if(specificEnthalpyUnchecked(middle)<specificEnthalpy)lower=middle;
      else upper=middle;
    }
    return (lower+upper)/2;
  }
  return bisectedTemperature(specificEnthalpy);
}

// TemperatureK, elastic modulusPa, 0.2% proof stressPa. Immutable startup data.
const MECHANICAL_KNOTS = [
  [373.15, 187210e6, 223e6], [473.15, 176314e6, 190e6],
  [573.15, 169642e6, 180e6], [673.15, 159526e6, 172e6],
  [773.15, 146800e6, 153e6], [873.15, 137390e6, 136e6],
  [973.15, 125450e6, 112e6], [1073.15, 108080e6, 62e6],
  [1173.15, 67550e6, 35e6],
] as const;

function mechanicalProperty(temperatureK: number, column: 1 | 2): number {
  if (!Number.isFinite(temperatureK) || temperatureK <= 0) {
    throw new RangeError('304 mechanical temperature must be finite and positiveK');
  }
  // Conservative availability policy outside measured data, not melting/fracture.
  if (temperatureK > 1173.15) return 0;
  let previousTemperature = 373.15;
  let previousValue: number = MECHANICAL_KNOTS[0][column];
  if (temperatureK <= previousTemperature) return previousValue;
  for (const knot of MECHANICAL_KNOTS) {
    if (temperatureK <= knot[0]) {
      const fraction = (temperatureK - previousTemperature) / (knot[0] - previousTemperature);
      return previousValue + fraction * (knot[column] - previousValue);
    }
    previousTemperature = knot[0];
    previousValue = knot[column];
  }
  return 0;
}

/**
 * Elastic modulusPa, linearly interpolated between published knots. Below100°C
 * hold187.210GPa as a conservative authored baseline; above900°C return zero
 * available stiffness because data end there, not because steel has melted.
 */
export function steelElasticModulus(temperatureK: number): number {
  return mechanicalProperty(temperatureK, 1);
}

/**
 * 0.2% proof stressPa; below100°C hold223MPa, above900°C zero availability.
 * The paper separately states250MPa at20°C; this intentionally conservative
 * baseline avoids inventing a matching room-temperature modulus or data blend.
 */
export function steelProofStrength(temperatureK: number): number {
  return mechanicalProperty(temperatureK, 2);
}

/**
 * Signed heat energyJ from nodeA toB over dt seconds, with conductanceW/K.
 * Apply-Q toA's stored energy and+Q toB's: energy is conserved exactly by the
 * update. Bound Fourier's requested energy at the nonlinear enthalpy equilibrium
 * so even a stiff/large step cannot exchange heat past equilibrium. This is a
 * bounded explicit exchange, not an exact transient conduction solution.
 * Temperatures must remain in the declared thermal domain; no energy clipping.
 */
export function conservativeHeatTransfer(
  temperatureA: number, massA: number, temperatureB: number, massB: number,
  conductanceWPerK: number, dt: number,
): number {
  requireThermalTemperature(temperatureA);
  requireThermalTemperature(temperatureB);
  if (!Number.isFinite(massA) || massA <= 0 || !Number.isFinite(massB) || massB <= 0
    || !Number.isFinite(conductanceWPerK) || conductanceWPerK < 0
    || !Number.isFinite(dt) || dt < 0) {
    throw new RangeError('Heat transfer requires positive masses and nonnegative finite conductance/dt');
  }
  if (temperatureA === temperatureB || conductanceWPerK === 0 || dt === 0) return 0;
  const enthalpyA = specificEnthalpyUnchecked(temperatureA);
  const enthalpyB = specificEnthalpyUnchecked(temperatureB);
  // Equivalent to ma*(ha-heq), avoiding subtraction of similar total energies.
  const equilibriumEnergy = massA / (massA + massB) * massB * (enthalpyA - enthalpyB);
  const requestedEnergy = conductanceWPerK * (temperatureA - temperatureB) * dt;
  return equilibriumEnergy > 0
    ? Math.min(requestedEnergy, equilibriumEnergy)
    : Math.max(requestedEnergy, equilibriumEnergy);
}
