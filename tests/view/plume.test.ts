/**
 * M9.6: the Raptor plume, as three things at one point.
 *
 * WHAT WAS WRONG. One emitter, at 95 m/s with 2.2 per second of drag and a
 * 0.32 s life, so a particle travelled `(95/2.2)(1 - e^-0.704) = 21.9 m` before
 * it died — on a fifty-metre vehicle. It read as a candle because it was one,
 * and no amount of tinting a single 64 px dot was going to make it read as an
 * exhaust.
 *
 * WHAT IT IS NOW. A CORE — the inner column, still supersonic and still
 * incandescent, fast and barely spread. A BELL wrapping it, translucent and
 * wide, which is 2021's emitter in its new job. And DIAMONDS, which are not an
 * emitter at all: a shock train is the same gas being alternately compressed and
 * expanded as it crosses standing shocks, so it is drawn as a periodic
 * brightness ALONG the core rather than as beads beside it.
 *
 * All three read the two ambient curves M6.7 built, because they are one
 * physical thing. This file pins the two new curves at the pressures the seven
 * golden scenarios actually visit, and checks the geometry of the emitters
 * against the arithmetic that produces it.
 */
import { describe, expect, it } from 'vitest';
import {
  NOZZLE_MATCHED_PRESSURE,
  SHOCK_CELL_MAX_LENGTH,
  SHOCK_CELL_MIN_LENGTH,
  SHOCK_GONE_RATIO,
  plumeScaleFactor,
  plumeSpreadFactor,
  shockCellLength,
  shockDiamondStrength,
} from '$view/atmosphere-look';
import { EFFECTS } from '$view/particles';
import { updateAtmosphere } from '$core/physics/atmosphere';
import { step } from '$core/step';
import { vehicleHeight } from '$core/constants';
import type { SimState } from '$core/state';
import { GOLDEN_DT } from '../golden/record';
import { GOLDEN_SPECS } from '../golden/scenarios';

/** How far a particle of an effect travels before it dies, in metres. */
function travel(effect: keyof typeof EFFECTS): number {
  const { speed, drag, life } = EFFECTS[effect];
  // dv/dt = -drag*v, so x(t) = (v0/drag)(1 - e^(-drag t)). Drag of zero is a
  // straight line and has to be handled separately or it divides by nothing.
  return drag === 0 ? speed * life : (speed / drag) * (1 - Math.exp(-drag * life));
}

describe('the plume reaches, where it used to flicker', () => {
  it('the core carries a particle further than the vehicle is long', () => {
    const core = travel('raptorPlumeCore');
    const report = `core travels ${core.toFixed(1)} m on a ${vehicleHeight} m vehicle`;
    expect(core, report).toBeGreaterThan(vehicleHeight * 2);
    // And not so far it becomes a beam: past about four vehicle lengths the
    // plume stops reading as attached to anything.
    expect(core, report).toBeLessThan(vehicleHeight * 4);
  });

  it('and the bell is short and wide beside it — that is what makes it a bell', () => {
    const core = travel('raptorPlumeCore');
    const bell = travel('raptorPlume');
    const report = `core ${core.toFixed(1)} m, bell ${bell.toFixed(1)} m`;
    expect(bell, report).toBeLessThan(core * 0.5);
    expect(EFFECTS.raptorPlume.spread, report).toBeGreaterThan(EFFECTS.raptorPlumeCore.spread * 3);
    expect(EFFECTS.raptorPlume.endSize, report).toBeGreaterThan(EFFECTS.raptorPlumeCore.endSize * 2);
    // Translucent, so the core shows through it rather than being buried.
    expect(EFFECTS.raptorPlume.startAlpha).toBeLessThan(EFFECTS.raptorPlumeCore.startAlpha);
  });

  it('the one 2021 emitter would not have reached a quarter as far', () => {
    // The number § 3.2 of the plan is written around, kept as a test so the
    // comparison cannot quietly stop being true.
    const old = (95 / 2.2) * (1 - Math.exp(-2.2 * 0.32));
    expect(old).toBeCloseTo(21.8, 1);
    expect(travel('raptorPlumeCore')).toBeGreaterThan(old * 4);
  });

  it('both halves draw with a texture that suits them', () => {
    // The core is the additive fire M9.5 built `core` for; the bell is the
    // translucent part, which wants the soft edge.
    expect(EFFECTS.raptorPlumeCore.texture).toBe('core');
    expect(EFFECTS.raptorPlume.texture).toBe('soft');
    expect(EFFECTS.raptorPlumeCore.additive).toBe(true);
    expect(EFFECTS.raptorPlume.additive).toBe(true);
  });
});

describe('vacuum: wider, and therefore dimmer', () => {
  it('spreads and swells as the air thins', () => {
    // M6.7's curves, which M9.6 reuses rather than replacing: both halves of the
    // plume read the same two numbers, because they are one physical thing.
    expect(plumeSpreadFactor(0)).toBeGreaterThan(plumeSpreadFactor(NOZZLE_MATCHED_PRESSURE) * 3);
    expect(plumeScaleFactor(0)).toBeGreaterThan(plumeScaleFactor(NOZZLE_MATCHED_PRESSURE) * 2);
  });

  it('and the dimming is arithmetic rather than a taste', () => {
    /*
      WHERE "DIMMER IN VACUUM" IS ACTUALLY PROVED, and it is here rather than in
      the browser. A particle's alpha does not change with altitude; its drawn
      SIZE does, by `plumeScaleFactor`, so the same emitted light is spread over
      the square of that factor. Vacuum against sea level is 2.3x the size and
      therefore 5.3x the area for the same light.

      The harness cannot measure this across altitudes and the e2e spec says so:
      at sea level the plume is drawn over a sky at luma 152 and in vacuum over
      one at 17, so a "brightness" comparison between the two is a comparison of
      backgrounds. Width it can measure, and does.
    */
    const vacuum = plumeScaleFactor(0);
    const seaLevel = plumeScaleFactor(NOZZLE_MATCHED_PRESSURE);
    const areaRatio = (vacuum / seaLevel) ** 2;
    expect(areaRatio, `${areaRatio.toFixed(1)}x the area for the same light`).toBeGreaterThan(4);
  });
});

describe('shock diamonds — the spacing curve', () => {
  it('is monotonically non-decreasing with altitude, and bounded at both ends', () => {
    let previous = 0;
    const report: string[] = [];
    for (let altitude = 0; altitude <= 120_000; altitude += 250) {
      const pressure = updateAtmosphere(altitude).airPressure;
      const length = shockCellLength(pressure);
      expect(length, `${altitude} m`).toBeGreaterThanOrEqual(SHOCK_CELL_MIN_LENGTH);
      expect(length, `${altitude} m`).toBeLessThanOrEqual(SHOCK_CELL_MAX_LENGTH);
      expect(length, `${altitude} m: ${length} after ${previous}`).toBeGreaterThanOrEqual(previous);
      if (altitude % 20_000 === 0) report.push(`${altitude / 1000} km: ${length.toFixed(1)} m`);
      previous = length;
    }
    expect(report.length).toBeGreaterThan(0);
  });

  it('stretches the cells out rather than fading them, which is how they really go', () => {
    // On the pad the train is tight; by the stratosphere one cell is longer than
    // the whole drawn plume, so there is no repeating pattern left to see. That
    // is the physical way for a shock train to disappear and it costs nothing.
    expect(shockCellLength(updateAtmosphere(0).airPressure)).toBe(SHOCK_CELL_MIN_LENGTH);
    expect(shockCellLength(updateAtmosphere(10_000).airPressure)).toBeGreaterThan(10);
    expect(shockCellLength(updateAtmosphere(30_000).airPressure)).toBe(SHOCK_CELL_MAX_LENGTH);
  });

  it('survives nonsense pressures', () => {
    for (const pressure of [NaN, Infinity, -1, 0]) {
      const length = shockCellLength(pressure);
      expect(Number.isFinite(length), String(pressure)).toBe(true);
      expect(length, String(pressure)).toBeGreaterThanOrEqual(SHOCK_CELL_MIN_LENGTH);
      expect(length, String(pressure)).toBeLessThanOrEqual(SHOCK_CELL_MAX_LENGTH);
    }
  });
});

describe('shock diamonds — the visibility curve', () => {
  it('is monotonically non-increasing with altitude and reaches exactly zero', () => {
    let previous = Infinity;
    for (let altitude = 0; altitude <= 120_000; altitude += 250) {
      const strength = shockDiamondStrength(updateAtmosphere(altitude).airPressure);
      expect(strength, `${altitude} m`).toBeGreaterThanOrEqual(0);
      expect(strength, `${altitude} m`).toBeLessThanOrEqual(1);
      expect(strength, `${altitude} m`).toBeLessThanOrEqual(previous);
      previous = strength;
    }
    expect(previous, 'the curve must actually arrive at zero').toBe(0);
  });

  it('reaches zero well before the diamonds would be physically absent', () => {
    /*
      The acceptance line's own words. A shock train exists wherever there is a
      pressure to shock against, which is a very long way up; what stops being
      true much sooner is that anyone can SEE it. Zero arrives at 2% of the
      matched pressure — about 27 km — where the atmosphere still has four
      hundred times the density it has at the Karman line.
    */
    const gone = NOZZLE_MATCHED_PRESSURE * SHOCK_GONE_RATIO;
    expect(shockDiamondStrength(gone)).toBe(0);
    expect(updateAtmosphere(27_000).airPressure).toBeLessThan(gone);
    expect(updateAtmosphere(100_000).airPressure).toBeLessThan(gone / 100);
    // And full strength on the pad, where the diamonds are the whole point.
    expect(shockDiamondStrength(updateAtmosphere(0).airPressure)).toBe(1);
  });

  it('has no seam where it starts fading or where it stops', () => {
    // The same standard M7.3's field-of-view curve is held to: continuous, and
    // continuous in its RATE, so nothing snaps on at an altitude.
    const at = (p: number) => shockDiamondStrength(p);
    const step = NOZZLE_MATCHED_PRESSURE * 0.0005;
    for (const edge of [NOZZLE_MATCHED_PRESSURE * 0.25, NOZZLE_MATCHED_PRESSURE * 0.02]) {
      const slopeInside = (at(edge + step) - at(edge)) / step;
      const slopeOutside = (at(edge) - at(edge - step)) / step;
      expect(Math.abs(slopeInside - slopeOutside), `at ${edge.toFixed(2)} kPa`).toBeLessThan(0.05);
    }
  });
});

describe('pinned at the pressures the seven scenarios actually visit', () => {
  it('reports the range each flight puts the plume through', () => {
    /*
      The whole point of putting these curves in `atmosphere-look.ts` rather
      than in a render loop: a curve is only as good as the interval it is
      evaluated over, and this is that interval, measured rather than assumed.
    */
    const report: string[] = [];
    for (const spec of GOLDEN_SPECS) {
      let s: SimState = spec.build();
      let lowest = Infinity;
      let highest = 0;
      for (let i = 0; i < spec.steps; i += 20) {
        for (let n = 0; n < 20 && i + n < spec.steps; n++) s = step(s, GOLDEN_DT);
        const pressure = s.atmosphere.airPressure;
        lowest = Math.min(lowest, pressure);
        highest = Math.max(highest, pressure);
      }
      const tightest = shockCellLength(highest);
      const widest = shockCellLength(lowest);
      report.push(
        `${spec.id.padEnd(24)} ${lowest.toFixed(3)}..${highest.toFixed(1)} kPa  ` +
          `cells ${tightest.toFixed(1)}..${widest.toFixed(1)} m  ` +
          `strength ${shockDiamondStrength(highest).toFixed(2)}..${shockDiamondStrength(lowest).toFixed(2)}`,
      );
      // Every curve is finite and in range at every pressure any flight reaches.
      for (const pressure of [lowest, highest]) {
        expect(Number.isFinite(shockCellLength(pressure)), spec.id).toBe(true);
        expect(shockDiamondStrength(pressure), spec.id).toBeGreaterThanOrEqual(0);
        expect(shockDiamondStrength(pressure), spec.id).toBeLessThanOrEqual(1);
      }
    }
    // At least one flight must go from visible diamonds to none, or the curve is
    // decoration nothing exercises.
    expect(report.join('\n')).toContain('..0.00');
  });
});
