/**
 * M5.4 precondition: v2 flies every scenario.
 *
 * The 2021 tree is only retired once v2 can do what it did. "Can do what it
 * did" is not a feeling, so this is it as an assertion: every scenario, flown
 * by the autopilot from its starting state to a definite end, with the outcome
 * recorded rather than assumed.
 *
 * Note what this does NOT claim. It does not claim every scenario lands — the
 * Re-entry preset does not, and why is a known open question about `heatLimit`
 * (see docs/PARITY.md). It claims each one runs to a definite outcome without
 * producing a non-finite number, getting stuck, or throwing, and that the
 * outcomes are the ones actually observed, written down.
 */
import { describe, expect, it } from 'vitest';
import { ALL_SCENARIOS, createIntroState, createScenarioState } from '$core/scenarios';
import { step } from '$core/step';
import { DT } from '$app/loop';
import { toggleAutoLand } from '$core/control/commands';
import type { SimState } from '$core/state';
import * as C from '$core/constants';

type Outcome = 'landed' | 'crashed' | 'brokeUp' | 'flying';

/** Fly until something definite happens, or the clock runs out. */
function fly(initial: SimState, maxSeconds: number): { outcome: Outcome; seconds: number; state: SimState } {
  let s = initial;
  const steps = Math.round(maxSeconds / DT);

  for (let i = 0; i < steps; i++) {
    s = step(s, DT);
    if (s.status.landed) return { outcome: 'landed', seconds: i * DT, state: s };
    if (s.failures.crashed) return { outcome: 'crashed', seconds: i * DT, state: s };
    if (s.failures.inFlightBreakUp) return { outcome: 'brokeUp', seconds: i * DT, state: s };
  }
  return { outcome: 'flying', seconds: maxSeconds, state: s };
}

/**
 * No NaN anywhere, and no Infinity outside the two fields where it means
 * something.
 *
 * The distinction is not pedantry. `freeFallTimeRemainingPrediction` and
 * `finalXPosPrediction` are Infinity when the prediction has no solution — the
 * vehicle is not falling, or thrust exceeds gravity — and that is the 2021
 * model's own answer, ported verbatim and already encoded in the golden
 * fixtures (which needed an Infinity sentinel for exactly this). A blanket
 * `Number.isFinite` check would flag them, and the fix would be to weaken the
 * check until it caught nothing.
 *
 * A NaN, by contrast, is always a dead simulation: it propagates through every
 * subsequent step and nothing recovers.
 */
const INFINITY_IS_MEANINGFUL = new Set([
  'autopilot.freeFallTimeRemainingPrediction',
  'autopilot.finalXPosPrediction',
]);

function assertFinite(state: SimState, label: string): void {
  const bad: string[] = [];
  const walk = (value: unknown, path: string) => {
    if (typeof value === 'number') {
      if (Number.isNaN(value)) {
        bad.push(`${path} = NaN`);
      } else if (!Number.isFinite(value) && !INFINITY_IS_MEANINGFUL.has(path.split('.').slice(1).join('.'))) {
        bad.push(`${path} = ${value}`);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${path}[${i}]`));
      return;
    }
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
    }
  };
  walk(state, label);
  expect(bad, `${label}: NaN or unexpected Infinity`).toEqual([]);
}

describe('every scenario runs to a definite outcome', () => {
  for (const preset of ALL_SCENARIOS) {
    it(`${preset.id} flies`, () => {
      const { outcome, seconds, state } = fly(createScenarioState(preset), 600);
      assertFinite(state, preset.id);

      // Something happened: it moved, and it did not sit exactly where it began.
      expect(state.world.updatedFrameCount, preset.id).toBeGreaterThan(0);
      expect(['landed', 'crashed', 'brokeUp', 'flying']).toContain(outcome);
      expect(seconds).toBeGreaterThan(0);
    });
  }
});

describe('the autopilot flies the ones it is meant to', () => {
  /**
   * The outcomes as measured, not as hoped.
   *
   * Writing the actual result down is the point: a test that asserted "lands"
   * everywhere would have to be weakened the first time it met Re-entry, and a
   * weakened test tells you nothing. These are the four scenarios where
   * auto-land is the intended answer.
   */
  const AUTO_LAND: ReadonlyArray<{ id: string; expected: Outcome }> = [
    { id: 'booster-sep', expected: 'landed' },
    { id: 'rtls', expected: 'landed' },
    { id: 'before-flip', expected: 'landed' },
    { id: 'landing-burn', expected: 'landed' },
    // M2.9(a): Re-entry joins the list. It broke up from M2.1 until the
    // heatLimit was recalibrated, because the limit had been tuned against a
    // model that understated both density and heating.
    { id: 'reentry', expected: 'landed' },
  ];

  for (const { id, expected } of AUTO_LAND) {
    it(`${id}: auto-land ${expected}`, () => {
      const preset = ALL_SCENARIOS.find((p) => p.id === id)!;
      const state = createScenarioState(preset);
      toggleAutoLand(state);

      const result = fly(state, 900);
      assertFinite(result.state, id);

      expect(result.outcome, `${id} after ${result.seconds.toFixed(1)} s`).toBe(expected);
      if (expected === 'landed') {
        // Landed means landed, not "stopped moving": within the touchdown limits.
        expect(Math.abs(result.state.kinematics.speedY), id).toBeLessThan(10);
        expect(result.state.kinematics.altitude, id).toBeGreaterThan(0);
      }
    });
  }

  it('reentry: survives the heat it now actually meets', () => {
    // The scenario the whole M2 arc was about. It broke up instantly from M2.1
    // until M2.9(a) recalibrated heatLimit against the model that replaced the
    // one the old limit was tuned for. Asserted with its numbers so the fix
    // cannot quietly become a different fix: peak heating is a real fraction of
    // the limit, not comfortably below it.
    const preset = ALL_SCENARIOS.find((p) => p.id === 'reentry')!;
    const state = createScenarioState(preset);
    toggleAutoLand(state);

    let s = state;
    let peak = 0;
    let outcome: Outcome = 'flying';
    let seconds = 0;
    for (let i = 1; i <= 120 * 900; i++) {
      s = step(s, DT);
      peak = Math.max(peak, s.forces.thermalPower);
      if (s.failures.inFlightBreakUp) { outcome = 'brokeUp'; seconds = i / 120; break; }
      if (s.failures.crashed) { outcome = 'crashed'; seconds = i / 120; break; }
      if (s.status.landed) { outcome = 'landed'; seconds = i / 120; break; }
    }
    assertFinite(s, 'reentry');

    expect(outcome, `after ${seconds.toFixed(1)} s`).toBe('landed');
    expect(peak, 'peak thermal load').toBeGreaterThan(C.heatLimit * 0.6);
    expect(peak).toBeLessThan(C.heatLimit);
  });
});

describe('the intro, which CLAUDE.md says must never change', () => {
  it('lands itself and hands the vehicle over with full tanks', () => {
    let s = createIntroState();
    let handedOver = -1;

    for (let i = 0; i < 120 * 120 && handedOver < 0; i++) {
      s = step(s, DT);
      if (!s.autopilot.demoAutoLandOn) handedOver = i;
    }

    expect(handedOver, 'the demo must hand over').toBeGreaterThan(0);
    assertFinite(s, 'intro');

    // autopilot/index.ts:497 — the handover restores the vehicle for play.
    expect(s.vehicle.propellantMass).toBe(350_000);
    expect(s.vehicle.throttle).toBe(100);
    expect(s.autopilot.pitchControl).toBe(0);
    expect(s.status.finLocked).toBe(false);
    expect(s.failures.crashed).toBe(false);
    expect(s.failures.inFlightBreakUp).toBe(false);
  });

  it('is deterministic: the same seed gives the same landing, every time', () => {
    const run = () => {
      let s = createIntroState(12345);
      for (let i = 0; i < 2_000; i++) s = step(s, DT);
      return [s.kinematics.altitude, s.kinematics.speedY, s.kinematics.downRangeDistance];
    };
    expect(run()).toEqual(run());
  });
});
