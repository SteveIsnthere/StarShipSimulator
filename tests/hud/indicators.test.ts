/**
 * M4.2: the indicator binder.
 *
 * 2021's `updateButtons()` repainted fourteen buttons unconditionally. Each
 * `buttonSwitchOn`/`buttonSwitchOff` did two `getElementById` calls and wrote
 * two inline style properties, so a full repaint was 56 lookups and 56 style
 * writes to communicate, usually, nothing at all.
 *
 * The interesting property is not the saving though — it is that an indicator
 * can change with no input at all. The autopilot shuts engines down; a landing
 * clears autoLand. A panel that repainted on click would show a lie the moment
 * the simulation disagreed with it. So these tests check both: that the binder
 * is quiet, and that it is not quiet when the simulation moves on its own.
 */
import { describe, expect, it, vi } from 'vitest';
import { createIndicatorBinder, type ClassTarget } from '$hud/binder';
import { INDICATORS } from '$hud/indicators';
import { createInitialState, type SimState } from '$core/state';
import { createScenarioState, getScenario } from '$core/scenarios';
import { step } from '$core/step';
import { DT } from '$app/loop';
import { applyControl } from '$ui/controls';

/** A class list that records every toggle. */
function target(): ClassTarget & { toggles: boolean[]; on: boolean } {
  const self = {
    toggles: [] as boolean[],
    on: false,
    classList: {
      toggle(_token: string, force: boolean) {
        self.on = force;
        self.toggles.push(force);
      },
    },
  };
  return self;
}

function harness() {
  const elements = new Map<string, ReturnType<typeof target>>();
  for (const indicator of INDICATORS) elements.set(indicator.id, target());

  const resolve = vi.fn((id: string) => elements.get(id) ?? null);
  return { elements, resolve, binder: createIndicatorBinder({ resolve }) };
}

describe('resolution happens once', () => {
  it('resolves each indicator once and never again', () => {
    const { resolve, binder } = harness();
    expect(resolve).toHaveBeenCalledTimes(INDICATORS.length);
    resolve.mockClear();

    let state = createInitialState();
    for (let i = 0; i < 300; i++) {
      state = step(state, DT);
      binder.update(state);
    }
    expect(resolve).toHaveBeenCalledTimes(0);
  });
});

describe('writes are diffed', () => {
  it('paints every indicator on the first update, then goes silent', () => {
    const { binder } = harness();
    const state = createInitialState();

    binder.update(state);
    expect(binder.lastWriteCount).toBe(INDICATORS.length);

    for (let i = 0; i < 500; i++) binder.update(state);
    expect(binder.lastWriteCount).toBe(0);
    expect(binder.totalWrites).toBe(INDICATORS.length);
  });

  it('writes exactly one indicator when one toggle is pressed', () => {
    const { binder, elements } = harness();
    const state = createInitialState();
    binder.update(state);

    applyControl(state, { type: 'rcs' });
    binder.update(state);

    expect(binder.lastWriteCount).toBe(1);
    expect(elements.get('rcs')!.on).toBe(true);
    expect(elements.get('fins')!.on).toBe(false);
  });

  it('an untouched panel costs nothing across a whole flight', () => {
    // No input at all: only what the simulation does to itself should show up.
    const { binder } = harness();
    let state: SimState = createScenarioState(getScenario('booster-sep')!);

    binder.update(state);
    const afterFirst = binder.totalWrites;

    for (let i = 0; i < 3_600; i++) {
      state = step(state, DT);
      binder.update(state);
    }

    // 2021's equivalent would have been 3600 x 14 repaints. A handful here.
    const changes = binder.totalWrites - afterFirst;
    expect(changes, `${changes} indicator changes over 30 s`).toBeLessThan(50);
  });
});

describe('indicators follow the simulation, not the buttons', () => {
  it('an engine lights up during its ignition countdown, before it is running', () => {
    // The countdown runs up to ~0.6 s. A button that stayed dark through it
    // would invite a second press, which switches.js:16 treats as a cancel.
    const { binder, elements } = harness();
    const state = createInitialState();
    binder.update(state);

    applyControl(state, { type: 'raptor', engine: 0 });
    binder.update(state);

    expect(state.engines.running[0]).toBe(false);
    expect(elements.get('raptor0')!.on).toBe(true);
  });

  it('goes dark when the simulation shuts an engine down on its own', () => {
    const { binder, elements } = harness();
    let state: SimState = createScenarioState(getScenario('landing-burn')!);

    applyControl(state, { type: 'raptor', engine: 0 });
    for (let i = 0; i < 240; i++) state = step(state, DT);
    binder.update(state);
    expect(elements.get('raptor0')!.on).toBe(true);

    // Nobody presses anything here. The engine stops because the flight ends.
    let quenched = false;
    for (let i = 0; i < 6_000 && !quenched; i++) {
      state = step(state, DT);
      binder.update(state);
      quenched = !elements.get('raptor0')!.on;
    }

    expect(quenched, 'the engine indicator should clear itself').toBe(true);
    expect(state.engines.running[0]).toBe(false);
  });

  it('every indicator id is unique and has a predicate', () => {
    const ids = INDICATORS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);

    const state = createInitialState();
    for (const indicator of INDICATORS) {
      expect(typeof indicator.on(state), indicator.id).toBe('boolean');
    }
  });
});

describe('missing elements', () => {
  it('tolerates an indicator with no element', () => {
    const binder = createIndicatorBinder({
      resolve: (id) => (id === 'rcs' ? null : target()),
    });
    expect(() => binder.update(createInitialState())).not.toThrow();
    expect(binder.lastWriteCount).toBe(INDICATORS.length - 1);
  });
});
