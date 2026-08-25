/**
 * M6.3: the mission event timeline, replayed over all seven goldens.
 *
 * The acceptance line asks for the derivation to be run over the golden
 * fixtures and each scenario's event order asserted. That is done twice here,
 * from two different sources, because the two catch different things:
 *
 *   FROM THE COMMITTED BYTES. Each fixture is read off disk, un-flattened back
 *   into SimState-shaped objects, and fed through the tracker. This is the
 *   literal reading of "replayed over the golden fixtures", and it is the one
 *   that would notice a derivation quietly depending on a field the fixtures do
 *   not carry.
 *
 *   FROM THE LIVE FLIGHT. The same seven specs are flown again at the full
 *   120 Hz and observed every step — the flight as the HUD will see it.
 *
 * The two are asserted EQUAL, which is a stronger claim than it looks: the
 * fixture reading is fed one state in sixty and still reports the same events
 * in the same order on all seven flights. That is a robustness property of the
 * predicates rather than a coincidence, and it is worth pinning — the HUD runs
 * at whatever frame rate the machine gives it, so a predicate that depended on
 * catching one particular step would be broken on a slow phone and this is what
 * would say so.
 *
 * And because the seven fixtures are the behavioural contract, running anything
 * over them doubles as proof that the UI work changed no behaviour.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createTimeline, EVENT_IDS, MAX_Q_FLOOR_KPA, trackFor, TRACKS } from '$hud/timeline';
import type { EventId } from '$hud/timeline';
import { deserialise, GOLDEN_DT, samplesOf, type Sample } from '../golden/record';
import { GOLDEN_SPECS } from '../golden/scenarios';
import { step } from '$core/step';
import type { SimState } from '$core/state';
import { createScenarioState, getScenario } from '$core/scenarios';
import * as C from '$core/constants';

const DIR = fileURLToPath(new URL('../golden/fixtures/', import.meta.url));

/**
 * Rebuild a state-shaped object from one flattened sample.
 *
 * `flattenState` writes `kinematics.altitude` and `engines.running[0]`; this
 * walks those paths back into nested objects and arrays. It is the exact
 * inverse and nothing more — no defaults, no filling in. A field the fixture
 * does not carry stays absent, so a derivation that reached for one would throw
 * here rather than silently reading undefined.
 */
function unflatten(sample: Sample): SimState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const root: any = {};
  for (const [path, value] of Object.entries(sample)) {
    const parts = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = root;
    parts.forEach((part, i) => {
      const match = /^([^[]+)((?:\[\d+\])*)$/.exec(part);
      const name = match ? match[1]! : part;
      const indices = match?.[2]
        ? [...match[2].matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]))
        : [];
      const last = i === parts.length - 1 && indices.length === 0;

      if (last) {
        node[name] = value;
        return;
      }

      node[name] ??= indices.length > 0 ? [] : {};
      node = node[name];

      indices.forEach((index, j) => {
        const leaf = i === parts.length - 1 && j === indices.length - 1;
        if (leaf) node[index] = value;
        else {
          node[index] ??= {};
          node = node[index];
        }
      });
    });
  }
  return root as SimState;
}

/** Every event the derivation fires over a fixture, in order. */
function eventsFromFixture(id: string): EventId[] {
  const samples = samplesOf(deserialise(readFileSync(`${DIR}${id}.json`, 'utf8')));
  const timeline = createTimeline();
  for (const sample of samples) timeline.observe(unflatten(sample));
  return timeline.events.map((e) => e.id);
}

/** Every event the derivation fires over the same flight, flown live. */
function eventsFromFlight(spec: (typeof GOLDEN_SPECS)[number]): EventId[] {
  const timeline = createTimeline();
  let state = spec.build();
  timeline.observe(state);
  for (let i = 1; i <= spec.steps; i++) {
    state = step(state, GOLDEN_DT);
    timeline.observe(state);
  }
  return timeline.events.map((e) => e.id);
}

/**
 * What each golden flight is expected to show, in order.
 *
 * These are OBSERVED, not designed — they are what the derivation reports over
 * the recorded window, written down so a change to any predicate has to be
 * argued for rather than absorbed. Three of them are shorter than the scenario
 * name suggests, and that is the point of the recording window rather than a
 * defect: `booster-sep-boostback` shows nothing at all because in its 120 s the
 * booster is still climbing through 143 km with its engines lit, and there is
 * genuinely no named event in that stretch.
 */
const EXPECTED: Readonly<Record<string, readonly EventId[]>> = {
  // T+ 0 is liftoff, literally: step.ts only advances `timeSpent` off the pad.
  'launch-pad-takeoff': ['LIFTOFF', 'MAX-Q'],
  'booster-sep-boostback': [],
  'rtls-boostback': ['MAX-Q', 'MECO', 'APOGEE'],
  // Starts at exactly the 80 km interface and descends through it.
  'reentry-autoland': ['ENTRY'],
  'before-flip-autoland': ['FLIP', 'LANDING BURN', 'TOUCHDOWN'],
  'landing-burn-autoland': ['FLIP', 'LANDING BURN', 'TOUCHDOWN'],
  'intro-demo': ['LANDING BURN', 'TOUCHDOWN'],
};

describe('the derivation, replayed over the seven goldens', () => {
  it('covers every golden scenario, so none can be quietly exempted', () => {
    expect(GOLDEN_SPECS.map((s) => s.id).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(GOLDEN_SPECS)('$id fires its events in order, flown live', (spec) => {
    expect(eventsFromFlight(spec)).toEqual(EXPECTED[spec.id]);
  });

  it.each(GOLDEN_SPECS)('$id derives the same events from the fixture bytes', (spec) => {
    /*
      EQUALITY, not a subset — and that is a real result rather than a
      convenience. Fixtures sample every 60 steps, so the derivation is being
      fed one state in sixty, and it still reports exactly the same events in
      exactly the same order on all seven flights.

      A subset assertion was written first, on the reasonable theory that a
      brief event could fall between two samples. Nothing does, because every
      predicate here is either a latch the simulation holds (FLIP,
      LANDING BURN, DEORBIT, TOUCHDOWN) or a condition that persists for
      seconds (a q decline, a descent through 80 km). A predicate that DID
      depend on catching a single step would fail this and should: the HUD runs
      at whatever frame rate the machine gives it, not at 120 Hz.
    */
    expect(eventsFromFixture(spec.id)).toEqual(EXPECTED[spec.id]);
  });

  it('the un-flattening is faithful, or the fixture reading proves nothing', () => {
    // If `unflatten` produced empty objects, every derivation above would
    // report no events — and for `booster-sep-boostback`, whose expected list
    // is legitimately empty, that would pass while proving nothing.
    const samples = samplesOf(deserialise(readFileSync(`${DIR}intro-demo.json`, 'utf8')));
    const state = unflatten(samples[0]!);
    expect(typeof state.kinematics.altitude).toBe('number');
    expect(Array.isArray(state.engines.running)).toBe(true);
    expect(state.engines.running).toHaveLength(3);
    expect(typeof state.status.onTheGround).toBe('boolean');
    expect(typeof state.world.timeSpent).toBe('number');
  });
});

describe('events are observed, never scripted', () => {
  it('a flight that does nothing lights nothing', () => {
    // The vehicle sits on the pad with the engines off for a minute. Every
    // predicate must decline. A scripted timeline would be three events in by
    // now, describing a launch that is not happening.
    const timeline = createTimeline();
    let state = createScenarioState(getScenario('launch-pad')!);
    for (let i = 0; i < 7_200; i++) {
      timeline.observe(state);
      state = step(state, GOLDEN_DT);
    }
    expect(timeline.events).toEqual([]);
  });

  it('a hand-flown divergent flight lights only what it reaches', () => {
    // Hand-flown, badly: fall from 40 km with no autopilot and no engines. The
    // vehicle is descending, so there is no liftoff and no apogee; nothing
    // touches the autopilot latches, so no flip and no landing burn. It should
    // reach the entry interface only if it starts above it — it does not — and
    // it should end in LOSS rather than TOUCHDOWN.
    const timeline = createTimeline();
    let state = createScenarioState(getScenario('reentry')!);
    state.kinematics.altitude = 40_000;
    for (let i = 0; i < 30_000 && !timeline.has('LOSS'); i++) {
      timeline.observe(state);
      state = step(state, GOLDEN_DT);
    }
    timeline.observe(state);

    const fired = timeline.events.map((e) => e.id);
    expect(fired).not.toContain('LIFTOFF');
    expect(fired).not.toContain('FLIP');
    expect(fired).not.toContain('LANDING BURN');
    expect(fired).not.toContain('TOUCHDOWN');
    expect(fired).not.toContain('ENTRY');
    expect(fired).toContain('LOSS');
  });

  it('never fires the same event twice, however long the flight', () => {
    const timeline = createTimeline();
    let state = createScenarioState(getScenario('landing-burn')!);
    for (let i = 0; i < 6_000; i++) {
      timeline.observe(state);
      state = step(state, GOLDEN_DT);
    }
    const ids = timeline.events.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reports touchdown and loss as alternatives, never both', () => {
    for (const scenario of ['landing-burn', 'before-flip']) {
      const timeline = createTimeline();
      let state = createScenarioState(getScenario(scenario)!);
      for (let i = 0; i < 12_000; i++) {
        timeline.observe(state);
        state = step(state, GOLDEN_DT);
      }
      const ids = timeline.events.map((e) => e.id);
      expect(ids.includes('TOUCHDOWN') && ids.includes('LOSS'), scenario).toBe(false);
    }
  });
});

describe('the thresholds are the ones the replay chose', () => {
  it('max-q has a floor, and it is above a landing hop', () => {
    // 1 kPa was the first value and every 200 m hop announced MAX-Q with it,
    // because the last second of a freefall has a peak in it. The floor is what
    // separates "the vehicle met the atmosphere" from "the vehicle moved".
    expect(MAX_Q_FLOOR_KPA).toBeGreaterThan(2.9); // before-flip's peak
    expect(MAX_Q_FLOOR_KPA).toBeLessThan(23.6); // launch-pad's peak
    expect(MAX_Q_FLOOR_KPA / C.dynamicPressureLimit).toBeLessThan(0.2);
  });

  it('a state exactly at the entry interface counts as crossing it', () => {
    // The Re-entry preset starts at exactly 80 km. A strict `>` on the previous
    // sample denied the one scenario named after the event its defining moment.
    const events = eventsFromFlight(GOLDEN_SPECS.find((s) => s.id === 'reentry-autoland')!);
    expect(events).toContain('ENTRY');
  });
});

describe('the expected tracks are presentation, not detection', () => {
  it('names only events the derivation can actually fire', () => {
    for (const [scenario, track] of Object.entries(TRACKS)) {
      for (const event of track) {
        expect(EVENT_IDS, `${scenario} expects ${event}`).toContain(event);
      }
    }
  });

  it('has a track for every scenario the game ships', async () => {
    const { ALL_SCENARIOS } = await import('$core/scenarios');
    for (const scenario of ALL_SCENARIOS) {
      expect(TRACKS[scenario.id], `${scenario.id} has no declared track`).toBeDefined();
    }
  });

  it('falls back rather than throwing on a scenario it has never seen', () => {
    expect(trackFor('nothing-like-this')).toEqual(trackFor('nothing-like-this'));
    expect(trackFor('nothing-like-this').length).toBeGreaterThan(0);
  });

  it('cannot light anything — only observe() can', () => {
    // The whole freestyle guarantee in one assertion: a scenario with a long
    // expected track, flown not at all, has fired nothing.
    const timeline = createTimeline();
    expect(trackFor('circularize').length).toBeGreaterThan(5);
    expect(timeline.events).toEqual([]);
  });
});

describe('reset', () => {
  it('a new flight is a new story', () => {
    const timeline = createTimeline();
    let state = createScenarioState(getScenario('landing-burn')!);
    for (let i = 0; i < 3_000; i++) {
      timeline.observe(state);
      state = step(state, GOLDEN_DT);
    }
    expect(timeline.events.length).toBeGreaterThan(0);

    timeline.reset();
    expect(timeline.events).toEqual([]);
    expect(timeline.current).toBeUndefined();

    // And the memory went with it: re-observing the SAME final state must not
    // re-fire touchdown off a stale peak or a stale previous altitude.
    timeline.observe(state);
    expect(timeline.has('MAX-Q')).toBe(false);
  });
});
