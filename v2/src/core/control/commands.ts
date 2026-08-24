/**
 * Sim-side commands — the half of backend/utilities/switches.js that is physics.
 *
 * Each 2021 toggle did two things: flip a simulation flag, and repaint a button.
 * Only the first belongs in core/. The button state moves to ui/ (M4.2), and the
 * particle effects to view/ (M3.3) — including the engine-shutdown emitter that
 * leaked a PIXI.Container per cutoff.
 *
 * These are the only sanctioned way for anything outside core/ to change the
 * simulation. `step()` never reads a button; it reads SimState.
 */
import { commandIgnition, getWorkingEngineCount, rollIgnitionFailure, shutdownEngine } from '../physics/engines';
import type { RaptorIndex, SimState } from '../state';

/**
 * switches.js:16 — toggle one Raptor.
 *
 * Ignition is asynchronous (a dt-ticked countdown, M1.4); shutdown is immediate.
 * An engine that is already igniting counts as "on" for toggle purposes, so a
 * second press cancels the ignition rather than queueing another.
 */
export function toggleRaptor(state: SimState, engine: RaptorIndex): void {
  const { engines, failures } = state;
  const igniting = engines.ignitionCountdown[engine] !== null;

  if (!engines.running[engine] && !igniting && !engines.failed[engine] && !failures.fuelRunOut) {
    // physics.js:456 — draws from the ignitionFailure stream whether or not the
    // rate is non-zero, so raising the rate cannot shift the delay stream.
    if (!rollIgnitionFailure(state, engine)) commandIgnition(state, engine);
  } else {
    shutdownEngine(state, engine);
  }
}

/**
 * switches.js:108 — all three at once.
 *
 * Note the 2021 asymmetry, preserved: if ANY engine is running it shuts down
 * only the running ones; otherwise it starts only the stopped ones. An engine
 * mid-ignition is neither, so the pattern differs subtly from "toggle each".
 */
export function toggleAllRaptors(state: SimState): void {
  const { running } = state.engines;
  if (running[0] || running[1] || running[2]) {
    for (const i of [0, 1, 2] as const) if (running[i]) toggleRaptor(state, i);
  } else {
    for (const i of [0, 1, 2] as const) if (!running[i]) toggleRaptor(state, i);
  }
}

/** switches.js:132 */
export function toggleFin(state: SimState): void {
  state.status.finActive = !state.status.finActive;
}

/** switches.js:144 */
export function toggleRcs(state: SimState): void {
  state.status.rcsActive = !state.status.rcsActive;
}

/** switches.js:156 */
export function toggleDumpFuel(state: SimState): void {
  state.status.dumpingFuel = !state.status.dumpingFuel;
}

/** tools.js:10 */
export function setGoalAsCurrentAttitude(state: SimState): void {
  state.autopilot.holdingPitch = state.kinematics.pitch;
}

/** tools.js:14 / :18 */
export function setManualControl(state: SimState, on: boolean): void {
  state.autopilot.manualControlOn = on;
}

export function togglePitchHold(state: SimState): void {
  state.autopilot.pitchHoldOn = !state.autopilot.pitchHoldOn;
}

export function toggleAutoMaxThrust(state: SimState): void {
  state.autopilot.autoMaxThrustOn = !state.autopilot.autoMaxThrustOn;
}

export function toggleAutoTakeOff(state: SimState): void {
  state.autopilot.autoTakeOffOn = !state.autopilot.autoTakeOffOn;
}

export function toggleBoostBack(state: SimState): void {
  state.autopilot.autoBoostBackOn = !state.autopilot.autoBoostBackOn;
}

export function toggleAutoLand(state: SimState): void {
  state.autopilot.autoLandOn = !state.autopilot.autoLandOn;
}

/** Convenience for the autopilot's own use. */
export { getWorkingEngineCount };
