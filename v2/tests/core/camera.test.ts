/**
 * M3.1: the camera.
 *
 * The 2021 camera is a second-order follow, not a snap, and that is what gives
 * the game its weight. It is ported verbatim and tested here for the properties
 * that make it feel right rather than for a transcription of its arithmetic.
 *
 * One deliberate change: 2021 updated the camera inside the physics loop and
 * scaled by `renderTimeInterval`, so camera motion depended on frame rate. Here
 * it takes a real dt, which is asserted below.
 */
import { describe, expect, it } from 'vitest';
import {
  centerizeAcceleration,
  computeViewport,
  createCamera,
  MAX_VEHICLE_DRAW_HEIGHT,
  MIN_VEHICLE_DRAW_HEIGHT,
  matchSpeedAcceleration,
  shouldBeSticky,
  updateCamera,
  worldToScreen,
  type CameraTarget,
} from '$view/camera';
import { vehicleHeight } from '$core/constants';

const viewport = (w = 1280, h = 800) => computeViewport(w, h, vehicleHeight);

const target = (over: Partial<CameraTarget> = {}): CameraTarget => ({
  downRangeDistance: 0,
  altitude: 1000,
  speedX: 0,
  speedY: 0,
  landed: false,
  onTheGround: false,
  crashed: false,
  ...over,
});

describe('viewport', () => {
  it('keeps the drawn vehicle between 100 and 220 px on any screen', () => {
    for (const [w, h] of [
      [320, 480],
      [1280, 800],
      [1920, 1080],
      [3840, 2160],
      [800, 300],
    ]) {
      const v = computeViewport(w!, h!, vehicleHeight);
      const drawn = v.scale * vehicleHeight;
      expect(drawn, `${w}x${h}`).toBeGreaterThanOrEqual(MIN_VEHICLE_DRAW_HEIGHT - 1e-9);
      expect(drawn, `${w}x${h}`).toBeLessThanOrEqual(MAX_VEHICLE_DRAW_HEIGHT + 1e-9);
    }
  });

  it('covers 200 m of world height at the base proportion', () => {
    // 50 m vehicle x4. The value core/scenarios.ts pins for the intro.
    const v = computeViewport(800, 800, vehicleHeight);
    expect(v.physicalHeight).toBe(200);
  });

  it('widens the world view on a wider screen', () => {
    const wide = computeViewport(1920, 800, vehicleHeight);
    const narrow = computeViewport(800, 800, vehicleHeight);
    expect(wide.physicalWidth).toBeGreaterThan(narrow.physicalWidth);
    expect(wide.physicalHeight).toBe(narrow.physicalHeight);
  });
});

describe('the follow law', () => {
  it('pulls proportionally when close', () => {
    expect(centerizeAcceleration(0, 10, 100, 500, 1)).toBe(10);
    expect(centerizeAcceleration(0, -10, 100, 500, 1)).toBe(-10);
  });

  it('pulls harder as the gap widens past the threshold', () => {
    const near = centerizeAcceleration(0, 150, 100, 500, 1);
    const far = centerizeAcceleration(0, 400, 100, 500, 1);
    expect(far / 400).toBeGreaterThan(near / 150);
  });

  it('gives up beyond the maximum, so it does not lurch after a crash', () => {
    expect(centerizeAcceleration(0, 600, 100, 500, 1)).toBe(0);
    expect(centerizeAcceleration(0, -600, 100, 500, 1)).toBe(0);
  });

  it('and a camera left outside that radius simply stays put', () => {
    // Worth asserting: it means the camera cannot be "teleported" into
    // following something far away, which is the behaviour after a breakup.
    const v = viewport();
    const cam = createCamera(v, 0, 0, 0);
    cam.posX = -100_000;
    const before = cam.posX;
    updateCamera(cam, target({ downRangeDistance: 0, altitude: v.physicalHeight / 2 }), v, 1 / 60);
    // Only the speed-matching term acts, and with both speeds zero it is zero.
    expect(cam.posX).toBe(before);
  });

  it('matches speed proportionally to the difference', () => {
    expect(matchSpeedAcceleration(10, 30, 2)).toBe(10);
    expect(matchSpeedAcceleration(30, 30, 1)).toBe(0);
  });
});

describe('following', () => {
  it('converges on a stationary vehicle', () => {
    const v = viewport();
    const cam = createCamera(v, 0, 0, 0);
    // Inside the catch-up radius. Beyond `physicalWidth / 2` - 160 m on this
    // viewport - the law deliberately returns zero and the camera lets the
    // vehicle go, which the next test covers.
    cam.posX = -100;
    const t = target({ downRangeDistance: 0, altitude: v.physicalHeight / 2 });
    for (let i = 0; i < 600; i++) updateCamera(cam, t, v, 1 / 60);
    expect(Math.abs(cam.posX)).toBeLessThan(1);
  });

  it('keeps up with a moving vehicle rather than falling behind forever', () => {
    const v = viewport();
    const cam = createCamera(v, 0, 0, 0);
    let x = 0;
    for (let i = 0; i < 1200; i++) {
      x += 200 * (1 / 60);
      updateCamera(cam, target({ downRangeDistance: x, speedX: 200, altitude: 5000 }), v, 1 / 60);
    }
    // Trailing by a bounded amount, not diverging.
    expect(Math.abs(cam.posX - x)).toBeLessThan(v.physicalWidth);
    expect(cam.speedX).toBeCloseTo(200, 0);
  });

  it('does not overshoot wildly — it is damped, not springy', () => {
    const v = viewport();
    const cam = createCamera(v, 0, 0, 0);
    const t = target({ downRangeDistance: 300, altitude: v.physicalHeight / 2 });
    let maxOvershoot = 0;
    for (let i = 0; i < 900; i++) {
      updateCamera(cam, t, v, 1 / 60);
      maxOvershoot = Math.max(maxOvershoot, cam.posX - 300);
    }
    expect(maxOvershoot).toBeLessThan(150);
  });

  it('never looks below the ground', () => {
    const v = viewport();
    const cam = createCamera(v, 0, 0, 0);
    for (let i = 0; i < 600; i++) {
      updateCamera(cam, target({ altitude: 0, speedY: -50 }), v, 1 / 60);
      expect(cam.posY).toBeGreaterThanOrEqual(v.physicalHeight * 0.5 - 1e-9);
    }
  });
});

describe('sticky versus ground mode', () => {
  it('is sticky in flight', () => {
    expect(shouldBeSticky(target({ altitude: 5000, speedY: -100 }), viewport())).toBe(true);
  });

  it('drops to ground mode when low and descending', () => {
    const v = viewport();
    expect(shouldBeSticky(target({ altitude: 100, speedY: -50 }), v)).toBe(false);
  });

  it('stays sticky when low but climbing', () => {
    const v = viewport();
    expect(shouldBeSticky(target({ altitude: 100, speedY: 50 }), v)).toBe(true);
  });

  it('is never sticky once landed, on the ground, or crashed', () => {
    const v = viewport();
    for (const flag of ['landed', 'onTheGround', 'crashed'] as const) {
      expect(shouldBeSticky(target({ altitude: 5000, [flag]: true }), v), flag).toBe(false);
    }
  });

  it('pins the vertical in ground mode', () => {
    const v = viewport();
    const cam = createCamera(v, 0, 0, 0);
    cam.posY = 5000;
    updateCamera(cam, target({ landed: true }), v, 1 / 60);
    expect(cam.posY).toBe(v.physicalHeight * 0.5);
    expect(cam.speedY).toBe(0);
  });
});

describe('frame-rate independence — the 2021 camera did not have this', () => {
  it('reaches the same place at 30 and 120 fps', () => {
    const v = viewport();
    const t = target({ downRangeDistance: 500, altitude: 3000, speedX: 100 });

    const run = (dt: number, steps: number) => {
      const cam = createCamera(v, 0, 0, 0);
      for (let i = 0; i < steps; i++) updateCamera(cam, t, v, dt);
      return cam;
    };
    const slow = run(1 / 30, 30 * 10);
    const fast = run(1 / 120, 120 * 10);

    // Same ten simulated seconds. Not bit-identical - it is an explicit Euler
    // integration and the step sizes differ fourfold - but within 2 m after
    // 10 s, against a 320 m viewport width. Measured drift is 1.1 m.
    //
    // The 2021 camera was not merely imprecise across frame rates: it scaled by
    // `renderTimeInterval`, so at 30 fps it accelerated twice as hard per unit
    // of real time and the follow felt different on different machines.
    expect(Math.abs(slow.posX - fast.posX)).toBeLessThan(2);
    expect(Math.abs(slow.posY - fast.posY)).toBeLessThan(2);
  });
});

describe('world to screen', () => {
  it('puts the camera position at the centre of the screen', () => {
    const v = viewport(1280, 800);
    const cam = createCamera(v, 1000, 0, 0);
    cam.posY = 500;
    const p = worldToScreen(cam, v, 1000, 500);
    expect(p.x).toBeCloseTo(640, 9);
    expect(p.y).toBeCloseTo(400, 9);
  });

  it('flips the vertical, because world y is up and screen y is down', () => {
    const v = viewport(1280, 800);
    const cam = createCamera(v, 0, 0, 0);
    cam.posY = 0;
    expect(worldToScreen(cam, v, 0, 100).y).toBeLessThan(400);
    expect(worldToScreen(cam, v, 0, -100).y).toBeGreaterThan(400);
  });

  it('scales by metres, not pixels', () => {
    const v = viewport(1280, 800);
    const cam = createCamera(v, 0, 0, 0);
    const a = worldToScreen(cam, v, 0, 0);
    const b = worldToScreen(cam, v, 10, 0);
    expect(b.x - a.x).toBeCloseTo(10 * v.scale, 9);
  });
});
