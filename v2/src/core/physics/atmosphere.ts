/**
 * Atmosphere model, ported verbatim from backend/physics.js:6-31.
 *
 * A two-branch barometric model: troposphere below 11 km, lower stratosphere
 * above. Pressure in kPa, temperature in Celsius, density from the ideal gas
 * law with R_specific folded into 0.2869.
 */

import { isaAtmosphere } from './isa';

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
export function updateAtmosphere(altitude: number, fullISA = false): Atmosphere {
  if (fullISA) return isaAtmosphere(altitude);
  if (altitude < TROPOPAUSE_ALTITUDE) {
    return tropo(altitude);
  }
  if (altitude < STRATOPAUSE_ALTITUDE) {
    return lowerStrato(altitude);
  }
  return upperStrato(altitude);
}

// ---------------------------------------------------------------------------
// Speed of sound — M2.7, Fidelity
// ---------------------------------------------------------------------------

/** Ratio of specific heats for air, dimensionless. */
export const GAMMA_AIR = 1.4;

/** Specific gas constant for dry air, J/(kg*K). */
export const R_SPECIFIC_AIR = 287.053;

/**
 * Speed of sound from local temperature: a = sqrt(gamma * R * T).
 *
 * The 2021 model used a constant 343 m/s at every altitude, which is the sea
 * level value on a warm day. Sound travels more slowly in colder air, and the
 * atmosphere gets cold fast: at 11 km it is about 295 m/s, so Mach number ran
 * roughly 16% low through the whole upper atmosphere.
 *
 * That is not a cosmetic readout. `getBodyDragCoefficient` is a function of
 * Mach — `machSpeed * 0.1347 + 1.153`, capped at 2.5 from Mach 10 — so an
 * understated Mach understated drag through the entire transonic and
 * supersonic regime, which is most of a re-entry.
 *
 * @param airTemperature deg C, as the rest of the atmosphere model uses
 * @returns m/s
 */
export function speedOfSoundAt(airTemperature: number): number {
  return Math.sqrt(GAMMA_AIR * R_SPECIFIC_AIR * (airTemperature + 273.15));
}
