/**
 * Landing margins: how much room the autopilot leaves, scenario by scenario.
 *
 * Phase 5 (docs/plans/modernization/modernization-phase-5.md) replaces the
 * guidance's flat-g, sea-level, drag-free estimates with the simulation's own
 * physics. Correcting an estimate can remove slack the landings quietly relied
 * on, so this measures the slack first and every guidance change diffs against
 * it (`npm run margins`, written to landing-margins.json).
 *
 * Two kinds of number:
 * - OUTCOMES of each golden flight: how it ended, touchdown speeds, propellant,
 *   miss distance, and for the intro its engine shutdown times.
 * - BURN SLACK, at the moment the aero descent hands over to the flip: the
 *   autopilot's own estimate of the burn altitude it needs
 *   (`finalStagePessimisticAltitude`, flat g, sea-level thrust, no drag) less
 *   the burn altitude the simulation itself needed. That difference is the
 *   pessimism Phase 5 replaces with a prediction. "Needed" is measured:
 *   from a copy of the state at the trigger, held upright, every working engine
 *   lit at full throttle at a chosen altitude, bisected for the lowest altitude
 *   that still stops the vehicle at touchdown height. Ignition delay, drag,
 *   thrust at altitude and mass flow are all the simulation's.
 */
import { DT } from '$app/loop';
import { setThrottle, toggleRaptor } from '$core/control/commands';
import * as C from '$core/constants';
import { step } from '$core/step';
import { cloneState, type SimState } from '$core/state';
import { rad } from '$core/units';
import { GOLDEN_SPECS } from './scenarios';

export interface FlightOutcome {
  readonly id: string;
  readonly outcome: 'landed' | 'crashed' | 'brokeUp' | 'flying';
  /** s */
  readonly seconds: number;
  /** m/s at the end */
  readonly speedY: number;
  readonly speedX: number;
  /** t */
  readonly propellant: number;
  /** m from the landing site; null when the flight has none */
  readonly miss: number | null;
  /** Present when the flight flipped: the trigger and its slack. */
  readonly trigger: TriggerSlack | null;
}

export interface TriggerSlack {
  /** m */
  readonly altitude: number;
  /** m/s */
  readonly speedY: number;
  /** m — the autopilot's own trigger altitude at that moment */
  readonly triggerAltitude: number;
  /** m — the autopilot's estimate of the burn altitude it needs */
  readonly estimatedBurnAltitude: number;
  /** m — the lowest full-thrust upright burn start that stops at touchdown height, or null if none does */
  readonly neededBurnAltitude: number | null;
  /** m — estimated − needed: the estimate's hidden pessimism (negative: it was optimistic) */
  readonly slack: number | null;
}

export interface IntroShutdowns {
  /** s at which each engine shut down, in order */
  readonly shutdowns: ReadonlyArray<{ engine: number; seconds: number }>;
  /** engines lit at touchdown */
  readonly litAtTouchdown: readonly boolean[];
  /** s */
  readonly touchdown: number | null;
}

/** m — where the vehicle's base is when it rests on the pad. */
export const TOUCHDOWN_HEIGHT = C.vehicleHeight * 0.5;

const MAX_SECONDS = 900;

/**
 * From a copy of `at`, held upright with the autopilot off: does lighting every
 * working engine at full throttle once the altitude falls to `h` stop the
 * vehicle at or above touchdown height? Returns the altitude where vY reached 0,
 * or -1 if it reached the ground still descending.
 */
function stopAltitude(at: SimState, h: number): number {
  let s = cloneState(at);
  const a = s.autopilot;
  a.autoLandOn = false;
  a.demoAutoLandOn = false;
  a.autoBoostBackOn = false;
  a.autoTakeOffOn = false;
  a.pitchHoldOn = false;
  a.autoMaxThrustOn = false;
  let lit = false;
  for (let i = 0; i < Math.round(120 / DT); i++) {
    s.kinematics.pitch = rad(0);
    s.kinematics.angularVelocity = 0;
    if (!lit && s.kinematics.altitude <= h) {
      lit = true;
      for (const e of [0, 1, 2] as const) {
        if (!s.engines.running[e] && !s.engines.failed[e]) toggleRaptor(s, e);
      }
      setThrottle(s, 100);
    }
    s = step(s, DT);
    if (lit && s.kinematics.speedY >= 0) return s.kinematics.altitude;
    if (s.kinematics.altitude <= TOUCHDOWN_HEIGHT || s.status.landed || s.failures.crashed) return -1;
  }
  return -1;
}

/** Bisect the lowest burn-start altitude that still stops at touchdown height (to 1 m). */
export function neededBurnAltitude(at: SimState): number | null {
  let hi = at.kinematics.altitude;
  if (stopAltitude(at, hi) < TOUCHDOWN_HEIGHT) return null;
  let lo = TOUCHDOWN_HEIGHT;
  while (hi - lo > 1) {
    const mid = (lo + hi) / 2;
    if (stopAltitude(at, mid) >= TOUCHDOWN_HEIGHT) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Fly one prepared state to a definite end, catching the flip trigger on the way. */
export function flyAndMeasure(id: string, initial: SimState, withTrigger = true): FlightOutcome {
  let s = initial;
  let trigger: TriggerSlack | null = null;
  const steps = Math.round(MAX_SECONDS / DT);
  let outcome: FlightOutcome['outcome'] = 'flying';
  let i = 0;
  for (; i < steps; i++) {
    const before = s;
    s = step(s, DT);
    if (withTrigger && trigger === null && !before.autopilot.aeroDescentCompleted && s.autopilot.aeroDescentCompleted) {
      const needed = neededBurnAltitude(s);
      const estimated = s.autopilot.finalStagePessimisticAltitude ?? Number.NaN;
      trigger = {
        altitude: s.kinematics.altitude,
        speedY: s.kinematics.speedY,
        triggerAltitude: s.autopilot.bellyFlopTriggerAltitude,
        estimatedBurnAltitude: estimated,
        neededBurnAltitude: needed,
        slack: needed === null ? null : estimated - needed,
      };
    }
    if (s.status.landed) { outcome = 'landed'; break; }
    if (s.failures.crashed) { outcome = 'crashed'; break; }
    if (s.failures.inFlightBreakUp) { outcome = 'brokeUp'; break; }
  }
  const site = s.autopilot.landingSiteXPos;
  return {
    id,
    outcome,
    seconds: (i + 1) * DT,
    speedY: s.kinematics.speedY,
    speedX: s.kinematics.speedX,
    propellant: s.vehicle.propellantMass / 1000,
    miss: Number.isFinite(site) ? Math.abs(s.kinematics.downRangeDistance - site) : null,
    trigger,
  };
}

/** The intro, on its golden seed: when each engine shut down, what was lit at touchdown. */
export function introShutdowns(): IntroShutdowns {
  const spec = GOLDEN_SPECS.find((g) => g.id === 'intro-demo')!;
  let s = spec.build();
  const shutdowns: Array<{ engine: number; seconds: number }> = [];
  for (let i = 0; i < Math.round(MAX_SECONDS / DT); i++) {
    const before = s;
    s = step(s, DT);
    for (const e of [0, 1, 2]) {
      if (before.engines.running[e] && !s.engines.running[e]) shutdowns.push({ engine: e, seconds: (i + 1) * DT });
    }
    if (s.status.landed || s.failures.crashed) {
      return { shutdowns, litAtTouchdown: [...s.engines.running], touchdown: (i + 1) * DT };
    }
  }
  return { shutdowns, litAtTouchdown: [...s.engines.running], touchdown: null };
}

/** Engine-out variants: engines failed from the start, on the two short landings. */
export const ENGINE_OUT = [
  { id: 'landing-burn-autoland/one-out', base: 'landing-burn-autoland', failed: [2] },
  { id: 'landing-burn-autoland/two-out', base: 'landing-burn-autoland', failed: [1, 2] },
  { id: 'before-flip-autoland/one-out', base: 'before-flip-autoland', failed: [2] },
  { id: 'before-flip-autoland/two-out', base: 'before-flip-autoland', failed: [1, 2] },
] as const;

export function buildEngineOut(variant: (typeof ENGINE_OUT)[number]): SimState {
  const s = GOLDEN_SPECS.find((g) => g.id === variant.base)!.build();
  for (const e of variant.failed) s.engines.failed[e] = true;
  return s;
}

export interface MarginsReport {
  readonly flights: readonly FlightOutcome[];
  readonly engineOut: readonly FlightOutcome[];
  readonly intro: IntroShutdowns;
}

export function measureAll(): MarginsReport {
  return {
    flights: GOLDEN_SPECS.map((g) => flyAndMeasure(g.id, g.build())),
    engineOut: ENGINE_OUT.map((v) => flyAndMeasure(v.id, buildEngineOut(v), false)),
    intro: introShutdowns(),
  };
}
