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

/** m/s^2 — the ISA's defined standard gravity. Part of the standard, not a measurement. */
export const G0 = 9.80665;

/** J/(kg*K) — specific gas constant for dry air. */
export const R = 287.053;

/** Sea-level reference conditions, from the standard. */
export const T0_KELVIN = 288.15;
/** Pa. */
export const P0_PASCAL = 101_325;

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

/**
 * The ISA at a geometric altitude.
 *
 * Returns the same shape as the three-layer model, in the same units — degrees
 * Celsius and kPa — so it is a drop-in alternative behind the flag.
 *
 * @param altitude m, geometric
 */
export function isaAtmosphere(altitude: number): Atmosphere {
  // Clamped at both ends. Below sea level the standard is not defined; above
  // 84.852 km geopotential the mesopause layer would keep cooling toward
  // absolute zero, which is worse than holding the top of the table.
  const geopotential = Math.min(
    Math.max(geopotentialAltitude(altitude), 0),
    ISA_TOP_GEOPOTENTIAL,
  );

  const layer = layerFor(geopotential);
  const dh = geopotential - layer.baseAltitude;
  const temperatureKelvin = layer.baseTemperature + layer.lapseRate * dh;
  const pressurePascal = pressureInLayer(
    layer.basePressure,
    layer.baseTemperature,
    layer.lapseRate,
    dh,
  );

  return {
    airTemperature: temperatureKelvin - 273.15,
    // kPa, matching the rest of the model.
    airPressure: pressurePascal / 1000,
    airDensity: pressurePascal / (R * temperatureKelvin),
  };
}
