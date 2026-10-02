import { describe, expect, it } from 'vitest';
import { autoLand } from '$core/autopilot';
import { createScenarioState, getScenario } from '$core/scenarios';
import { entryPitchOffset } from '$core/autopilot/entry';
import { toggleAutoLand } from '$core/control/commands';
import { getVerticalAcceleration } from '$core/physics/components';
import { step } from '$core/step';
import { rad } from '$core/units';

// A missing entry schedule steers an already correctly aligned vehicle back
// toward the old broadside target, producing a non-zero control command.
describe('the high-Mach entry target', () => {
  for (const [vx, motion, pitch] of [[3000, 90, 30], [-3000, -90, 150]] as const) {
    it(`holds an outward-lift attitude while travelling at ${vx} m/s`, () => {
      const s = createScenarioState(getScenario('reentry')!);
      s.autopilot.autoLandOn = true;
      s.autopilot.initVehicleConfigCompleted = true;
      s.status.rcsActive = true;
      s.kinematics.speedX = vx;
      s.kinematics.speedY = 0;
      s.kinematics.angleOfMotion = rad(motion * Math.PI / 180);
      s.kinematics.pitch = rad(pitch * Math.PI / 180);
      s.kinematics.angularVelocity = 0;
      s.kinematics.machSpeed = 40;
      s.forces.offAxisThrustDifferenceAcceleration = 0;
      autoLand(s, 1 / 120, rad(Math.PI / 3));
      expect(s.autopilot.pitchControl).toBeCloseTo(0, 9);
      expect(s.autopilot.rcsThrustCommand).toBeCloseTo(0, 9);
    });
  }
});

it.each([-6000, 6000])('keeps lift outward through the flown hypersonic segment at vx=%i', (vx) => {
  let s = createScenarioState(getScenario('reentry')!);
  s.kinematics.speedX = vx;
  s.kinematics.speedY = -200;
  const motion = Math.atan2(vx, -200);
  s.kinematics.pitch = rad(motion - Math.PI / 2 + Math.sign(vx) * Math.PI / 6);
  s.kinematics.angularVelocity = 0;
  toggleAutoLand(s);
  for (let n = 0; n < 1200; n++) {
    s = step(s, 1 / 120);
    expect(s.kinematics.machSpeed).toBeGreaterThan(5);
    const liftY = getVerticalAcceleration({
      angleOfMotion: s.kinematics.angleOfMotion,
      angleOfAttack: s.kinematics.angleOfAttack,
      aerodynamicDragAcceleration: 0,
      aerodynamicLiftAcceleration: s.forces.aerodynamicLiftAcceleration,
      thrustAcceleration: 0, fixedThrustAcceleration: 0,
      gimbalPointingDirection: rad(0), pitch: s.kinematics.pitch,
    }, 0);
    expect(liftY, `step ${n}`).toBeGreaterThan(0);
    expect(s.failures.inFlightBreakUp).toBe(false);
  }
});

describe('the Mach-twenty to Mach-two blend', () => {
  it('returns the original broadside law below Mach two and the entry angle above twenty', () => {
    expect(entryPitchOffset(1, 3000, rad(Math.PI / 3))).toBe(0);
    expect(entryPitchOffset(2, 3000, rad(Math.PI / 3))).toBe(0);
    expect(entryPitchOffset(20, 3000, rad(Math.PI / 3))).toBeCloseTo(Math.PI / 6, 12);
    expect(entryPitchOffset(40, -3000, rad(Math.PI / 3))).toBeCloseTo(-Math.PI / 6, 12);
    expect(entryPitchOffset(11, 3000, rad(Math.PI / 3))).toBeCloseTo(Math.PI / 12, 12);
  });
  it('has no pitch step at either boundary in either direction', () => {
    for (const mach of [2, 20]) for (const vx of [-3000, 3000]) {
      expect(Math.abs(entryPitchOffset(mach+1e-8,vx,rad(Math.PI/3))-entryPitchOffset(mach-1e-8,vx,rad(Math.PI/3)))).toBeLessThan(1e-8);
    }
  });
});
