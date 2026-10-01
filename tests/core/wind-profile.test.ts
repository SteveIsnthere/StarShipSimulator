/**
 * The wind profile and its turbulence (Phase 6, Task 10, Fidelity).
 *
 * The mean profile is NASA/TM-2008-215633 §2.2.5.2, eqs. (2.1)-(2.2); the
 * turbulence is MIL-F-8785C's low-altitude Dryden model. Each expectation
 * below is written from the published formula, independently of
 * physics/wind.ts, and the statistics are measured over long seeded runs.
 */
import { describe, expect, it } from 'vitest';
import { createRng, peek } from '$core/rng';
import { createInitialState } from '$core/state';
import { step } from '$core/step';
import {
  drydenIntensity,
  meanWindAt,
  updateTurbulence,
  W20_HEIGHT,
  type DrydenIntensity,
} from '$core/physics/wind';
import { GOLDEN_SPECS } from '../golden/scenarios';

const FT = 0.3048;

describe('the mean profile (TM-2008-215633 eqs. 2.1-2.2)', () => {
  it('is the scenario wind at the 18.3 m reference height', () => {
    for (const u of [-25, -3, 1, 10, 40]) expect(meanWindAt(u, 18.3)).toBeCloseTo(u, 12);
  });

  it('follows the power law with k = 0.52 u^(-3/4) through the surface layer', () => {
    // 10 m/s at 18.3 m: k = 0.52 · 10^-0.75 = 0.09247; at 150 m the wind is
    // 10 · (150/18.3)^k = 12.147 m/s.
    expect(meanWindAt(10, 150)).toBeCloseTo(10 * (150 / 18.3) ** (0.52 * 10 ** -0.75), 12);
    expect(meanWindAt(10, 150)).toBeCloseTo(12.147, 3);
    expect(meanWindAt(10, 60)).toBeCloseTo(10 * (60 / 18.3) ** 0.092469, 4);
    // Below the reference height it falls off.
    expect(meanWindAt(10, 5)).toBeLessThan(10);
  });

  it('holds k constant below 2 m/s', () => {
    const k2 = 0.52 * 2 ** -0.75;
    expect(meanWindAt(1, 100)).toBeCloseTo((100 / 18.3) ** k2, 12);
  });

  it('is symmetric in the wind direction', () => {
    expect(meanWindAt(-12, 90)).toBe(-meanWindAt(12, 90));
  });

  it('is held at its 150 m value above the surface layer', () => {
    expect(meanWindAt(10, 2_000)).toBe(meanWindAt(10, 150));
    expect(meanWindAt(10, 80_000)).toBe(meanWindAt(10, 150));
  });

  it('is exactly +0 in calm air at every height', () => {
    for (const h of [0, 18.3, 500, 100_000]) expect(Object.is(meanWindAt(0, h), 0)).toBe(true);
  });
});

describe('the Dryden intensities (MIL-F-8785C, low altitude)', () => {
  const out: DrydenIntensity = { sigmaU: 0, sigmaW: 0, lengthU: 0, lengthW: 0 };

  it('at 100 ft: sigma_w = 0.1 W20, sigma_u and L_u from (0.177 + 0.000823 h)', () => {
    drydenIntensity(10, 100 * FT, out);
    const shape = 0.177 + 0.000823 * 100;
    expect(out.sigmaW).toBeCloseTo(1, 12);
    expect(out.sigmaU).toBeCloseTo(1 / shape ** 0.4, 12);
    expect(out.lengthW).toBeCloseTo(100 * FT, 9);
    expect(out.lengthU).toBeCloseTo((100 / shape ** 1.2) * FT, 9);
    // The longitudinal gust is the stronger and longer one near the ground.
    expect(out.sigmaU).toBeGreaterThan(out.sigmaW);
    expect(out.lengthU).toBeGreaterThan(out.lengthW);
  });

  it('is isotropic at 1,000 ft and held there above it', () => {
    drydenIntensity(10, 1000 * FT, out);
    expect(out.sigmaU).toBeCloseTo(1, 12);
    expect(out.lengthU).toBeCloseTo(1000 * FT, 9);
    const at1000 = { ...out };
    drydenIntensity(10, 40_000, out);
    expect(out).toEqual(at1000);
  });

  it('is held at 10 ft below it', () => {
    drydenIntensity(10, 10 * FT, out);
    const at10 = { ...out };
    drydenIntensity(10, 0.5, out);
    expect(out).toEqual(at10);
  });
});

/** Run the turbulence alone at a fixed height and airspeed; return the gust series. */
function series(wind: number, height: number, airspeed: number, dt: number, n: number) {
  const world = createInitialState().world;
  world.wind = wind;
  const rng = createRng(1234);
  const u = new Float64Array(n);
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    updateTurbulence(world, rng, height, airspeed, dt);
    u[i] = world.gust;
    w[i] = world.gustVertical;
  }
  return { u, w, rng };
}

function std(x: Float64Array): number {
  let m = 0;
  for (const v of x) m += v;
  m /= x.length;
  let s = 0;
  for (const v of x) s += (v - m) ** 2;
  return Math.sqrt(s / x.length);
}

function autocorrelation(x: Float64Array, lag: number): number {
  let num = 0;
  let den = 0;
  for (let i = 0; i < x.length; i++) {
    den += x[i]! * x[i]!;
    if (i + lag < x.length) num += x[i]! * x[i + lag]!;
  }
  return num / den;
}

describe('the turbulence statistics over a long seeded run', () => {
  // 200 m, 50 m/s airspeed, a 10 m/s wind: L_u ~ 298 m, so tau_u ~ 6 s; 3 h of
  // simulated air at 60 Hz is ~ 900 decorrelation times.
  const height = 200;
  const airspeed = 50;
  const dt = 1 / 60;
  const { u, w, rng } = series(10, height, airspeed, dt, 3 * 3600 * 60);
  const expected = drydenIntensity(meanWindAt(10, W20_HEIGHT), height, {
    sigmaU: 0,
    sigmaW: 0,
    lengthU: 0,
    lengthW: 0,
  });

  it('has the specified standard deviations', () => {
    expect(std(u) / expected.sigmaU).toBeGreaterThan(0.93);
    expect(std(u) / expected.sigmaU).toBeLessThan(1.07);
    expect(std(w) / expected.sigmaW).toBeGreaterThan(0.93);
    expect(std(w) / expected.sigmaW).toBeLessThan(1.07);
  });

  it("has u's correlation fall to 1/e over one length scale of travel", () => {
    const lag = Math.round(expected.lengthU / airspeed / dt);
    expect(autocorrelation(u, lag)).toBeGreaterThan(Math.exp(-1) - 0.06);
    expect(autocorrelation(u, lag)).toBeLessThan(Math.exp(-1) + 0.06);
  });

  it("has w's correlation at one length scale where Dryden puts it, e^-1 / 2", () => {
    // The Dryden vertical autocorrelation is R_w(ξ) = σ² e^(-ξ/L) (1 - ξ/(2L)),
    // so at one length scale of travel it is half of e^-1.
    const lag = Math.round(expected.lengthW / airspeed / dt);
    expect(autocorrelation(w, lag)).toBeGreaterThan(0.5 * Math.exp(-1) - 0.06);
    expect(autocorrelation(w, lag)).toBeLessThan(0.5 * Math.exp(-1) + 0.06);
  });

  it('draws two values a step from its own stream and from no other', () => {
    expect(rng.counters.turbulence).toBe(2 * u.length);
    expect(rng.counters.ignitionDelay).toBe(0);
    expect(rng.counters.ignitionFailure).toBe(0);
  });

  it('leaves the ignition draws where they were', () => {
    // Stream independence: the ignition stream's values do not depend on how
    // far the turbulence stream has run.
    const fresh = createRng(1234);
    for (const i of [0, 1, 7, 100]) expect(peek(rng, 'ignitionDelay', i)).toBe(peek(fresh, 'ignitionDelay', i));
  });
});

describe('calm air', () => {
  it('draws nothing and leaves every gust at zero', () => {
    const { u, w, rng } = series(0, 200, 50, 1 / 60, 1000);
    expect(rng.counters.turbulence).toBe(0);
    expect(u.every((v) => v === 0)).toBe(true);
    expect(w.every((v) => v === 0)).toBe(true);
  });

  it('the intro flies with no turbulence at all', () => {
    let s = GOLDEN_SPECS.find((g) => g.id === 'intro-demo')!.build();
    for (let i = 0; i < 120 * 60 && !s.status.landed && !s.failures.crashed; i++) {
      s = step(s, 1 / 120);
      expect(s.world.gust).toBe(0);
      expect(s.world.gustVertical).toBe(0);
    }
    expect(s.rng.counters.turbulence).toBe(0);
  });
});

describe('in a wind', () => {
  function windyFlight(seed: number) {
    let s = GOLDEN_SPECS.find((g) => g.id === 'landing-burn-headwind')!.build();
    s.rng = createRng(seed);
    const gusts: number[] = [];
    for (let i = 0; i < 600; i++) {
      s = step(s, 1 / 120);
      gusts.push(s.world.gust, s.world.gustVertical);
    }
    return gusts;
  }

  it('the same seed gives the same gusts, and they are not zero', () => {
    const a = windyFlight(7);
    expect(windyFlight(7)).toEqual(a);
    expect(a.some((v) => v !== 0)).toBe(true);
  });

  it('another seed gives other gusts', () => {
    expect(windyFlight(8)).not.toEqual(windyFlight(7));
  });
});
