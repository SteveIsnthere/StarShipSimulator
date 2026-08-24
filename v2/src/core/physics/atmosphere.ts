/**
 * Atmosphere model, ported verbatim from backend/physics.js:6-31.
 *
 * A two-branch barometric model: troposphere below 11 km, lower stratosphere
 * above. Pressure in kPa, temperature in Celsius, density from the ideal gas
 * law with R_specific folded into 0.2869.
 */

export interface Atmosphere {
  /** deg C */
  airTemperature: number;
  /** kPa */
  airPressure: number;
  /** kg/m^3 */
  airDensity: number;
}

/** physics.js:27 — `airPressure / (0.2869 * (airTemperature + 273.1))`. */
function getDensity(airPressure: number, airTemperature: number): number {
  return airPressure / (0.2869 * (airTemperature + 273.1));
}

/** physics.js:23 — below 11 km. */
function tropo(altitude: number): Atmosphere {
  const airTemperature = 15.04 - 0.00649 * altitude;
  const airPressure = 101.29 * ((airTemperature + 273.1) / 288.08) ** 5.256;
  return { airTemperature, airPressure, airDensity: getDensity(airPressure, airTemperature) };
}

/** physics.js:18 — 11 km and above, in the 2021 model. */
function lowerStrato(altitude: number): Atmosphere {
  const airTemperature = -56.46;
  const airPressure = 22.65 * Math.E ** (1.73 - 0.000157 * altitude);
  return { airTemperature, airPressure, airDensity: getDensity(airPressure, airTemperature) };
}

/**
 * physics.js:13 — defined in 2021 and never called.
 *
 * `updateAtmosphere` branches only on `altitude < 11000`, so everything above
 * 11 km uses the lower-stratosphere isotherm, including the entire re-entry
 * regime this model exists to simulate. Ported dead, exactly as found, so the
 * goldens in M1.8 capture the behaviour the game actually had. M2.1 wires it in
 * as a declared Bug fix with a before/after trajectory diff.
 */
export function upperStrato(altitude: number): Atmosphere {
  const airTemperature = -131.21 + 0.0299 * altitude;
  const airPressure = 2.488 * ((airTemperature + 273.1) / 216.6) ** -11.388;
  return { airTemperature, airPressure, airDensity: getDensity(airPressure, airTemperature) };
}

/**
 * physics.js:6 — the dispatcher, with its two live branches.
 * @param altitude m
 */
export function updateAtmosphere(altitude: number): Atmosphere {
  if (altitude < 11000) {
    return tropo(altitude);
  }
  return lowerStrato(altitude);
}
