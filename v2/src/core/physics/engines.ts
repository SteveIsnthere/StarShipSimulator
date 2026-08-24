/**
 * Engines: thrust, fuel, and ignition.
 *
 * Ported from backend/physics.js and backend/updateBackEnd.js, with one declared
 * change: ignition timing. See `commandIgnition` below.
 *
 * Note on `dt` throughout this file. The 2021 code divides per-second rates by
 * `renderTimeInterval`, and `renderTimeInterval = frameRate / timeAccel`, so
 * `1 / renderTimeInterval` is exactly the simulated seconds elapsed in one
 * frame. Substituting `X / renderTimeInterval` with `X * dt` is therefore an
 * exact port, not a reinterpretation — the 2021 model was already dt-based,
 * just written in a way that hid it behind a measured frame rate.
 */
import * as C from '../constants';
import { draw } from '../rng';
import type { RaptorIndex, SimState } from '../state';
import { rad, type Rad } from '../units';

// --- thrust ----------------------------------------------------------------

/** physics.js:288 — 0..3. Verbatim, including its redundant branch structure. */
export function getWorkingEngineCount(running: readonly boolean[]): number {
  const [n1, n2, n3] = running;
  if (n1 && n2 && n3) return 3;
  if ((n1 && n2) || (n3 && n2) || (n1 && n3)) return 2;
  if (n1 || n2 || n3) return 1;
  return 0;
}

/** physics.js:267. @returns N */
export function getTotalMaxThrust(running: readonly boolean[]): number {
  return getWorkingEngineCount(running) * C.maxThrustPerRaptor;
}

/** physics.js:275 — at the lower throttle limit. @returns N */
export function getTotalMinThrust(running: readonly boolean[]): number {
  return (
    getWorkingEngineCount(running) * C.maxThrustPerRaptor * C.throttleLowwerLimmit * 0.01
  );
}

/** physics.js:261. @returns N */
export function getThrust(running: readonly boolean[], throttleCurrent: number): number {
  return getTotalMaxThrust(running) * throttleCurrent * 0.01;
}

/** physics.js:283 — the lateral component produced by gimbal deflection. @returns N */
export function getThrustVectorForce(thrust: number, gimbolPosition: number): number {
  return thrust * Math.sin(0.01 * gimbolPosition * C.gimbolAngleLimit);
}

/**
 * physics.js:514 — net off-axis force from engines not being on the centreline.
 *
 * The booleans are multiplied directly, relying on JavaScript's true->1 coercion.
 * Ported as `? 1 : 0` because TypeScript will not multiply a boolean; the
 * arithmetic is identical.
 * @returns N
 */
export function getOffAxisThrustDifference(
  running: readonly boolean[],
  throttleCurrent: number,
): number {
  const [n1, n2, n3] = running;
  return (
    ((n1 ? 1 : 0) * C.raptorN1offAxisForceFraction +
      (n2 ? 1 : 0) * C.raptorN2offAxisForceFraction +
      (n3 ? 1 : 0) * C.raptorN3offAxisForceFraction) *
    throttleCurrent *
    0.01 *
    C.maxThrustPerRaptor
  );
}

/** physics.js:518 — nozzle direction in world space, wrapped to (-pi, pi]. */
export function getGimbolPointingDirection(pitch: Rad, gimbolPosition: number): Rad {
  let d: number = pitch - 0.01 * gimbolPosition * C.gimbolAngleLimit;
  if (d > Math.PI) {
    d = d - 2 * Math.PI;
  } else if (d < -Math.PI) {
    d = d + 2 * Math.PI;
  }
  return rad(d);
}

// --- fuel ------------------------------------------------------------------

/** updateBackEnd.js:43 — kg/s at the current throttle and engine count. */
export function getFuelFlowRate(running: readonly boolean[], throttleCurrent: number): number {
  return getWorkingEngineCount(running) * throttleCurrent * 0.01 * C.maxFuelFlowPerRaptor;
}

/**
 * updateBackEnd.js:41-58 — burn, then dump. Mutates `state`.
 *
 * `X / renderTimeInterval` becomes `X * dt`; see the file header.
 */
export function updatePropellant(state: SimState, dt: number): void {
  const { vehicle, engines, status } = state;

  if (vehicle.propellantMass > 0) {
    const flowRate = getFuelFlowRate(engines.running, vehicle.throttleCurrent);
    vehicle.propellantMass -= flowRate * dt;
  } else {
    vehicle.propellantMass = 0;
  }

  if (status.dumpingFuel) {
    if ((vehicle.propellantMass > C.dumpLimit || status.forceDump) && vehicle.propellantMass > 0) {
      vehicle.propellantMass -= C.dumpRate * dt;
    } else {
      status.dumpingFuel = !status.dumpingFuel;
    }
  }

  vehicle.vehicleMass = C.vehicleDryMass + vehicle.propellantMass;
}

/** updateBackEnd.js:161 — recomputed as propellant burns off. */
export function getMomentOfInertia(vehicleMass: number): number {
  return (
    vehicleMass * (C.vehicleDiameter / 2) ** 2 * 0.25 + (vehicleMass * C.vehicleHeight ** 2) / 12
  );
}

// --- ignition --------------------------------------------------------------

/**
 * Ignition delay bounds, in SIMULATED seconds.
 *
 * physics.js:452 draws `Math.random() * 1.5 + 0.5`, a 0.5x..2.0x multiplier on
 * `raptorIgnitionTimeMean` (600 ms). So 0.3 s to 1.2 s, mean 0.75 s.
 */
export const IGNITION_DELAY_MIN_S = 0.5 * (C.raptorIgnitionTimeMean / 1000);
export const IGNITION_DELAY_MAX_S = 2.0 * (C.raptorIgnitionTimeMean / 1000);

/**
 * Command an engine to light. Declared change, Bug-fix tier.
 *
 * WAS (switches.js:20, physics.js:452):
 *   setTimeout(toggle_On, getRaptorIgnitionTime() / timeAccel)
 *   where getRaptorIgnitionTime() already contained a 1/timeAccel factor, so the
 *   wall-clock delay was (rand*1.5 + 0.5) * 600 / timeAccel^2 milliseconds —
 *   timeAccel divided out twice — and it was measured against the wall clock
 *   while the simulation ran timeAccel times faster than real time. One factor
 *   of timeAccel is legitimately absorbed by that speed-up; the other is the
 *   defect, so an engine lit `timeAccel` times early in simulated terms: at 4x
 *   warp, 0.75 s of intended delay became 0.1875 s. The two cancel exactly at
 *   timeAccel = 1, which is why this shipped.
 *
 * IS: a duration in simulated seconds, drawn once from the seeded
 * `ignitionDelay` stream and counted down by dt in `tickIgnition`. Warp changes
 * how many steps run per frame and nothing else, so the delay is identical at
 * every warp factor and every frame rate.
 *
 * Re-commanding an engine that is already igniting is a no-op, so a held button
 * cannot draw repeatedly from the RNG and shift the stream.
 */
export function commandIgnition(state: SimState, engine: RaptorIndex): void {
  const { engines } = state;
  if (engines.running[engine] || engines.failed[engine]) return;
  if (!Number.isNaN(engines.ignitionCountdown[engine])) return;

  const roll = draw(state.rng, 'ignitionDelay');
  engines.ignitionCountdown[engine] = (roll * 1.5 + 0.5) * (C.raptorIgnitionTimeMean / 1000);
}

/**
 * physics.js:456 — an engine may fail to light at all.
 *
 * `raptorIgnitionFaliureRate` is 0 in the shipped configuration, so this never
 * fires today; it draws anyway, exactly as the 2021 code did, so that turning
 * the rate up does not shift the delay stream.
 */
export function rollIgnitionFailure(state: SimState, engine: RaptorIndex): boolean {
  const failed = draw(state.rng, 'ignitionFailure') < C.raptorIgnitionFaliureRate;
  if (failed) state.engines.failed[engine] = true;
  return failed;
}

/** Advance every pending ignition by dt, lighting any that reach zero. */
export function tickIgnition(state: SimState, dt: number): void {
  const { engines } = state;
  for (let i = 0; i < 3; i++) {
    const remaining = engines.ignitionCountdown[i];
    if (remaining === undefined || Number.isNaN(remaining)) continue;
    const next = remaining - dt;
    if (next <= 0) {
      engines.ignitionCountdown[i] = NaN;
      engines.running[i] = true;
    } else {
      engines.ignitionCountdown[i] = next;
    }
  }
}

/** Shut an engine down immediately. Shutdown has never had a delay. */
export function shutdownEngine(state: SimState, engine: RaptorIndex): void {
  state.engines.running[engine] = false;
  state.engines.ignitionCountdown[engine] = NaN;
}

/** updateBackEnd.js:64 — out of fuel stops every engine. */
export function updateRaptorStatus(state: SimState): void {
  if (state.failures.fuelRunOut) {
    state.engines.running = [false, false, false];
  }
}
