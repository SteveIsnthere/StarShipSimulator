/** Conservative pair exchange for finite nodes of DIFFERENT materials.
 * Energy is J, mass kg, temperatures K, conductance W/K, time seconds.
 * A bounded pair exchange is not a complete thermal-network integrator:
 * simultaneous links/radiation still require stability and dt convergence.
 */
export interface ThermalMaterial {
  readonly minKelvin: number;
  readonly maxKelvin: number;
  /** J/kg, monotone with positive heat capacity on the declared domain. */
  readonly enthalpy: (temperature: number) => number;
}

export function interfaceHeatTransfer(
  temperatureA: number, massA: number, materialA: ThermalMaterial,
  temperatureB: number, massB: number, materialB: ThermalMaterial,
  conductance: number, dt: number,
): number {
  if (!(massA > 0 && massB > 0 && temperatureA > 0 && temperatureB > 0)
    || conductance < 0 || dt < 0
    || !Number.isFinite(massA + massB + temperatureA + temperatureB + conductance + dt)) {
    throw new RangeError('Finite positive nodes and nonnegative conductance/time required');
  }
  if (temperatureA === temperatureB || conductance === 0 || dt === 0) return 0;
  const enthalpyA = materialA.enthalpy, enthalpyB = materialB.enthalpy;
  const energyA = massA * enthalpyA(temperatureA);
  const energyB = massB * enthalpyB(temperatureB);
  const total = energyA + energyB;
  let lower = Math.max(Math.min(temperatureA, temperatureB), materialA.minKelvin, materialB.minKelvin);
  let upper = Math.min(Math.max(temperatureA, temperatureB), materialA.maxKelvin, materialB.maxKelvin);
  const requested = conductance * (temperatureA - temperatureB) * dt;
  // An outer silica cell may exceed the steel source's maximum while their
  // finite-mass equilibrium is still inside both domains. Never evaluate a
  // material outside its table merely to bracket that equilibrium.
  if (lower > upper) throw new RangeError('Material equilibrium has no common source domain');
  const lowEnergy = massA * enthalpyA(lower) + massB * enthalpyB(lower);
  const highEnergy = massA * enthalpyA(upper) + massB * enthalpyB(upper);
  if (total < lowEnergy || total > highEnergy) {
    // Equilibrium itself is outside the common source domain. No equilibrium
    // cap is justified there. The network must retain these requested joules
    // and report any resulting per-node domain exit before inversion.
    return requested;
  }
  // Positive source heat capacities make this energy root unique. Both laws
  // must cover the common bracket; their own domain checks reject otherwise.
  for (let iteration = 0; iteration < 48; iteration++) {
    const middle = (lower + upper) / 2;
    if (massA * enthalpyA(middle) + massB * enthalpyB(middle) < total) lower = middle;
    else upper = middle;
  }
  const equilibriumTransfer = energyA - massA * enthalpyA((lower + upper) / 2);
  return temperatureA > temperatureB
    ? Math.min(requested, Math.max(0, equilibriumTransfer))
    : Math.max(requested, Math.min(0, equilibriumTransfer));
}
