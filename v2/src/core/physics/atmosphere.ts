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
 * Upper stratosphere, 25 km and above. M2.1 — Bug-fix tier.
 *
 * TWO DEFECTS were fixed here, and they had to be fixed together.
 *
 * The function was defined in 2021 and never called: `updateAtmosphere`
 * branched only on `altitude < 11000`, so everything above 11 km used the
 * lower-stratosphere isotherm — including the whole re-entry regime this
 * simulator exists to model. At 80 km that understated density about fivefold,
 * and the vehicle fell through 25-80 km with far too little to push against.
 *
 * The formula was also mistranscribed. It read `-131.21 + 0.0299 * altitude`
 * where the NASA Earth Atmosphere Model it comes from has **0.00299** — a
 * factor of ten. The evidence is continuity: the layers are built to meet, and
 * at exactly 25 km the correct coefficient yields -56.46 C, the lower
 * stratosphere's isotherm, to the digit. The 2021 coefficient yields +616 C and
 * a density of 1e-9 kg/m^3, which is vacuum.
 *
 * Wiring the branch in without correcting the coefficient would have made the
 * atmosphere far worse than leaving it unreachable, which is why this is one
 * change and not two.
 */
export function upperStrato(altitude: number): Atmosphere {
  const airTemperature = -131.21 + 0.00299 * altitude;
  const airPressure = 2.488 * ((airTemperature + 273.1) / 216.6) ** -11.388;
  return { airTemperature, airPressure, airDensity: getDensity(airPressure, airTemperature) };
}

/** The model's own layer boundaries, in metres. */
export const TROPOPAUSE_ALTITUDE = 11_000;
export const STRATOPAUSE_ALTITUDE = 25_000;

/**
 * physics.js:6 — the dispatcher, now with all three branches live.
 * @param altitude m
 */
export function updateAtmosphere(altitude: number): Atmosphere {
  if (altitude < TROPOPAUSE_ALTITUDE) {
    return tropo(altitude);
  }
  if (altitude < STRATOPAUSE_ALTITUDE) {
    return lowerStrato(altitude);
  }
  return upperStrato(altitude);
}
