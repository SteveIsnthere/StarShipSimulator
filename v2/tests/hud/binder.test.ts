/**
 * M4.1: the HUD binder.
 *
 * The 2021 wound, measured: displayComponents/dispUpdate.js contains 45
 * `document.getElementById` calls, 18 of them in `updateFlightParamDisp()` —
 * the only function of the three on the per-frame path — and it assigns
 * `textContent` unconditionally. It could only afford that by running its body
 * every fifth frame (`updatedFrameCount % 5 == 0`), i.e. at 12 Hz on a 60 fps
 * machine. The binder updates at the full frame rate instead, and pays less.
 *
 * So the tests here are not "does it show the right number" — they are the
 * three properties that make it a different thing from 2021:
 *
 *   1. Elements are resolved once. The per-frame path never looks anything up.
 *   2. Writes are diffed. Unchanged readouts cost nothing.
 *   3. The whole update fits the 2 ms budget from CLAUDE.md.
 *
 * The binder takes a resolver rather than reaching for `document`, so all of
 * this runs in plain Node against counting stubs — which is also how the write
 * counts below are exact rather than approximate.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  createHudBinder,
  createIndicatorBinder,
  createMetricBinder,
  type ClassTarget,
  type TextTarget,
} from '$hud/binder';
import { READOUTS } from '$hud/readouts';
import { METRICS } from '$hud/metrics';
import { INDICATORS } from '$hud/indicators';
import { createInitialState, type SimState } from '$core/state';
import { createScenarioState, getScenario, PRESETS } from '$core/scenarios';
import { step } from '$core/step';
import { DT } from '$app/loop';
import * as cmd from '$core/control/commands';

/** A text node that records how many times it was written, and to what. */
function counter(): TextTarget & { writes: number; text: string | null } {
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

function harness() {
  const elements = new Map<string, { value: ReturnType<typeof counter>; unit: ReturnType<typeof counter> }>();
  for (const readout of READOUTS) elements.set(readout.id, { value: counter(), unit: counter() });

  const resolve = vi.fn((id: string) => {
    const pair = elements.get(id);
    return { value: pair?.value ?? null, unit: pair?.unit ?? null };
  });

  return { elements, resolve, binder: createHudBinder({ resolve }) };
}

describe('resolution happens once', () => {
  it('resolves every readout exactly once, at bind time', () => {
    const { resolve } = harness();
    expect(resolve).toHaveBeenCalledTimes(READOUTS.length);
  });

  it('never resolves again, however many frames run', () => {
    const { resolve, binder } = harness();
    resolve.mockClear();

    let state = createInitialState();
    for (let i = 0; i < 600; i++) {
      state = step(state, DT);
      binder.update(state);
    }

    // This is the 45-getElementById-per-frame wound, closed. Not reduced: zero.
    expect(resolve).toHaveBeenCalledTimes(0);
  });
});

describe('writes are diffed', () => {
  it('writes every readout on the first update, since nothing is on screen yet', () => {
    const { binder, elements } = harness();
    binder.update(createInitialState());

    for (const readout of READOUTS) {
      const pair = elements.get(readout.id)!;
      expect(pair.value.writes, readout.id).toBe(1);
      expect(pair.unit.writes, readout.id).toBe(1);
    }
    expect(binder.lastWriteCount).toBe(READOUTS.length * 2);
  });

  it('writes nothing at all on a repeat of the same state', () => {
    const { binder } = harness();
    const state = createInitialState();

    binder.update(state);
    const afterFirst = binder.totalWrites;

    for (let i = 0; i < 100; i++) binder.update(state);

    expect(binder.lastWriteCount).toBe(0);
    expect(binder.totalWrites).toBe(afterFirst);
  });

  it('writes only the readouts that actually changed', () => {
    const { binder, elements } = harness();
    const state = createInitialState();
    binder.update(state);

    const before = READOUTS.map((r) => elements.get(r.id)!.value.writes);

    // Move one readout and nothing else. Altitude is not derived from any other
    // field on this path, so exactly one value node should be touched.
    state.kinematics.altitude += 100;
    binder.update(state);

    const after = READOUTS.map((r) => elements.get(r.id)!.value.writes);
    const moved = READOUTS.filter((_, i) => after[i]! !== before[i]!).map((r) => r.id);

    expect(moved).toEqual(['altitude']);
    expect(binder.lastWriteCount).toBe(1);
  });

  it('holds a unit steady while its digits change, and switches it at the boundary', () => {
    const { binder, elements } = harness();
    const altitude = elements.get('altitude')!;
    const state = createInitialState();

    state.kinematics.altitude = 100;
    binder.update(state);
    expect(altitude.unit.text).toBe('M');
    const unitWrites = altitude.unit.writes;

    // Ten changes of altitude within metres: ten value writes, no unit write.
    for (let i = 1; i <= 10; i++) {
      state.kinematics.altitude = 100 + i;
      binder.update(state);
    }
    expect(altitude.unit.writes).toBe(unitWrites);
    expect(altitude.value.text).toBe('110');

    // Cross 1000 and the unit follows.
    state.kinematics.altitude = 2500;
    binder.update(state);
    expect(altitude.unit.writes).toBe(unitWrites + 1);
    expect(altitude.unit.text).toBe('KM');
    expect(altitude.value.text).toBe('2.5');
  });

  it('a real flight writes a small fraction of what an undiffed binder would', () => {
    // Every scenario preset, 30 s of simulated flight each at the fixed 120 Hz
    // step, measured against this same binder with the diff removed — every node
    // written on every update, which is what 2021 did per update.
    //
    // The baseline is deliberately NOT "what dispUpdate.js did", because that
    // ran at 12 Hz: a raw write-count comparison would flatter the binder by
    // counting its 10x higher update rate as a win. This compares like with
    // like — same rate, same readouts, diff on versus diff off.
    //
    // The saving is larger than it first looks, and the reason is the frame
    // rate itself: at 120 Hz most readouts move less than their displayed
    // precision from one frame to the next — a metre of altitude, 0.01 Mach —
    // so the formatted string is simply the same string again. The faster the
    // loop runs, the more the diff is worth. 2021 got the opposite deal.
    const worst: Array<{ id: string; ratio: number }> = [];

    for (const preset of PRESETS) {
      const { binder } = harness();
      let state: SimState = createScenarioState(getScenario(preset.id)!);
      cmd.toggleAutoLand(state);

      const frames = 3_600;
      for (let i = 0; i < frames; i++) {
        state = step(state, DT);
        binder.update(state);
      }

      const undiffedWrites = frames * READOUTS.length * 2;
      worst.push({ id: preset.id, ratio: binder.totalWrites / undiffedWrites });
    }

    worst.sort((a, b) => b.ratio - a.ratio);
    const report = worst.map((w) => `${w.id} ${(w.ratio * 100).toFixed(1)}%`).join(', ');

    // Measured at 0.6%-2.8% across the five presets. The bound is set an order
    // of magnitude above that: this test is here to catch the diff being lost,
    // not to pin the exact number, which legitimately moves when a readout is
    // added or a scenario is retuned.
    expect(worst[0]!.ratio, report).toBeLessThan(0.1);
  });
});

describe('missing elements', () => {
  it('tolerates a readout with no element, and still tracks the rest', () => {
    // A panel may be collapsed or not yet mounted. That must not throw, and must
    // not stop the readouts that ARE on screen from updating.
    const binder = createHudBinder({
      resolve: (id) => (id === 'altitude' ? { value: null, unit: null } : { value: counter(), unit: counter() }),
    });

    expect(() => binder.update(createInitialState())).not.toThrow();
    expect(binder.lastWriteCount).toBe((READOUTS.length - 1) * 2);
  });
});

describe('the 2 ms budget', () => {
  it('an update costs a small fraction of 2 ms, even when every readout changes', () => {
    const { binder } = harness();
    let state: SimState = createScenarioState(getScenario('reentry')!);

    // Warm up so this measures steady state, not first-call compilation.
    for (let i = 0; i < 500; i++) {
      state = step(state, DT);
      binder.update(state);
    }

    const samples: number[] = [];
    for (let run = 0; run < 7; run++) {
      const states: SimState[] = [];
      for (let i = 0; i < 1_000; i++) {
        state = step(state, DT);
        states.push(state);
      }
      const t0 = performance.now();
      for (const s of states) binder.update(s);
      samples.push((performance.now() - t0) / 1_000);
    }
    samples.sort((a, b) => a - b);
    const perUpdate = samples[Math.floor(samples.length / 2)]!;

    expect(perUpdate, `HUD update cost ${perUpdate.toFixed(4)} ms`).toBeLessThan(2);
  });

  it('all THREE binders together still fit it, on the M6.2 overlay', () => {
    /*
      The budget is per frame, not per binder, and M6.2 put a third binder on
      the frame path — the gauges, bars, dots and chevron. Measuring the readout
      binder alone would have kept saying 'green' while the actual per-frame
      cost grew, which is exactly the shape of regression a budget exists to
      catch. So this measures what App.svelte's tick really calls.
    */
    const text = harness();

    const metricEls = new Map<string, { setAttribute(name: string, value: string): void }>();
    for (const metric of METRICS) {
      metricEls.set(metric.id, { setAttribute: () => {} });
    }
    const metrics = createMetricBinder({ resolve: (id) => metricEls.get(id) ?? null });

    const indicatorEls = new Map<string, ClassTarget>();
    for (const indicator of INDICATORS) {
      indicatorEls.set(indicator.id, { classList: { toggle: () => {} } });
    }
    const indicators = createIndicatorBinder({ resolve: (id) => indicatorEls.get(id) ?? null });

    let state: SimState = createScenarioState(getScenario('reentry')!);
    cmd.toggleAutoLand(state);

    const tick = (s: SimState) => {
      text.binder.update(s);
      metrics.update(s);
      indicators.update(s);
    };

    for (let i = 0; i < 500; i++) {
      state = step(state, DT);
      tick(state);
    }

    const samples: number[] = [];
    for (let run = 0; run < 7; run++) {
      const states: SimState[] = [];
      for (let i = 0; i < 1_000; i++) {
        state = step(state, DT);
        states.push(state);
      }
      const t0 = performance.now();
      for (const s of states) tick(s);
      samples.push((performance.now() - t0) / 1_000);
    }
    samples.sort((a, b) => a - b);
    const perFrame = samples[Math.floor(samples.length / 2)]!;

    expect(perFrame, `whole-HUD frame cost ${perFrame.toFixed(4)} ms`).toBeLessThan(2);
  });
});

describe('the source itself', () => {
  it('contains no document lookups anywhere in hud/', () => {
    // The behavioural test above proves the resolver is not called again. This
    // one proves there is no second way in: no module under hud/ may reach for
    // the document at all, so a future readout cannot quietly reintroduce the
    // lookup the binder exists to remove.
    const dir = fileURLToPath(new URL('../../src/hud/', import.meta.url));
    const offenders: string[] = [];

    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.ts')) continue;
      // Comments stripped first: these files talk about the document at
      // length, because explaining the wound is half of what they are for.
      const source = readFileSync(dir + name, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      if (/getElementById|querySelector|\bdocument\b/.test(source)) offenders.push(name);
    }

    expect(offenders).toEqual([]);
  });
});
