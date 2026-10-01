/**
 * Golden trajectory recorder.
 *
 * A golden is a full state history for one scenario, sampled every N steps and
 * committed to tests/golden/fixtures/. It is the behavioural contract: a
 * refactor that moves one has changed physics, whatever its author intended.
 *
 * WHY SAMPLED, NOT EVERY STEP. A 60 s flight at 120 Hz is 7200 states; at ~60
 * numeric fields each that is half a million numbers per scenario. Sampling
 * every 24 steps (5 Hz) keeps fixtures reviewable in a diff while still
 * catching any divergence — errors in a feedback loop grow, they do not hide
 * for a fifth of a second and then vanish.
 *
 * WHY FULL PRECISION. Values are written with the shortest round-trip decimal
 * form JavaScript produces (`String(x)`), so reading a fixture back gives the
 * identical double. Rounding for readability would make the contract weaker
 * than the code it guards.
 */
import type { SimState } from '$core/state';
import { step } from '$core/step';

/**
 * How often a state is sampled, in steps. 60 at 120 Hz is 2 Hz.
 *
 * Sampling is safe because divergence in a feedback loop grows: a trajectory
 * that differs at step N differs at every step after it, so a coarser sample
 * reports the same failure slightly later rather than missing it. Verified by
 * mutation — a one-ULP change to `gravity` is caught in the very first sample.
 */
export const SAMPLE_EVERY = 60;

/** The fixed timestep goldens are recorded at. */
export const GOLDEN_DT = 1 / 120;

/** One sampled instant, flattened to `path -> value` for diffable output. */
export type Sample = Record<string, number | boolean | null | undefined>;

/**
 * A recorded flight.
 *
 * Stored columnar rather than as a list of objects, for two reasons that pull
 * the same way. Repeating 140 key strings in every sample made the seven
 * fixtures 21 MB, which is not something to put in a repository. And a diff of
 * that format is unreadable: a single changed number is buried in a wall of
 * re-printed keys.
 *
 * So keys are listed once, fields that never change across the whole flight are
 * folded into `constant`, and each sample is one line of values in key order.
 * A behavioural change then shows up as a handful of changed lines with the
 * key list right there to index into — which is what makes "a refactor that
 * moves a fixture fails CI" a reviewable claim rather than a wall of noise.
 */
export interface Golden {
  /** Scenario id. */
  readonly scenario: string;
  /** Steps recorded in total. */
  readonly steps: number;
  readonly dt: number;
  readonly sampleEvery: number;
  /** RNG seed, so the fixture pins the random draws too. */
  readonly seed: number;
  /** What was switched on for this run. */
  readonly setup: string;
  /** Fields identical in every sample, stored once. */
  readonly constant: Sample;
  /** Names of the fields that vary, in sample-column order. */
  readonly keys: readonly string[];
  /** One row per sample, values in `keys` order. */
  readonly rows: ReadonlyArray<ReadonlyArray<number | boolean | null | undefined>>;
}

/** Rebuild the full per-sample view a comparison needs. */
export function samplesOf(golden: Golden): Sample[] {
  return golden.rows.map((row) => {
    const sample: Sample = { ...golden.constant };
    golden.keys.forEach((key, i) => {
      sample[key] = row[i];
    });
    return sample;
  });
}

/**
 * Flatten a SimState into `path -> leaf`. Arrays become indexed paths so a
 * changed engine or pitchRecord entry shows up as its own line in a diff.
 */
export function flattenState(value: unknown, prefix = '', out: Sample = {}): Sample {
  if (Array.isArray(value)) {
    value.forEach((v, i) => flattenState(v, `${prefix}[${i}]`, out));
  } else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      flattenState(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else {
    out[prefix] = value as number | boolean | null | undefined;
  }
  return out;
}

/**
 * Run a scenario and record it.
 *
 * @param setup a description of what was toggled on, stored in the fixture so
 *   a reader knows what flight they are looking at without running it
 */
export function record(
  scenario: string,
  initial: SimState,
  steps: number,
  setup: string,
): Golden {
  const samples: Sample[] = [flattenState(initial)];
  let s = initial;
  for (let i = 1; i <= steps; i++) {
    s = step(s, GOLDEN_DT);
    if (i % SAMPLE_EVERY === 0) samples.push(flattenState(s));
  }

  const allKeys = Object.keys(samples[0]!).sort();
  const constant: Sample = {};
  const keys: string[] = [];
  for (const key of allKeys) {
    if (samples.every((sample) => Object.is(sample[key], samples[0]![key]))) {
      constant[key] = samples[0]![key];
    } else {
      keys.push(key);
    }
  }
  const rows = samples.map((sample) => keys.map((key) => sample[key]));

  return {
    scenario,
    steps,
    dt: GOLDEN_DT,
    sampleEvery: SAMPLE_EVERY,
    seed: initial.rng.seed,
    setup,
    constant,
    keys,
    rows,
  };
}

/**
 * Serialise a golden with every value round-tripping exactly.
 *
 * JSON.stringify emits shortest-round-trip decimals for finite doubles, which is
 * what makes a fixture as precise as the code it guards. Three things it does
 * NOT survive, all of which occur in SimState, all encoded as sentinels here:
 *
 *   Infinity   pitchRecord seeds with it; so do the boostback predictions.
 *              JSON writes null, erasing the difference between "no prediction
 *              yet" and "zero".
 *   NaN        same fate. No field uses it as a sentinel any more (M1.5 moved
 *              ignitionCountdown to null for exactly this reason) but a stray
 *              NaN must show up in a diff, not vanish into null.
 *   undefined  JSON omits the KEY entirely. Six autopilot fields are
 *              `number | undefined` until their stage runs, so without this the
 *              fixture would have a different shape at different points in the
 *              flight — which is how this was caught: the replay test compares
 *              key sets and found 134 recorded against 140 live.
 *   -0         JSON.stringify(-0) writes "0". The sign of zero survives through
 *              the quadrant ladders (M1.3 documented -sin(0) = -0 there) and the
 *              replay test compares with Object.is, so losing it turns a clean
 *              replay into a spurious failure — or worse, hides a real one.
 */
function encode(value: unknown): unknown {
  if (value === undefined) return '@undefined';
  if (Object.is(value, -0)) return '@-0';
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return Number.isNaN(value) ? '@NaN' : value > 0 ? '@Infinity' : '@-Infinity';
  }
  return value;
}

export function serialise(golden: Golden): string {
  const { scenario, steps, dt, sampleEvery, seed, setup, constant, keys, rows } = golden;
  const head = JSON.stringify({ scenario, steps, dt, sampleEvery, seed, setup }, null, 1).slice(
    1,
    -2,
  );
  const enc = (v: unknown) => JSON.stringify(encode(v));
  const constantLines = Object.entries(constant).map(([k, v]) => `  ${JSON.stringify(k)}: ${enc(v)}`);
  // One sample per line: a changed instant is a changed line in the diff.
  const rowLines = rows.map((row) => `  [${row.map(enc).join(',')}]`);

  return [
    '{',
    head + ',',
    ' "constant": {',
    constantLines.join(',\n'),
    ' },',
    ' "keys": [',
    keys.map((k) => `  ${JSON.stringify(k)}`).join(',\n'),
    ' ],',
    ' "rows": [',
    rowLines.join(',\n'),
    ' ]',
    '}',
  ].join('\n');
}

export function deserialise(text: string): Golden {
  // Infinity and NaN are restored in the reviver, but '@undefined' must NOT be:
  // a JSON.parse reviver that returns undefined DELETES the key, which would
  // undo exactly what the sentinel exists to preserve. It is converted in a
  // second pass by explicit assignment, which keeps the key present.
  const golden = JSON.parse(text, (_key, value: unknown) => {
    if (value === '@NaN') return NaN;
    if (value === '@Infinity') return Infinity;
    if (value === '@-Infinity') return -Infinity;
    if (value === '@-0') return -0;
    return value;
  }) as Golden;

  const con = golden.constant as Record<string, unknown>;
  for (const key of Object.keys(con)) {
    if (con[key] === '@undefined') con[key] = undefined;
  }
  const rows = golden.rows as unknown as unknown[][];
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '@undefined') row[i] = undefined;
    }
  }
  return golden;
}
