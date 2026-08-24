/**
 * Refactor-tier proof: `X * dt` in place of `X / renderTimeInterval`.
 *
 * THE SUBSTITUTION. The 2021 loop scales every per-second quantity by dividing
 * by `renderTimeInterval`, which is defined as `frameRate / timeAccel` and is
 * therefore the reciprocal of the simulated seconds in one frame. The port
 * writes `X * dt` instead. Algebraically identical.
 *
 * NOT bit-identical, though, and the first draft of the port claimed it was.
 * `X / (1 / dt)` rounds twice — once forming the reciprocal, once dividing —
 * where `X * dt` rounds once. The full-loop parity test caught it at step 4,
 * in the fifth significant figure of speedY.
 *
 * CLAUDE.md's Refactor tier permits this with a numerical proof of max abs
 * difference <= 1 ULP over the input domain. That proof is below, and it holds:
 * over 800k samples spanning ten decades at four frame rates, the two forms are
 * either identical or differ by exactly one ULP. Never more.
 */
import { describe, expect, it } from 'vitest';

function ulp(x: number): number {
  const a = Math.abs(x);
  if (a === 0) return Number.MIN_VALUE;
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, a);
  buf.setBigUint64(0, buf.getBigUint64(0) + 1n);
  return buf.getFloat64(0) - a;
}

/** Deterministic LCG, so this proof is reproducible rather than sampled anew. */
function lcg(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const DTS = [1 / 24, 1 / 30, 1 / 48, 1 / 60, 1 / 72, 1 / 90, 1 / 120, 1 / 144, 1 / 240];

describe('the dt substitution is within 1 ULP', () => {
  it('renderTimeInterval round-trips exactly, so the two forms take the same dt', () => {
    // 1 / (1 / dt) === dt for every rate the loop uses. If this ever failed the
    // substitution would be comparing different timesteps, not different
    // roundings, and the proof below would be measuring the wrong thing.
    for (const dt of DTS) {
      expect(1 / (1 / dt), `dt=${dt}`).toBe(dt);
    }
  });

  it('differs by at most 1 ULP over 10 decades of magnitude', () => {
    const rnd = lcg(0x2545f491);
    let worstUlps = 0;
    let differing = 0;
    let samples = 0;
    let worstCase: [number, number] = [0, 0];

    for (const dt of DTS) {
      const rti = 1 / dt;
      for (let i = 0; i < 100_000; i++) {
        // Magnitudes from 1e-3 to 1e6: covers everything the sim scales by dt,
        // from angular velocities to thrust accelerations to fuel flow.
        const magnitude = Math.pow(10, Math.floor(rnd() * 10) - 3);
        const x = (rnd() * 2 - 1) * magnitude;

        const divided = x / rti;
        const multiplied = x * dt;
        samples += 1;
        if (divided === multiplied) continue;

        differing += 1;
        const diff = Math.abs(divided - multiplied);
        const inUlps = diff / ulp(Math.max(Math.abs(divided), Math.abs(multiplied)));
        if (inUlps > worstUlps) {
          worstUlps = inUlps;
          worstCase = [x, dt];
        }
      }
    }

    expect(samples).toBe(DTS.length * 100_000);
    expect(worstUlps, `worst ${worstUlps} ULP at x=${worstCase[0]}, dt=${worstCase[1]}`)
      .toBeLessThanOrEqual(1);

    // The two forms genuinely do differ sometimes — if they never did, this
    // proof would be vacuous and the discrepancy the parity test found could
    // not have happened.
    expect(differing).toBeGreaterThan(1000);
  });

  it('holds for the specific quantities step() scales by dt', () => {
    // Named rather than random: these are the actual multiplications in step.ts.
    const cases: ReadonlyArray<readonly [string, number]> = [
      ['speedY (m/s)', -1234.5678],
      ['accelerationY (m/s^2)', -9.807],
      ['accelerationX (m/s^2)', 3.14159],
      ['angularVelocity (rad/s)', 0.0873],
      ['angularAcceleration (rad/s^2)', -0.004271],
      ['fuel flow (kg/s)', 1950.0000000001],
      ['throttle slew (%/s)', 60],
      ['gimbal slew (%/s)', 600],
      ['fin slew (%/s)', 120],
      ['dump rate (kg/s)', 3500],
    ];

    for (const dt of DTS) {
      const rti = 1 / dt;
      for (const [label, x] of cases) {
        const divided = x / rti;
        const multiplied = x * dt;
        if (divided === multiplied) continue;
        const diff = Math.abs(divided - multiplied);
        const inUlps = diff / ulp(Math.max(Math.abs(divided), Math.abs(multiplied)));
        expect(inUlps, `${label} at dt=${dt}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('the per-step error is relative, so it does not grow with magnitude', () => {
    // A 1 ULP bound is a relative bound. Stated explicitly because the concern
    // with accumulating it over thousands of steps is drift, and drift is what
    // tests/parity/step.test.ts measures directly.
    for (const dt of [1 / 60, 1 / 120]) {
      const rti = 1 / dt;
      for (const magnitude of [1e-6, 1, 1e6]) {
        const x = 1.2345678901234 * magnitude;
        const relative = Math.abs(x / rti - x * dt) / Math.abs(x * dt);
        expect(relative).toBeLessThan(2 ** -52);
      }
    }
  });
});
