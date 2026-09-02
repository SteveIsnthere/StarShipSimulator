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
  altitudeFov,
  centerizeAcceleration,
  computeViewport,
  createCamera,
  framingLead,
  FOV_FLAT_ALTITUDE,
  FOV_FULL_ALTITUDE,
  FOV_MAX,
  LEAD_FRACTION,
  LEAD_TIME,
  MAX_VEHICLE_DRAW_HEIGHT,
  MIN_VEHICLE_DRAW_HEIGHT,
  matchSpeedAcceleration,
  MAX_RECOVERY_GAIN,
  shakeAmplitude,
  shouldBeSticky,
  updateCamera,
  worldToScreen,
  writeViewport,
  type CameraTarget,
  type MutableViewport,
  CAMERA_MODES,
  CHASE_LEAD,
  PAD_CAPTURE_FRACTION,
  PAD_HOLD_FRACTION,
  effectiveTarget,
  modeZoom,
  type CameraMode,
  type ModeTarget,
} from '$view/camera';
import { starBaseXPos, vehicleHeight } from '$core/constants';
import { step } from '$core/step';
import type { SimState } from '$core/state';
import { GOLDEN_DT } from '../golden/record';
import { GOLDEN_SPECS } from '../golden/scenarios';

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

  it('covers 200 m of world height at the base proportion, ON THE GROUND', () => {
    // 50 m vehicle x4. The value core/scenarios.ts pins for the intro.
    //
    // M7.3 made this altitude-aware rather than deleting it: the number is still
    // 200 m, and it is still the number the intro is pinned to — but it is now a
    // claim about the BOTTOM of the field-of-view curve rather than about every
    // altitude, which is what it silently used to be. The next test is the other
    // half.
    const v = computeViewport(800, 800, vehicleHeight, 1, 0);
    expect(v.physicalHeight).toBe(200);
  });

  it('opens to about a kilometre high up, and stays 200 m where landings happen', () => {
    // The owner's moderate setting, as the two numbers that matter.
    const low = computeViewport(800, 800, vehicleHeight, 1, FOV_FLAT_ALTITUDE);
    const high = computeViewport(800, 800, vehicleHeight, 1, FOV_FULL_ALTITUDE);
    expect(low.physicalHeight).toBe(200);
    expect(high.physicalHeight).toBe(200 * FOV_MAX);
    // And the ship is still the subject rather than a marker: the drawn vehicle
    // must not fall below a height that keeps it identifiable.
    expect(high.scale * vehicleHeight).toBeGreaterThan(30);
  });

  it('widens the world view on a wider screen, at any altitude', () => {
    for (const altitude of [0, 5_000, 100_000]) {
      const wide = computeViewport(1920, 800, vehicleHeight, 1, altitude);
      const narrow = computeViewport(800, 800, vehicleHeight, 1, altitude);
      expect(wide.physicalWidth, `${altitude} m`).toBeGreaterThan(narrow.physicalWidth);
      expect(wide.physicalHeight, `${altitude} m`).toBe(narrow.physicalHeight);
    }
  });
});

describe('the altitude field of view (M7.3)', () => {
  it('is FLAT below 500 m — the intro and every landing are untouched', () => {
    // The one hard constraint of the owner decision. Asserted at exact equality
    // rather than approximately: "untouched by construction" is the claim, and
    // an epsilon here would be an admission that it is not.
    for (const altitude of [0, 1, 25, 100, 250, 499.9, FOV_FLAT_ALTITUDE]) {
      expect(altitudeFov(altitude), `${altitude} m`).toBe(1);
    }
  });

  it('reaches the moderate cap and stops', () => {
    expect(altitudeFov(FOV_FULL_ALTITUDE)).toBe(FOV_MAX);
    expect(altitudeFov(200_000)).toBe(FOV_MAX);
    expect(altitudeFov(Infinity)).toBe(FOV_MAX);
  });

  it('is monotonic — the view never narrows as the vehicle climbs', () => {
    let previous = 0;
    for (let altitude = 0; altitude < 100_000; altitude += 137) {
      const fov = altitudeFov(altitude);
      expect(fov, `${altitude} m`).toBeGreaterThanOrEqual(previous);
      previous = fov;
    }
  });

  it('has no seam where it starts opening or where it stops', () => {
    // Smoothstep is here for this: a bare logarithm is continuous but its RATE
    // jumps at each end, and a field of view that starts opening abruptly is
    // something a player notices without being able to say what happened.
    const slope = (a: number) => (altitudeFov(a + 0.5) - altitudeFov(a - 0.5)) / 1;
    expect(Math.abs(slope(FOV_FLAT_ALTITUDE))).toBeLessThan(1e-4);
    expect(Math.abs(slope(FOV_FULL_ALTITUDE))).toBeLessThan(1e-4);
  });

  it('spends its range where the plan says it should', () => {
    // "What ~5x genuinely buys is the 500 m to 20 km band, which is most of an
    // ascent." Half the opening should have happened by a couple of kilometres.
    expect(altitudeFov(2_000)).toBeGreaterThan(1.5);
    expect(altitudeFov(10_000)).toBeGreaterThan(3.5);
  });

  it('survives a nonsense altitude', () => {
    expect(altitudeFov(NaN)).toBe(1);
    expect(altitudeFov(-1_000)).toBe(1);
  });

  it('manual zoom MULTIPLIES it rather than fighting it', () => {
    // The owner decision, as arithmetic. Zooming in one step at altitude must
    // show exactly ZOOM_IN_FACTOR less world than not zooming at that altitude —
    // the two controls compose instead of competing for the same number.
    const plain = computeViewport(1200, 800, vehicleHeight, 1, 10_000);
    const zoomed = computeViewport(1200, 800, vehicleHeight, 1.5, 10_000);
    expect(plain.physicalHeight / zoomed.physicalHeight).toBeCloseTo(1.5, 10);
    expect(zoomed.scale / plain.scale).toBeCloseTo(1.5, 10);
  });

  it('writes a viewport in place without allocating one', () => {
    const out = {
      width: 0,
      height: 0,
      physicalHeight: 0,
      physicalWidth: 0,
      scale: 0,
    };
    writeViewport(out, 1200, 800, vehicleHeight, 1, 10_000);
    const fresh = computeViewport(1200, 800, vehicleHeight, 1, 10_000);
    expect(out).toEqual(fresh);
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

  it('gives up beyond the maximum when ASKED to, so it does not lurch after a crash', () => {
    // The default is 2021's, so every caller written before M9.2 means what it
    // always meant.
    expect(centerizeAcceleration(0, 600, 100, 500, 1)).toBe(0);
    expect(centerizeAcceleration(0, -600, 100, 500, 1)).toBe(0);
  });

  it('and does not give up when asked not to — M9.2', () => {
    /*
      The owner's decision of 2026-08-26, as arithmetic. Beyond `max` the pull no
      longer vanishes: it holds at MAX_RECOVERY_GAIN times the proportional
      pull, which is finite, damped, and — crucially — non-zero, so the error
      can close. Signed, because a camera that recovered in only one direction
      would be worse than one that never recovered.
    */
    expect(centerizeAcceleration(0, 600, 100, 500, 1, false)).toBe(600 * MAX_RECOVERY_GAIN);
    expect(centerizeAcceleration(0, -600, 100, 500, 1, false)).toBe(-600 * MAX_RECOVERY_GAIN);
  });

  it('caps the gain, so the pole at `max` cannot fling the camera', () => {
    /*
      2021's gain is `(max - threshold) / (max - magnitude)`, which goes to
      infinity as the camera approaches the give-up radius from inside. That was
      unreachable while the branch beyond `max` returned zero. Making the
      give-up conditional made it reachable, and it fired: instrumented on
      `reentry` with frames dropping, one sub-step at a gain of 400 threw the
      camera to 10 km/s chasing a vehicle doing 7, and put the ship 2.5 km
      outside the frame. The fix for the latch had reproduced the symptom from
      the other side.
    */
    const atThePole = centerizeAcceleration(0, 499.999, 100, 500, 1, false);
    expect(Number.isFinite(atThePole)).toBe(true);
    expect(atThePole).toBe(499.999 * MAX_RECOVERY_GAIN);
    // And exactly on the radius, where the raw expression divides by zero.
    expect(centerizeAcceleration(0, 500, 100, 500, 1, false)).toBe(500 * MAX_RECOVERY_GAIN);
  });

  it('and the cap bites nowhere the old code did anything', () => {
    /*
      The raw gain only exceeds the cap beyond 0.75 of the give-up radius — and
      out there the old code either returned zero (past `max`) or was about to.
      Below that point every value is 2021's to the digit, which is what makes
      this a fix rather than a retune.
    */
    for (const magnitude of [100, 150, 200, 250, 300, 350, 400, 449]) {
      const raw = (500 - 100) / (500 - magnitude);
      if (raw > MAX_RECOVERY_GAIN) continue;
      expect(centerizeAcceleration(0, magnitude, 100, 500, 1), `${magnitude} m`).toBeCloseTo(
        magnitude * raw,
        9,
      );
    }
  });

  it('a camera left outside that radius RECOVERS, unless the vehicle is wreckage', () => {
    /*
      This test used to assert the opposite, and it was vacuously green: the
      camera was 100 km away, `centerizeAcceleration` returned zero, both speeds
      were zero, and so `cam.posX` did not move. It described the latch that put
      the re-entry vehicle off the side of the screen for three milestones.

      Since M9.2 it describes the owner's decision instead — a flying vehicle is
      always worth following — and the crashed case, which keeps 2021's shot of
      the wreckage leaving the frame, is asserted right beside it so the
      distinction cannot rot.
    */
    const v = viewport();
    const flying = createCamera(v, 0, 0, 0);
    flying.posX = -100_000;
    for (let i = 0; i < 60 * 60; i++) {
      updateCamera(flying, target({ downRangeDistance: 0, altitude: v.physicalHeight / 2 }), v, 1 / 60);
    }
    expect(Math.abs(flying.posX), `recovered to ${flying.posX.toFixed(1)} m`).toBeLessThan(1);

    const wreckage = createCamera(v, 0, 0, 0);
    wreckage.posX = -100_000;
    const before = wreckage.posX;
    for (let i = 0; i < 60 * 60; i++) {
      updateCamera(
        wreckage,
        target({ downRangeDistance: 0, altitude: v.physicalHeight / 2, crashed: true }),
        v,
        1 / 60,
      );
    }
    expect(wreckage.posX).toBe(before);
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
    /*
      READ THE HISTORY BEFORE TIGHTENING THIS. A 300 m step is outside the
      160 m give-up radius of this viewport, so before M9.2 the camera did not
      move at all: `maxOvershoot` was zero, the assertion was vacuous, and the
      bound below was never once evaluated against a moving camera.

      It measures something now. Outside `threshold` the law is
      `x'' + x' + G*x = 0` on 2021's one-second constants, so the damping ratio
      is `1 / (2*sqrt(G))`: at MAX_RECOVERY_GAIN = 2 that is 0.35 and the step
      settles with about 30% of overshoot. Measured: 89 m on a 300 m step.
    */
    const v = viewport();
    const cam = createCamera(v, 0, 0, 0);
    const t = target({ downRangeDistance: 300, altitude: v.physicalHeight / 2 });
    let maxOvershoot = 0;
    for (let i = 0; i < 900; i++) {
      updateCamera(cam, t, v, 1 / 60);
      maxOvershoot = Math.max(maxOvershoot, cam.posX - 300);
    }
    const report = `overshoot ${maxOvershoot.toFixed(1)} m on a 300 m step`;
    expect(maxOvershoot, report).toBeGreaterThan(0);
    expect(maxOvershoot, report).toBeLessThan(120);
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

    /*
      A target that MOVES as its speed says it does.

      The first version of this test held the vehicle still at 500 m while
      telling the camera it was doing 100 m/s, and it passed for a year. M7.3's
      framing lead pushed it over a cliff: with an inconsistent target the camera
      coasts out past `physicalWidth / 2`, where `centerizeAcceleration`
      deliberately returns zero and gives up — and whether a given frame rate
      escapes that radius or not is a coin toss. One run settled, the other flew
      away, and the "drift" was 2.8 km.

      That was the test being unphysical, not the camera being wrong. A real
      vehicle's position is the integral of its speed, so this integrates it.
    */
    const run = (dt: number, seconds: number) => {
      const cam = createCamera(v, 0, 0, 0);
      const steps = Math.round(seconds / dt);
      let x = 0;
      for (let i = 0; i < steps; i++) {
        x += 100 * dt;
        updateCamera(cam, target({ downRangeDistance: x, altitude: 3000, speedX: 100 }), v, dt);
      }
      return cam;
    };

    // The four rates the acceptance line names.
    const rates = [30, 60, 120, 144];
    const runs = rates.map((fps) => ({ fps, cam: run(1 / fps, 10) }));
    const reference = runs[1]!.cam;

    let worst = 0;
    const report: string[] = [];
    for (const { fps, cam } of runs) {
      const drift = Math.max(
        Math.abs(cam.posX - reference.posX),
        Math.abs(cam.posY - reference.posY),
      );
      worst = Math.max(worst, drift);
      report.push(`${fps} fps: ${drift.toFixed(3)} m`);
    }

    /*
      Ten simulated seconds against a 320 m viewport, measured from 60 fps:

          30 fps  1.71 m      120 fps  0.86 m      144 fps  1.00 m

      Not bit-identical — this is an explicit integration and the step sizes
      differ nearly fivefold — but the worst case is 0.5% of a screen width, and
      the drift scales with dt as an O(dt) method should rather than diverging.

      2 m is the bound. The 2021 camera was not merely imprecise across frame
      rates: it scaled by `renderTimeInterval`, so at 30 fps it accelerated twice
      as hard per unit of real time and the follow genuinely felt different on
      different machines. That is the failure this replaces, and 0.5% of a
      screen is not it.
    */
    expect(worst, report.join(' · ')).toBeLessThan(2);
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

/* ── M7.3: the five properties that replaced the bit-identical guarantee ──
 *
 * The camera used to be checked by being exactly what 2021 was. That was a
 * cheap and total guarantee, and the owner decision of 2026-08-25 spends it.
 * These are what stand in its place; DEPTH-AND-SPEED-PLAN § 6.1 names all five.
 */

describe('property 1 — the vehicle stays framed, over all seven goldens', () => {
  it.each(GOLDEN_SPECS.map((s) => [s.id, s] as const))('%s', (id, spec) => {
    /*
      The real test of a camera: fly the actual flights and check the ship is
      on screen. Nothing else here would have caught a field-of-view curve that
      opened in the wrong direction, or a lead that ran away at re-entry speed.
    */
    const live: MutableViewport = {
      width: 0,
      height: 0,
      physicalHeight: 0,
      physicalWidth: 0,
      scale: 0,
    };
    writeViewport(live, 1280, 800, vehicleHeight, 1, 0);

    let s: SimState = spec.build();
    /*
      Seeded with the vehicle's OWN velocity, as App.svelte does.

      The first version of this test started the camera at rest, and re-entry
      failed by 879% of a half-frame. That was the test, not the camera: from
      rest the camera needs a second to reach 7 km/s, by which time it is seven
      kilometres behind — and out there `centerizeAcceleration` has
      deliberately given up, so it can never close the gap. Handed the vehicle's
      velocity at birth, as the real one is, there is no transient to lose.
    */
    const camera = createCamera(
      live,
      s.kinematics.downRangeDistance,
      s.kinematics.speedX,
      s.kinematics.speedY,
    );
    camera.posY = Math.max(live.physicalHeight * 0.5, s.kinematics.altitude);

    const DT = 1 / 60;
    let worstX = 0;
    let worstY = 0;

    // 120 Hz simulation, 60 fps render: two steps per frame, as the loop does.
    for (let i = 0; i < spec.steps; i += 2) {
      s = step(s, GOLDEN_DT);
      s = step(s, GOLDEN_DT);
      writeViewport(live, 1280, 800, vehicleHeight, 1, s.kinematics.altitude);
      updateCamera(
        camera,
        {
          downRangeDistance: s.kinematics.downRangeDistance,
          altitude: s.kinematics.altitude,
          speedX: s.kinematics.speedX,
          speedY: s.kinematics.speedY,
          landed: s.status.landed,
          onTheGround: s.status.onTheGround,
          crashed: s.failures.crashed,
          dynamicPressure: s.forces.dynamicPressure,
          thrustAcceleration: s.forces.thrustAcceleration,
        },
        live,
        DT,
      );

      // A destroyed vehicle is allowed to leave the frame — that is the
      // "gives up beyond max" behaviour, and it is deliberate.
      if (s.failures.crashed || s.failures.inFlightBreakUp) break;

      const p = worldToScreen(camera, live, s.kinematics.downRangeDistance, s.kinematics.altitude);
      worstX = Math.max(worstX, Math.abs(p.x - live.width / 2) / (live.width / 2));
      worstY = Math.max(worstY, Math.abs(p.y - live.height / 2) / (live.height / 2));
    }

    const report = `${id}: worst offset ${(worstX * 100).toFixed(1)}% x, ${(worstY * 100).toFixed(1)}% y of half-frame`;

    /*
      Measured worst cases across the seven:

          x   39%  (reentry, at 7.3 km/s)      y   100%  (the ground-mode handoff)
          x   26%  (rtls / booster-sep)        y    75%  (a vehicle standing on the pad)

      HORIZONTALLY there is real margin everywhere, and half a frame is a bound
      with room in it.

      VERTICALLY the worst case is exactly 1.0, and it is structural rather than
      sloppy: ground mode engages at `altitude <= physicalHeight` and pins the
      camera at half that, so at the instant of the handoff the vehicle is at the
      top edge by definition — then descends through the frame. That is 2021's
      framing, it is the band every landing and the whole intro happen in, and
      CLAUDE.md names the intro as part of the soul. Tightening it would mean
      retuning the one thing M7.3's flat-below-500 m rule exists to leave alone.
    */
    expect(worstX, report).toBeLessThan(0.5);
    expect(worstY, report).toBeLessThanOrEqual(1);
  });
});

describe('property 6 — it always comes back (M9.2)', () => {
  /*
    The sixth property, added by the owner's decision of 2026-08-26 alongside
    M7.3's five. The other five say what the camera does while it is working;
    this one says it cannot stop working. Seeded past the give-up radius — the
    exact state the wall-clock bug used to put it in and leave it in — a camera
    following a flying vehicle must return to frame, from any direction, at any
    field of view.
  */
  it.each([
    ['just outside the radius', 1.1],
    ['a whole frame out', 2],
    ['ten frames out', 20],
    ['a kilometre of frames out', 2_000],
  ])('recovers from an error %s', (_label, multiple) => {
    const v = viewport();
    for (const sign of [1, -1]) {
      const cam = createCamera(v, 0, 0, 0);
      cam.posX = sign * v.physicalWidth * 0.5 * multiple;
      for (let i = 0; i < 60 * 120; i++) {
        updateCamera(cam, target({ downRangeDistance: 0, altitude: v.physicalHeight / 2 }), v, 1 / 60);
      }
      expect(Math.abs(cam.posX), `from ${(sign * multiple).toFixed(1)} half-frames`).toBeLessThan(1);
    }
  });

  it('recovers vertically too, and still never looks below the ground', () => {
    const v = viewport();
    const cam = createCamera(v, 0, 0, 0);
    cam.posY = v.physicalHeight * 10;
    for (let i = 0; i < 60 * 120; i++) {
      updateCamera(cam, target({ downRangeDistance: 0, altitude: 3_000, speedY: 0 }), v, 1 / 60);
      expect(cam.posY).toBeGreaterThanOrEqual(v.physicalHeight * 0.5 - 1e-9);
    }
    expect(Math.abs(cam.posY - 3_000)).toBeLessThan(1);
  });

  it('but wreckage is still allowed to leave, which is the point of keeping the branch', () => {
    const v = viewport();
    const cam = createCamera(v, 0, 0, 0);
    cam.posX = v.physicalWidth * 5;
    const before = cam.posX;
    for (let i = 0; i < 600; i++) {
      updateCamera(cam, target({ downRangeDistance: 0, altitude: 3_000, crashed: true }), v, 1 / 60);
    }
    expect(cam.posX).toBe(before);
  });
});

describe('property 2 — damped, not springy', () => {
  it('settles a step change without ringing, and says how long it took', () => {
    const v = viewport();
    const cam = createCamera(v, 0, 0, 0);
    // A step inside the capture radius: the regime where the law actually
    // controls, rather than the one where it deliberately gives up.
    const t = target({ downRangeDistance: 60, altitude: v.physicalHeight / 2 });

    let overshoot = 0;
    let settledAt = -1;
    const DT = 1 / 60;
    for (let i = 0; i < 60 * 20; i++) {
      updateCamera(cam, t, v, DT);
      overshoot = Math.max(overshoot, cam.posX - 60);
      if (settledAt < 0 && Math.abs(cam.posX - 60) < 0.6) settledAt = i * DT;
      else if (settledAt >= 0 && Math.abs(cam.posX - 60) >= 0.6) settledAt = -1;
    }

    const report = `overshoot ${overshoot.toFixed(2)} m of a 60 m step, settled at ${settledAt.toFixed(2)} s`;
    /*
      Measured: 9.68 m of overshoot on a 60 m step — 16% — and settled to within
      1% at 8.7 seconds.

      Damped rather than springy is the claim, and the overshoot is what carries
      it: one excursion of a sixth of the step and no ringing. The settling time
      is long because both time constants are a full second by design
      (ALIGN_TIME_CENTERIZE and ALIGN_TIME_MATCH_SPEED are 2021's, and the
      floaty weight they give is the feel worth keeping); 1% of a 60 m step is
      also a demanding criterion — it is inside a single drawn pixel.
    */
    expect(overshoot, report).toBeLessThan(12);
    expect(settledAt, report).toBeGreaterThanOrEqual(0);
    expect(settledAt, report).toBeLessThan(10);
  });
});

describe('property 4 — deterministic for a given state sequence', () => {
  it('replays identically, shake included', () => {
    /*
      The shake is sines of an accumulated time, not noise, precisely so this
      can be exact rather than approximate. `view/` is allowed to call
      Math.random; a camera that did would replay differently every time for no
      gain anyone could hear.
    */
    const v = viewport();
    const run = () => {
      const cam = createCamera(v, 0, 0, 0);
      for (let i = 0; i < 600; i++) {
        updateCamera(
          cam,
          target({
            downRangeDistance: i * 0.5,
            altitude: 1000 + i,
            speedX: 30,
            speedY: 60,
            dynamicPressure: 12_000,
            thrustAcceleration: 14,
          }),
          v,
          1 / 60,
        );
      }
      return cam;
    };
    const a = run();
    const b = run();
    expect(a.posX).toBe(b.posX);
    expect(a.posY).toBe(b.posY);
    expect(a.shakeX).toBe(b.shakeX);
    expect(a.shakeY).toBe(b.shakeY);
  });
});

describe('property 5 — it never looks below the ground, at any field of view', () => {
  it('holds while the view opens and closes around it', () => {
    // The floor is half a viewport, and the viewport is no longer constant —
    // so this is a different claim from the M4 version of it.
    const live: MutableViewport = {
      width: 0,
      height: 0,
      physicalHeight: 0,
      physicalWidth: 0,
      scale: 0,
    };
    const cam = createCamera(viewport(), 0, 0, 0);
    for (let i = 0; i < 2_000; i++) {
      // Sweep the altitude down through the whole FOV range and back up.
      const altitude = Math.abs(1_000 - (i % 2_000)) * 30;
      writeViewport(live, 1280, 800, vehicleHeight, 1, altitude);
      updateCamera(cam, target({ altitude: 0, speedY: -80 }), live, 1 / 60);
      expect(cam.posY, `${altitude} m`).toBeGreaterThanOrEqual(live.physicalHeight * 0.5 - 1e-9);
    }
  });
});

describe('the framing lead', () => {
  it('looks ahead by the distance the vehicle covers in LEAD_TIME', () => {
    // A distance the vehicle covers, not a fixed number of metres: it means the
    // same thing at 30 m/s and at 3 km/s.
    expect(framingLead(50, 10_000)).toBeCloseTo(50 * LEAD_TIME, 9);
  });

  it('caps, so a re-entry cannot throw the ship out of frame', () => {
    // 7 km/s would ask for four kilometres of lead across a 356 m viewport.
    const span = 356;
    expect(framingLead(7_300, span)).toBeCloseTo(span * 0.5 * LEAD_FRACTION, 9);
    expect(framingLead(-7_300, span)).toBeCloseTo(-span * 0.5 * LEAD_FRACTION, 9);
  });

  it('is zero for a stationary vehicle, so a landing is centred', () => {
    expect(framingLead(0, 356)).toBe(0);
  });
});

describe('shake', () => {
  it('is silent in calm air with the engines off', () => {
    expect(shakeAmplitude(0, 0)).toBe(0);
  });

  it('rises with dynamic pressure and with thrust, and caps', () => {
    /*
      KILOPASCALS (M9.3). This test used to read `shakeAmplitude(15_000, 0)` and
      pass, which is the whole shape of the bug: the assertion and the constant
      agreed with each other and neither agreed with the simulation. Half
      amplitude arrives at half of SHAKE_FULL_Q, and SHAKE_FULL_Q is 30 kPa —
      a number the RTLS golden actually reaches, rather than one no vehicle
      could survive.
    */
    expect(shakeAmplitude(15, 0)).toBeCloseTo(0.5, 9);
    expect(shakeAmplitude(0, 20)).toBeCloseTo(0.5, 9);
    expect(shakeAmplitude(1e9, 1e9)).toBe(1);
  });

  it('is held still by prefers-reduced-motion', () => {
    // The one part of this file that is decoration rather than information, and
    // therefore the one part a reduced-motion request may switch off.
    const v = viewport();
    const cam = createCamera(v, 0, 0, 0);
    const t = target({ dynamicPressure: 30, thrustAcceleration: 20 });
    for (let i = 0; i < 60; i++) updateCamera(cam, t, v, 1 / 60, { reducedMotion: true });
    expect(cam.shakeX).toBe(0);
    expect(cam.shakeY).toBe(0);

    // And it is genuinely shaking otherwise, or the above proves nothing.
    const shaken = createCamera(v, 0, 0, 0);
    let moved = 0;
    for (let i = 0; i < 60; i++) {
      updateCamera(shaken, t, v, 1 / 60);
      moved = Math.max(moved, Math.abs(shaken.shakeX));
    }
    expect(moved).toBeGreaterThan(0);
  });

  it('never moves the lens far enough to unread the instrument', () => {
    const v = viewport();
    const cam = createCamera(v, 0, 0, 0);
    const t = target({ dynamicPressure: 1e9, thrustAcceleration: 1e9 });
    let worst = 0;
    for (let i = 0; i < 3_000; i++) {
      updateCamera(cam, t, v, 1 / 60);
      worst = Math.max(worst, Math.hypot(cam.shakeX, cam.shakeY));
    }
    // A shake is a cue, not an earthquake: under 2% of the frame at its worst.
    expect(worst / v.physicalHeight).toBeLessThan(0.02);
  });
});

/* ── M11.6: the camera modes ────────────────────────────────────────────────
 *
 * Four modes, one law. Each mode is a different target handed to the same
 * follow, so the five properties are proven per mode by running the same
 * checks with the mode set, not by four new arguments.
 */
describe('the modes are the one law with a different target — M11.6', () => {
  const v = viewport(1280, 800);
  const at = (x: number, speedX = 0): CameraTarget => ({
    downRangeDistance: x,
    altitude: 5_000,
    speedX,
    speedY: 0,
    landed: false,
    onTheGround: false,
    crashed: false,
  });
  const out: ModeTarget = { x: 0, speedX: 0, leadScale: 1, pinned: false, held: false };

  it('follow aims at the vehicle with the ordinary lead', () => {
    effectiveTarget('follow', at(starBaseXPos + 900, 200), v, starBaseXPos, false, out);
    expect(out).toEqual({ x: starBaseXPos + 900, speedX: 200, leadScale: 1, pinned: false, held: false });
  });

  it('the pad camera is FIXED while it holds: pad aim, no lead, zero speed', () => {
    const capture = v.physicalWidth * PAD_CAPTURE_FRACTION;
    effectiveTarget('pad', at(starBaseXPos + capture * 0.9, 40), v, starBaseXPos, false, out);
    expect(out.x).toBe(starBaseXPos);
    expect(out.speedX).toBe(0);
    expect(out.leadScale).toBe(0);
    expect(out.held).toBe(true);
    // And it stands wherever it is told to.
    effectiveTarget('pad', at(12_000), v, 12_000, false, out);
    expect(out.x).toBe(12_000);
  });

  it('the hold is a latch: captured inside the small band, released outside the large one', () => {
    const capture = v.physicalWidth * PAD_CAPTURE_FRACTION;
    const hold = v.physicalWidth * PAD_HOLD_FRACTION;
    expect(capture).toBeLessThan(hold);
    // Not held, between the bands: stays free.
    effectiveTarget('pad', at(starBaseXPos + (capture + hold) / 2, 30), v, starBaseXPos, false, out);
    expect(out.held).toBe(false);
    expect(out.x).toBe(starBaseXPos + (capture + hold) / 2);
    // Held, between the bands: stays held.
    effectiveTarget('pad', at(starBaseXPos + (capture + hold) / 2, 30), v, starBaseXPos, true, out);
    expect(out.held).toBe(true);
    expect(out.x).toBe(starBaseXPos);
    // Held, past the large band: released — the webcast's cut to the chase.
    effectiveTarget('pad', at(starBaseXPos + hold * 1.1, 300), v, starBaseXPos, true, out);
    expect(out.held).toBe(false);
    expect(out.x).toBe(starBaseXPos + hold * 1.1);
    expect(out.leadScale).toBe(1);
    expect(out.speedX).toBe(300);
  });

  it('holding, the camera does not move with a vehicle drifting over the pad', () => {
    // The finding: aim at the pad but match the vehicle's speed and the lens
    // is dragged a third of a frame off it under a landing approach.
    const cam = createCamera(v, starBaseXPos, 0, 0);
    cam.posY = 5_000;
    const band = v.physicalWidth * PAD_CAPTURE_FRACTION;
    for (let i = 0; i < 600; i++) {
      // Back and forth across the pad at 40 m/s, inside the capture band.
      const x = starBaseXPos + band * 0.8 * Math.sin(i / 40);
      updateCamera(cam, at(x, 40 * Math.cos(i / 40)), v, 1 / 60, { mode: 'pad', reducedMotion: true });
      expect(cam.padHeld).toBe(true);
      expect(Math.abs(cam.posX - starBaseXPos)).toBeLessThan(1);
    }
  });

  it('the chase camera leads further and the onboard camera is pinned', () => {
    effectiveTarget('chase', at(1_000, 500), v, starBaseXPos, false, out);
    expect(out.leadScale).toBe(CHASE_LEAD);
    expect(CHASE_LEAD).toBeGreaterThan(1);
    effectiveTarget('onboard', at(1_000, 500), v, starBaseXPos, false, out);
    expect(out.pinned).toBe(true);
    expect(out.leadScale).toBe(0);
  });

  it('chase and onboard look closer; follow and pad do not', () => {
    expect(modeZoom('follow')).toBe(1);
    expect(modeZoom('pad')).toBe(1);
    expect(modeZoom('chase')).toBeGreaterThan(1);
    expect(modeZoom('onboard')).toBeGreaterThan(modeZoom('chase'));
  });

  it('the onboard camera is exactly on the vehicle, above the floor', () => {
    const cam = createCamera(v, 0, 0, 0);
    updateCamera(cam, at(4_321, 700), v, 1 / 60, { mode: 'onboard' });
    expect(cam.posX).toBe(4_321);
    expect(cam.posY).toBe(5_000);
    expect(cam.speedX).toBe(700);
    // On the pad it sits half a frame up, like every mode: property 5.
    updateCamera(cam, { ...at(0), altitude: 25 }, v, 1 / 60, { mode: 'onboard' });
    expect(cam.posY).toBe(v.physicalHeight * 0.5);
  });
});

describe('property 1 holds in every mode, over every golden — M11.6', () => {
  const modes = CAMERA_MODES.filter((m) => m !== 'follow');
  const cases = GOLDEN_SPECS.flatMap((spec) => modes.map((mode) => [spec.id, mode, spec] as const));
  it.each(cases)('%s in %s', (id, mode, spec) => {
    const live: MutableViewport = { width: 0, height: 0, physicalHeight: 0, physicalWidth: 0, scale: 0 };
    // The mode's field of view, as App applies it through the view shell.
    writeViewport(live, 1280, 800, vehicleHeight, modeZoom(mode), 0);
    let s: SimState = spec.build();
    const camera = createCamera(live, s.kinematics.downRangeDistance, s.kinematics.speedX, s.kinematics.speedY);
    camera.posY = Math.max(live.physicalHeight * 0.5, s.kinematics.altitude);
    const options = { mode: mode as CameraMode };
    let worstX = 0;
    let worstY = 0;
    for (let i = 0; i < spec.steps; i += 2) {
      s = step(s, GOLDEN_DT);
      s = step(s, GOLDEN_DT);
      writeViewport(live, 1280, 800, vehicleHeight, modeZoom(mode), s.kinematics.altitude);
      updateCamera(
        camera,
        {
          downRangeDistance: s.kinematics.downRangeDistance,
          altitude: s.kinematics.altitude,
          speedX: s.kinematics.speedX,
          speedY: s.kinematics.speedY,
          landed: s.status.landed,
          onTheGround: s.status.onTheGround,
          crashed: s.failures.crashed,
          dynamicPressure: s.forces.dynamicPressure,
          thrustAcceleration: s.forces.thrustAcceleration,
        },
        live,
        1 / 60,
        options,
      );
      if (s.failures.crashed || s.failures.inFlightBreakUp) break;
      // Property 5, every step, every mode.
      expect(camera.posY).toBeGreaterThanOrEqual(live.physicalHeight * 0.5 - 1e-9);
      const p = worldToScreen(camera, live, s.kinematics.downRangeDistance, s.kinematics.altitude);
      worstX = Math.max(worstX, Math.abs(p.x - live.width / 2) / (live.width / 2));
      worstY = Math.max(worstY, Math.abs(p.y - live.height / 2) / (live.height / 2));
    }
    const report = `${id} in ${mode}: worst offset ${(worstX * 100).toFixed(1)}% x, ${(worstY * 100).toFixed(1)}% y of half-frame`;
    // The same bounds the follow camera meets. Vertically 1.0 is the
    // ground-mode handoff, structural and shared by every mode but onboard.
    expect(worstX, report).toBeLessThan(0.5);
    expect(worstY, report).toBeLessThanOrEqual(1);
  });
});

describe('properties 2, 3 and 4 hold in every mode — M11.6', () => {
  const v = viewport(1280, 800);
  const target = (x: number, speedX: number): CameraTarget => ({
    downRangeDistance: x,
    altitude: 3_000,
    speedX,
    speedY: 0,
    landed: false,
    onTheGround: false,
    crashed: false,
  });

  it.each(CAMERA_MODES)('%s: a step change settles without ringing', (mode) => {
    const cam = createCamera(v, 0, 0, 0);
    cam.posY = 3_000;
    // Well inside the pad band would pin the pad camera; step past the band
    // so every mode has something to follow.
    const from = starBaseXPos + v.physicalWidth;
    const to = from + v.physicalWidth * 0.2;
    cam.posX = from;
    let overshoot = 0;
    let settledAt = -1;
    for (let i = 0; i < 60 * 8; i++) {
      updateCamera(cam, target(to, 0), v, 1 / 60, { mode });
      overshoot = Math.max(overshoot, cam.posX - to);
      if (settledAt < 0 && Math.abs(cam.posX - to) < 1) settledAt = i;
    }
    expect(overshoot, `${mode} overshot by ${overshoot.toFixed(1)} m`).toBeLessThan((to - from) * 0.25);
    expect(settledAt, `${mode} never settled`).toBeGreaterThanOrEqual(0);
  });

  it.each(CAMERA_MODES)('%s: reaches the same place at 30 and 120 fps', (mode) => {
    // As the follow camera's own frame-rate test: a target that moves as its
    // speed says, integrated; the camera seeded with the vehicle's speed.
    // Starts past the pad band so the pad camera has the same job as the rest.
    const run = (fps: number) => {
      const start = starBaseXPos + v.physicalWidth;
      const cam = createCamera(v, start, 100, 0);
      cam.posY = 3_000;
      let x = start;
      for (let i = 0; i < fps * 10; i++) {
        x += 100 / fps;
        updateCamera(cam, target(x, 100), v, 1 / fps, { mode, reducedMotion: true });
      }
      return cam.posX;
    };
    // The follow camera's measured drift is under 2 m over ten seconds at
    // 100 m/s; a mode is a target, and the integration is the same.
    expect(Math.abs(run(30) - run(120))).toBeLessThan(2);
  });

  it.each(CAMERA_MODES)('%s: the same states give the same path, twice', (mode) => {
    const run = () => {
      const cam = createCamera(v, 0, 0, 0);
      cam.posY = 3_000;
      const path: number[] = [];
      for (let i = 0; i < 300; i++) {
        updateCamera(cam, target(starBaseXPos + i * 3, 180), v, 1 / 60, { mode });
        path.push(cam.posX, cam.posY, cam.shakeX);
      }
      return path;
    };
    expect(run()).toEqual(run());
  });
});
