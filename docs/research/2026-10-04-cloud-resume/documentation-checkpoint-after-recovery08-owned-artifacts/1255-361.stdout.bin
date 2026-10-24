import { describe, expect, it } from 'vitest';
import { createInitialState } from '$core/state';
import { rad } from '$core/units';
import { writeReferenceShift } from '$core/physics/body-reference';

describe('rigid body reference translation', () => {
  it('moves a point on a spinning rigid body without inventing acceleration or reversing spin', () => {
    const s = createInitialState().kinematics;
    s.pitch = rad(0);
    s.downRangeDistance = 10; s.altitude = 100;
    s.speedX = 3; s.speedY = 4;
    s.angularVelocity = 2; s.angularAcceleration = 3;
    s.accelerationX = 5; s.accelerationY = 6;
    const out = { ...s };
    writeReferenceShift(s, 2, 7, out);
    expect([out.downRangeDistance, out.altitude]).toEqual([12, 107]);
    expect([out.speedX, out.speedY]).toEqual([17, 0]);
    // Tangential(21,-6) plus centripetal(-8,-28).
    expect([out.accelerationX, out.accelerationY]).toEqual([18, -28]);
    expect(out.angularVelocity).toBe(2);
    expect(out.angularAcceleration).toBe(3);
  });
  it('round trips arbitrary clockwise attitudes and permits in-place output', () => {
    const s = createInitialState().kinematics;
    s.pitch = rad(.83); s.angularVelocity = -.4; s.angularAcceleration = .7;
    s.downRangeDistance = 120; s.altitude = 3400;
    s.speedX = 230; s.speedY = -64;
    s.accelerationX = 3; s.accelerationY = -8;
    const out = { ...s };
    writeReferenceShift(s, -1.3, 8.2, out);
    writeReferenceShift(out, 1.3, -8.2, out);
    for (const key of ['downRangeDistance', 'altitude', 'speedX', 'speedY', 'accelerationX', 'accelerationY'] as const)
      expect(out[key]).toBeCloseTo(s[key], 11);
  });
});
