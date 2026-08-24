/**
 * Golden trajectories — the behavioural contract.
 *
 * M1.8 acceptance: fixtures committed, and replay is bit-identical across
 * 30/60/144 fps frame batching.
 *
 * WHAT FRAME BATCHING MEANS HERE. The loop (M1.11) runs a fixed dt and drains an
 * accumulator, so a 30 fps frame runs 4 steps of 1/120 and a 144 fps frame runs
 * 0 or 1. The number of steps per frame must not change the trajectory — only
 * the total number of steps. This test batches the same 1/120 steps into groups
 * of different sizes and asserts the result is IDENTICAL, not merely close.
 *
 * If a fixture in this directory moves, physics changed. CLAUDE.md permits that
 * only under a declared Bug-fix or Fidelity tier justified in the same commit,
 * with `git diff tests/golden/fixtures/` as the evidence.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { step } from '$core/step';
import {
  deserialise,
  flattenState,
  GOLDEN_DT,
  SAMPLE_EVERY,
  samplesOf,
  type Golden,
  type Sample,
} from './record';
import { GOLDEN_SPECS } from './scenarios';

const DIR = fileURLToPath(new URL('./fixtures/', import.meta.url));

function load(id: string): Golden {
  return deserialise(readFileSync(`${DIR}${id}.json`, 'utf8'));
}

/** Fixtures are columnar on disk; comparison wants one object per instant. */
function loadSamples(id: string): Sample[] {
  return samplesOf(load(id));
}

describe.each(GOLDEN_SPECS)('$id', (spec) => {
  const golden = loadSamples(spec.id);

  it('replays exactly, field for field, sample for sample', () => {
    let s = spec.build();
    let sampleIndex = 0;

    // Sample 0 is the initial state.
    expectSampleMatches(golden, sampleIndex++, flattenState(s), spec.id, 0);

    for (let i = 1; i <= spec.steps; i++) {
      s = step(s, GOLDEN_DT);
      if (i % SAMPLE_EVERY === 0) {
        expectSampleMatches(golden, sampleIndex++, flattenState(s), spec.id, i);
      }
    }
    expect(sampleIndex, 'sample count').toBe(golden.length);
  });

  it.each([1, 2, 4, 8])('is identical when %d steps are batched per frame', (perFrame) => {
    // 4 steps/frame is 30 fps at dt=1/120; 2 is 60 fps; 1 is 120 fps.
    // 144 fps drains 0 or 1 steps per frame, covered by perFrame=1 plus the
    // ragged-batching test below.
    let s = spec.build();
    let stepsTaken = 0;
    let sampleIndex = 1;

    while (stepsTaken < spec.steps) {
      const n = Math.min(perFrame, spec.steps - stepsTaken);
      for (let k = 0; k < n; k++) {
        s = step(s, GOLDEN_DT);
        stepsTaken += 1;
        if (stepsTaken % SAMPLE_EVERY === 0) {
          expectSampleMatches(golden, sampleIndex++, flattenState(s), spec.id, stepsTaken);
        }
      }
    }
    expect(sampleIndex).toBe(golden.length);
  });

  it('is identical under ragged batching, as a real frame budget produces', () => {
    // A 144 Hz display against a 120 Hz sim yields 1,1,0,1,1,0,... and a
    // stuttering one yields anything. Batch sizes cycle irregularly here.
    const pattern = [1, 0, 2, 1, 3, 0, 1, 5, 1, 0, 2];
    let s = spec.build();
    let stepsTaken = 0;
    let sampleIndex = 1;
    let p = 0;

    while (stepsTaken < spec.steps) {
      const n = Math.min(pattern[p % pattern.length]!, spec.steps - stepsTaken);
      p += 1;
      for (let k = 0; k < n; k++) {
        s = step(s, GOLDEN_DT);
        stepsTaken += 1;
        if (stepsTaken % SAMPLE_EVERY === 0) {
          expectSampleMatches(golden, sampleIndex++, flattenState(s), spec.id, stepsTaken);
        }
      }
    }
    expect(sampleIndex).toBe(golden.length);
  });
});

/** Compare one sample, reporting the first field that differs and where. */
function expectSampleMatches(
  golden: readonly Sample[],
  index: number,
  actual: Record<string, unknown>,
  id: string,
  atStep: number,
): void {
  const expected = golden[index];
  expect(expected, `${id}: no golden sample ${index}`).toBeDefined();

  const expectedKeys = Object.keys(expected!).sort();
  const actualKeys = Object.keys(actual).sort();
  expect(actualKeys, `${id}: SimState shape changed`).toEqual(expectedKeys);

  for (const key of expectedKeys) {
    const want = expected![key];
    const got = actual[key];
    expect(
      Object.is(got, want),
      `${id} step ${atStep} (sample ${index}): ${key} is ${String(got)}, golden has ${String(want)}`,
    ).toBe(true);
  }
}

describe('the fixtures themselves', () => {
  it('there is one per spec, and no orphans', () => {
    for (const spec of GOLDEN_SPECS) {
      const g = load(spec.id);
      expect(g.scenario).toBe(spec.id);
      expect(g.steps).toBe(spec.steps);
      expect(g.dt).toBe(GOLDEN_DT);
      expect(g.sampleEvery).toBe(SAMPLE_EVERY);
      expect(samplesOf(g).length).toBe(Math.floor(spec.steps / SAMPLE_EVERY) + 1);
      // Constant folding must not lose anything: every field is in exactly one
      // of `constant` and `keys`.
      const overlap = g.keys.filter((k) => k in g.constant);
      expect(overlap, 'a field appears in both constant and keys').toEqual([]);
    }
  });

  it('round-trip through the serialiser preserves every value exactly', () => {
    // Infinity and NaN appear in SimState (pitchRecord seeds with Infinity, the
    // boostback predictions start there). JSON turns both into null, which
    // would silently erase the difference between "no prediction" and "zero" —
    // so they are encoded as sentinels. This proves the encoding is lossless.
    for (const spec of GOLDEN_SPECS) {
      const raw = readFileSync(`${DIR}${spec.id}.json`, 'utf8');
      const a = samplesOf(deserialise(raw));
      const b = samplesOf(deserialise(JSON.stringify(deserialise(raw), replacer)));
      expect(a.length).toBe(b.length);
      for (let i = 0; i < a.length; i++) {
        for (const [k, v] of Object.entries(a[i]!)) {
          expect(Object.is(b[i]![k], v), `${spec.id} sample ${i} ${k}`).toBe(true);
        }
      }
    }
  });

  it('records Infinity rather than losing it to JSON', () => {
    const first = loadSamples('landing-burn-autoland')[0]!;
    expect(first['kinematics.pitchRecord[0]']).toBe(Infinity);
    expect(first['autopilot.finalXposPrediction']).toBe(Infinity);
  });

  it('every scenario reaches a definite outcome, so the fixtures mean something', () => {
    // A golden of a vehicle sitting still proves nothing. Each of these either
    // lands, flies a long way, or is still under active control at the end.
    const outcomes: Record<string, (last: Record<string, unknown>) => boolean> = {
      'launch-pad-takeoff': (l) => Number(l['kinematics.altitude']) > 10_000,
      'booster-sep-boostback': (l) => Number(l['kinematics.altitude']) > 50_000,
      'rtls-boostback': (l) => Number(l['world.updatedFrameCount']) > 0,
      'reentry-autoland': (l) => Number(l['kinematics.altitude']) < 80_000,
      'before-flip-autoland': (l) => l['status.landed'] === true,
      'landing-burn-autoland': (l) => l['status.landed'] === true,
      'intro-demo': (l) => l['status.landed'] === true,
    };
    for (const [id, check] of Object.entries(outcomes)) {
      const samples = loadSamples(id);
      const last = samples[samples.length - 1]!;
      expect(check(last), `${id} did not reach its expected outcome`).toBe(true);
      expect(last['failures.inFightBreakUp'], `${id} broke up`).toBe(false);
    }
  });

  it('the three landing scenarios land without crashing', () => {
    for (const id of ['before-flip-autoland', 'landing-burn-autoland', 'intro-demo']) {
      const samples = loadSamples(id);
      const last = samples[samples.length - 1]!;
      expect(last['failures.crashed'], `${id} crashed`).toBe(false);
      expect(Number(last['kinematics.altitude'])).toBeLessThan(26);
    }
  });
});

function replacer(_key: string, value: unknown): unknown {
  if (value === undefined) return '@undefined';
  if (Object.is(value, -0)) return '@-0';
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return Number.isNaN(value) ? '@NaN' : value > 0 ? '@Infinity' : '@-Infinity';
  }
  return value;
}
