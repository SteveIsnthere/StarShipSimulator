import { describe, expect, it } from 'vitest';
import { createEngineGroupBinder } from '$hud/engine-groups';
import { createScenarioVehicle, getScenario } from '$core/scenarios';
import { createMetricBinder } from '$hud/binder';
import { metricsFor } from '$hud/metrics';

describe('physical booster group readouts', () => {
  it('uses the active V3 3650t tank for the booster propellant bars', () => {
    const { state, vehicle } = createScenarioVehicle(getScenario('rtls')!);
    let width = '';
    const binder = createMetricBinder({ metrics: metricsFor(vehicle), resolve: id => id === 'propellant-ch4'
      ? { setAttribute: (_attribute, value) => { width = value; } } : null });
    state.vehicle.propellantMass = 500_000;
    binder.update(state);
    expect(width).toBe('13.7');
    state.vehicle.propellantMass = 3_650_000;
    binder.update(state);
    expect(width).toBe('100.0');
  });

  it('counts distinct lit, starting and failed engines and stays quiet when unchanged', () => {
    const { state } = createScenarioVehicle(getScenario('rtls')!);
    state.engines.running[0] = true;
    state.engines.ignitionCountdown[1] = .2;
    state.engines.failed[2] = true;
    state.engines.running[13] = true;
    const targets = { centre: { textContent: '' }, inner: { textContent: '' }, outer: { textContent: '' } };
    let resolves = 0;
    const binder = createEngineGroupBinder(group => { resolves++; return targets[group]; });
    binder.update(state);
    expect(targets.centre.textContent).toBe('1 lit · 1 start · 1 fail');
    expect(targets.inner.textContent).toBe('0 lit · 0 start · 0 fail');
    expect(targets.outer.textContent).toBe('1 lit · 0 start · 0 fail');
    expect(binder.lastWriteCount).toBe(3);
    binder.update(state);
    expect(binder.lastWriteCount).toBe(0);
    expect(resolves).toBe(3);
    state.engines.running[13] = false;
    binder.update(state);
    expect(binder.lastWriteCount).toBe(1);
    expect(targets.outer.textContent).toBe('0 lit · 0 start · 0 fail');
  });
});
