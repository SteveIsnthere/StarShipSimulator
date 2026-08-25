/**
 * M6.2: the drawn readouts, and the binder that writes them.
 *
 * Everything in `$hud/metrics` is a pure function of SimState, so all of this
 * runs in Node against counting stubs — which is the only reason the claims
 * below are exact rather than approximate. The three that matter:
 *
 *   1. The quantisation actually suppresses writes. A gauge whose arc is
 *      rewritten every frame would be a per-frame DOM write and a per-frame
 *      string allocation, and would have undone M4.1 quietly.
 *   2. `format` runs ONLY when the quantum moved. That is the allocation claim,
 *      and it is checked by counting calls, not by inspecting the heap.
 *   3. The auto-ranging is a function, not remembered state.
 */
import { describe, expect, it, vi } from 'vitest';
import { createMetricBinder, type AttributeTarget } from '$hud/binder';
import {
  altitudeFraction,
  ALTITUDE_SCALES,
  arcOffset,
  CAUTION_FRACTION,
  engineState,
  ENGINE_STATES,
  GAUGE_SWEEP,
  limitState,
  METRICS,
  propellantFraction,
  scaleFor,
  speedFraction,
  SPEED_SCALES,
} from '$hud/metrics';
import { createInitialState, type SimState } from '$core/state';
import { createScenarioState, getScenario } from '$core/scenarios';
import { step } from '$core/step';
import { DT } from '$app/loop';
import * as C from '$core/constants';
import * as cmd from '$core/control/commands';

/** An element that records every attribute write. */
function target(): AttributeTarget & { writes: number; last: string | null } {
  return {
    writes: 0,
    last: null,
    setAttribute(_name: string, value: string) {
      this.writes += 1;
      this.last = value;
    },
  };
}

function harness() {
  const elements = new Map<string, ReturnType<typeof target>>();
  for (const metric of METRICS) elements.set(metric.id, target());
  const resolve = vi.fn((id: string) => elements.get(id) ?? null);
  return { elements, resolve, binder: createMetricBinder({ resolve }) };
}

describe('resolution happens once', () => {
  it('resolves every metric exactly once, at bind time', () => {
    const { resolve } = harness();
    expect(resolve).toHaveBeenCalledTimes(METRICS.length);
  });

  it('never resolves again, however many frames run', () => {
    const { resolve, binder } = harness();
    resolve.mockClear();

    let state = createInitialState();
    for (let i = 0; i < 600; i++) {
      state = step(state, DT);
      binder.update(state);
    }

    expect(resolve).toHaveBeenCalledTimes(0);
  });
});

describe('writes are diffed', () => {
  it('the first update writes every metric, and only once', () => {
    const { elements, binder } = harness();
    binder.update(createInitialState());
    for (const [id, el] of elements) expect(el.writes, id).toBe(1);
    expect(binder.lastWriteCount).toBe(METRICS.length);
  });

  it('a repeated identical state writes nothing at all', () => {
    const { binder } = harness();
    const state = createInitialState();
    binder.update(state);
    for (let i = 0; i < 100; i++) binder.update(state);
    expect(binder.lastWriteCount).toBe(0);
  });

  it('a vehicle sitting on the pad costs almost nothing per frame', () => {
    // The point of quantising. Nothing is moving, so nothing should be written
    // — where a naive float diff would write both gauges on every frame.
    const { binder } = harness();
    let state = createScenarioState(getScenario('launch-pad')!);
    binder.update(state);

    let writes = 0;
    for (let i = 0; i < 300; i++) {
      state = step(state, DT);
      binder.update(state);
      writes += binder.lastWriteCount;
    }

    expect(writes, `${writes} writes over 300 still frames`).toBe(0);
  });

  it('formats only on the frames where the quantum moved', () => {
    // The allocation claim, counted rather than assumed: `format` builds a
    // string, so calling it on an unchanged frame is exactly the per-frame
    // allocation CLAUDE.md forbids.
    const spied = METRICS.map((metric) => ({
      metric,
      spy: vi.spyOn(metric, 'format'),
    }));

    const { binder } = harness();
    const state = createScenarioState(getScenario('launch-pad')!);
    binder.update(state);
    for (const { spy } of spied) spy.mockClear();

    for (let i = 0; i < 200; i++) binder.update(state);

    for (const { metric, spy } of spied) {
      expect(spy, metric.id).not.toHaveBeenCalled();
      spy.mockRestore();
    }
  });

  it('a real descent writes far less than a metric per frame', () => {
    const { binder } = harness();
    let state = createScenarioState(getScenario('landing-burn')!);
    cmd.toggleAutoLand(state);
    binder.update(state);

    let writes = 0;
    const frames = 1_200;
    for (let i = 0; i < frames; i++) {
      state = step(state, DT);
      binder.update(state);
      writes += binder.lastWriteCount;
    }

    // Ten metrics on the list; a landing moves two gauges, a chevron and some
    // engine dots. Anything approaching frames*METRICS.length would mean the
    // quantisation is not doing its job.
    const perFrame = writes / frames;
    expect(perFrame, `${perFrame.toFixed(2)} writes/frame`).toBeLessThan(METRICS.length / 2);
  });
});

describe('the gauges auto-range', () => {
  it('picks the smallest scale that contains the value', () => {
    expect(scaleFor(0, SPEED_SCALES)).toBe(200);
    expect(scaleFor(199, SPEED_SCALES)).toBe(200);
    expect(scaleFor(201, SPEED_SCALES)).toBe(500);
    expect(scaleFor(7_999, SPEED_SCALES)).toBe(8_000);
  });

  it('clamps to the largest rung rather than overflowing the dial', () => {
    // Orbital velocity is beyond the top rung; the arc must saturate at full
    // rather than wrap around, which is what an unclamped fraction would do.
    expect(scaleFor(1e9, SPEED_SCALES)).toBe(SPEED_SCALES[SPEED_SCALES.length - 1]);
    const state = createInitialState();
    state.kinematics.trueSpeed = 1e9;
    expect(speedFraction(state)).toBe(1);
  });

  it('is a function of state, with no memory between calls', () => {
    // The property that makes it testable AND keeps per-frame mutable state
    // out of the HUD. Ask twice in any order, get the same answers.
    const fast = createInitialState();
    fast.kinematics.trueSpeed = 3_000;
    const slow = createInitialState();
    slow.kinematics.trueSpeed = 50;

    const first = [speedFraction(fast), speedFraction(slow), speedFraction(fast)];
    expect(first[0]).toBe(first[2]);
    expect(first[1]).not.toBe(first[0]);
  });

  it('never reports a negative altitude fraction', () => {
    // The vehicle can be fractionally below zero on the pad; a negative arc
    // would render as a dash offset past the end of the sweep.
    const state = createInitialState();
    state.kinematics.altitude = -3;
    expect(altitudeFraction(state)).toBe(0);
    expect(scaleFor(-3, ALTITUDE_SCALES)).toBe(1_000);
  });

  it('an empty arc is the full sweep, a full arc is zero', () => {
    expect(arcOffset(0)).toBeCloseTo(GAUGE_SWEEP, 10);
    expect(arcOffset(1)).toBe(0);
  });
});

describe('the engine dots say what the engines are doing', () => {
  const state = () => createScenarioState(getScenario('launch-pad')!);

  it('reads off, igniting, lit and failed', () => {
    const s: SimState = state();
    expect(ENGINE_STATES[engineState(s, 0)]).toBe('off');

    s.engines.ignitionCountdown[0] = 0.4;
    expect(ENGINE_STATES[engineState(s, 0)]).toBe('igniting');

    s.engines.ignitionCountdown[0] = null;
    s.engines.running[0] = true;
    expect(ENGINE_STATES[engineState(s, 0)]).toBe('lit');

    s.engines.failed[0] = true;
    expect(ENGINE_STATES[engineState(s, 0)]).toBe('failed');
  });

  it('failure wins over everything, because it is the thing to know', () => {
    const s = state();
    s.engines.running[1] = true;
    s.engines.ignitionCountdown[1] = 0.2;
    s.engines.failed[1] = true;
    expect(ENGINE_STATES[engineState(s, 1)]).toBe('failed');
  });

  it('lights during the countdown, not only after it', () => {
    // switches.js:16 treats a second press as a cancel, so a dot that stayed
    // dark through the ~0.6 s ignition would actively invite a mis-click.
    let s = state();
    cmd.toggleAllRaptors(s);
    expect(ENGINE_STATES[engineState(s, 0)]).toBe('igniting');
    for (let i = 0; i < 5; i++) s = step(s, DT);
    expect(ENGINE_STATES[engineState(s, 0)]).toBe('igniting');
  });
});

describe('colour appears only as meaning', () => {
  it('is nominal below the caution fraction, and alarm at the limit', () => {
    expect(limitState(0, 100)).toBe(0);
    expect(limitState(CAUTION_FRACTION * 100 - 0.01, 100)).toBe(0);
    expect(limitState(CAUTION_FRACTION * 100, 100)).toBe(1);
    expect(limitState(99.9, 100)).toBe(1);
    expect(limitState(100, 100)).toBe(2);
    expect(limitState(1e6, 100)).toBe(2);
  });

  it('is wired to the two limits that can actually end a flight', () => {
    const heat = METRICS.find((m) => m.id === 'heat-state')!;
    const q = METRICS.find((m) => m.id === 'q-state')!;

    const s = createInitialState();
    s.forces.thermalPower = C.heatLimit;
    s.forces.dynamicPressure = C.dynamicPressureLimit;
    expect(heat.format(heat.quantum(s))).toBe('alarm');
    expect(q.format(q.quantum(s))).toBe('alarm');

    s.forces.thermalPower = 0;
    s.forces.dynamicPressure = 0;
    expect(heat.format(heat.quantum(s))).toBe('nominal');
    expect(q.format(q.quantum(s))).toBe('nominal');
  });
});

describe('the propellant bars', () => {
  it('read full at the start and empty when the tanks are dry', () => {
    const s = createInitialState();
    s.vehicle.propellantMass = C.propellantMass;
    expect(propellantFraction(s)).toBe(1);
    s.vehicle.propellantMass = 0;
    expect(propellantFraction(s)).toBe(0);
  });

  it('clamp, because a scenario may be configured over a full load', () => {
    const s = createInitialState();
    s.vehicle.propellantMass = C.propellantMass * 3;
    expect(propellantFraction(s)).toBe(1);
    s.vehicle.propellantMass = -1;
    expect(propellantFraction(s)).toBe(0);
  });

  it('both bars follow the one tank the simulation actually has', () => {
    // Documented rather than hidden: core is frozen for M6 and has a single
    // propellant mass. Drawing the pair is the reference's shape; driving them
    // from one number is the honest implementation of it.
    const ch4 = METRICS.find((m) => m.id === 'propellant-ch4')!;
    const lox = METRICS.find((m) => m.id === 'propellant-lox')!;
    const s = createInitialState();
    s.vehicle.propellantMass = C.propellantMass * 0.42;
    expect(ch4.quantum(s)).toBe(lox.quantum(s));
  });
});

describe('the metric list itself', () => {
  it('has unique ids — a duplicate would resolve to one element', () => {
    const ids = METRICS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('formats every metric to a non-empty string across a whole flight', () => {
    // A format that returned undefined for some quantum would write the string
    // "undefined" into an attribute and fail silently on screen.
    let state = createScenarioState(getScenario('reentry')!);
    cmd.toggleAutoLand(state);
    for (let i = 0; i < 3_000; i++) {
      state = step(state, DT);
      if (i % 100 !== 0) continue;
      for (const metric of METRICS) {
        const text = metric.format(metric.quantum(state));
        expect(typeof text, metric.id).toBe('string');
        expect(text.length, metric.id).toBeGreaterThan(0);
        expect(text, metric.id).not.toContain('NaN');
      }
    }
  });
});
