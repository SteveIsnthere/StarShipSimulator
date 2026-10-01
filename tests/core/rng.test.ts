/**
 * M1.2 acceptance: 10k-draw sequence stable; drawing from one stream leaves the
 * other untouched.
 *
 * Both matter for a specific reason. If sequences are not stable across runs,
 * golden fixtures cannot exist. If streams are not independent, adding one new
 * random effect anywhere in the sim shifts every other stream and invalidates
 * every committed fixture at once.
 */
import { describe, expect, it } from 'vitest';
import { cloneRng, createRng, draw, hash, peek, STREAM_NAMES, type StreamName } from '$core/rng';
import { createInitialState, DEFAULT_SEED } from '$core/state';

/**
 * Pearson correlation over paired samples.
 *
 * Deliberately not "covariance times 12". Assuming variance is 1/12 makes the
 * check vacuous against a generator whose variance collapses: a counter ramp
 * like `(seed*3 + counter) / 2^32` is almost perfectly correlated yet has
 * near-zero covariance, and would sail through. Measuring both variances is
 * what makes this test bite. Verified by exactly that mutation.
 */
function correlation(pairs: Iterable<readonly [number, number]>): number {
  let n = 0;
  let sa = 0;
  let sb = 0;
  let saa = 0;
  let sbb = 0;
  let sab = 0;
  for (const [a, b] of pairs) {
    n += 1;
    sa += a;
    sb += b;
    saa += a * a;
    sbb += b * b;
    sab += a * b;
  }
  const cov = sab / n - (sa / n) * (sb / n);
  const va = saa / n - (sa / n) ** 2;
  const vb = sbb / n - (sb / n) ** 2;
  return cov / Math.sqrt(va * vb);
}

/** Sample variance, to assert the distribution has not collapsed. */
function variance(values: Iterable<number>): number {
  let n = 0;
  let s = 0;
  let ss = 0;
  for (const v of values) {
    n += 1;
    s += v;
    ss += v * v;
  }
  return ss / n - (s / n) ** 2;
}

const take = (seed: number, stream: StreamName, n: number): number[] => {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => draw(rng, stream));
};

describe('reproducibility', () => {
  it('a 10k-draw sequence is identical across generators with the same seed', () => {
    const a = take(12345, 'ignitionDelay', 10_000);
    const b = take(12345, 'ignitionDelay', 10_000);
    expect(a).toEqual(b);
    expect(a).toHaveLength(10_000);
  });

  it('a different seed gives a different sequence', () => {
    const a = take(1, 'ignitionDelay', 1_000);
    const b = take(2, 'ignitionDelay', 1_000);
    expect(a).not.toEqual(b);
    // Not merely different overall — essentially every element differs.
    const same = a.filter((v, i) => v === b[i]).length;
    expect(same).toBe(0);
  });

  it('is stable against this committed sequence, so a hash change cannot pass silently', () => {
    // Regenerating these is a Bug-fix or Fidelity tier decision, like any golden.
    const first5 = take(DEFAULT_SEED, 'ignitionDelay', 5);
    expect(first5.map((v) => v.toFixed(12))).toEqual([
      '0.794301226269',
      '0.950300228549',
      '0.003106360789',
      '0.131635287311',
      '0.651959306095',
    ]);
  });
});

describe('seek — the point of a counter-based generator', () => {
  it('peek at index N equals the Nth sequential draw', () => {
    const seq = take(999, 'ignitionDelay', 500);
    const rng = createRng(999);
    for (const i of [0, 1, 7, 42, 199, 499]) {
      expect(peek(rng, 'ignitionDelay', i), `index ${i}`).toBe(seq[i]);
    }
  });

  it('peek does not advance the counter', () => {
    const rng = createRng(7);
    peek(rng, 'ignitionDelay', 5000);
    peek(rng, 'ignitionDelay', 5001);
    expect(rng.counters.ignitionDelay).toBe(0);
    // ...so the next draw is still index 0.
    expect(draw(rng, 'ignitionDelay')).toBe(peek(createRng(7), 'ignitionDelay', 0));
  });
});

describe('stream independence', () => {
  it('drawing from one stream leaves the other untouched', () => {
    const rng = createRng(4242);
    const expectedFailure = Array.from({ length: 5 }, (_, i) =>
      peek(createRng(4242), 'ignitionFailure', i),
    );

    // Hammer one stream.
    for (let i = 0; i < 1_000; i++) draw(rng, 'ignitionDelay');

    expect(rng.counters.ignitionFailure).toBe(0);
    const actual = Array.from({ length: 5 }, () => draw(rng, 'ignitionFailure'));
    expect(actual).toEqual(expectedFailure);
  });

  it('the same counter in different streams gives different values', () => {
    const rng = createRng(11);
    for (let i = 0; i < 200; i++) {
      expect(peek(rng, 'ignitionDelay', i)).not.toBe(peek(rng, 'ignitionFailure', i));
    }
  });

  it('streams are uncorrelated, not merely unequal', () => {
    // A generator that offset one stream by a constant would pass the test
    // above and still destroy fixture stability. Check correlation instead.
    const rng = createRng(31337);
    const n = 20_000;
    const pairs = Array.from(
      { length: n },
      (_, i) => [peek(rng, 'ignitionDelay', i), peek(rng, 'ignitionFailure', i)] as const,
    );
    expect(Math.abs(correlation(pairs))).toBeLessThan(0.03);
  });
});

describe('distribution', () => {
  const n = 100_000;

  it('stays in [0, 1)', () => {
    const rng = createRng(5);
    for (const stream of STREAM_NAMES) {
      for (let i = 0; i < 10_000; i++) {
        const v = peek(rng, stream, i);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
  });

  it('is uniform enough for an ignition delay', () => {
    const rng = createRng(8675309);
    const buckets = new Array(10).fill(0) as number[];
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const v = peek(rng, 'ignitionDelay', i);
      buckets[Math.floor(v * 10)]! += 1;
      sum += v;
    }
    expect(sum / n).toBeCloseTo(0.5, 2);
    // Chi-square with 9 df: 27.88 is the 0.999 critical value.
    const expected = n / 10;
    const chi2 = buckets.reduce((acc, b) => acc + (b - expected) ** 2 / expected, 0);
    expect(chi2).toBeLessThan(27.88);
  });

  it('avalanches: adjacent counters are uncorrelated', () => {
    const rng = createRng(2024);
    const values = Array.from({ length: n + 1 }, (_, i) => peek(rng, 'ignitionDelay', i));

    // The distribution must actually be spread out. U(0,1) has variance 1/12.
    expect(variance(values)).toBeCloseTo(1 / 12, 3);

    const pairs = Array.from({ length: n }, (_, i) => [values[i]!, values[i + 1]!] as const);
    expect(Math.abs(correlation(pairs))).toBeLessThan(0.03);
  });

  it('does not collide over a long run', () => {
    const rng = createRng(77);
    const seen = new Set<number>();
    for (let i = 0; i < 50_000; i++) seen.add(hash(rng.seed, 'ignitionDelay', i));
    // Birthday bound over 2^32: ~0.29 expected collisions at 50k. Allow a few.
    expect(seen.size).toBeGreaterThan(50_000 - 5);
  });
});

describe('integration with SimState', () => {
  it('counters live in SimState, so a state determines all future draws', () => {
    const s = createInitialState();
    expect(s.rng.seed).toBe(DEFAULT_SEED);
    expect(s.rng.counters).toEqual({ ignitionDelay: 0, ignitionFailure: 0 });
  });

  it('a cloned state advances independently of its source', () => {
    const s = createInitialState();
    const forked = cloneRng(s.rng);
    draw(forked, 'ignitionDelay');
    draw(forked, 'ignitionDelay');
    expect(s.rng.counters.ignitionDelay).toBe(0);
    expect(forked.counters.ignitionDelay).toBe(2);
  });

  it('replaying from a captured state reproduces the same draws', () => {
    // This is what golden replay depends on.
    const s = createInitialState(4321);
    for (let i = 0; i < 17; i++) draw(s.rng, 'ignitionDelay');
    const snapshot = cloneRng(s.rng);

    const runA = Array.from({ length: 20 }, () => draw(s.rng, 'ignitionDelay'));
    const runB = Array.from({ length: 20 }, () => draw(snapshot, 'ignitionDelay'));
    expect(runA).toEqual(runB);
  });
});
