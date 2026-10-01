/**
 * The last drop. A burn or a dump takes a whole step's worth of propellant, so
 * on the step the tank empties it must stop at zero — not go negative for a
 * step (vehicle lighter than its dry mass) and then snap back up, which makes
 * the mass rise. Found by tests/core/invariants.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState } from '$core/state';
import { updatePropellant } from '$core/physics/engines';
import * as C from '$core/constants';

describe('the tank empties to zero, never below', () => {
  it('a burn larger than what is left stops at zero', () => {
    const s = createInitialState();
    s.vehicle.propellantMass = 1;
    s.engines.running = [true, true, true];
    s.vehicle.throttleCurrent = 100;
    updatePropellant(s, 1 / 120);
    expect(s.vehicle.propellantMass).toBe(0);
    expect(s.vehicle.vehicleMass).toBe(C.vehicleDryMass);
  });

  it('a dump larger than what is left stops at zero', () => {
    const s = createInitialState();
    s.vehicle.propellantMass = 1;
    s.engines.running = [false, false, false];
    s.status.dumpingFuel = true;
    s.status.forceDump = true;
    updatePropellant(s, 1 / 120);
    expect(s.vehicle.propellantMass).toBe(0);
    expect(s.vehicle.vehicleMass).toBe(C.vehicleDryMass);
  });
});
