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

/*
  M11.2, Fidelity: thrust depends on the ambient pressure. Every function here
  that returns a thrust takes the pressure at the nozzle, in kPa as the
  atmosphere model carries it, and there is deliberately no overload without
  it — a caller that forgot would silently get sea-level thrust at 100 km.
  The model and its anchors are in constants.ts (`thrustPerRaptorAt`).
*/

/** physics.js:267, at ambient pressure. @returns N */
export function getTotalMaxThrust(running: readonly boolean[], ambientPressureKPa: number): number {
  return getWorkingEngineCount(running) * C.thrustPerRaptorAt(ambientPressureKPa);
}

/** physics.js:275 — at the lower throttle limit. @returns N */
export function getTotalMinThrust(running: readonly boolean[], ambientPressureKPa: number): number {
  return getTotalMaxThrust(running, ambientPressureKPa) * C.throttleLowerLimit * 0.01;
}

/** physics.js:261. @returns N */
export function getThrust(
  running: readonly boolean[],
  throttleCurrent: number,
  ambientPressureKPa: number,
): number {
  return getTotalMaxThrust(running, ambientPressureKPa) * throttleCurrent * 0.01;
}

/** physics.js:283 — the lateral component produced by gimbal deflection. @returns N */
export function getThrustVectorForce(thrust: number, gimbalPosition: number): number {
  return thrust * Math.sin(0.01 * gimbalPosition * C.gimbalAngleLimit);
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
  ambientPressureKPa: number,
): number {
  const [n1, n2, n3] = running;
  return (
    ((n1 ? 1 : 0) * C.raptorN1offAxisForceFraction +
      (n2 ? 1 : 0) * C.raptorN2offAxisForceFraction +
      (n3 ? 1 : 0) * C.raptorN3offAxisForceFraction) *
    throttleCurrent *
    0.01 *
    C.thrustPerRaptorAt(ambientPressureKPa)
  );
}

/** physics.js:518 — nozzle direction in world space, wrapped to (-pi, pi]. */
export function getGimbalPointingDirection(pitch: Rad, gimbalPosition: number): Rad {
  let d: number = pitch - 0.01 * gimbalPosition * C.gimbalAngleLimit;
  if (d > Math.PI) {
    d = d - 2 * Math.PI;
  } else if (d < -Math.PI) {
    d = d + 2 * Math.PI;
  }
  return rad(d);
}

// --- fuel ------------------------------------------------------------------

/**
 * updateBackEnd.js:43 — kg/s at the current throttle and engine count.
 *
 * Takes no pressure, on purpose: mass flow is set by the pumps and does not
 * change with altitude. What altitude changes is the thrust each kilogram
 * buys, and that is `getThrust`'s business. M11.2 changed the constant from
 * 650 to 703 kg/s (327 s on the pad, from the public figure); the shape here
 * is 2021's.
 */
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
  if (engines.ignitionCountdown[engine] !== null) return;

  const roll = draw(state.rng, 'ignitionDelay');
  engines.ignitionCountdown[engine] = (roll * 1.5 + 0.5) * (C.raptorIgnitionTimeMean / 1000);
}

/**
 * physics.js:456 — an engine may fail to light at all.
 *
 * `raptorIgnitionFailureRate` is 0 in the shipped configuration, so this never
 * fires today; it draws anyway, exactly as the 2021 code did, so that turning
 * the rate up does not shift the delay stream.
 */
export function rollIgnitionFailure(state: SimState, engine: RaptorIndex): boolean {
  // M4.4, Bug fix. The rate comes from the menu toggle, which is what
  // switches.js:247 changed. Before this the constant was read directly, so the
  // toggle in SimState was inert and no engine ever failed to light.
  //
  // The draw happens either way — physics.js:456 did the same — so turning the
  // toggle on cannot shift the ignitionFailure stream and change a flight's
  // ignition delays. It only changes whether an engine catches.
  const rate = state.failures.randomFailure
    ? C.RANDOM_IGNITION_FAILURE_RATE
    : C.raptorIgnitionFailureRate;
  const failed = draw(state.rng, 'ignitionFailure') < rate;
  if (failed) state.engines.failed[engine] = true;
  return failed;
}

/** Advance every pending ignition by dt, lighting any that reach zero. */
export function tickIgnition(state: SimState, dt: number): void {
  const { engines } = state;
  for (let i = 0; i < 3; i++) {
    const remaining = engines.ignitionCountdown[i];
    if (remaining === null || remaining === undefined) continue;
    const next = remaining - dt;
    if (next <= 0) {
      engines.ignitionCountdown[i] = null;
      engines.running[i] = true;
    } else {
      engines.ignitionCountdown[i] = next;
    }
  }
}

/** Shut an engine down immediately. Shutdown has never had a delay. */
export function shutdownEngine(state: SimState, engine: RaptorIndex): void {
  state.engines.running[engine] = false;
  state.engines.ignitionCountdown[engine] = null;
}

/** updateBackEnd.js:64 — out of fuel stops every engine. */
export function updateRaptorStatus(state: SimState): void {
  if (state.failures.fuelRunOut) {
    state.engines.running = [false, false, false];
  }
}
