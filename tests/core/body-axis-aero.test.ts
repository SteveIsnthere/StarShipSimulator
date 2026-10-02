/** Phase 6b: the integrator consumes the physical broadside force. */
import { describe, expect, it } from 'vitest';
import { DT } from '$app/loop';
import { getScenario, createScenarioState } from '$core/scenarios';
import { step } from '$core/step';
import { broadsideDragCoefficient, getBodyAxisAccelerations } from '$core/physics/aero';
import { getVerticalAcceleration } from '$core/physics/components';
import { rad } from '$core/units';

it('uses geometric crossflow drag at hypersonic broadside instead of the 2021 blend', () => {
  const s = createScenarioState(getScenario('landing-burn')!);
  s.autopilot.autoLandOn = false;
  s.kinematics.altitude = 10_000;
  s.kinematics.speedX = 3_000;
  s.kinematics.speedY = 0;
  s.kinematics.pitch = rad(Math.PI);
  s.kinematics.angularVelocity = 0;
  s.engines.running.fill(false);
  const next = step(s, DT);
  const q = 0.5 * next.atmosphere.airDensity * 3_000 ** 2;
  // R-474 p17: hypersonic eta=1; Newtonian cylinder coefficient 1.2266667.
  expect(next.forces.aerodynamicDrag / (q * next.vehicle.vehicleInFlightMaxArea)).toBeCloseTo(1.226666666666667, 9);
  expect(Math.abs(next.forces.aerodynamicLiftAcceleration)).toBeLessThan(1e-10);
});

const out = { lift: 0, drag: 0 };
const force = (angle: number, density = 0.2, speed = 100) =>
  getBodyAxisAccelerations(density, speed, 10, rad(angle), 450, 100_000, out);

describe('body-axis forces over the full attitude domain', () => {
  it('is axial only at zero and pi, with the flat base producing more drag', () => {
    const nose = force(0).drag;
    expect(out.lift).toBe(0);
    const tail = force(Math.PI).drag;
    expect(out.lift).toBeLessThan(1e-12);
    expect(nose).toBeGreaterThan(0);
    expect(tail).toBeGreaterThan(5 * nose);
  });

  it('has exactly the cylinder crossflow drag and no lift at broadside', () => {
    force(Math.PI / 2);
    expect(out.drag).toBeCloseTo(5.52, 10);
    expect(out.lift).toBeLessThan(1e-12);
  });

  it('is dissipative and left/right symmetric through every quadrant', () => {
    for (let n = 0; n <= 180; n++) {
      const angle = n * Math.PI / 180;
      const positive = { ...force(angle) };
      const negative = force(-angle);
      expect(positive.drag).toBeGreaterThanOrEqual(0);
      expect(positive.lift).toBeGreaterThanOrEqual(0);
      expect(negative.drag).toBeCloseTo(positive.drag, 12);
      expect(negative.lift).toBeCloseTo(positive.lift, 12);
    }
  });

  it('remains continuous when the leading end changes at ninety degrees', () => {
    const below = { ...force(Math.PI / 2 - 1e-8) };
    const above = force(Math.PI / 2 + 1e-8);
    expect(Math.abs(above.drag - below.drag)).toBeLessThan(1e-6);
    expect(Math.abs(above.lift - below.lift)).toBeLessThan(1e-6);
  });

  it('gives outward lift on either direction of hypersonic entry', () => {
    for (const [motion, attack] of [[Math.PI / 2, -Math.PI / 3], [-Math.PI / 2, Math.PI / 3]] as const) {
      const f = force(attack);
      const vertical = getVerticalAcceleration({
        angleOfMotion: rad(motion), angleOfAttack: rad(attack),
        gimbalPointingDirection: rad(0), aerodynamicDragAcceleration: f.drag,
        aerodynamicLiftAcceleration: f.lift, thrustAcceleration: 0,
        fixedThrustAcceleration: 0, pitch: rad(motion + attack),
      }, 0);
      expect(vertical).toBeGreaterThan(0);
    }
  });

  it('writes zero forces at rest or in vacuum, reusing the caller buffer', () => {
    force(0.4);
    expect(force(0.4, 0)).toBe(out);
    expect(out).toEqual({ lift: 0, drag: 0 });
    force(0.4);
    force(0.4, 0.2, 0);
    expect(out).toEqual({ lift: 0, drag: 0 });
  });
});

describe('the approved finite-length crossflow factor', () => {
  const eta = (mach: number) => {
    const f = getBodyAxisAccelerations(0.2, 100, mach, rad(Math.PI / 2), 450, 100_000, out);
    return f.drag / (4.5 * broadsideDragCoefficient(mach));
  };
  it('keeps the low-speed Figure4 factor and recovers hypersonic unity', () => {
    expect(eta(0)).toBeCloseTo(0.63, 12);
    expect(eta(0.4)).toBeCloseTo(0.63, 12);
    expect(eta(1.6)).toBeCloseTo(1, 12);
    expect(eta(10)).toBeCloseTo(1, 12);
  });
  it('uses the predeclared bridge, without fitting a transonic dip', () => {
    expect(eta(0.7)).toBeCloseTo(0.6878125, 12);
    expect(eta(1)).toBeCloseTo(0.815, 12);
    expect(eta(1.3)).toBeCloseTo(0.9421875, 12);
  });
  it('has no force step at either endpoint', () => {
    for (const mach of [0.4, 1.6]) {
      expect(Math.abs(eta(mach + 1e-8) - eta(mach - 1e-8))).toBeLessThan(1e-8);
    }
  });
});
