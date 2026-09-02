/**
 * M12.1 — the debrief card: what just happened, and how close it was.
 *
 * WHAT THIS IS FOR. A flight ends and the screen goes quiet. Until now the only
 * record of how it went was the Black Box, nine plots deep, and the player's
 * memory of the last two seconds. The numbers that decide a landing — vertical
 * speed, horizontal speed, pitch at contact — are checked once, inside
 * `checkIfCrash`, against three constants, and then thrown away. This is that
 * comparison, shown.
 *
 * TWO REASONS IT CANNOT BE A FUNCTION OF THE FINAL STATE ALONE, both found by
 * reading `core/step.ts` rather than assumed:
 *
 *   1. `checkIfCrash` ZEROES what it judged. A crash sets `speedX`, `speedY`
 *      and `angularVelocity` to zero, `pitch` to zero and `propellantMass` to
 *      zero — so by the time anything can ask "how fast was it going?", the
 *      answer has been erased by the code that used it.
 *   2. `checkIfBreakUp` does not stop the simulation. The wreckage keeps
 *      falling, and the forces that broke it are recomputed away within a step.
 *
 * So the flight is WITNESSED, per step, exactly as `hud/timeline.ts` witnesses
 * its events — `observe(state)` from the same loop, keeping one small record.
 * The event times come from the timeline; `debrief()` itself is pure over the
 * three.
 *
 * WHY THE PEAKS ARE WITNESSED TOO, and not read from the flight recorder as
 * this task's plan said. Review of the first version found two faults that are
 * one fault: the recorder samples one frame in five, so a break-up could show
 * a peak BELOW the limit flagged red (the flag came from the witness, the
 * number from the sample); and its `g` channel is `perceivedG`, the felt g with
 * its one-g offset, while `checkIfBreakUp` judges `totalAcceleration / gravity`
 * — measured across the goldens the two differ by up to a full g in both
 * directions, so a clean landing could read "13.5 g of 13" in alarm red. A card
 * whose number and whose verdict come from different places will eventually
 * disagree with itself, so both now come from the step.
 *
 * The recorder did not go to waste: `tests/hud/debrief.test.ts` replays every
 * golden and cross-checks each figure against its series, which is a better use
 * of it — an independent measurement rather than the same one twice.
 */
import * as C from '$core/constants';
import { PROPELLANT_CAPACITY } from '$core/physics/mass';
import { DT } from '$app/loop';
import type { SimState } from '$core/state';
import type { Timeline, TimelineEvent } from './timeline';

/**
 * What became of the vehicle.
 *
 * `FLYING` is not an outcome so much as the absence of one: the card is not
 * shown, and a caller that renders it anyway gets a truthful card about a
 * flight in progress rather than a special case to handle.
 */
export const OUTCOMES = ['FLYING', 'TOUCHDOWN', 'CRASH', 'LOSS'] as const;
export type Outcome = (typeof OUTCOMES)[number];

/** One line of the card: a measured value against the limit it was judged by. */
export interface Judged {
  /** SI, as the simulation holds it. */
  readonly value: number;
  /** The constant it was compared with, in the same unit. */
  readonly limit: number;
  /** `value / limit`, clamped at 0. Above 1 is what ended the flight. */
  readonly fraction: number;
  /** True when this is one of the reasons the flight ended badly. */
  readonly exceeded: boolean;
}

/**
 * The last instant the vehicle was still flying, plus the flight's peaks.
 *
 * MUTATED IN PLACE, one record for the life of the watch. `observe` runs on
 * every simulation step — 120 Hz, times the time-warp factor — and CLAUDE.md's
 * per-frame path allows no allocation there; a fresh ten-field object per step
 * is exactly the kind of quiet garbage that rule exists for. The consequence
 * for callers is stated rather than hidden: `watch.last` is a VIEW of the
 * watch, valid until the next step. `debrief()` copies what it needs.
 */
export interface Witness {
  /** s — `world.timeSpent` at that instant. */
  readonly at: number;
  /** m/s, downrange. */
  readonly speedX: number;
  /** m/s, vertical. Negative is descending. */
  readonly speedY: number;
  /** rad, from vertical. */
  readonly pitch: number;
  /** m above the ground. */
  readonly altitude: number;
  /** m from StarBase, signed. */
  readonly miss: number;
  /** kg. */
  readonly propellantMass: number;
  /** m/s^2 — total, for the g limit. */
  readonly totalAcceleration: number;
  /** the heating scale of `core/constants.ts`. */
  readonly thermalPower: number;
  /** kPa. */
  readonly dynamicPressure: number;

  /** kPa — the highest this flight reached, exactly. */
  readonly peakDynamicPressure: number;
  /** The heating scale — the highest this flight reached, exactly. */
  readonly peakThermalPower: number;
  /**
   * g — the highest this flight reached, exactly, as STRUCTURAL g.
   *
   * `totalAcceleration / gravity`, which is the quantity `checkIfBreakUp`
   * compares with `gLimit`. Not `perceivedG`: that is the felt g, offset by one
   * on the pad, and judging it against a structural limit is comparing two
   * different numbers that happen to share a unit.
   */
  readonly peakStructuralG: number;
}

/**
 * The per-step observer.
 *
 * Deliberately as small as it can be: ONE record, overwritten while the vehicle
 * is airborne, plus nothing. The peaks are not kept here — the recorder already
 * has them, and a second copy of a number is a second thing that can disagree.
 */
export interface FlightWatch {
  /** Offer a state. Call once per step, beside `recorder.sample`. */
  observe(state: SimState): void;
  /**
   * The last airborne instant and the flight's peaks, or undefined before the
   * first step. Valid until the next `observe` — see `Witness`.
   */
  readonly last: Witness | undefined;
  /** A new flight is a new story. */
  reset(): void;
}

/** True while the vehicle is still flying — the same test the recorder uses. */
function airborne(s: SimState): boolean {
  return (
    !s.failures.crashed &&
    !s.failures.inFlightBreakUp &&
    !s.status.onTheGround &&
    !s.status.landed
  );
}

export function createFlightWatch(): FlightWatch {
  // One record, written in place. `seen` is what makes `last` undefined before
  // the first airborne step without allocating an object to say so.
  let seen = false;
  const record = {
    at: 0,
    speedX: 0,
    speedY: 0,
    pitch: 0,
    altitude: 0,
    miss: 0,
    propellantMass: 0,
    totalAcceleration: 0,
    thermalPower: 0,
    dynamicPressure: 0,
    peakDynamicPressure: 0,
    peakThermalPower: 0,
    peakStructuralG: 0,
  };

  return {
    get last(): Witness | undefined {
      return seen ? record : undefined;
    },

    observe(s: SimState): void {
      if (!airborne(s)) return;
      const { kinematics, forces, vehicle } = s;
      seen = true;
      record.at = s.world.timeSpent;
      record.speedX = kinematics.speedX;
      record.speedY = kinematics.speedY;
      record.pitch = kinematics.pitch as number;
      record.altitude = kinematics.altitude;
      record.miss = kinematics.downRangeDistance - C.starBaseXPos;
      record.propellantMass = vehicle.propellantMass;
      record.totalAcceleration = kinematics.totalAcceleration;
      record.thermalPower = forces.thermalPower;
      record.dynamicPressure = forces.dynamicPressure;

      const structuralG = kinematics.totalAcceleration / C.gravity;
      if (forces.dynamicPressure > record.peakDynamicPressure) {
        record.peakDynamicPressure = forces.dynamicPressure;
      }
      if (forces.thermalPower > record.peakThermalPower) {
        record.peakThermalPower = forces.thermalPower;
      }
      if (structuralG > record.peakStructuralG) record.peakStructuralG = structuralG;
    },

    reset(): void {
      seen = false;
      record.peakDynamicPressure = 0;
      record.peakThermalPower = 0;
      record.peakStructuralG = 0;
    },
  };
}

/** The whole card. Every field SI, formatting left to the layer that draws. */
export interface Debrief {
  readonly outcome: Outcome;
  /**
   * Whether there was a touchdown to judge.
   *
   * False for a break-up, and the card hides the three landing figures when it
   * is: a vehicle that came apart at Mach 20 has a "descent speed" of 2 km/s
   * and a "drift" of six, and printing those against a ten-metre-a-second
   * landing limit in alarm red is three numbers pretending to be a verdict
   * about something that never happened.
   */
  readonly touchedDown: boolean;
  /** Why it ended that way, one clause per limit that was passed. Empty on a
   *  clean touchdown, and on a flight still in progress. */
  readonly reasons: readonly string[];
  /** s — `world.timeSpent` at the end. */
  readonly elapsed: number;
  /** m/s down at contact, against `touchDownSpeedLimit`. */
  readonly vertical: Judged;
  /** m/s across at contact, against the 2 m/s `checkIfCrash` allows. */
  readonly horizontal: Judged;
  /** rad off vertical at contact, against `touchDownPitchLimit`. */
  readonly attitude: Judged;
  /** m from the pad, signed: negative is short. No limit — a landing anywhere
   *  is a landing — so `limit` is the vehicle's own height, which is the
   *  smallest miss anyone could call a miss. */
  readonly miss: Judged;
  /** kPa, against `dynamicPressureLimit`. */
  readonly peakQ: Judged;
  /** the heating scale, against `heatLimit`. */
  readonly peakHeat: Judged;
  /** g, against `gLimit`. */
  readonly peakG: Judged;
  /** t remaining when it ended. `limit` is the tank, so the fraction is a fuel
   *  gauge rather than a warning. */
  readonly propellant: Judged;
  /** The timeline, as it stands. */
  readonly events: readonly TimelineEvent[];
}

/** m/s — `checkIfCrash`'s horizontal gate, which has no name in constants.ts. */
export const TOUCHDOWN_DRIFT_LIMIT = 2;

function judged(value: number, limit: number, exceeded = false): Judged {
  const magnitude = Math.abs(value);
  return {
    value,
    limit,
    fraction: limit > 0 ? magnitude / limit : 0,
    exceeded,
  };
}

/**
 * Assemble the card.
 *
 * Pure: same state, timeline and witness in, same card out. The
 * witness may be undefined — a flight that ended on its first step, or a card
 * asked for before the loop has run — and every figure that depends on it then
 * reads zero rather than throwing, because a debrief is a readout and a readout
 * that crashes the page is worse than one that says nothing happened.
 */
export function debrief(
  state: SimState,
  timeline: Timeline,
  witness: Witness | undefined,
): Debrief {
  const { status, failures } = state;

  const outcome: Outcome = failures.inFlightBreakUp
    ? 'LOSS'
    : failures.crashed
      ? 'CRASH'
      : status.landed
        ? 'TOUCHDOWN'
        : 'FLYING';

  const speedY = witness?.speedY ?? 0;
  const speedX = witness?.speedX ?? 0;
  const pitch = witness?.pitch ?? 0;

  /*
    WHICH GATE FAILED, read off the same three comparisons `checkIfCrash` makes
    rather than inferred from the outcome. All three are reported when all three
    failed: "too fast and sideways and leaning" is what happened, and picking
    the worst one would be the card deciding what the player should learn.
  */
  const tooFast = Math.abs(speedY) >= C.touchDownSpeedLimit;
  const tooSideways = Math.abs(speedX) >= TOUCHDOWN_DRIFT_LIMIT;
  const tooTilted = Math.abs(pitch) >= C.touchDownPitchLimit;

  /*
    And which limit broke it. `checkIfBreakUp` tests three; the witness carries
    all three because the state does not keep them past the step that used them.
  */
  const overG = (witness?.totalAcceleration ?? 0) > C.gLimit * C.gravity;
  const overHeat = (witness?.thermalPower ?? 0) > C.heatLimit;
  const overQ = (witness?.dynamicPressure ?? 0) > C.dynamicPressureLimit;

  const reasons: string[] = [];
  if (outcome === 'CRASH') {
    if (tooFast) reasons.push('descending too fast');
    if (tooSideways) reasons.push('drifting sideways');
    if (tooTilted) reasons.push('not upright');
    // The three gates are `checkIfCrash`'s whole test, so one of them held. If
    // none reads as failed the witness is older than the contact — say so
    // rather than print a card with a blank reason.
    if (reasons.length === 0) reasons.push('outside the landing envelope');
  } else if (outcome === 'LOSS') {
    if (overG) reasons.push('over the g limit');
    if (overHeat) reasons.push('over the heating limit');
    if (overQ) reasons.push('over the dynamic-pressure limit');
    if (reasons.length === 0) reasons.push('structural limits exceeded');
  }

  return {
    outcome,
    touchedDown: outcome === 'TOUCHDOWN' || outcome === 'CRASH',
    reasons,
    elapsed: state.world.timeSpent,
    vertical: judged(speedY, C.touchDownSpeedLimit, outcome === 'CRASH' && tooFast),
    horizontal: judged(speedX, TOUCHDOWN_DRIFT_LIMIT, outcome === 'CRASH' && tooSideways),
    attitude: judged(pitch, C.touchDownPitchLimit, outcome === 'CRASH' && tooTilted),
    /*
      From the witness, not from the live state. `checkIfCrash` does not move
      the vehicle, but `checkIfBreakUp` does not stop the simulation either —
      the wreckage keeps falling downrange, so a card built a few frames after a
      break-up would report where the debris got to rather than where the
      vehicle was lost.
    */
    miss: judged(
      witness?.miss ?? state.kinematics.downRangeDistance - C.starBaseXPos,
      C.vehicleHeight,
    ),
    peakQ: judged(witness?.peakDynamicPressure ?? 0, C.dynamicPressureLimit, overQ),
    peakHeat: judged(witness?.peakThermalPower ?? 0, C.heatLimit, overHeat),
    peakG: judged(witness?.peakStructuralG ?? 0, C.gLimit, overG),
    // The recorder holds tonnes; so does the card, because the propellant bar
    // and the editor field are both in tonnes and three units for one quantity
    // is how a readout starts lying.
    propellant: judged(
      (witness?.propellantMass ?? state.vehicle.propellantMass) / 1000,
      PROPELLANT_CAPACITY / 1000,
    ),
    events: timeline.events,
  };
}

/**
 * Seconds of recorded flight, for a test that wants to know the card and the
 * recorder are talking about the same flight.
 *
 * `recordTimeInterval * DT` per sample is the recorder's own conversion; this
 * is it, exported once so the test does not re-derive it and agree with itself.
 */
export const RECORDER_SAMPLE_SECONDS = C.recordTimeInterval * DT;
