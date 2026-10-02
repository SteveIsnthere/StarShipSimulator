/** Scheduled unpowered entry, using exactly the forces the fall predictor shares with step(). */
import * as C from '../constants';
import { entryPitchOffset } from '../autopilot/entry';
import { speedOfSoundAt } from '../physics/atmosphere';
import { isaAtmosphereInto } from '../physics/isa';
import { meanWindAt } from '../physics/wind';
import { getReentryHeatPower, radiativeSinkKelvin, surfaceTemperature } from '../physics/thermal';
import type { SimState } from '../state';
import { rad, type Rad } from '../units';
import { fallAcceleration, type BurnScratch, type FallResult } from './guidance-physics';

export interface EntryPrediction extends FallResult {
  /** K — maximum radiative-equilibrium skin temperature on the forecast. */
  peakKelvin: number;
}

export function createEntryPrediction(): EntryPrediction {
  return { reached: false, time: Number.NaN, downRange: 0, peakKelvin: 0 };
}

function scheduledAcceleration(
  h: number, vx: number, vy: number, mass: number, area: number,
  referenceWind: number, entryAngle: Rad, pitchBias: Rad, scratch: BurnScratch,
): number {
  isaAtmosphereInto(Math.max(h, 0), scratch.atmosphere);
  const speed = Math.hypot(vx - meanWindAt(referenceWind, h), vy);
  const mach = speed / speedOfSoundAt(scratch.atmosphere.airTemperature);
  const pitch = Math.atan2(vx, vy) - Math.PI / 2 + entryPitchOffset(mach, vx, entryAngle) + pitchBias;
  fallAcceleration(h, vx, vy, pitch, mass, area, referenceWind, scratch);
  return surfaceTemperature(
    getReentryHeatPower(speed, scratch.atmosphere.airDensity, C.NOSE_RADIUS, scratch.inputs.angleOfAttack),
    radiativeSinkKelvin(h, scratch.atmosphere.airTemperature),
  );
}

/**
 * Signed displacement to 1 km under the entry schedule, not a flightworthiness
 * claim. Midpoint integration includes the planned dump to the landing reserve;
 * fins keep their current presented planform. Attitude lag, gusts and the powered
 * flip/landing are excluded, so guidance repeats the prediction as the flight
 * proceeds. The optional measured pitch tracking bias stays fixed over a
 * forecast; it changes the prediction, never the requested pitch. 2500 s cap covers the slowest measured sweep without accepting an
 * orbital start as a touchdown. Caller owns and reuses all scratch buffers.
 */
export function predictEntryRangeInto(
  state: SimState, entryAngle: Rad, scratch: BurnScratch, out: EntryPrediction,
  stepSeconds = 0.5, pitchBias: Rad = rad(0),
): void {
  let h = state.kinematics.altitude;
  let vx = state.kinematics.speedX, vy = state.kinematics.speedY, x = 0;
  let mass = state.vehicle.vehicleMass;
  const floorMass = C.vehicleDryMass + C.landingReserve;
  const dumping = state.status.dumpingFuel;
  const half = stepSeconds * 0.5;
  const area = state.vehicle.vehicleInFlightMaxArea;
  const wind = state.world.wind;
  out.peakKelvin = 0;
  out.reached = h <= 1000;
  out.time = out.reached ? 0 : Number.NaN;
  out.downRange = 0;
  if (out.reached) return;
  for (let n = 0; n < Math.round(2500 / stepSeconds); n++) {
    const incomingKelvin = scheduledAcceleration(h, vx, vy, mass, area, wind, entryAngle, pitchBias, scratch);
    const mx = vx + scratch.acc.x * half, my = vy + scratch.acc.y * half;
    const midMass = dumping ? Math.max(floorMass, mass - C.dumpRate * half) : mass;
    const midpointKelvin = scheduledAcceleration(h + vy * half, mx, my, midMass, area, wind, entryAngle, pitchBias, scratch);
    out.peakKelvin = Math.max(out.peakKelvin, incomingKelvin, midpointKelvin);
    const nx = vx + scratch.acc.x * stepSeconds, ny = vy + scratch.acc.y * stepSeconds;
    const nh = h + my * stepSeconds, nextX = x + mx * stepSeconds;
    if (nh <= 1000) {
      const fraction = (h - 1000) / (h - nh);
      out.reached = true;
      out.time = (n + fraction) * stepSeconds;
      out.downRange = x + (nextX - x) * fraction;
      return;
    }
    h = nh; x = nextX; vx = nx; vy = ny;
    if (dumping) mass = Math.max(floorMass, mass - C.dumpRate * stepSeconds);
  }
  out.downRange = x;
}

/** Angle trim solved from the signed ranges at the two authority limits. */
export function entryRangeTrim(target: number, lowAngleRange: number, highAngleRange: number): Rad {
  const span = highAngleRange - lowAngleRange;
  if (!Number.isFinite(span) || Math.abs(span) < 1) return rad(0);
  const fraction = Math.max(0, Math.min(1, (target - lowAngleRange) / span));
  return rad(C.aeroDescentMaxCorrectionAngle * (2 * fraction - 1));
}

/**
 * Solve the forecast's nonlinear range inside the existing trim authority.
 * Endpoint interpolation is the first estimate, not a range solution: the
 * long lifting entry can curve enough to leave kilometres of residual.
 * A safeguarded secant bracket needs no new physical parameter. Its 100 m
 * numerical residual is one tenth of the unchanged 1 km aim-health bound;
 * at most 16 forecasts cap work. The caller still applies the thermal guard.
 * `out` always describes the returned trim, including a capped forecast.
 */
export function solveEntryRangeTrimInto(
  state: SimState, baseAngle: Rad, target: number, pitchBias: Rad,
  scratch: BurnScratch, low: EntryPrediction, high: EntryPrediction, out: EntryPrediction,
): Rad {
  let lowTrim: number = -C.aeroDescentMaxCorrectionAngle;
  let highTrim: number = C.aeroDescentMaxCorrectionAngle;
  let lowRange = low.downRange, highRange = high.downRange;
  let trim = low.reached && high.reached ? entryRangeTrim(target, lowRange, highRange) : rad(0);
  for (let n = 0; n < 16; n++) {
    predictEntryRangeInto(state, rad(baseAngle + trim), scratch, out, 0.5, pitchBias);
    if (!out.reached || !low.reached || !high.reached ||
        Math.abs(out.downRange - target) <= 100 || n === 15 ||
        Math.abs(trim) === C.aeroDescentMaxCorrectionAngle || Math.abs(highRange - lowRange) < 1) return trim;
    if ((out.downRange < target) === (lowRange < target)) {
      lowTrim = trim;
      lowRange = out.downRange;
    } else {
      highTrim = trim;
      highRange = out.downRange;
    }
    const fraction = Math.max(0.1, Math.min(0.9, (target - lowRange) / (highRange - lowRange)));
    trim = rad(lowTrim + (highTrim - lowTrim) * fraction);
  }
  return trim;
}

/** Thermal constraint on a range solution, always within the same trim authority. */
export function thermallyConstrainedTrim(
  requested: Rad, candidate: EntryPrediction, low: EntryPrediction, high: EntryPrediction,
): Rad {
  if (candidate.reached && candidate.peakKelvin <= C.TILE_LIMIT_KELVIN) return requested;
  let best = candidate.reached ? candidate.peakKelvin : Infinity;
  let trim = candidate.reached ? requested : rad(0);
  if (low.reached && low.peakKelvin < best) {
    best = low.peakKelvin;
    trim = rad(-C.aeroDescentMaxCorrectionAngle);
  }
  if (high.reached && high.peakKelvin < best) trim = C.aeroDescentMaxCorrectionAngle;
  return trim;
}
