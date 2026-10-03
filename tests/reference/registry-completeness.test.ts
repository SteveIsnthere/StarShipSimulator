/** Completion requires named, measured quantities, not a pass count that can
 * stay green while a required row disappears. Existing bands remain binding. */
import { describe, expect, it } from 'vitest';
import { BANDS } from './anchors';
import { ascentMaxQ, reentryPeakHeating } from './flight-probes';
import { judge } from './bands';
import { createScenarioState, getScenario } from '$core/scenarios';
describe('modernization reference registry', () => {
  it('retains every required quantity with its conditions and measurement', () => {
    const required = ['raptor2.sl.thrust', 'raptor2.vac.thrust', 'raptor2.sl.isp', 'raptor2.vac.isp',
      'rvac2.vac.isp', 'rvac2.vac.thrust', 'ship.propellant.capacity', 'ship.dry.mass', 'ship.engine.count',
      'super-heavy.propellant.capacity', 'super-heavy.dry.mass', 'super-heavy.engine.count', 'earth.radius',
      'ascent.max-q.value', 'ascent.max-q.altitude', 'reentry.peak.heating'];
    expect(new Set(BANDS.map(row => row.id)).size).toBe(BANDS.length);
    for (const id of required) {
      const row = BANDS.find(value => value.id === id);
      expect(row, id).toBeDefined();
      expect(row!.source.length, id).toBeGreaterThan(0);
      expect(row!.conditions.length, id).toBeGreaterThan(0);
      expect(Number.isFinite(judge(row!).value), id).toBe(true);
    }
  });
  it('measures the actual ascent interval and landed entry without changing either preset', () => {
    const pad = createScenarioState(getScenario('launch-pad')!);
    const entry = createScenarioState(getScenario('reentry')!);
    const q = ascentMaxQ(), heat = reentryPeakHeating();
    expect(q.outcome).toBe('window-complete'); expect(q.seconds).toBe(90);
    expect(heat.outcome).toBe('landed'); expect(heat.seconds).toBeLessThan(900);
    expect(heat.peak).toBeGreaterThan(170_900 * .95);
    expect(heat.peak).toBeLessThan(170_900 * 1.05);
    expect(Object.isFrozen(q)).toBe(true); expect(Object.isFrozen(heat)).toBe(true);
    expect(createScenarioState(getScenario('launch-pad')!)).toEqual(pad);
    expect(createScenarioState(getScenario('reentry')!)).toEqual(entry);
  });
});
