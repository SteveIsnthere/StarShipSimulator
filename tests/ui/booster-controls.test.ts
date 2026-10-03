import { describe, expect, it } from 'vitest';
import { applyControl, type ControlEvent } from '$app/controls';
import { createScenarioVehicle, getScenario } from '$core/scenarios';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { rad } from '$core/units';

describe('manual booster controls', () => {
  it('toggles a whole physical ring, cancels pending ignition, and leaves other rings alone', () => {
    const { state } = createScenarioVehicle(getScenario('rtls')!);
    state.engines.failed[14] = true;
    applyControl(state, { type: 'engineGroup', group: 'outer' }, SUPER_HEAVY);
    expect(state.engines.ignitionCountdown.slice(0, 13).every(value => value === null)).toBe(true);
    expect(state.engines.ignitionCountdown.slice(13).filter(value => value !== null)).toHaveLength(19);
    expect(state.engines.ignitionCountdown[14]).toBeNull();
    applyControl(state, { type: 'engineGroup', group: 'outer' }, SUPER_HEAVY);
    expect(state.engines.ignitionCountdown.every(value => value === null)).toBe(true);
    expect(state.engines.failed[14]).toBe(true);
  });

  it('lights the actual thirteen return engines through the all-engine command', () => {
    const { state } = createScenarioVehicle(getScenario('rtls')!);
    applyControl(state, { type: 'allRaptors' }, SUPER_HEAVY);
    expect(state.engines.ignitionCountdown.filter(value => value !== null)).toHaveLength(13);
  });

  for (const event of [
    { type: 'raptor', engine: 20 }, { type: 'throttle', percent: 60 },
    { type: 'pitch', percent: 30 }, { type: 'rcs' }, { type: 'dumpFuel' },
    { type: 'yokeGrab' }, { type: 'boostBack' },
  ] satisfies ControlEvent[]) {
    it(`invalidates accepted return authority before ${event.type}`, () => {
      const { state } = createScenarioVehicle(getScenario('rtls')!);
      state.autopilot.boosterReturnPlan = { originTime: 0, shutdownAt: 10, coastPitch: rad(0),
        handoff: { x: 0, height: 100, vx: 0, vy: -20, time: 10, lateralFeasible: true } };
      applyControl(state, event, SUPER_HEAVY);
      expect(state.autopilot.boosterReturnPlan).toBeUndefined();
    });
  }
});
