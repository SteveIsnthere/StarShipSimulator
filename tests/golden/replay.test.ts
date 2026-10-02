/**
 * Golden trajectories — the behavioural contract.
 *
 * Each fixture is replayed from its initial state and compared sample by
 * sample: bit-exact on the platform that recorded it, within a measured
 * tolerance elsewhere (tests/golden/compare.ts says why and how much).
 *
 * That the frame rate cannot change the trajectory is the loop's property, and
 * tests/core/loop.test.ts proves it through the real accumulator.
 *
 * If a fixture in this directory moves, physics changed. `physics-change-policy` permits that
 * only under a declared Bug-fix or Fidelity tier justified in the same commit,
 * with `git diff tests/golden/fixtures/` as the evidence.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { step } from '$core/step';
import { readdirSync } from 'node:fs';
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
import { ACTIVE_REL_TOL, matches, relDiff } from './compare';

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

  it('replays field for field, sample for sample', () => {
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
    const diff = relDiff(got, want);
    expect(
      matches(got, want),
      `${id} step ${atStep} (sample ${index}): ${key} is ${String(got)}, golden has ${String(want)} (relative difference ${diff.toExponential(2)}, tolerance ${ACTIVE_REL_TOL})`,
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
      if (id !== 'reentry-autoland') {
        expect(last['failures.inFlightBreakUp'], `${id} broke up`).toBe(false);
      }
    }
  });

  it('reentry-autoland now survives — M2.9(a) recalibrated the heat limit', () => {
    // For most of the rebuild this fixture recorded a vehicle that broke up on
    // the first step: M2.1 made the air above 40 km several times denser than
    // the isotherm claimed, M2.2 fixed the units heating was expressed in, and
    // the 55-unit limit that had been tuned against both of those errors then
    // killed the preset instantly.
    //
    // M2.9(a) recalibrated the limit to preserve 2021's margin rather than
    // 2021's number — 390, derived when the limit was set by flying the preset
    // on the frozen 2021 tree and on v2. That derivation lived in
    // tests/parity/heat-margin.test.ts, deleted at M10.2; the figure is now a
    // record of how the limit was chosen, not a live check. The preset flies
    // again, and this fixture is the record of it doing so.
    const samples = loadSamples('reentry-autoland');
    for (const sample of samples) {
      expect(sample['failures.inFlightBreakUp'], 'broke up somewhere in the descent').toBe(false);
    }

    // And it is a real descent, not a vehicle sitting where it spawned: 80 km
    // down below 50 km, still descending, at the original Phase6 180 s
    // witness. The approved600s window now continues through touchdown.
    const first = samples[0]!;
    const last = samples[samples.length - 1]!;
    expect(Number(first['kinematics.altitude'])).toBeGreaterThan(79_000);
    const descent = samples[180 / (GOLDEN_DT * SAMPLE_EVERY)]!;
    expect(descent['world.updatedFrameCount']).toBe(180 / GOLDEN_DT);
    expect(Number(descent['kinematics.altitude'])).toBeLessThan(50_000);
    expect(Number(descent['kinematics.speedY'])).toBeLessThan(-100);
    expect(last['status.landed']).toBe(true);
    expect(last['failures.crashed']).toBe(false);
    expect(Number(last['kinematics.altitude'])).toBeLessThan(26);
    expect(Number(last['kinematics.speedY'])).toBe(0);
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

describe('one physics, one fixture set — M2.10', () => {
  // From M2.5 to M1.9 this directory also held a fixture per shipped fidelity
  // flag combination, suffixed `--planetCenteredGravity` and so on, because
  // "off by default" is worth nothing if the on path is untested. The flags are
  // gone: the fidelity physics is the only physics. These two assertions are
  // what stop the removal from half-happening — a leftover suffixed fixture, or
  // a spec that quietly reintroduces one.

  it('no flag-suffixed fixture survives on disk', () => {
    const orphans = readdirSync(DIR).filter((name) => name.includes('--'));
    expect(orphans, `flag-suffixed fixtures left behind: ${orphans.join(', ')}`).toEqual([]);
  });

  it('and no spec declares one', () => {
    expect(GOLDEN_SPECS.filter((spec) => spec.id.includes('--'))).toEqual([]);
    // Eight since M11.1: the seven flights plus `landing-burn-headwind`, the
    // same landing in 10 m/s of wind. That is a new SCENARIO, not a flag
    // variant of an old one — it has no `--` suffix and exercises a state field
    // (`world.wind`) every other fixture holds at zero. The count is a tripwire
    // for a suffixed fixture creeping back under a different name, so it is
    // raised here deliberately rather than dropped.
    expect(GOLDEN_SPECS).toHaveLength(8);
  });

  it('every file in the directory belongs to a spec', () => {
    const onDisk = readdirSync(DIR)
      .filter((n) => n.endsWith('.json'))
      .map((n) => n.slice(0, -5))
      .sort();
    expect(onDisk).toEqual(GOLDEN_SPECS.map((s) => s.id).sort());
  });
});
