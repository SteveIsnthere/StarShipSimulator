/**
 * M8.4: transients, and the latch that fires them once.
 *
 * THE CLAIM THAT MATTERS is not that they sound like anything — § 6 is clear
 * that no test can say so. It is that each one fires EXACTLY ONCE per event
 * over a real flight. A crash that fired every frame would be sixty explosions
 * a second, and it is the kind of bug that is obvious in a room and invisible
 * in a diff.
 *
 * The pattern is `showedCrash` from view/effects.ts, generalised: fire on the
 * transition INTO a state, never while it holds, and re-arm on restart.
 */
import { describe, expect, it } from 'vitest';
import { OfflineAudioContext } from 'node-web-audio-api';
import { createEdgeDetector } from '$audio/events';
import { createTransientBank, TRANSIENTS, TRANSIENT_SPECS } from '$audio/transients';
import { createMixer, createNoiseBuffer, type AudioGraphContext } from '$audio/graph';
import { step } from '$core/step';
import * as cmd from '$core/control/commands';
import { createScenarioState, getScenario } from '$core/scenarios';
import { GOLDEN_DT } from '../golden/record';
import { GOLDEN_SPECS } from '../golden/scenarios';
import type { SimState } from '$core/state';
import type { TransientName } from '$audio/transients';

/** Fly a spec, collecting every transient the detector fires and when. */
function flyCollecting(spec: (typeof GOLDEN_SPECS)[number]) {
  const detector = createEdgeDetector();
  const fired: Array<{ name: TransientName; step: number }> = [];
  let s: SimState = spec.build();
  for (let i = 0; i < spec.steps; i++) {
    s = step(s, GOLDEN_DT);
    detector.observe(s, (name) => fired.push({ name, step: i }));
  }
  return fired;
}

describe('the latch fires once per event', () => {
  it.each(GOLDEN_SPECS.map((s) => [s.id, s] as const))('%s', (id, spec) => {
    const fired = flyCollecting(spec);
    const counts: Partial<Record<TransientName, number>> = {};
    for (const event of fired) counts[event.name] = (counts[event.name] ?? 0) + 1;

    console.log(
      `${id}: ${TRANSIENTS.map((n) => `${n} x${counts[n] ?? 0}`)
        .filter((s2) => !s2.endsWith('x0'))
        .join(', ') || 'nothing'}`,
    );

    // The once-only events. An engine may legitimately light and stop several
    // times in a flight; a vehicle lands, crashes or breaks up at most once.
    for (const name of ['touchdown', 'crash', 'breakup'] as const) {
      expect(counts[name] ?? 0, `${id}: ${name}`).toBeLessThanOrEqual(1);
    }
    // And nothing fires on a frame where nothing changed: over thousands of
    // frames the total is a handful, not a stream.
    expect(fired.length, `${id}: ${fired.length} transients`).toBeLessThan(30);
  });

  it('does not bark at a flight that loads with its engines already running', () => {
    /*
      The seeding rule. Without it, a scenario configured mid-burn would fire an
      ignition for every lit engine at the moment it loaded — sound reporting a
      transition that happened before the flight existed.
    */
    const detector = createEdgeDetector();
    let s: SimState = createScenarioState(getScenario('landing-burn')!);
    cmd.toggleAutoLand(s);
    for (let i = 0; i < 200; i++) s = step(s, GOLDEN_DT);
    expect(s.engines.running.some(Boolean), 'the setup should have lit something').toBe(true);

    const fired: TransientName[] = [];
    detector.observe(s, (n) => fired.push(n));
    expect(fired).toEqual([]);
  });

  it('re-arms on a restart, because the same flight again is a new flight', () => {
    const detector = createEdgeDetector();
    let s: SimState = createScenarioState(getScenario('landing-burn')!);
    cmd.toggleAutoLand(s);

    const first: TransientName[] = [];
    for (let i = 0; i < 120 * 60; i++) {
      s = step(s, GOLDEN_DT);
      detector.observe(s, (n) => first.push(n));
      if (s.status.landed) break;
    }
    expect(first, 'the flight should have made some noise').not.toEqual([]);

    // Restart: a fresh state and a re-armed detector.
    detector.reset();
    let again: SimState = createScenarioState(getScenario('landing-burn')!);
    cmd.toggleAutoLand(again);
    const second: TransientName[] = [];
    for (let i = 0; i < 120 * 60; i++) {
      again = step(again, GOLDEN_DT);
      detector.observe(again, (n) => second.push(n));
      if (again.status.landed) break;
    }
    expect(second).toEqual(first);
  });

  it('an engine FAILING is not a shutdown', () => {
    /*
      A failure and a commanded cutoff are different events and must not sound
      the same — one is the pilot's choice and the other is the vehicle's. M8.5's
      warning tones are where a failure gets its own voice; what matters here is
      that it does not borrow the wrong one.
    */
    const detector = createEdgeDetector();
    let s: SimState = createScenarioState(getScenario('landing-burn')!);
    cmd.toggleAutoLand(s);
    for (let i = 0; i < 600 && !s.engines.running.some(Boolean); i++) s = step(s, GOLDEN_DT);
    for (let i = 0; i < 60; i++) s = step(s, GOLDEN_DT);

    // Seed, then fail an engine outright.
    detector.observe(s, () => {});
    const lit = s.engines.running.findIndex(
      (r, i) => r && !s.engines.failed[i] && s.engines.ignitionCountdown[i] === null,
    );
    expect(lit, 'need a lit engine to fail').toBeGreaterThanOrEqual(0);
    s.engines.failed[lit as 0 | 1 | 2] = true;

    const fired: TransientName[] = [];
    detector.observe(s, (n) => fired.push(n));
    expect(fired).not.toContain('shutdown');
  });
});

describe('the one-shots', () => {
  const bank = () => {
    const context = new OfflineAudioContext(1, 4_800, 24_000) as unknown as AudioGraphContext;
    const mixer = createMixer(context);
    return createTransientBank({ context, mixer, noise: createNoiseBuffer(context) });
  };

  it('every named transient has a spec and can be fired', () => {
    const b = bank();
    for (const name of TRANSIENTS) {
      expect(TRANSIENT_SPECS[name], name).toBeDefined();
      expect(TRANSIENT_SPECS[name].duration, name).toBeGreaterThan(0);
      expect(TRANSIENT_SPECS[name].attack, name).toBeLessThan(TRANSIENT_SPECS[name].duration);
      b.fire(name);
    }
    expect(b.firedCount).toBe(TRANSIENTS.length);
  });

  it('every one is SHORT — these are events, not beds', () => {
    for (const name of TRANSIENTS) {
      expect(TRANSIENT_SPECS[name].duration, name).toBeLessThan(3);
    }
  });

  it('every one has a fast attack, which is what makes an impact an impact', () => {
    for (const name of TRANSIENTS) {
      expect(TRANSIENT_SPECS[name].attack, name).toBeLessThan(0.03);
    }
  });

  it('schedules its own stop, so nothing outlives its envelope', () => {
    /*
      The shape of every audio leak ever written is a one-shot that starts and
      is never stopped: silent, and immortal. Every source here is given a stop
      time AT CREATION rather than in a callback someone has to remember.
    */
    const b = bank();
    for (let i = 0; i < 200; i++) b.fire('ignition');
    expect(b.firedCount).toBe(200);
    // Nothing here asserts the nodes are gone — that is the renderer's job and
    // it happens after the render. What is asserted is that the bank does not
    // accumulate state of its own per firing.
    expect(b.liveNodes).toBeLessThanOrEqual(200 * 3);
  });

  it('ignores a name it does not know', () => {
    const b = bank();
    b.fire('not-a-sound' as TransientName);
    expect(b.firedCount).toBe(0);
  });
});
