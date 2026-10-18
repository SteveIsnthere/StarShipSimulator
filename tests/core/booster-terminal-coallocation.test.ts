/** Local command/authority boundaries; these do not assert successful flight. */
import { expect, it, vi } from 'vitest';
import { runBoosterPolicy } from '$core/autopilot/booster';
import { alignBooster } from '$core/autopilot/booster';
import { createTerminalGimbalAllocation, writeTerminalGimbalAllocation } from '$core/control/booster-terminal-allocation';
import * as allocation from '$core/control/booster-terminal-allocation';
import { cloneState } from '$core/state';
import { rad } from '$core/units';
import { DT } from '$app/loop';
import * as C from '$core/constants';
import { createMassProperties } from '$core/physics/mass';
import { createDamageMassProperties } from '$core/physics/damage-mass';
import { writeFlightMassQuery } from '$core/physics/flight-mass-query';
import { createGridFinForces } from '$core/physics/grid-fins';
import { writeFlightGridForces } from '$core/physics/damage-flight';
import { gimballedShare, getThrust, updatePropellant } from '$core/physics/engines';
import { throttleUpdate, controlTranslation } from '$core/control/actuation';
import { airVelocityX } from '$core/physics/wind';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { terminalControlFixture } from '../support/terminal-control-fixture';

it('does not overwrite attitude allocation with translation torque beyond paid grid/RCS support', () => {
  const state = terminalControlFixture();
  const arms = createMassProperties(), retained = createDamageMassProperties(), grid = createGridFinForces();
  writeFlightMassQuery(state, SUPER_HEAVY, retained, arms);
  const k = state.kinematics;
  // The existing terminal PD horizon is 0.5 s; no new tuning quantity.
  const error = Math.atan2(Math.sin(-k.pitch), Math.cos(-k.pitch));
  const demand = (error / 0.5 ** 2 - 2 * k.angularVelocity / 0.5
    - state.forces.offAxisThrustDifferenceAcceleration - state.forces.angularDragAcceleration) * retained.momentOfInertia;
  writeFlightGridForces(state, state.atmosphere.airDensity,
    k.speedX - airVelocityX(state.world, k.altitude), k.speedY - state.world.gustVertical,
    k.pitch, arms, SUPER_HEAVY, grid);
  const coefficient = state.forces.thrust * gimballedShare(state.engines.running,
    state.atmosphere.airPressure, SUPER_HEAVY) * arms.engineArm;
  const rcs = C.rcsMaxThrust * Math.abs(arms.rcsArm) * Math.min(1, state.vehicle.rcsRunTimeRemaining / DT);
  runBoosterPolicy(state, DT, SUPER_HEAVY);
  const gimbal = coefficient * Math.sin(state.autopilot.pitchControl * 0.01 * C.gimbalAngleLimit);
  const residual = Math.abs(demand - grid.torque - gimbal);
  const roundoff = 8 * Number.EPSILON * Math.max(1, Math.abs(demand), Math.abs(grid.torque), coefficient, rcs);
  expect(residual, 'translation command must leave an attitude residual supportable by paid RCS').toBeLessThanOrEqual(rcs + roundoff);
});

it('selects commands without changing paid forces, pose, propellant, RCS or RNG', () => {
  const state = terminalControlFixture();
  const physical = () => structuredClone({ kinematics: state.kinematics, forces: state.forces,
    fuel: state.vehicle.propellantMass, reserve: state.vehicle.rcsRunTimeRemaining,
    actualGimbal: state.vehicle.gimbalPosition, actualThrottle: state.vehicle.throttleCurrent, rng: state.rng });
  const before = physical();
  runBoosterPolicy(state, DT, SUPER_HEAVY);
  expect(physical()).toEqual(before);
});

for (const sign of [-1, 1]) {
  it(`rejects Bmax-only false feasibility for attitude sign ${sign}`, () => {
    const out = createTerminalGimbalAllocation();
    const requested = Math.asin(sign * .015) / C.gimbalAngleLimit * 100;
    expect(Math.abs(sign * 2 - 100 * Math.sin(requested * .01 * C.gimbalAngleLimit)))
      .toBeLessThanOrEqual(.5 + Number.EPSILON);
    writeTerminalGimbalAllocation(sign * 2, 0, .5, 10, 100, 0, requested, 1, out);
    expect(out.feasible).toBe(false);
    const sine = Math.sin(out.commandPercent * .01 * C.gimbalAngleLimit);
    expect(sine).toBeCloseTo(sign * 4 / 110, 14);
    expect(out.worstResidual).toBeCloseTo(2 - 40 / 110, 14);
  });
}

it('preserves a feasible unsaturated request and clips only unsupported translation', () => {
  const out = createTerminalGimbalAllocation();
  writeTerminalGimbalAllocation(0, 0, 2, 10, 20, 0, 5, 1, out);
  expect(out.feasible).toBe(true);
  expect(out.commandPercent).toBeCloseTo(5, 14);
  writeTerminalGimbalAllocation(0, 0, 2, 10, 20, 0, 100, 1, out);
  expect(out.feasible).toBe(true);
  expect(Math.sin(out.commandPercent * .01 * C.gimbalAngleLimit)).toBeCloseTo(.1, 14);
  expect(out.worstResidual).toBeLessThanOrEqual(2 + 8 * Number.EPSILON);
});

it('respects mechanical gimbal slew and reports an unreachable attitude interval', () => {
  const out = createTerminalGimbalAllocation();
  writeTerminalGimbalAllocation(0, 0, 0, 100, 100, 50, -100, DT, out);
  expect(out.feasible).toBe(false);
  expect(out.commandPercent).toBeCloseTo(50 - C.gimbalSpeed * DT, 12);
  expect(out.worstResidual).toBeCloseTo(Math.abs(100 * Math.sin(out.commandPercent * .01 * C.gimbalAngleLimit)), 12);
});

it('does not invent engine or RCS torque when either is unavailable', () => {
  const out = createTerminalGimbalAllocation();
  writeTerminalGimbalAllocation(1, 0, 0, 0, 0, 0, 100, DT, out);
  expect(out.feasible).toBe(false);
  expect(out.worstResidual).toBe(1);
  writeTerminalGimbalAllocation(0, 0, 0, 0, 0, 0, 100, DT, out);
  expect(out.feasible).toBe(true);
  expect(out.worstResidual).toBe(0);
  writeTerminalGimbalAllocation(0, 0, 0, 100, 100, 0, 100, 1, out);
  expect(out.feasible).toBe(true);
  expect(out.commandPercent).toBe(0);
});

it('keeps the incomplete-ignition branch on the original alignment commands', () => {
  const state = terminalControlFixture();
  state.engines.running[1] = false;
  state.engines.ignitionCountdown[1] = .5;
  const expected = cloneState(state);
  expected.vehicle.throttle = 100;
  alignBooster(expected, rad(0), .5, SUPER_HEAVY);
  runBoosterPolicy(state, DT, SUPER_HEAVY);
  expect(state.autopilot.pitchControl).toBe(expected.autopilot.pitchControl);
  expect(state.autopilot.boosterFinControl).toBe(expected.autopilot.boosterFinControl);
  expect(state.autopilot.rcsThrustCommand).toBe(expected.autopilot.rcsThrustCommand);
  expect(state.vehicle.throttle).toBe(expected.vehicle.throttle);
});

it('rejects nonfinite, inverted or negative scalar allocation domains', () => {
  const out = createTerminalGimbalAllocation();
  for (const args of [
    [NaN, 0, 1, 1, 2, 0, 0, DT], [0, 0, -1, 1, 2, 0, 0, DT],
    [0, 0, 1, 2, 1, 0, 0, DT], [0, 0, 1, 1, 2, 101, 0, DT],
    [0, 0, 1, 1, 2, 0, 0, -DT],
  ] as const) {
    expect(() => writeTerminalGimbalAllocation(args[0], args[1], args[2], args[3],
      args[4], args[5], args[6], args[7], out)).toThrow('Invalid terminal allocation domain');
  }
});

it('keeps minimax finite at large and subnormal finite coefficients, rejecting unrepresentable residuals', () => {
  const out = createTerminalGimbalAllocation();
  writeTerminalGimbalAllocation(1e308, 0, 0, 1e308, 1.5e308, 0, 100, 1, out);
  expect(Number.isFinite(out.commandPercent)).toBe(true);
  expect(out.commandPercent).toBe(100);
  expect(Number.isFinite(out.worstResidual)).toBe(true);
  writeTerminalGimbalAllocation(0, 0, 0, 0, Number.MIN_VALUE, 0, 0, 1, out);
  expect(out.commandPercent).toBe(0);
  expect(out.worstResidual).toBe(0);
  expect(() => writeTerminalGimbalAllocation(1e308, -1e308, 0, 1, 1, 0, 0, 1, out)).toThrow(RangeError);
  expect(() => writeTerminalGimbalAllocation(Number.MAX_VALUE, 0, 0, Number.MAX_VALUE,
    Number.MAX_VALUE, -100, 0, 0, out)).toThrow(RangeError);
});

for (const boundary of ['partial-rcs', 'third-centre', 'throttle-decrease', 'limited-fuel'] as const) {
  it(`bounds actual paid delivery through the policy wrapper at ${boundary}`, () => {
    const state = terminalControlFixture();
    // A previously two-engine paid interval may end by lighting the third.
    if (boundary === 'third-centre') state.forces.thrust = getThrust([true, true, false],
      state.vehicle.throttleCurrent, state.atmosphere.airPressure, SUPER_HEAVY);
    // Isolate decreasing throttle after a fully paid, already-lit cohort; the
    // historical boundary otherwise has the separate ignition transition.
    if (boundary === 'throttle-decrease') state.forces.thrust = getThrust(state.engines.running,
      state.vehicle.throttleCurrent, state.atmosphere.airPressure, SUPER_HEAVY);
    if (boundary === 'partial-rcs') state.vehicle.rcsRunTimeRemaining = DT / 4;
    if (boundary === 'limited-fuel') state.vehicle.propellantMass = .01;
    const arms = createMassProperties(), retained = createDamageMassProperties();
    writeFlightMassQuery(state, SUPER_HEAVY, retained, arms);
    const current = state.forces.thrust * gimballedShare(state.engines.running,
      state.atmosphere.airPressure, SUPER_HEAVY) * arms.engineArm;
    const spy = vi.spyOn(allocation, 'writeTerminalGimbalAllocation');
    try {
      runBoosterPolicy(state, DT, SUPER_HEAVY);
      expect(spy).toHaveBeenCalledOnce();
      const [, , rcs, low, high] = spy.mock.calls[0]!;
      expect(rcs).toBe(C.rcsMaxThrust * Math.abs(arms.rcsArm)
        * Math.min(1, state.vehicle.rcsRunTimeRemaining / DT));
      expect(low).toBeLessThanOrEqual(current);
      expect(high).toBeGreaterThanOrEqual(current);
      for (const target of [0, 100]) {
        const next = cloneState(state);
        next.vehicle.throttle = target;
        throttleUpdate(next, DT);
        const paid = updatePropellant(next, DT, SUPER_HEAVY);
        const delivered = getThrust(next.engines.running, next.vehicle.throttleCurrent,
          next.atmosphere.airPressure, SUPER_HEAVY) * paid
          * gimballedShare(next.engines.running, next.atmosphere.airPressure, SUPER_HEAVY) * arms.engineArm;
        const roundoff = 8 * Number.EPSILON * Math.max(1, current, delivered);
        expect(low).toBeLessThanOrEqual(delivered + roundoff);
        expect(high + roundoff).toBeGreaterThanOrEqual(delivered);
      }
      if (boundary === 'third-centre') expect(high).toBeGreaterThan(current);
      if (boundary === 'throttle-decrease' || boundary === 'limited-fuel') expect(low).toBeLessThan(current);
      if (boundary === 'partial-rcs') {
        controlTranslation(state, state.autopilot.pitchControl, DT, SUPER_HEAVY);
        expect(Math.abs(state.forces.rcsThrust)).toBeLessThanOrEqual(C.rcsMaxThrust / 4);
      }
    } finally { spy.mockRestore(); }
  });
}
