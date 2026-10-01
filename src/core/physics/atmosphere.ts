/**
 * Atmosphere model.
 *
 * TWO MODELS LIVE HERE, and which one is the atmosphere changed at M2.10.
 *
 * `updateAtmosphere` — what the simulation flies through — is now the full ISA
 * (core/physics/isa.ts): seven lapse-rate layers to 86 km with an isothermal
 * continuation above. `legacyAtmosphere` is the 2021 three-branch barometric
 * model, ported verbatim from backend/physics.js:6-31 and repaired at M2.1,
 * kept because the parity suite compares against it and because the size of
 * the departure is worth being able to measure rather than assert.
 *
 * Pressure in kPa, temperature in Celsius, density from the ideal gas law with
 * R_specific folded into 0.2869 — the 2021 units, which the ISA module also
 * returns, so the two are directly comparable.
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

/**
 * The atmosphere the vehicle flies through. M2.10, Fidelity tier.
 *
 * The US Standard Atmosphere 1976, in full. The three-layer model above stops
 * being meaningful at the stratopause and had to be extrapolated past 86 km;
 * this one has a mesosphere, which is most of what a re-entry passes through.
 *
 * @param altitude m
 */
export function updateAtmosphere(altitude: number): Atmosphere {
  return isaAtmosphere(altitude);
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
