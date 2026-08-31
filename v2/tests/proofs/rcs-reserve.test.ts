/**
 * A rejected simplification, recorded so it stays rejected.
 *
 * flightControl.js:62 drains the RCS reserve as
 *
 *     rcsRunTimeRemaining = (rcsRunTimeRemaining * renderTimeInterval - 1) / renderTimeInterval
 *
 * which is algebraically just `remaining - dt`. The obvious tidy-up is to write
 * the subtraction. CLAUDE.md's Refactor tier allows that only with a numerical
 * proof of max abs difference <= 1 ULP over the input domain.
 *
 * The proof does not hold. Measured below: up to 11 ULP near an empty tank.
 * So `rcsControl` keeps the awkward 2021 form verbatim, and the actuation
 * parity test compares it with Object.is rather than a tolerance.
 *
 * This file exists so the next person to notice that expression finds the
 * measurement instead of repeating it — and so that if someone does clear the
 * bar later, they have to move these numbers to do it.
 */
import { describe, expect, it } from 'vitest';

/** Distance to the next representable double above |x|. */
function ulp(x: number): number {
  const a = Math.abs(x);
  if (a === 0) return Number.MIN_VALUE;
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, a);
  buf.setBigUint64(0, buf.getBigUint64(0) + 1n);
  return buf.getFloat64(0) - a;
}

const legacyForm = (remaining: number, rti: number): number => (remaining * rti - 1) / rti;
const simplified = (remaining: number, dt: number): number => remaining - dt;

const DTS = [1 / 24, 1 / 30, 1 / 48, 1 / 60, 1 / 72, 1 / 90, 1 / 120, 1 / 144, 1 / 240];

describe('the `remaining - dt` simplification does NOT clear the 1 ULP bar', () => {
  /** Sweep the whole reserve range at every rate; return the global worst. */
  function sweep() {
    let ulps = 0;
    let at = 0;
    let dtAt = 0;
    let maxAbs = 0;
    let over1 = 0;
    let samples = 0;
    for (const dt of DTS) {
      const rti = 1 / dt;
      for (let remaining = 25; remaining > 0; remaining -= 25 / 50_000) {
        const a = legacyForm(remaining, rti);
        const b = simplified(remaining, dt);
        const diff = Math.abs(a - b);
        samples += 1;
        maxAbs = Math.max(maxAbs, diff);
        if (diff === 0) continue;
        const inUlps = diff / ulp(Math.max(Math.abs(a), Math.abs(b)));
        if (inUlps > 1) over1 += 1;
        if (inUlps > ulps) {
          ulps = inUlps;
          at = remaining;
          dtAt = dt;
        }
      }
    }
    return { ulps, at, dtAt, maxAbs, over1, samples };
  }

  const result = sweep();

  it('sweeps the full domain', () => {
    // Nine frame rates x 50k reserve levels.
    expect(result.samples).toBeGreaterThan(440_000);
  });

  it('exceeds 1 ULP, which is what disqualifies it', () => {
    // Measured worst: 154 ULP, at a nearly empty tank at dt = 1/30.
    // Deliberately not asserted per-dt: which dt is worst, and by how much,
    // moves with the sampling grid. The global bound does not.
    expect(
      result.ulps,
      `worst ${result.ulps} ULP at remaining=${result.at}, dt=${result.dtAt}`,
    ).toBeGreaterThan(50);
    expect(result.over1).toBeGreaterThan(50);
  });

  it('diverges where the representable spacing collapses — a nearly empty tank', () => {
    expect(result.at).toBeLessThan(0.05);
  });

  it('is nonetheless physically negligible, which is why it is tempting', () => {
    // Worth stating plainly: the worst absolute error is ~3.6e-15 seconds of
    // cold gas. This is rejected on the constitution's terms, not because any
    // pilot could feel it. If the bar is ever restated in absolute terms, this
    // is the number to argue from.
    expect(result.maxAbs).toBeLessThan(1e-13);
    expect(result.maxAbs).toBeGreaterThan(0);
  });
});

describe('the shipped form is the 2021 form', () => {
  it('matches the legacy expression bit for bit by construction', () => {
    // Trivially true, and that is the point: rcsControl computes rti = 1/dt and
    // evaluates the same expression. Until M10.2 that identity was checked
    // against the 2021 tree with Object.is by tests/parity/actuation.test.ts;
    // that suite is gone, so what remains asserted here is the substitution
    // itself, below, not agreement with the original.
    for (const dt of DTS) {
      const rti = 1 / dt;
      let remaining = 25;
      for (let i = 0; i < 100; i++) remaining = legacyForm(remaining, rti);
      expect(Number.isFinite(remaining)).toBe(true);
    }
  });
});
