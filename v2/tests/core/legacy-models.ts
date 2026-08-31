/**
 * The 2021 physical models, as v2 ports of them. Reference material for tests.
 *
 * MOVED HERE FROM `src/core/` AT M10.9, Refactor tier. These functions were
 * written during the port so that v2's departures from the 2021 model could be
 * stated numerically rather than asserted, and until M10.2 the parity suite was
 * their main consumer. Nothing in the simulation has called any of them since
 * M2.10 — `updateAtmosphere` is the ISA, and gravity is planet-centred.
 *
 * WHY THEY MOVED RATHER THAN BEING DELETED. `docs/VERIFICATION-PLAN.md` listed
 * them as parity-orphaned exports to remove. That was wrong on the facts: they
 * have live consumers in `tests/core/atmosphere-strato.test.ts` and
 * `tests/core/orbit.test.ts`, which are NOT parity tests — they never execute
 * the 2021 tree. They assert v2's own bug fixes and departures, and deleting
 * these functions would have silently destroyed those assertions.
 *
 * WHY THEY MOVED AT ALL. They are dead in production, and dead code in the
 * protected zone is not free:
 *
 *   - it ships. `core/` is bundled.
 *   - it FLATTERED THE COVERAGE NUMBER. Every line here was counted as covered
 *     `src/core/**` — by tests that exist only to exercise it. Roughly 20 lines
 *     of always-covered dead code sat in the denominator making the real code
 *     look better tested than it was.
 *
 * They are ported verbatim, including `0.2869` standing in for R and the
 * `273.1` that should be 273.15 — those are the 2021 model's own arithmetic and
 * changing them here would make this a worse record of it.
 *
 * DO NOT import this from `src/`. It is test-tree reference material, and the
 * lint walls do not police an import in that direction because nothing should
 * ever attempt one.
 */
import * as C from '$core/constants';
import type { Atmosphere } from '$core/physics/atmosphere';

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

/** The 2021 model's own layer boundaries, in metres. */
export const TROPOPAUSE_ALTITUDE = 11_000;
export const STRATOPAUSE_ALTITUDE = 25_000;

/**
 * physics.js:6 — the 2021 dispatcher, with all three branches live (M2.1).
 *
 * Not what the simulation flies through: M2.10 made the ISA the only
 * atmosphere. Retained because "the shipped model departs from 2021 here" is a
 * claim worth being able to evaluate numerically rather than assert.
 *
 * @param altitude m
 */
export function legacyAtmosphere(altitude: number): Atmosphere {
  if (altitude < TROPOPAUSE_ALTITUDE) {
    return tropo(altitude);
  }
  if (altitude < STRATOPAUSE_ALTITUDE) {
    return lowerStrato(altitude);
  }
  return upperStrato(altitude);
}

/**
 * The 2021 orbital-gravity relief term. Nothing has called it since M2.10.
 *
 * Kept so `tests/core/orbit.test.ts` can show what planet-centred gravity
 * replaced: a linear approximation to a quadratic effect, divided by an orbital
 * velocity fixed at spawn, and clamped so that net vertical acceleration could
 * never be positive — which is why a stable orbit was structurally impossible
 * in that model rather than merely inaccurate.
 *
 * @param speedX m/s downrange
 * @param orbitalVelocityAtCurrentAltitude m/s — in 2021, the value fixed at spawn
 * @returns m/s^2, clamped to at most `gravity`
 */
export function legacyOrbitRelief(
  speedX: number,
  orbitalVelocityAtCurrentAltitude: number,
): number {
  const relief = (C.gravity * Math.abs(speedX)) / orbitalVelocityAtCurrentAltitude;
  return relief >= C.gravity ? C.gravity : relief;
}
