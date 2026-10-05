import { describe, expect, it } from 'vitest';
import { createInitialState } from '$core/state';
import { rcsControl } from '$core/control/actuation';
import { rcsMaxThrust } from '$core/constants';

describe('finite RCS reserve pays the final partial interval', () => {
  for (const hz of [120, 240, 480]) for (const sign of [-1, 1]) {
    it(`${hz} Hz, sign ${sign}: delivered impulse cannot exceed available reserve`, () => {
      const state = createInitialState();
      state.status.rcsActive = true;
      const dt = 1 / hz, reserve = dt / 4;
      state.vehicle.rcsRunTimeRemaining = reserve;
      rcsControl(state, sign * 100, dt);
      expect(state.vehicle.rcsRunTimeRemaining).toBe(0);
      expect(state.forces.rcsThrust * dt).toBe(sign * rcsMaxThrust * reserve);
      rcsControl(state, sign * 100, dt);
      expect(state.forces.rcsThrust).toBe(0);
    });
  }
});
