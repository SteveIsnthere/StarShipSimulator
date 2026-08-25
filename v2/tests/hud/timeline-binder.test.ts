/**
 * M6.3: the binder that draws the event track.
 *
 * The derivation is tested against the goldens in timeline.test.ts. This is the
 * other half: given a tracker and a rendered track, does the right dot light,
 * does the narration say the right thing, and does it stay quiet when nothing
 * has happened.
 *
 * The rebinding case is the one worth having. It exists because the set of dots
 * depends on which scenario is loaded, so Configure genuinely replaces them —
 * and a binder holding the old elements would write into orphans while the new
 * dots sat dark forever, which is a bug that looks exactly like "the timeline
 * stopped working after I changed scenario".
 */
import { describe, expect, it } from 'vitest';
import {
  createTimelineBinder,
  eventMetricId,
  narrate,
  PRE_FLIGHT,
  type NodeState,
} from '$hud/timeline-binder';
import { createTimeline, type EventId } from '$hud/timeline';
import type { AttributeTarget, TextTarget } from '$hud/binder';
import { createScenarioState, getScenario } from '$core/scenarios';
import { step } from '$core/step';
import { GOLDEN_DT } from '../golden/record';
import * as cmd from '$core/control/commands';

/**
 * A landing that actually lands.
 *
 * The autopilot has to be switched on — the first draft of these tests built
 * the scenario and let it fall, which crashes the vehicle and fires LOSS rather
 * than TOUCHDOWN. That is the derivation being right, and the test being wrong.
 */
function landingFlight() {
  const state = createScenarioState(getScenario('landing-burn')!);
  cmd.toggleAutoLand(state);
  return state;
}

function dot(): AttributeTarget & { writes: number; state: string | null } {
  return {
    writes: 0,
    state: null,
    setAttribute(_name: string, value: string) {
      this.writes += 1;
      this.state = value;
    },
  };
}

function text(): TextTarget & { writes: number; text: string | null } {
  return {
    writes: 0,
    text: null,
    get textContent() {
      return this.text;
    },
    set textContent(next: string | null) {
      this.text = next;
      this.writes += 1;
    },
  };
}

const TRACK: readonly EventId[] = ['LIFTOFF', 'MAX-Q', 'MECO', 'TOUCHDOWN'];

function harness(track: readonly EventId[] = TRACK) {
  const timeline = createTimeline();
  const dots = new Map<string, ReturnType<typeof dot>>();
  for (const event of track) dots.set(eventMetricId(event), dot());
  const now = text();
  const next = text();

  const binder = createTimelineBinder({
    timeline,
    resolveText: (id) => (id === 'now' ? now : next),
  });
  binder.rebind(track, (id) => dots.get(id) ?? null);

  return { timeline, dots, now, next, binder };
}

const stateOf = (h: ReturnType<typeof harness>, event: EventId): NodeState =>
  h.dots.get(eventMetricId(event))!.state as NodeState;

describe('before anything happens', () => {
  it('every dot is pending and the narration says pre-flight', () => {
    const h = harness();
    h.binder.update();

    for (const event of TRACK) expect(stateOf(h, event), event).toBe('pending');
    expect(h.now.text).toBe(PRE_FLIGHT);
    expect(h.next.text).toBe('→ LIFTOFF');
  });

  it('writes nothing on the frames after that', () => {
    const h = harness();
    h.binder.update();
    for (let i = 0; i < 100; i++) h.binder.update();
    expect(h.binder.lastWriteCount).toBe(0);
  });
});

describe('as events arrive', () => {
  /** Fly a landing until the timeline has moved on. */
  function fly(h: ReturnType<typeof harness>, steps: number) {
    let state = landingFlight();
    for (let i = 0; i < steps; i++) {
      h.timeline.observe(state);
      h.binder.update();
      state = step(state, GOLDEN_DT);
    }
  }

  it('lights the current event and leaves the earlier ones reached', () => {
    const track: readonly EventId[] = ['FLIP', 'LANDING BURN', 'TOUCHDOWN'];
    const h = harness(track);
    fly(h, 4_000);

    // A landing-burn flight reaches all three. The last is current; the rest
    // are reached, not pending, and not current.
    expect(stateOf(h, 'TOUCHDOWN')).toBe('current');
    expect(stateOf(h, 'FLIP')).toBe('reached');
    expect(stateOf(h, 'LANDING BURN')).toBe('reached');
    expect(h.now.text).toBe('TOUCHDOWN');
    // Nothing left on the track, so nothing to point at.
    expect(h.next.text).toBe('');
  });

  it('names what is next by the track, not by what just happened', () => {
    // The distinction matters when a flight reaches something out of order or
    // something the track never expected: "next" is the first OUTSTANDING
    // expectation, which is still meaningful, where "the one after the current
    // one" would be nonsense.
    const timeline = createTimeline();
    const track: readonly EventId[] = ['LIFTOFF', 'MAX-Q', 'MECO', 'TOUCHDOWN'];

    let state = landingFlight();
    for (let i = 0; i < 4_000; i++) {
      timeline.observe(state);
      state = step(state, GOLDEN_DT);
    }

    // This flight reached TOUCHDOWN and nothing else on the track.
    expect(timeline.has('TOUCHDOWN')).toBe(true);
    expect(timeline.has('LIFTOFF')).toBe(false);

    const { now, next } = narrate(timeline, track);
    expect(now).toBe('TOUCHDOWN');
    expect(next).toBe('LIFTOFF');
  });

  it('costs one write per dot that actually changed', () => {
    const track: readonly EventId[] = ['FLIP', 'LANDING BURN', 'TOUCHDOWN'];
    const h = harness(track);
    fly(h, 4_000);

    // Three dots. FLIP goes pending -> current -> reached, LANDING BURN the
    // same, TOUCHDOWN pending -> current. Nine writes at the very most, over
    // four thousand frames.
    const dotWrites = [...h.dots.values()].reduce((sum, d) => sum + d.writes, 0);
    expect(dotWrites, `${dotWrites} dot writes over 4000 frames`).toBeLessThanOrEqual(9);
  });
});

describe('rebinding, when the scenario changes', () => {
  it('writes into the new dots and forgets the old ones', () => {
    const h = harness();
    h.binder.update();

    const replacement: readonly EventId[] = ['FLIP', 'TOUCHDOWN'];
    const fresh = new Map<string, ReturnType<typeof dot>>();
    for (const event of replacement) fresh.set(eventMetricId(event), dot());
    h.binder.rebind(replacement, (id) => fresh.get(id) ?? null);

    const oldWrites = [...h.dots.values()].reduce((sum, d) => sum + d.writes, 0);
    h.binder.update();

    // Every new dot was written on the first update after a rebind — they are
    // freshly rendered and must never be left showing a stale state.
    for (const [id, el] of fresh) expect(el.writes, id).toBe(1);
    // And nothing touched the elements that are no longer in the document.
    expect([...h.dots.values()].reduce((sum, d) => sum + d.writes, 0)).toBe(oldWrites);
  });

  it('re-narrates against the new track', () => {
    const h = harness();
    h.binder.update();
    expect(h.next.text).toBe('→ LIFTOFF');

    h.binder.rebind(['FLIP', 'TOUCHDOWN'], () => null);
    h.binder.update();
    expect(h.next.text).toBe('→ FLIP');
  });
});

describe('a reset flight starts the story again', () => {
  it('puts every dot back to pending', () => {
    const track: readonly EventId[] = ['FLIP', 'LANDING BURN', 'TOUCHDOWN'];
    const h = harness(track);

    let state = landingFlight();
    for (let i = 0; i < 4_000; i++) {
      h.timeline.observe(state);
      state = step(state, GOLDEN_DT);
    }
    h.binder.update();
    expect(stateOf(h, 'TOUCHDOWN')).toBe('current');

    h.timeline.reset();
    h.binder.update();

    for (const event of track) expect(stateOf(h, event), event).toBe('pending');
    expect(h.now.text).toBe(PRE_FLIGHT);
  });
});
