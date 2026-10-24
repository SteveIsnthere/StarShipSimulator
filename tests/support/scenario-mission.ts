/** Successor mission sequences, using production commands and one charged
 * fixed-step loop. Launch handoff is a new reviewed test policy using the
 * existing autoTakeOff witness's 1000 m upward milestone, not recovered bytes.
 */
import * as C from '$core/constants';
import * as cmd from '$core/control/commands';
import { createScenarioState, type ScenarioPreset } from '$core/scenarios';
import type { SimState } from '$core/state';
import { step, NO_INPUT } from '$core/step';
import type { VehicleDefinition } from '$core/vehicle';
import { circularOrbitalSpeed, inertialTangentialSpeed } from '$core/physics/gravity';
import { DT } from '$app/loop';
import { scenarioMissionHorizon } from './scenario-horizon';

type MissionPhase = 'ascent' | 'circularize' | 'deorbit' | 'boostback' | 'return';
type DeepReadonly<T> = T extends number | string | boolean | null | undefined ? T
  : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
export type MissionObservedState = DeepReadonly<SimState>;
export type MissionObserver = (previous: MissionObservedState, current: MissionObservedState, tick: number) => void;
export interface MissionEvent {
  kind: 'departed' | 'ascent-complete' | 'circularized' | 'burn-start' | 'burn-cutoff' | 'return-handoff';
  tick: number;
  time: number;
  altitude: number;
  speedX: number;
  speedY: number;
  pitch: number;
  angularVelocity: number;
  rcsRemaining: number;
  propellant: number;
}
export interface ScenarioMission {
  state: SimState;
  outcome: 'landed' | 'crashed' | 'brokeUp' | 'flying';
  ticks: number;
  seconds: number;
  launchDeparted: boolean;
  ascentCompleted: boolean;
  circularized: boolean;
  finite: boolean;
  peakTemperature: number;
  peakPressure: number;
  peakG: number;
  events: MissionEvent[];
  /** Incoming physical pose before contact handling resets velocity. */
  touchdown?: { altitude: number; speedX: number; speedY: number; pitch: number };
}

/** Real command semantics cancel running AND pending engines, without paying
 * an ignition on engines that are already off. No state/actuator is teleported. */
function stopEngines(state: SimState): void {
  for (let engine = 0; engine < state.engines.running.length; engine++) {
    if (state.engines.running[engine] || state.engines.ignitionCountdown[engine] !== null) {
      cmd.toggleRaptor(state, engine);
    }
  }
}

export function runScenarioMission(preset: ScenarioPreset, model: VehicleDefinition, observe?: MissionObserver): ScenarioMission {
  let state = createScenarioState(preset, undefined, model);
  const horizon = scenarioMissionHorizon(preset);
  let phase: MissionPhase;
  if (preset.id === 'launch-pad') {
    cmd.toggleAutoTakeOff(state);
    phase = 'ascent';
  } else if (preset.id === 'circularize') {
    cmd.toggleAllRaptors(state, model);
    cmd.setThrottle(state, C.throttleUpperLimit);
    phase = 'circularize';
  } else if (preset.id === 'deorbit') {
    cmd.toggleAutoDeorbit(state);
    phase = 'deorbit';
  } else if (model.id === 'ship' && preset.id === 'rtls') {
    cmd.toggleBoostBack(state);
    phase = 'boostback';
  } else {
    cmd.toggleAutoLand(state);
    phase = 'return';
  }
  const result: ScenarioMission = { state, outcome: 'flying', ticks: 0, seconds: 0,
    launchDeparted: false, ascentCompleted: false, circularized: false, finite: true,
    peakTemperature: 0, peakPressure: 0, peakG: 0, events: [] };
  const event = (kind: MissionEvent['kind']): void => {
    const k = state.kinematics;
    result.events.push({ kind, tick: result.ticks, time: state.world.environmentTime,
      altitude: k.altitude, speedX: k.speedX, speedY: k.speedY, pitch: k.pitch,
      angularVelocity: k.angularVelocity, rcsRemaining: state.vehicle.rcsRunTimeRemaining,
      propellant: state.vehicle.propellantMass });
  };
  // All preparation, takeoff, circularization, coast and terminal motion uses
  // this one counter. There is no uncharged support loop or restarted horizon.
  for (let tick = 0; tick < horizon.steps; tick++) {
    const previous = state;
    state = step(state, DT, NO_INPUT, model);
    result.ticks++;
    observe?.(previous, state, result.ticks);
    const k = state.kinematics, f = state.forces;
    result.peakTemperature = Math.max(result.peakTemperature, f.surfaceTemperature);
    result.peakPressure = Math.max(result.peakPressure, f.dynamicPressure);
    result.peakG = Math.max(result.peakG, f.perceivedG);
    result.finite &&= Number.isFinite(k.altitude) && Number.isFinite(k.downRangeDistance)
      && Number.isFinite(k.speedX) && Number.isFinite(k.speedY)
      && Number.isFinite(k.pitch) && Number.isFinite(k.angularVelocity)
      && Number.isFinite(state.vehicle.propellantMass) && Number.isFinite(state.vehicle.rcsRunTimeRemaining)
      && Number.isFinite(f.surfaceTemperature) && Number.isFinite(f.dynamicPressure)
      && Number.isFinite(f.perceivedG) && Number.isFinite(state.world.environmentTime);
    if (!previous.autopilot.deorbitBurnStarted && state.autopilot.deorbitBurnStarted) event('burn-start');
    if (!previous.autopilot.deorbitBurnCompleted && state.autopilot.deorbitBurnCompleted) event('burn-cutoff');
    if (model.id === 'ship' && !previous.status.landed && state.status.landed) {
      const incoming = previous.kinematics;
      result.touchdown = { altitude: incoming.altitude, speedX: incoming.speedX,
        speedY: incoming.speedY, pitch: incoming.pitch };
    }
    if (state.failures.inFlightBreakUp) result.outcome = 'brokeUp';
    else if (state.failures.crashed) result.outcome = 'crashed';
    else if (state.status.landed) result.outcome = 'landed';
    if (result.outcome !== 'flying' || !result.finite) break;

    if (phase === 'ascent') {
      if (!result.launchDeparted && !state.status.onTheGround && k.altitude > model.height / 2 && k.speedY > 0) {
        result.launchDeparted = true; event('departed');
      }
      if (result.launchDeparted && previous.kinematics.altitude <= 1000 && k.altitude > 1000 && k.speedY > 0) {
        result.ascentCompleted = true; event('ascent-complete');
        if (state.autopilot.autoTakeOffOn) cmd.toggleAutoTakeOff(state);
        if (state.autopilot.autoMaxThrustOn) cmd.toggleAutoMaxThrust(state);
        stopEngines(state);
        if (!state.autopilot.autoLandOn) cmd.toggleAutoLand(state);
        phase = 'return'; event('return-handoff');
      }
    } else if (phase === 'circularize') {
      if (inertialTangentialSpeed(k.distanceToPlanetCenter, k.speedX) >= circularOrbitalSpeed(k.distanceToPlanetCenter)) {
        result.circularized = true; event('circularized');
        stopEngines(state);
        cmd.toggleAutoDeorbit(state);
        phase = 'deorbit';
      }
    } else if ((phase === 'deorbit' || phase === 'boostback') && state.autopilot.autoLandOn) {
      phase = 'return'; event('return-handoff');
    }
  }
  result.state = state;
  result.seconds = result.ticks * DT;
  return result;
}
