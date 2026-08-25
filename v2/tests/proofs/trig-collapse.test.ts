/**
 * The proof behind the `collapsedTrig` fidelity flag (M1.9).
 *
 * physics.js picks a trig expression by which quadrant its angle falls in — six
 * times, 143 of the file's 539 lines. Every branch is a trigonometric identity
 * of the others, so each ladder collapses to a single expression:
 *
 *     horizontalDrag(x)    = -sin(x)
 *     verticalDrag(x)      = -cos(x)
 *     horizontalLift(x)    = -cos(x)
 *     verticalLift(x)      =  sin(x)
 *     horizontalThrust(x)  =  sin(x)
 *     verticalThrust(x)    =  cos(x)
 *
 * This started as a Refactor-tier proof: max abs difference <= 1 ULP over the
 * input domain, committed as a test. 4,000,001 sampled angles per ladder across
 * [-pi, pi], plus every branch boundary and its immediate float neighbours.
 *
 * THE PROOF HOLDS. Maximum absolute difference is 2.2204e-16 for four ladders
 * and 1.1102e-16 for the other two — exactly one and one-half ULP at unit
 * magnitude, which is the right scale for coefficients that live in [-1, 1].
 *
 * IT STILL COULD NOT SHIP AS A REFACTOR, and that is the interesting part.
 * M1.9's acceptance line has a second clause: "goldens unchanged". About a
 * third of sampled angles produce a different last bit, and compounded through
 * a feedback loop that moves the fixtures — measured, at step 4260 of
 * launch-pad-takeoff, perceivedG_Y shifts in its sixteenth significant figure.
 * CLAUDE.md is explicit that a refactor moving a golden fails CI. A proof of
 * mathematical identity is not a proof of bit-identity, and the tier asks for
 * the second.
 *
 * SO IT SHIPPED AS FIDELITY, on the owner's decision: the `collapsedTrig` flag,
 * off by default, with a golden fixture for the on path. The accuracy claim the
 * Fidelity tier demands is real rather than a formality — the ladder computes
 * `sin(PI - a)` where the collapsed form computes `sin(a)`, and near a = PI that
 * subtraction cancels leading digits before the sine is taken. Where the two
 * disagree it is the ladder carrying the error.
 *
 * This file is the measurement that justifies the flag, and it also documents
 * that 143 of physics.js's 539 lines are one-line identities.
 *
 * Note on relative vs absolute. Measuring in ULP *of the local value* explodes
 * near the zeros of sin and cos, where the spacing of doubles collapses: at
 * x just past pi the two forms give -1.2e-16 and -2.4e-16, which is 1e16
 * relative ULP and completely meaningless. These coefficients are always
 * multiplied by an acceleration and summed, so the absolute difference is what
 * propagates, and unit-ULP is the scale to judge it against.
 */
import { describe, expect, it } from 'vitest';
import * as comp from '$core/physics/components';
import { rad, type Rad } from '$core/units';

const HALF_PI = Math.PI / 2;

// --- the 2021 ladders, verbatim ---------------------------------------------

function ladderHorizontalDrag(a: number): number {
  if (0 <= a && a <= HALF_PI) return -Math.sin(a);
  else if (HALF_PI < a && a <= Math.PI) return -Math.sin(Math.PI - a);
  else if (-HALF_PI <= a && a < 0) return Math.sin(-a);
  else return Math.sin(a + Math.PI);
}

function ladderVerticalDrag(a: number): number {
  if (0 <= a && a <= HALF_PI) return -Math.cos(a);
  else if (HALF_PI < a && a <= Math.PI) return Math.cos(Math.PI - a);
  else if (-HALF_PI <= a && a < 0) return -Math.cos(a);
  else return Math.cos(a + Math.PI);
}

function ladderHorizontalLift(a: number): number {
  if (0 <= a && a <= HALF_PI) return -Math.sin(HALF_PI - a);
  else if (HALF_PI < a && a < Math.PI) return Math.cos(Math.PI - a);
  else if (-HALF_PI <= a && a < 0) return -Math.sin(HALF_PI + a);
  else return Math.sin(-a - HALF_PI);
}

function ladderVerticalLift(a: number): number {
  if (0 <= a && a <= HALF_PI) return Math.cos(HALF_PI - a);
  else if (HALF_PI < a && a <= Math.PI) return Math.sin(Math.PI - a);
  else if (-HALF_PI <= a && a < 0) return -Math.cos(HALF_PI + a);
  else return -Math.cos(-a - HALF_PI);
}

function ladderHorizontalThrust(a: number): number {
  if (0 <= a && a <= HALF_PI) return Math.sin(a);
  else if (HALF_PI < a && a <= Math.PI) return Math.cos(a - HALF_PI);
  else if (-HALF_PI <= a && a < 0) return Math.sin(a);
  else return -Math.cos(a + HALF_PI);
}

function ladderVerticalThrust(a: number): number {
  if (0 <= a && a <= HALF_PI) return Math.cos(a);
  else if (HALF_PI < a && a <= Math.PI) return -Math.sin(a - HALF_PI);
  else if (-HALF_PI <= a && a < 0) return Math.cos(a);
  else return Math.sin(a + HALF_PI);
}

// --- the proposed collapsed forms -------------------------------------------

const collapsedHorizontalDrag = (a: number): number => -Math.sin(a);
const collapsedVerticalDrag = (a: number): number => -Math.cos(a);
const collapsedHorizontalLift = (a: number): number => -Math.cos(a);
const collapsedVerticalLift = (a: number): number => Math.sin(a);
const collapsedHorizontalThrust = (a: number): number => Math.sin(a);
const collapsedVerticalThrust = (a: number): number => Math.cos(a);

// ---------------------------------------------------------------------------

function ulp(x: number): number {
  const a = Math.abs(x);
  if (a === 0) return Number.MIN_VALUE;
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, a);
  buf.setBigUint64(0, buf.getBigUint64(0) + 1n);
  return buf.getFloat64(0) - a;
}

/**
 * THE DOMAIN. Both inputs to these ladders are angles in [-pi, pi]:
 * `angleOfMotion` is the output of `Math.atan2`, and `gimbalPointingDirection`
 * is explicitly wrapped into that range by `getGimbalPointingDirection`
 * (physics.js:518). Anything outside it cannot reach these functions.
 *
 * The distinction matters. Just past pi the ladder falls to its `else` branch
 * and computes `sin(a + pi)`, where the addition loses precision, while the
 * collapsed `-sin(a)` does not — the two diverge to about 2.6 unit-ULP there.
 * Proving over a domain the code cannot reach would be proving the wrong thing;
 * proving over [-pi, pi] and saying so is the honest claim. The out-of-domain
 * behaviour is measured separately below, because it is the reason that wrap
 * in getGimbalPointingDirection is load-bearing rather than cosmetic.
 */
const DOMAIN_MIN = -Math.PI;
const DOMAIN_MAX = Math.PI;
const inDomain = (a: number) => a >= DOMAIN_MIN && a <= DOMAIN_MAX;

/** Every branch boundary, and the representable doubles either side of it. */
function boundaries(): number[] {
  const out: number[] = [];
  for (const b of [0, HALF_PI, -HALF_PI, Math.PI, -Math.PI]) {
    out.push(b);
    // nextafter in both directions, twice, so both sides of every `<=` are hit.
    let up = b;
    let down = b;
    for (let i = 0; i < 2; i++) {
      up = up + Math.max(ulp(up), Number.MIN_VALUE);
      down = down - Math.max(ulp(down), Number.MIN_VALUE);
      out.push(up, down);
    }
  }
  return out.filter(inDomain);
}

const SAMPLES = 4_000_000;

/** One ULP at unit magnitude: 2^-52. The scale a coefficient in [-1,1] lives at. */
const UNIT_ULP = Number.EPSILON;

interface LadderCase {
  readonly name: string;
  readonly ladder: (a: number) => number;
  readonly collapsed: (a: number) => number;
  readonly shipped: (a: Rad) => number;
}

const CASES: readonly LadderCase[] = [
  {
    name: 'horizontalDrag = -sin(x)',
    ladder: ladderHorizontalDrag,
    collapsed: collapsedHorizontalDrag,
    shipped: comp.horizontalDragCoefficient,
  },
  {
    name: 'verticalDrag = -cos(x)',
    ladder: ladderVerticalDrag,
    collapsed: collapsedVerticalDrag,
    shipped: comp.verticalDragCoefficient,
  },
  {
    name: 'horizontalLift = -cos(x)',
    ladder: ladderHorizontalLift,
    collapsed: collapsedHorizontalLift,
    shipped: comp.horizontalLiftCoefficient,
  },
  {
    name: 'verticalLift = sin(x)',
    ladder: ladderVerticalLift,
    collapsed: collapsedVerticalLift,
    shipped: comp.verticalLiftCoefficient,
  },
  {
    name: 'horizontalThrust = sin(x)',
    ladder: ladderHorizontalThrust,
    collapsed: collapsedHorizontalThrust,
    shipped: comp.horizontalThrustCoefficient,
  },
  {
    name: 'verticalThrust = cos(x)',
    ladder: ladderVerticalThrust,
    collapsed: collapsedVerticalThrust,
    shipped: comp.verticalThrustCoefficient,
  },
];

describe('each ladder collapses to one expression within 1 ULP', () => {
  it.each(CASES)('$name', ({ name, ladder, collapsed }) => {
    let maxAbsolute = 0;
    let worstAt = 0;
    let differing = 0;
    let checked = 0;

    const evaluate = (a: number) => {
      const l = ladder(a);
      const c = collapsed(a);
      checked += 1;
      if (Object.is(l, c)) return;
      differing += 1;
      const diff = Math.abs(l - c);
      if (diff > maxAbsolute) {
        maxAbsolute = diff;
        worstAt = a;
      }
    };

    for (const a of boundaries()) evaluate(a);

    // 4,000,001 evenly spaced angles across the full domain.
    const span = 2 * Math.PI;
    for (let i = 0; i <= SAMPLES; i++) {
      evaluate(-Math.PI + (i * span) / SAMPLES);
    }

    expect(checked).toBeGreaterThan(SAMPLES);
    expect(
      maxAbsolute / UNIT_ULP,
      `${name}: worst ${maxAbsolute.toExponential(4)} (${(maxAbsolute / UNIT_ULP).toFixed(2)} ` +
        `unit-ULP) at ${worstAt}`,
    ).toBeLessThanOrEqual(1);

    // The proof would be vacuous if the forms never differed. They differ often
    // - which is precisely why applying the collapse moves the goldens.
    expect(differing, `${name} never differed, so nothing was proved`).toBeGreaterThan(1000);
  });

  it('records the measured maxima, so unblocking M1.9 starts from numbers', () => {
    const expected: Record<string, number> = {
      'horizontalDrag = -sin(x)': 1,
      'verticalDrag = -cos(x)': 1,
      'horizontalLift = -cos(x)': 1,
      'verticalLift = sin(x)': 1,
      'horizontalThrust = sin(x)': 0.5,
      'verticalThrust = cos(x)': 0.5,
    };
    for (const { name, ladder, collapsed } of CASES) {
      let maxAbsolute = 0;
      for (let i = 0; i <= 500_000; i++) {
        const a = -Math.PI + (i * 2 * Math.PI) / 500_000;
        maxAbsolute = Math.max(maxAbsolute, Math.abs(ladder(a) - collapsed(a)));
      }
      expect(maxAbsolute / UNIT_ULP, name).toBeCloseTo(expected[name]!, 6);
    }
  });
});

describe('the shipped implementation is the collapse — M2.10', () => {
  // Until M2.10 this block asserted the opposite: src/ had to match the LADDER
  // bit for bit, because the collapse was behind a flag that was off. The flags
  // are gone and the collapsed form is the physics, so the assertion inverts.
  // It is still two independent alarms with tests/golden — one on the
  // arithmetic, one on the trajectories it produces.
  it.each(CASES)('$name is the single expression, bit for bit', ({ collapsed, shipped }) => {
    for (const a of boundaries()) {
      expect(Object.is(shipped(rad(a)), collapsed(a)), `boundary ${a}`).toBe(true);
    }
    for (let i = 0; i <= 200_000; i++) {
      const a = -Math.PI + (i * 2 * Math.PI) / 200_000;
      if (!Object.is(shipped(rad(a)), collapsed(a))) {
        expect.fail(`diverged at ${a}: shipped=${shipped(rad(a))} collapsed=${collapsed(a)}`);
      }
    }
  });

  it.each(CASES)('$name — and the preserved 2021 copy still IS the ladder', ({ name, ladder }) => {
    // The ladders did not leave the tree; they moved to `legacy*Coefficient` so
    // the parity suite has something to compare 2021 against. This checks the
    // copy in src/ against the transcription in this file, which is what makes
    // "the parity suite compares against the real 2021 arithmetic" true rather
    // than assumed.
    const preserved = PRESERVED[name]!;
    for (const a of boundaries()) {
      expect(Object.is(preserved(rad(a)), ladder(a)), `boundary ${a}`).toBe(true);
    }
    for (let i = 0; i <= 200_000; i++) {
      const a = -Math.PI + (i * 2 * Math.PI) / 200_000;
      if (!Object.is(preserved(rad(a)), ladder(a))) {
        expect.fail(`diverged at ${a}: src=${preserved(rad(a))} transcription=${ladder(a)}`);
      }
    }
  });
});

/** The ladder copies kept in src/, by case name. */
const PRESERVED: Readonly<Record<string, (a: Rad) => number>> = {
  'horizontalDrag = -sin(x)': comp.legacyHorizontalDragCoefficient,
  'verticalDrag = -cos(x)': comp.legacyVerticalDragCoefficient,
  'horizontalLift = -cos(x)': comp.legacyHorizontalLiftCoefficient,
  'verticalLift = sin(x)': comp.legacyVerticalLiftCoefficient,
  'horizontalThrust = sin(x)': comp.legacyHorizontalThrustCoefficient,
  'verticalThrust = cos(x)': comp.legacyVerticalThrustCoefficient,
};

describe('the proof is not vacuous', () => {
  it('a wrong collapse is rejected', () => {
    // Sanity: if -sin(x) were mistakenly collapsed to sin(x), the measurement
    // must reject it. Confirms the harness measures what it claims to.
    let maxAbsolute = 0;
    for (let i = 0; i <= 10_000; i++) {
      const a = -Math.PI + (i * 2 * Math.PI) / 10_000;
      maxAbsolute = Math.max(maxAbsolute, Math.abs(ladderHorizontalDrag(a) - Math.sin(a)));
    }
    expect(maxAbsolute / UNIT_ULP).toBeGreaterThan(1);
  });

  it('outside [-pi, pi] the two forms diverge further, which is why the wrap matters', () => {
    // Just past pi the ladder computes sin(a + pi) and loses precision in the
    // addition. getGimbalPointingDirection wraps into range for exactly this
    // kind of reason; without it, the ladders would be doing something else.
    // Measured across the first 2000 representable doubles past pi: the
    // divergence cycles through 0.55, 1.45 and 2.55 unit-ULP depending on how
    // `a + pi` happens to round. 2.55 is the worst, i.e. over twice the bound
    // that holds inside the domain.
    let worst = 0;
    for (let k = 1; k <= 2000; k++) {
      const a = Math.PI + k * ulp(Math.PI);
      worst = Math.max(worst, Math.abs(ladderHorizontalDrag(a) - -Math.sin(a)) / UNIT_ULP);
    }
    expect(worst).toBeGreaterThan(2.5);
    // ...and inside the domain it stays within one.
    const justInside = Math.PI - 4 * ulp(Math.PI);
    expect(
      Math.abs(ladderHorizontalDrag(justInside) - -Math.sin(justInside)) / UNIT_ULP,
    ).toBeLessThanOrEqual(1);
  });

  it('the collapse would move the goldens, which is what blocks M1.9', () => {
    // The measured fact behind the block, asserted rather than asserted-in-prose:
    // a large fraction of angles differ in the last bit, so the difference
    // cannot stay confined to one step of a feedback loop.
    let differing = 0;
    const n = 100_000;
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI + (i * 2 * Math.PI) / n;
      if (!Object.is(ladderHorizontalDrag(a), -Math.sin(a))) differing += 1;
    }
    expect(differing / n).toBeGreaterThan(0.2);
  });

  it('the ladders really do have four branches each', () => {
    // If a ladder had collapsed accidentally during the port, the proof would
    // be trivially true. Check each one takes different code paths.
    const probes = [0.5, 2.0, -0.5, -2.0];
    for (const { name, ladder } of CASES) {
      const values = probes.map(ladder);
      expect(new Set(values.map((v) => v.toFixed(15))).size, `${name} branch spread`)
        .toBeGreaterThan(1);
    }
  });
});
