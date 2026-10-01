/**
 * The International Standard Atmosphere, to 86 km. M2.8, Fidelity tier.
 *
 * The three-layer NASA model (as repaired in M2.1) is a teaching simplification
 * of this. It is good to about 25 km and increasingly approximate above: it has
 * no mesosphere at all, so it warms monotonically past the stratopause, and by
 * 86 km it is extrapolating a formula whose stated range ended long before.
 *
 * The ISA is the actual standard — ISO 2533, and the US Standard Atmosphere
 * 1976 below 86 km — defined as seven layers, each with a constant temperature
 * lapse rate. Pressure follows from hydrostatic equilibrium: the barometric
 * formula within a lapsing layer, the exponential form within an isothermal one.
 *
 * Two conventions matter and are handled explicitly:
 *
 *   GEOPOTENTIAL ALTITUDE. The ISA is tabulated against geopotential altitude
 *   H, not geometric altitude h. They differ because gravity weakens with
 *   height: H = r*h / (r + h). At 86 km geometric that is 84.9 km
 *   geopotential — a 1.3% difference, which matters at the top of the table
 *   where density is changing by a factor of e every few kilometres.
 *
 *   TEMPERATURE IN KELVIN. The rest of this codebase carries air temperature in
 *   degrees Celsius because the 2021 model did. The conversion happens at the
 *   boundary of this module, once.
 */
import * as C from '../constants';
import type { Atmosphere } from './atmosphere';

/**
 * m/s^2 — the ISA's defined standard gravity. Part of the standard, not a
 * measurement. Since M11.2 the one definition lives in constants.ts, because
 * specific impulse is defined against the same g0; this is that value.
 */
export const G0 = C.standardGravity;

/** J/(kg*K) — specific gas constant for dry air. */
export const R = 287.053;

/** Sea-level reference conditions, from the standard. */
export const T0_KELVIN = 288.15;
/** Pa — likewise one definition, shared with the Raptor thrust anchors. */
export const P0_PASCAL = C.SEA_LEVEL_PRESSURE_PA;

interface Layer {
  /** Geopotential altitude of the layer base, m. */
  readonly baseAltitude: number;
  /** Temperature at the base, K. */
  readonly baseTemperature: number;
  /** Pressure at the base, Pa. */
  readonly basePressure: number;
  /** Lapse rate, K/m. Negative means cooling with height; 0 is isothermal. */
  readonly lapseRate: number;
}

/**
 * The seven layers, built by integrating upward from sea level.
 *
 * Base pressures are computed rather than tabulated so that the layers join
 * exactly by construction: a transcribed table can disagree with its own
 * formulas in the last digits, and a discontinuity in density is visible as a
 * jolt in the simulation.
 */
function buildLayers(): readonly Layer[] {
  /** Base geopotential altitude (m) and lapse rate (K/m) for each layer. */
  const spec: ReadonlyArray<readonly [number, number]> = [
    [0, -0.0065], // troposphere
    [11_000, 0.0], // tropopause
    [20_000, 0.001], // lower stratosphere
    [32_000, 0.0028], // upper stratosphere
    [47_000, 0.0], // stratopause
    [51_000, -0.0028], // lower mesosphere
    [71_000, -0.002], // upper mesosphere, to 84.852 km
  ];

  const layers: Layer[] = [];
  let baseTemperature = T0_KELVIN;
  let basePressure = P0_PASCAL;

  for (let i = 0; i < spec.length; i++) {
    const [baseAltitude, lapseRate] = spec[i]!;
    layers.push({ baseAltitude, baseTemperature, basePressure, lapseRate });

    const next = spec[i + 1];
    if (!next) break;
    const thickness = next[0] - baseAltitude;
    const topTemperature = baseTemperature + lapseRate * thickness;
    basePressure = pressureInLayer(basePressure, baseTemperature, lapseRate, thickness);
    baseTemperature = topTemperature;
  }
  return layers;
}

/**
 * Pressure a height `dh` above a layer base, from hydrostatic equilibrium.
 *
 * Two forms, because the lapsing one divides by the lapse rate: the barometric
 * power law where temperature changes with height, and the exponential where it
 * does not.
 */
function pressureInLayer(
  basePressure: number,
  baseTemperature: number,
  lapseRate: number,
  dh: number,
): number {
  if (lapseRate === 0) {
    return basePressure * Math.exp((-G0 * dh) / (R * baseTemperature));
  }
  const temperature = baseTemperature + lapseRate * dh;
  return basePressure * (temperature / baseTemperature) ** (-G0 / (R * lapseRate));
}

const LAYERS = buildLayers();

/** Top of the model, in geopotential metres. Above this it is extrapolation. */
export const ISA_TOP_GEOPOTENTIAL = 84_852;

/**
 * Geometric altitude to geopotential altitude.
 *
 * H = r*h / (r + h). Uses the simulation's own planet radius rather than
 * Earth's, so the two models describe the same planet.
 */
export function geopotentialAltitude(geometricAltitude: number): number {
  return (C.planetRadius * geometricAltitude) / (C.planetRadius + geometricAltitude);
}

/** The layer containing a given geopotential altitude. */
function layerFor(geopotential: number): Layer {
  let found = LAYERS[0]!;
  for (const layer of LAYERS) {
    if (geopotential >= layer.baseAltitude) found = layer;
    else break;
  }
  return found;
}

// ---------------------------------------------------------------------------
// The thermosphere — M2.14, Fidelity
// ---------------------------------------------------------------------------

/** m — geometric altitude at which the lapse-rate table ends and the bands begin. */
export const THERMOSPHERE_BASE = 86_000;

/**
 * Scale heights for the standard piecewise-exponential atmosphere, by band base.
 *
 * `[geometric altitude m, scale height m]`, transcribed from the published
 * exponential-atmosphere table that is itself fitted to the standard atmosphere
 * — the model every orbital-drag calculation uses above the ISA's ceiling.
 *
 * The scale heights are transcribed; the base DENSITIES are not. They are
 * chained upward from whatever the ISA itself gives at 86 km, for the same
 * reason `buildLayers` computes its base pressures rather than tabulating them:
 * a transcribed table can disagree with its own formulas in the last digits,
 * and a discontinuity in density is a jolt the vehicle can feel. Anchoring to
 * the ISA also means the two halves of the model join by construction rather
 * than by luck.
 *
 * The first band's 5.44 km is not from the table — it is derived, as the scale
 * height that carries the ISA's 86 km density to the table's own 100 km value.
 * It is what stitches the two together.
 */
const THERMOSPHERE_BANDS: ReadonlyArray<readonly [number, number]> = [
  [86_000, 5_440],
  [100_000, 5_877],
  [110_000, 7_263],
  [120_000, 9_473],
  [130_000, 12_636],
  [140_000, 16_149],
  [150_000, 22_523],
  [180_000, 29_740],
  [200_000, 37_105],
  [250_000, 45_546],
  [300_000, 53_628],
  [350_000, 53_298],
  [400_000, 58_515],
  [450_000, 60_828],
  [500_000, 63_822],
  [600_000, 71_835],
  [700_000, 88_667],
  [800_000, 124_640],
  [900_000, 181_050],
  [1_000_000, 268_000],
];

/** K — exospheric temperature the thermosphere warms toward. */
const T_EXOSPHERE = 1000;

/**
 * The bands with their base densities filled in by chaining upward.
 *
 * Built once. The base density of the first band is the ISA's own value at
 * 86 km, so `isaAtmosphere` is continuous across the seam to the last bit.
 */
const THERMOSPHERE = (() => {
  const bands: { base: number; density: number; scaleHeight: number }[] = [];
  let density = tableDensityAt(THERMOSPHERE_BASE);
  for (let i = 0; i < THERMOSPHERE_BANDS.length; i++) {
    const [base, scaleHeight] = THERMOSPHERE_BANDS[i]!;
    bands.push({ base, density, scaleHeight });
    const next = THERMOSPHERE_BANDS[i + 1];
    if (next) density *= Math.exp(-(next[0] - base) / scaleHeight);
  }
  return bands;
})();

/** Density from the lapse-rate table alone, at a geometric altitude. */
function tableDensityAt(altitude: number): number {
  const { pressurePascal, temperatureKelvin } = tableStateAt(altitude);
  return pressurePascal / (R * temperatureKelvin);
}

/** Pressure and temperature from the lapse-rate table, clamped at its ceiling. */
function tableStateAt(altitude: number): { pressurePascal: number; temperatureKelvin: number } {
  const geopotential = Math.max(geopotentialAltitude(altitude), 0);
  const withinTable = Math.min(geopotential, ISA_TOP_GEOPOTENTIAL);
  const layer = layerFor(withinTable);
  const dh = withinTable - layer.baseAltitude;
  return {
    temperatureKelvin: layer.baseTemperature + layer.lapseRate * dh,
    pressurePascal: pressureInLayer(layer.basePressure, layer.baseTemperature, layer.lapseRate, dh),
  };
}

/**
 * The ISA at a geometric altitude, with a thermosphere above it.
 *
 * Returns the same shape as the three-layer model, in the same units — degrees
 * Celsius and kPa — so it was a drop-in replacement for the model it took over
 * from at M2.10.
 *
 * ABOVE 86 km the lapse-rate table has run out, and what replaces it decides
 * whether orbits are real. Two earlier answers and why they were not enough:
 *
 *   A HARD CLAMP holds the 86 km density everywhere above, leaving
 *   6.96e-6 kg/m^3 at 100 km where the standard has 5.6e-7 — twelve times too
 *   dense. At orbital speed that is a thermal load of 109 units against one of
 *   31, so a 100 km orbit destroyed the vehicle on the first step. That is a
 *   property of the clamp, not of orbits.
 *
 *   AN ISOTHERMAL CONTINUATION at the mesopause temperature fixes 100 km — it
 *   gives 5.8e-7, within 4% — and then fails upward, because it holds the
 *   mesopause's 5.6 km scale height forever while the real thermosphere warms
 *   toward ~1000 K and its scale height grows past 50 km. Measured against the
 *   standard atmosphere: 0.76x at 120 km, 0.042x at 150 km, 6e-5 at 200 km, and
 *   3.6e-11 at 300 km. Above about 130 km it is not a thin atmosphere, it is a
 *   vacuum — and an orbit in a vacuum never decays.
 *
 * SO ABOVE 86 km THIS IS THE PIECEWISE-EXPONENTIAL MODEL, anchored to the ISA's
 * own density at the seam. Measured against the standard atmosphere it is
 * within 5% at 100 km, 0.4% at 110, 10% at 120, 0.2% at 150, 10% at 200, and a
 * factor of 1.26 at 300 — the residual being the coarseness of the band
 * structure, not a model error. Compared with five to ten orders of magnitude,
 * that is the difference between an orbit that decays and one that cannot.
 *
 * TEMPERATURE up there follows the standard's shape rather than its arithmetic:
 * it warms asymptotically from the mesopause toward an exospheric 1000 K. It is
 * carried because the Mach number reads it; at these densities nothing else
 * depends on it, and pressure is recovered from the ideal gas law so the three
 * returned quantities stay mutually consistent.
 *
 * @param altitude m, geometric
 */
export function isaAtmosphere(altitude: number): Atmosphere {
  if (altitude <= THERMOSPHERE_BASE) {
    const { pressurePascal, temperatureKelvin } = tableStateAt(altitude);
    return {
      airTemperature: temperatureKelvin - 273.15,
      airPressure: pressurePascal / 1000,
      airDensity: pressurePascal / (R * temperatureKelvin),
    };
  }

  let band = THERMOSPHERE[0]!;
  for (const candidate of THERMOSPHERE) {
    if (altitude >= candidate.base) band = candidate;
    else break;
  }
  const airDensity = band.density * Math.exp(-(altitude - band.base) / band.scaleHeight);

  // Warms from the mesopause toward the exosphere over a ~100 km e-folding —
  // the standard's shape, which is what the Mach number needs it for.
  const mesopause = tableStateAt(THERMOSPHERE_BASE).temperatureKelvin;
  const temperatureKelvin =
    T_EXOSPHERE - (T_EXOSPHERE - mesopause) * Math.exp(-(altitude - THERMOSPHERE_BASE) / 100_000);

  return {
    airTemperature: temperatureKelvin - 273.15,
    airPressure: (airDensity * R * temperatureKelvin) / 1000,
    airDensity,
  };
}
