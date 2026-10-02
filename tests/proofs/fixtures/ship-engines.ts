/** Shipped engine implementation from e17b24d (same as7a757d7).
 * Original SHA256: 0d970c9106ea9d74ed5931bbe6af70fe64bad1fad27847c03546057ebd8e70ba
 * Only import paths adjusted. Independent baseline; do not update to match implementation.
 */
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
import * as C from '$core/constants';
import { draw } from '$core/rng';
import type { RaptorIndex, SimState } from '$core/state';
import { rad, type Rad } from '$core/units';

// --- thrust ----------------------------------------------------------------

/** physics.js:288 — how many engines are running, 0..N (Phase 6, Task 4a: counted, not enumerated). */
export function getWorkingEngineCount(running: readonly boolean[]): number {
  let n = 0;
  for (const lit of running) if (lit) n += 1;
  return n;
}

/** How many engines of one kind are flagged in a per-engine array. */
function countOfKind(flags: readonly boolean[], kind: C.RaptorKind, flagged: boolean): number {
  let n = 0;
  for (let i = 0; i < C.RAPTORS.length; i++) {
    if (C.RAPTORS[i]!.kind === kind && (flags[i] === true) === flagged) n += 1;
  }
  return n;
}

/** Sea-level engines running: what the landing logic counts (the autopilot never lights an RVac). */
export function getWorkingSeaLevelCount(running: readonly boolean[]): number {
  return countOfKind(running, 'sea-level', true);
}

/*
  M11.2, Fidelity: thrust depends on the ambient pressure. Every function here
  that returns a thrust takes the pressure at the nozzle, in kPa as the
  atmosphere model carries it, and there is deliberately no overload without
  it — a caller that forgot would silently get sea-level thrust at 100 km.
  The model and its anchors are in constants.ts (`thrustPerRaptorAt`).
*/

/** physics.js:267, at ambient pressure. @returns N */
/** Sea-level Raptors that have not failed: the ones *Engines* (all) lights. */
export function getHealthySeaLevelCount(failed: readonly boolean[]): number {
  return countOfKind(failed, 'sea-level', false);
}

/**
 * Full-throttle thrust of the running engines, each kind at its own nozzle's
 * thrust for the ambient pressure. With no RVac running the second term is an
 * exact +0, so three sea-level engines give 2021's bits.
 */
export function getTotalMaxThrust(running: readonly boolean[], ambientPressureKPa: number): number {
  return (
    countOfKind(running, 'sea-level', true) * C.thrustPerRaptorAt(ambientPressureKPa) +
    countOfKind(running, 'vacuum', true) * C.thrustPerRVacAt(ambientPressureKPa)
  );
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

/**
 * The share of the running engines' thrust that gimbals: the sea-level
 * engines'. The RVacs are fixed (Phase 6, found by the independent review: they
 * were steering with the gimbal). Exactly 1 with no RVac running, so the
 * gimballed thrust is the total's bits.
 */
export function gimballedShare(running: readonly boolean[], ambientPressureKPa: number): number {
  if (countOfKind(running, 'vacuum', true) === 0) return 1;
  const total = getTotalMaxThrust(running, ambientPressureKPa);
  return total > 0 ? (countOfKind(running, 'sea-level', true) * C.thrustPerRaptorAt(ambientPressureKPa)) / total : 0;
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
 * arithmetic is identical. Summed over the mount table in index order, the
 * order 2021's three terms were added in, so three engines give the same bits.
 * @returns N
 */
export function getOffAxisThrustDifference(
  running: readonly boolean[],
  throttleCurrent: number,
  ambientPressureKPa: number,
): number {
  let seaLevel = 0;
  let vacuum = 0;
  for (let i = 0; i < C.RAPTORS.length; i++) {
    const m = C.RAPTORS[i]!;
    const term = (running[i] ? 1 : 0) * m.offAxisForceFraction;
    if (m.kind === 'sea-level') seaLevel += term;
    else vacuum += term;
  }
  return (
    seaLevel * throttleCurrent * 0.01 * C.thrustPerRaptorAt(ambientPressureKPa) +
    vacuum * throttleCurrent * 0.01 * C.thrustPerRVacAt(ambientPressureKPa)
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
  return (
    countOfKind(running, 'sea-level', true) * throttleCurrent * 0.01 * C.maxFuelFlowPerRaptor +
    countOfKind(running, 'vacuum', true) * throttleCurrent * 0.01 * C.RVAC_MASS_FLOW
  );
}

/**
 * updateBackEnd.js:41-58 — burn, then dump. Mutates `state`.
 *
 * `X / renderTimeInterval` becomes `X * dt`; see the file header.
 *
 * Returns the fraction of a full step's burn the propellant covered: 1 on
 * every step but the one the tank runs dry, where it is what was left over
 * what a full step needs. The step scales that step's thrust by it (Phase 6,
 * Bug fix: the emptying step used to thrust in full on its last kilograms).
 */
export function updatePropellant(state: SimState, dt: number): number {
  const { vehicle, engines, status } = state;
  let burned = 1;

  if (vehicle.propellantMass > 0) {
    const flowRate = getFuelFlowRate(engines.running, vehicle.throttleCurrent);
    const needed = flowRate * dt;
    if (needed > vehicle.propellantMass) burned = vehicle.propellantMass / needed;
    // The last step burns what is left, not a full step's worth below zero.
    vehicle.propellantMass = Math.max(0, vehicle.propellantMass - needed);
  } else {
    vehicle.propellantMass = 0;
  }

  if (status.dumpingFuel) {
    if ((vehicle.propellantMass > C.dumpLimit || status.forceDump) && vehicle.propellantMass > 0) {
      vehicle.propellantMass = Math.max(0, vehicle.propellantMass - C.dumpRate * dt);
    } else {
      status.dumpingFuel = !status.dumpingFuel;
    }
  }

  vehicle.vehicleMass = C.vehicleDryMass + vehicle.propellantMass;
  return burned;
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
  for (let i = 0; i < engines.ignitionCountdown.length; i++) {
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

/**
 * updateBackEnd.js:64 — out of fuel stops every engine, and cancels any
 * ignition still counting down (Phase 6, Bug fix: one could light for a step
 * on an empty tank, because the countdown ticks after this).
 */
export function updateRaptorStatus(state: SimState): void {
  if (state.failures.fuelRunOut) {
    state.engines.running.fill(false);
    state.engines.ignitionCountdown.fill(null);
  }
}
