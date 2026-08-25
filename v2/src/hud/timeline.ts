/**
 * The mission event timeline.
 *
 * The one genuinely NEW system in M6 — everything else in this milestone is a
 * different way of drawing something the simulator already knew. This is the
 * element that turns a wall of telemetry into a story: LIFTOFF · MAX-Q · MECO ·
 * ENTRY · FLIP · LANDING BURN · TOUCHDOWN, lighting one after another as the
 * flight reaches them, with the next one named. It is the thing the reference
 * broadcasts are actually built around (BROADCAST-UI-PLAN § 4).
 *
 * EVENTS ARE OBSERVED, NEVER SCRIPTED. This is the whole design constraint and
 * it comes from what the game is: the player can ignore the autopilot entirely,
 * fly the vehicle into the sea sideways, and nothing about that is a bug. A
 * timeline driven from a per-scenario script would then be showing a flight
 * that is not happening. So every event below is a predicate over SimState —
 * an event that never occurs simply never lights, and one that occurs out of
 * the expected order lights out of order, honestly.
 *
 * WHY THIS HAS MEMORY, WHEN THE REST OF hud/ DOES NOT. Readouts and metrics are
 * pure functions of the current state because everything they show is in it.
 * Three of these events are not: a peak (MAX-Q) needs the maximum so far, a
 * sign flip (APOGEE) needs the previous sample, and a threshold crossing
 * (ENTRY) needs to know which side you were on. That memory has to live
 * somewhere, and the two alternatives are worse — SimState is frozen for M6 and
 * would carry HUD bookkeeping into every golden fixture, and a module-level
 * variable would make two flights in one page share a timeline. So it is an
 * explicit tracker object, created per flight and thrown away with it, exactly
 * as app/recorder.ts already does for the black box.
 *
 * The tracker is fed states in order and is otherwise deterministic: the same
 * sequence in gives the same events out, which is what lets the test replay all
 * seven golden fixtures through it.
 */
import type { SimState } from '$core/state';
import * as C from '$core/constants';

/** Every event the timeline can show, in the order a full flight meets them. */
export const EVENT_IDS = [
  'LIFTOFF',
  'MAX-Q',
  'MECO',
  'APOGEE',
  'DEORBIT',
  'ENTRY',
  'FLIP',
  'LANDING BURN',
  'TOUCHDOWN',
  'LOSS',
] as const;

export type EventId = (typeof EVENT_IDS)[number];

export interface TimelineEvent {
  readonly id: EventId;
  /** Simulated seconds since the flight began, from `world.timeSpent`. */
  readonly at: number;
}

export interface Timeline {
  /** Fire any events this state has reached. Call once per step. */
  observe(state: SimState): void;
  /** What has happened, in the order it happened. */
  readonly events: readonly TimelineEvent[];
  /** True once `id` has fired. */
  has(id: EventId): boolean;
  /** The most recent event, or undefined before the first. */
  readonly current: TimelineEvent | undefined;
  /** Start again — a new flight is a new story. */
  reset(): void;
}

/**
 * How long dynamic pressure must fall before max-q is called.
 *
 * Max-q is a peak, and a peak is only knowable in hindsight: calling it at the
 * first sample that is lower than the last would fire it on the first bit of
 * turbulence on the way up. Two seconds of sustained decline is the broadcast
 * convention and is long enough that nothing on any of the seven scenarios
 * calls it early.
 */
export const MAX_Q_CONFIRM_SECONDS = 2;

/**
 * Below this, there is no max-q worth naming.
 *
 * A vehicle that never really flies still has a maximum dynamic pressure — it
 * is just a tiny one, reached in the first second and declining thereafter.
 * Without a floor the timeline would announce MAX-Q on a flight that never left
 * the pad, which is exactly the false-positive the observed-not-scripted design
 * exists to avoid. It was 1 kPa first, and the golden replay showed why that is
 * too low: every 200 m landing hop announced MAX-Q, because the last second of
 * a freefall does have a peak in it. 5 kPa is 10% of the structural limit —
 * reached on a real ascent or a real entry and nowhere else in the seven
 * scenarios.
 */
export const MAX_Q_FLOOR_KPA = 5;

/** Above 1 km, so a hop's landing does not read as an apogee. */
export const APOGEE_FLOOR_ALTITUDE = 1_000;

export function createTimeline(): Timeline {
  const events: TimelineEvent[] = [];
  const fired = new Set<EventId>();

  /** The running peak, and how long it has been falling. */
  let peakQ = 0;
  let fallingFor = 0;

  /** Enough of the previous state to see a sign flip or a crossing. */
  let previousSpeedY: number | undefined;
  let previousAltitude: number | undefined;
  let previousTime: number | undefined;
  let previousOnTheGround: boolean | undefined;

  /** Set once the engines have been lit while climbing — MECO needs a start. */
  let poweredAscent = false;

  const fire = (id: EventId, at: number) => {
    if (fired.has(id)) return;
    fired.add(id);
    events.push({ id, at });
  };

  return {
    get events() {
      return events;
    },
    get current() {
      return events[events.length - 1];
    },

    has: (id) => fired.has(id),

    observe(state: SimState): void {
      const now = state.world.timeSpent;
      const { altitude, speedY } = state.kinematics;
      const dt = previousTime === undefined ? 0 : Math.max(0, now - previousTime);

      // --- LIFTOFF -------------------------------------------------------
      // The ground-to-air TRANSITION, climbing. Not "off the ground and going
      // up", which was the first attempt and fired at t=0.0 on the pad launch:
      // a vehicle held on the pad by an igniting autopilot registers a hair of
      // positive vertical speed long before anything leaves anything, and the
      // altitude test could not tell that apart from the real thing.
      //
      // A transition cannot be faked. It also correctly refuses to fire for a
      // scenario configured at altitude (never on the ground to begin with).
      //
      // A pleasing consequence, found while chasing the false positive above:
      // this fires at `timeSpent` exactly 0. step.ts:425 only advances the
      // clock while the vehicle is off the ground and alive, so the mission
      // clock genuinely counts from liftoff and freezes at touchdown — the
      // broadcast T+ convention, already correct in the 2021 model.
      if (previousOnTheGround === true && !state.status.onTheGround && speedY > 0) {
        fire('LIFTOFF', now);
      }

      // --- MAX-Q ---------------------------------------------------------
      const q = state.forces.dynamicPressure;
      if (q > peakQ) {
        peakQ = q;
        fallingFor = 0;
      } else {
        fallingFor += dt;
      }
      if (peakQ >= MAX_Q_FLOOR_KPA && fallingFor >= MAX_Q_CONFIRM_SECONDS) {
        fire('MAX-Q', now);
      }

      // --- MECO ----------------------------------------------------------
      // Main engine cutoff, which only means anything after a powered ascent —
      // the descent controller shuts engines down a dozen times on the way
      // home and none of those is a MECO.
      const anyRunning = state.engines.running.some(Boolean);
      if (anyRunning && speedY > 0 && altitude > C.vehicleHeight) poweredAscent = true;
      if (poweredAscent && !anyRunning) {
        fire('MECO', now);
        poweredAscent = false;
      }

      // --- APOGEE --------------------------------------------------------
      if (
        previousSpeedY !== undefined &&
        previousSpeedY > 0 &&
        speedY <= 0 &&
        altitude > APOGEE_FLOOR_ALTITUDE
      ) {
        fire('APOGEE', now);
      }

      // --- DEORBIT -------------------------------------------------------
      if (state.autopilot.deorbitBurnStarted) fire('DEORBIT', now);

      // --- ENTRY ---------------------------------------------------------
      // The entry interface, crossed downwards. A vehicle climbing through
      // 80 km is on its way out, not coming home.
      //
      // `>=` on the previous sample rather than `>`, because the Re-entry
      // preset starts at exactly 80 km. It does cross the interface — on its
      // very first step — and a strict comparison silently denied the one
      // scenario named after the event its defining moment.
      if (
        previousAltitude !== undefined &&
        previousAltitude >= C.ENTRY_INTERFACE_ALTITUDE &&
        altitude < C.ENTRY_INTERFACE_ALTITUDE
      ) {
        fire('ENTRY', now);
      }

      // --- FLIP and LANDING BURN -----------------------------------------
      if (state.autopilot.flipCompleted) fire('FLIP', now);
      if (state.autopilot.finalDescentStageInitialised) fire('LANDING BURN', now);

      // --- how it ended --------------------------------------------------
      if (state.failures.crashed || state.failures.inFlightBreakUp) fire('LOSS', now);
      else if (state.status.landed) fire('TOUCHDOWN', now);

      previousSpeedY = speedY;
      previousAltitude = altitude;
      previousTime = now;
      previousOnTheGround = state.status.onTheGround;
    },

    reset(): void {
      events.length = 0;
      fired.clear();
      peakQ = 0;
      fallingFor = 0;
      previousSpeedY = undefined;
      previousAltitude = undefined;
      previousTime = undefined;
      previousOnTheGround = undefined;
      poweredAscent = false;
    },
  };
}

/**
 * The track a scenario is expected to follow.
 *
 * This is presentation, NOT detection: it decides which dots are drawn dim and
 * waiting, so the pilot can see what is coming. Nothing here can light an event
 * — only `observe` does that — which is what keeps a freestyled flight honest.
 * An event the track did not expect still appears; an expected one that never
 * happens stays dim forever.
 */
export const DEFAULT_TRACK: readonly EventId[] = [
  'LIFTOFF',
  'MAX-Q',
  'MECO',
  'APOGEE',
  'ENTRY',
  'FLIP',
  'LANDING BURN',
  'TOUCHDOWN',
];

export const TRACKS: Readonly<Record<string, readonly EventId[]>> = {
  'launch-pad': ['LIFTOFF', 'MAX-Q', 'MECO', 'APOGEE', 'FLIP', 'LANDING BURN', 'TOUCHDOWN'],
  'booster-sep': ['MECO', 'APOGEE', 'ENTRY', 'FLIP', 'LANDING BURN', 'TOUCHDOWN'],
  rtls: ['MECO', 'APOGEE', 'FLIP', 'LANDING BURN', 'TOUCHDOWN'],
  reentry: ['ENTRY', 'MAX-Q', 'FLIP', 'LANDING BURN', 'TOUCHDOWN'],
  'before-flip': ['FLIP', 'LANDING BURN', 'TOUCHDOWN'],
  'landing-burn': ['LANDING BURN', 'TOUCHDOWN'],
  intro: ['LANDING BURN', 'TOUCHDOWN'],
  circularize: ['MECO', 'APOGEE', 'DEORBIT', 'ENTRY', 'MAX-Q', 'FLIP', 'LANDING BURN', 'TOUCHDOWN'],
  deorbit: ['DEORBIT', 'ENTRY', 'MAX-Q', 'FLIP', 'LANDING BURN', 'TOUCHDOWN'],
};

/** The expected track for a scenario, falling back to the general shape. */
export function trackFor(scenarioId: string): readonly EventId[] {
  return TRACKS[scenarioId] ?? DEFAULT_TRACK;
}
