/**
 * M2.4, Bug-fix tier: pitchRateOfChange is not a rate of change.
 *
 * THE DEFECT. physics.js:468:
 *
 *     pitchRateOfChange = (pitch - lastPitch) / renderTimeInterval * 3600
 *
 * A rate of change is dPitch / dt. But `renderTimeInterval` is `frameRate /
 * timeAccel`, whose reciprocal IS dt - so dividing BY it multiplies by dt.
 * The expression computes `dPitch * dt * 3600`, which has units of rad*s, not
 * rad/s, and is wrong by a factor of dt^2 * 3600.
 *
 * At exactly 60 fps with timeAccel 1, dt = 1/60 and dt^2 * 3600 = 1. The
 * expression is accidentally correct at precisely one frame rate, which is why
 * it shipped. At 30 fps it reads 4x high; at 120 fps, 4x low; at 144 fps,
 * 5.76x low.
 *
 * WHY IT MATTERS. pitchHold gates on `Math.abs(pitchRateOfChange) < 0.4` to
 * decide whether to re-latch its target attitude. That threshold therefore
 * meant something different on every device: a player on a 144 Hz monitor got a
 * pitchHold that latched far more eagerly than one on a 30 Hz phone. The
 * autopilot's behaviour depended on the display.
 *
 * THE FIX is dPitch / dt, and the pitchHold threshold is re-derived so the gate
 * keeps the meaning it had at the 2021 reference rate.
 *
 * These tests were written before the fix and observed to fail.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState } from '$core/state';
import { step } from '$core/step';
import { PITCH_HOLD_RATE_THRESHOLD } from '$core/constants';
import { rad } from '$core/units';

/** Spin the vehicle at a known rate and read back what the sim reports. */
function reportedRate(angularVelocity: number, dt: number): number {
  let s = createInitialState();
  s.kinematics.altitude = 40_000;
  s.kinematics.angularVelocity = angularVelocity;
  // Two steps: pitchRecord needs one to fill its Infinity seed.
  s = step(s, dt);
  s = step(s, dt);
  return s.kinematics.pitchRateOfChange;
}

describe('pitchRateOfChange is a rate, in rad/s', () => {
  it('reports the actual angular velocity', () => {
    for (const w of [0.05, 0.2, -0.3, 1.0]) {
      // The vehicle rotates at w rad/s, so dPitch/dt is w.
      expect(reportedRate(w, 1 / 120), `w=${w}`).toBeCloseTo(w, 3);
    }
  });

  it('reads the same at every frame rate — the whole point', () => {
    const w = 0.25;
    const rates = [1 / 30, 1 / 60, 1 / 120, 1 / 144, 1 / 240].map((dt) => reportedRate(w, dt));
    for (const r of rates) expect(r).toBeCloseTo(w, 2);
    // Spread across frame rates is now noise, not a factor of 5.76.
    expect(Math.max(...rates) - Math.min(...rates)).toBeLessThan(0.02);
  });

  it('has the sign of the rotation', () => {
    expect(reportedRate(0.3, 1 / 120)).toBeGreaterThan(0);
    expect(reportedRate(-0.3, 1 / 120)).toBeLessThan(0);
  });

  it('is zero when the vehicle is not rotating', () => {
    expect(reportedRate(0, 1 / 120)).toBe(0);
  });
});

describe('the 2021 expression, for comparison', () => {
  /** physics.js:468 as written: dPitch / renderTimeInterval * 3600. */
  const legacyRate = (dPitch: number, dt: number) => (dPitch / (1 / dt)) * 3600;
  /** What a rate of change actually is. */
  const trueRate = (dPitch: number, dt: number) => dPitch / dt;

  it('is accidentally correct at exactly 60 fps', () => {
    const dt = 1 / 60;
    const dPitch = 0.25 * dt;
    expect(legacyRate(dPitch, dt)).toBeCloseTo(trueRate(dPitch, dt), 9);
    // Because dt^2 * 3600 = 1 there, and only there.
    expect(dt * dt * 3600).toBeCloseTo(1, 12);
  });

  it('is wrong by dt^2 * 3600 everywhere else', () => {
    for (const [dt, factor] of [
      [1 / 30, 4],
      [1 / 120, 0.25],
      [1 / 144, 1 / 5.76],
      [1 / 240, 1 / 16],
    ] as const) {
      const dPitch = 0.25 * dt;
      expect(legacyRate(dPitch, dt) / trueRate(dPitch, dt), `dt=${dt}`).toBeCloseTo(factor, 6);
    }
  });

  it('so a 30 fps device read 16x the rate a 120 fps device did', () => {
    const w = 0.25;
    const at30 = legacyRate(w / 30, 1 / 30);
    const at120 = legacyRate(w / 120, 1 / 120);
    expect(at30 / at120).toBeCloseTo(16, 6);
  });
});

describe('the pitchHold gate keeps its 2021 meaning', () => {
  it('the threshold is stated in rad/s', () => {
    // 0.4 in the old units, at the 60 fps reference where the old expression
    // was correct, IS 0.4 rad/s. So the number is unchanged - what changed is
    // that it now means the same thing at every frame rate.
    expect(PITCH_HOLD_RATE_THRESHOLD).toBe(0.4);
  });

  it('gates at the same angular velocity regardless of frame rate', () => {
    // Just below and just above the threshold, at four frame rates.
    for (const dt of [1 / 30, 1 / 60, 1 / 120, 1 / 144]) {
      expect(Math.abs(reportedRate(0.35, dt)), `below, dt=${dt}`).toBeLessThan(
        PITCH_HOLD_RATE_THRESHOLD,
      );
      expect(Math.abs(reportedRate(0.5, dt)), `above, dt=${dt}`).toBeGreaterThan(
        PITCH_HOLD_RATE_THRESHOLD,
      );
    }
  });

  it('under the 2021 formula the same rotation fell on different sides', () => {
    // The device dependence, quantified: a 0.25 rad/s rotation registered as
    // 1.0 on a 30 fps device (gate closed) and 0.0625 on a 120 fps one (gate
    // open). Same vehicle, same motion, opposite autopilot behaviour.
    const legacyRate = (dPitch: number, dt: number) => (dPitch / (1 / dt)) * 3600;
    const w = 0.25;
    expect(legacyRate(w / 30, 1 / 30)).toBeGreaterThan(PITCH_HOLD_RATE_THRESHOLD);
    expect(legacyRate(w / 120, 1 / 120)).toBeLessThan(PITCH_HOLD_RATE_THRESHOLD);
  });
});

describe('pitchHold itself now behaves identically across frame rates', () => {
  it('arrests a rotation the same way at 30 and 120 fps', () => {
    const fly = (dt: number, steps: number) => {
      const s = createInitialState();
      s.kinematics.altitude = 30_000;
      s.kinematics.speedY = -100;
      s.kinematics.pitch = rad(0.6);
      s.kinematics.angularVelocity = 0.3;
      s.engines.running = [true, true, true];
      s.vehicle.throttle = 100;
      s.vehicle.throttleCurrent = 100;
      s.autopilot.pitchHoldOn = true;
      let cur = s;
      for (let i = 0; i < steps; i++) cur = step(cur, dt);
      return cur;
    };
    // Same simulated duration, different step sizes.
    const slow = fly(1 / 30, 20 * 30);
    const fast = fly(1 / 120, 20 * 120);
    expect(Math.abs(slow.kinematics.angularVelocity)).toBeLessThan(0.05);
    expect(Math.abs(fast.kinematics.angularVelocity)).toBeLessThan(0.05);
    // And they settle at comparable attitudes rather than diverging.
    expect(Math.abs(slow.kinematics.pitch - fast.kinematics.pitch)).toBeLessThan(0.1);
  });
});
