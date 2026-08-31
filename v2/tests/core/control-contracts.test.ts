/**
 * M10.5 — the control primitives against their contracts, not through a flight.
 *
 * These are the functions every autopilot mode steers with, and until M10.2 the
 * only thing exercising most of their branches was `tests/parity/`, which asked
 * whether they agreed with a 2021 file rather than whether they were right. The
 * measured cost of deleting it was 18 branches, all in this module.
 *
 * A contract test asks what the function PROMISES. `controlEnginebyTWR` promises
 * a throttle inside the engine's limits; `precisionAlignment` promises to reduce
 * the pitch error without flinging the vehicle past its target;
 * `raptorAutoShutDown_KeepMinTWRBelow1` promises to shut down exactly when
 * minimum thrust would otherwise hold the vehicle up, and not otherwise. None of
 * those need a trajectory, and stating them directly reaches the branches a
 * nominal flight never visits.
 */
import { describe, expect, it } from 'vitest';
import * as C from '$core/constants';
import { rad, type Rad } from '$core/units';
import {
  controlEnginebyEffectiveVerticalTWR,
  controlEnginebyTWR,
  getEffectiveVerticalMaxThrust,
  getMaxSpeedWithSafeDynamicPressure,
  getPitchDifference,
  getTWR,
  horizontalSpeedAdjustment,
  legacyEffectiveVerticalMaxThrust,
  precisionAlignment,
  raptorAutoShutDown_KeepMinTWRBelow1,
  speedAdjustment,
  verticalSpeedAdjustment,
} from '$core/control/primitives';
import { controlTranslation, slewToward, throttleUpdate } from '$core/control/actuation';
import { toggleAllRaptors, toggleRaptor } from '$core/control/commands';
import { createInitialState } from '$core/state';
import type { SimState } from '$core/state';

/**
 * A vehicle with `count` engines already burning and the throttle open.
 *
 * Sets `engines.running` directly rather than going through `toggleRaptor`,
 * which starts an ignition COUNTDOWN (a dt-ticked field since M5, replacing
 * 2021's wall-clock timer) and so lights nothing on the step it is called. That
 * is the ignition sequence's contract, not these primitives', and flying it here
 * would only make every test below depend on a mechanism it is not testing.
 */
function litCount(count: number): SimState {
  const s = createInitialState();
  for (let i = 0; i < count; i++) s.engines.running[i] = true;
  s.vehicle.throttle = 100;
  s.vehicle.throttleCurrent = 100;
  return s;
}

/** All three burning. */
function lit(): SimState {
  return litCount(3);
}

describe('getPitchDifference wraps to (-pi, pi]', () => {
  it('takes the short way round in both directions', () => {
    // The two wrap branches. A controller that took the long way round would
    // command a full rotation to correct a small error near the seam.
    expect(getPitchDifference(rad(-3), rad(3))).toBeCloseTo(2 * Math.PI - 6, 12);
    expect(getPitchDifference(rad(3), rad(-3))).toBeCloseTo(6 - 2 * Math.PI, 12);
  });

  it('and never returns an error larger than half a turn, anywhere', () => {
    // The property the two branches exist to guarantee, swept rather than
    // sampled: no pair of angles may produce an error worth more than pi.
    for (let pitch = -Math.PI; pitch <= Math.PI; pitch += Math.PI / 50) {
      for (let goal = -Math.PI; goal <= Math.PI; goal += Math.PI / 37) {
        const d = getPitchDifference(rad(pitch), rad(goal));
        expect(Math.abs(d), `pitch ${pitch} goal ${goal}`).toBeLessThanOrEqual(Math.PI + 1e-12);
      }
    }
  });

  it('is zero exactly when the vehicle is already pointing at the goal', () => {
    for (const a of [-3, -1, 0, 1, 3]) expect(getPitchDifference(rad(a), rad(a))).toBe(0);
  });
});

describe('the vertical thrust projection', () => {
  it('the collapsed form and the 2021 quadrant ladder agree everywhere', () => {
    // The ladder's four branches, including the two the shipped `cos` form
    // makes unreachable. This is what stops anyone deleting the ladder as dead
    // code: it is the independent second implementation.
    const running = [true, true, true] as const;
    for (let a = -Math.PI; a <= Math.PI; a += Math.PI / 500) {
      const collapsed = getEffectiveVerticalMaxThrust(running, rad(a));
      const ladder = legacyEffectiveVerticalMaxThrust(running, rad(a));
      expect(Math.abs(collapsed - ladder), `gimbal ${a}`).toBeLessThan(1e-6);
    }
  });

  it('is full thrust straight up, zero sideways, and negative upside down', () => {
    const running = [true, true, true] as const;
    const full = 3 * C.maxThrustPerRaptor;
    expect(getEffectiveVerticalMaxThrust(running, rad(0))).toBeCloseTo(full, 6);
    expect(getEffectiveVerticalMaxThrust(running, rad(Math.PI / 2))).toBeCloseTo(0, 6);
    expect(getEffectiveVerticalMaxThrust(running, rad(Math.PI))).toBeCloseTo(-full, 6);
  });
});

describe('controlEnginebyTWR keeps the throttle inside the engine limits', () => {
  it('reaches the commanded TWR when it is achievable', () => {
    // The contract: after the call, the thrust at the commanded throttle should
    // produce the TWR that was asked for.
    const s = lit();
    const goalTWR = 1.2;
    controlEnginebyTWR(s, goalTWR);
    const achieved = getTWR(
      3 * C.maxThrustPerRaptor * (s.vehicle.throttle / 100),
      s.vehicle.vehicleMass,
    );
    expect(achieved).toBeCloseTo(goalTWR, 6);
  });

  it('saturates at the upper limit rather than commanding more', () => {
    const s = lit();
    controlEnginebyTWR(s, 1e6);
    expect(s.vehicle.throttle).toBe(C.throttleUpperLimit);
  });

  it('and at the lower limit rather than commanding less', () => {
    // The lower clamp, which a nominal flight reaches only in the landing burn.
    const s = lit();
    controlEnginebyTWR(s, 1e-9);
    expect(s.vehicle.throttle).toBe(C.throttleLowerLimit);
  });

  /**
   * M10.5, Bug-fix tier. See the guard in `controlEnginebyTWR`.
   */
  it('never writes a non-finite throttle, even at TWR 0 with no thrust', () => {
    // 0/0. Before the fix this wrote NaN: the clamp is
    // `if (x > upper) ... else if (x < lower) ...`, and NaN fails both.
    const s = createInitialState(); // engines unlit, throttleCurrent 0
    expect(s.engines.running.some(Boolean)).toBe(false);
    controlEnginebyTWR(s, 0);
    expect(Number.isNaN(s.vehicle.throttle)).toBe(false);
    expect(s.vehicle.throttle).toBeGreaterThanOrEqual(C.throttleLowerLimit);
    expect(s.vehicle.throttle).toBeLessThanOrEqual(C.throttleUpperLimit);
  });

  it('and the vertical form does not either, with no working engine', () => {
    // The same 0/0 by a different route: the denominator is
    // maxThrust * cos(gimbal), and maxThrust is zero with nothing lit.
    //
    // NOT via a gimbal of pi/2, which an earlier draft used and which asserts
    // nothing: Math.cos(Math.PI / 2) is 6.12e-17, not 0, so that divides to a
    // large finite number and clamps. The test passed against the unguarded
    // source.
    expect(Math.cos(Math.PI / 2)).not.toBe(0);

    const s = createInitialState();
    expect(getEffectiveVerticalMaxThrust(s.engines.running, s.vehicle.gimbalPointingDirection)).toBe(0);
    controlEnginebyEffectiveVerticalTWR(s, 0);
    expect(Number.isNaN(s.vehicle.throttle)).toBe(false);
    expect(s.vehicle.throttle).toBeGreaterThanOrEqual(C.throttleLowerLimit);
  });

  it('but Infinity still means FULL throttle, not idle', () => {
    // The other half, and the one that matters more in practice. A positive TWR
    // asked of engines producing no thrust divides to +Infinity, and the clamp
    // already answers correctly: command everything, because the vehicle needs
    // thrust it does not yet have.
    //
    // A first draft of the guard tested `!Number.isFinite` and swallowed this
    // too, re-commanding 100% to the 40% floor — the vehicle throttled down at
    // every engine start. That silent change, not the NaN fix, was what moved
    // four of the five golden fixtures. Pinned so it cannot come back.
    const s = createInitialState();
    s.vehicle.throttleCurrent = 0;
    controlEnginebyTWR(s, 1.5);
    expect(s.vehicle.throttle).toBe(C.throttleUpperLimit);

    const v = createInitialState();
    controlEnginebyEffectiveVerticalTWR(v, 1.5);
    expect(v.vehicle.throttle).toBe(C.throttleUpperLimit);
  });

  it('the throttle stays within limits across a wide sweep of commands', () => {
    // The contract as a property. Every combination of goal TWR, engine
    // configuration and current throttle — including the degenerate ones.
    for (const goalTWR of [0, 1e-9, 0.5, 1, 3, 1e9]) {
      for (const lightCount of [0, 1, 2, 3]) {
        for (const current of [0, 40, 100]) {
          const s = litCount(lightCount);
          s.vehicle.throttleCurrent = current;
          controlEnginebyTWR(s, goalTWR);
          const label = `TWR ${goalTWR}, ${lightCount} lit, current ${current}`;
          expect(Number.isFinite(s.vehicle.throttle), label).toBe(true);
          expect(s.vehicle.throttle, label).toBeGreaterThanOrEqual(C.throttleLowerLimit);
          expect(s.vehicle.throttle, label).toBeLessThanOrEqual(C.throttleUpperLimit);
        }
      }
    }
  });
});

describe('a non-finite throttle command would walk the throttle down forever', () => {
  it('slewToward takes the decrement branch against a NaN goal', () => {
    // This is WHY the guard above matters, and it is the quiet part: a NaN goal
    // does not make the throttle NaN. Both comparisons in slewToward are false
    // against NaN, so it returns `current - perStep` and the throttle walks
    // down one step per frame with no lower bound.
    expect(slewToward(50, NaN, 1)).toBe(49);
    expect(slewToward(0, NaN, 1)).toBe(-1);
  });

  it('and would drive it negative within a second of frames', () => {
    const s = lit();
    s.vehicle.throttle = NaN;
    s.vehicle.throttleCurrent = 1;
    for (let i = 0; i < 60; i++) throttleUpdate(s, 1 / 60);
    expect(s.vehicle.throttleCurrent).toBeLessThan(0);
  });

  it('so the guarded primitives never produce that goal in the first place', () => {
    // The two together: the guard is what stops the walk starting. The bound
    // must be a LOWER one — an earlier draft asserted only an upper bound, and
    // since a NaN goal walks the throttle DOWN it passed against the unguarded
    // source and detected nothing.
    const s = createInitialState();
    controlEnginebyTWR(s, 0);
    for (let i = 0; i < 600; i++) throttleUpdate(s, 1 / 60);
    expect(Number.isFinite(s.vehicle.throttleCurrent)).toBe(true);
    expect(s.vehicle.throttleCurrent).toBeGreaterThanOrEqual(0);
  });
});

describe('the speed adjustments choose a side and commit to it', () => {
  it('vertical: too slow opens the throttle, too fast closes it', () => {
    const tooSlow = lit();
    tooSlow.kinematics.speedY = -50;
    verticalSpeedAdjustment(tooSlow, 0, 10, 2);

    const tooFast = lit();
    tooFast.kinematics.speedY = 50;
    verticalSpeedAdjustment(tooFast, 0, 10, 2);

    expect(tooSlow.vehicle.throttle).toBeGreaterThan(tooFast.vehicle.throttle);
  });

  it('horizontal: over the target closes the throttle to its floor', () => {
    // speedDifference < 0 commands TWR 0, which clamps to the lower limit.
    const s = lit();
    s.kinematics.speedX = 500;
    horizontalSpeedAdjustment(s, 100, 10, 2);
    expect(s.vehicle.throttle).toBe(C.throttleLowerLimit);
  });

  it('horizontal: inside the threshold it eases rather than saturating', () => {
    // The fine-tune branch: within speedDifferenceThreshold of the target the
    // command becomes `1 + difference/threshold` instead of the full twrLimit.
    // Here that is 1 + 5/10 = 1.5 against a limit of 3.
    //
    // The mass is chosen, not arbitrary. Both commanded TWRs have to land
    // strictly inside [throttleLowerLimit, throttleUpperLimit] or the two
    // clamp to the same value and the comparison proves nothing — which is
    // exactly what a first draft of this test did. With max achievable TWR = T,
    // a goal of g asks for (g/T)*100 percent, so we need 3 <= T (the larger
    // goal is reachable) and 1.5 >= 0.4*T (the smaller clears the 40% floor),
    // i.e. T in [3, 3.75]. T = 3.5 gives 42.9% and 85.7%.
    const maxAchievableTWR = 3.5;
    const mass = (3 * C.maxThrustPerRaptor) / (maxAchievableTWR * C.gravity);

    const near = lit();
    near.vehicle.vehicleMass = mass;
    near.kinematics.speedX = 95;
    horizontalSpeedAdjustment(near, 100, 10, 3);

    const far = lit();
    far.vehicle.vehicleMass = mass;
    far.kinematics.speedX = 0;
    horizontalSpeedAdjustment(far, 100, 10, 3);

    expect(near.vehicle.throttle).toBeGreaterThan(C.throttleLowerLimit);
    expect(far.vehicle.throttle).toBeLessThan(C.throttleUpperLimit);
    expect(near.vehicle.throttle).toBeLessThan(far.vehicle.throttle);
  });

  it('speedAdjustment behaves the same way on true speed', () => {
    const over = lit();
    over.kinematics.trueSpeed = 500;
    speedAdjustment(over, 100, 10, 2);
    expect(over.vehicle.throttle).toBe(C.throttleLowerLimit);

    const under = lit();
    under.kinematics.trueSpeed = 0;
    speedAdjustment(under, 100, 10, 2);
    expect(under.vehicle.throttle).toBeGreaterThan(C.throttleLowerLimit);
  });

  it('and none of them can produce a throttle outside the limits', () => {
    for (const speed of [-1000, -1, 0, 1, 99, 100, 101, 1000]) {
      for (const lightCount of [0, 3]) {
        const s = litCount(lightCount);
        s.kinematics.speedX = speed;
        s.kinematics.speedY = speed;
        s.kinematics.trueSpeed = Math.abs(speed);
        horizontalSpeedAdjustment(s, 100, 10, 2);
        verticalSpeedAdjustment(s, 0, 10, 2);
        speedAdjustment(s, 100, 10, 2);
        const label = `speed ${speed}, ${lightCount} lit`;
        expect(Number.isFinite(s.vehicle.throttle), label).toBe(true);
        expect(s.vehicle.throttle, label).toBeGreaterThanOrEqual(C.throttleLowerLimit);
        expect(s.vehicle.throttle, label).toBeLessThanOrEqual(C.throttleUpperLimit);
      }
    }
  });
});

describe('precisionAlignment steers toward the goal and does not overshoot', () => {
  it('reduces the pitch error rather than growing it', () => {
    // The contract of a critically-damped law: from rest, the commanded control
    // must act in the direction that closes the error.
    const s = lit();
    s.kinematics.pitch = rad(0.4) as Rad;
    s.kinematics.angularVelocity = 0;
    precisionAlignment(s, rad(0), 3);
    // The error is positive, so the command must be negative to close it.
    expect(s.autopilot.pitchControl).toBeLessThanOrEqual(0);
  });

  it('and mirrors exactly when the error is mirrored', () => {
    // Sign symmetry. An asymmetric controller flies differently left and right,
    // which no amount of trajectory-watching makes obvious.
    const positive = lit();
    positive.kinematics.pitch = rad(0.4) as Rad;
    precisionAlignment(positive, rad(0), 3);

    const negative = lit();
    negative.kinematics.pitch = rad(-0.4) as Rad;
    precisionAlignment(negative, rad(0), 3);

    expect(positive.autopilot.pitchControl).toBeCloseTo(-negative.autopilot.pitchControl, 9);
  });

  it('commands nothing at all when it is already on target', () => {
    const s = lit();
    s.kinematics.pitch = rad(0) as Rad;
    s.kinematics.angularVelocity = 0;
    s.forces.offAxisThrustDifferenceAcceleration = 0;
    precisionAlignment(s, rad(0), 3);
    expect(Math.abs(s.autopilot.pitchControl)).toBeLessThanOrEqual(1e-9);
  });

  it('saturates the yoke rather than exceeding it, in both directions', () => {
    // The RCS branch's two saturation limits, +-100.
    for (const sign of [1, -1]) {
      const s = createInitialState();
      s.status.rcsActive = true;
      s.kinematics.pitch = rad(sign * 3) as Rad;
      s.kinematics.angularVelocity = 0;
      precisionAlignment(s, rad(0), 0.05);
      expect(Math.abs(s.autopilot.pitchControl)).toBeLessThanOrEqual(100);
    }
  });

  it('never writes a non-finite control, over a sweep of attitudes and rates', () => {
    for (let pitch = -Math.PI; pitch <= Math.PI; pitch += Math.PI / 24) {
      for (const rate of [-1, -0.01, 0, 0.01, 1]) {
        const s = lit();
        s.status.rcsActive = true;
        s.kinematics.pitch = rad(pitch) as Rad;
        s.kinematics.angularVelocity = rate;
        precisionAlignment(s, rad(0), 3);
        const label = `pitch ${pitch} rate ${rate}`;
        expect(Number.isFinite(s.autopilot.pitchControl), label).toBe(true);
        expect(Math.abs(s.autopilot.pitchControl), label).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('raptorAutoShutDown fires exactly when minimum thrust would lift the vehicle', () => {
  /** Minimum thrust for a given number of lit engines. */
  const minThrust = (count: number) => count * C.maxThrustPerRaptor * C.throttleLowerLimit * 0.01;

  it('does nothing while minimum thrust cannot hold the vehicle up', () => {
    // A heavy vehicle: min TWR below 1, so no shutdown is warranted.
    const s = lit();
    s.vehicle.vehicleMass = (minThrust(3) / C.gravity) * 2;
    expect(getTWR(minThrust(3), s.vehicle.vehicleMass)).toBeLessThan(1);
    const before = [...s.engines.running];
    raptorAutoShutDown_KeepMinTWRBelow1(s, toggleRaptor);
    expect([...s.engines.running]).toEqual(before);
  });

  it('shuts one down as soon as it would', () => {
    const s = lit();
    s.vehicle.vehicleMass = minThrust(3) / C.gravity / 2; // min TWR = 2
    expect(getTWR(minThrust(3), s.vehicle.vehicleMass)).toBeGreaterThan(1);
    raptorAutoShutDown_KeepMinTWRBelow1(s, toggleRaptor);
    expect(s.engines.running.filter(Boolean).length).toBe(2);
  });

  it('and picks the 2021 order rather than simply the highest index', () => {
    // The two-engine case is not "shut the last one": which engine goes depends
    // on WHICH two are lit, and the order is 2021's. These are the branches a
    // nominal landing walks through once, in one configuration only.
    const cases: [boolean[], number][] = [
      [[true, true, false], 0],
      [[false, true, true], 1],
      [[true, false, true], 2],
    ];
    for (const [running, expected] of cases) {
      const s = createInitialState();
      for (const i of [0, 1, 2] as const) if (running[i]) s.engines.running[i] = true;
      s.vehicle.vehicleMass = minThrust(2) / C.gravity / 2;
      raptorAutoShutDown_KeepMinTWRBelow1(s, toggleRaptor);
      expect(s.engines.running[expected], `from ${JSON.stringify(running)}`).toBe(false);
    }
  });

  it('and with one left, it shuts whichever one that is', () => {
    for (const only of [0, 1, 2] as const) {
      const s = createInitialState();
      s.engines.running[only] = true;
      s.vehicle.vehicleMass = minThrust(1) / C.gravity / 2;
      raptorAutoShutDown_KeepMinTWRBelow1(s, toggleRaptor);
      expect(s.engines.running[only], `only ${only}`).toBe(false);
    }
  });

  it('and does nothing at all with no engines lit', () => {
    // Minimum thrust is zero, so TWR is zero, so there is nothing to shut down
    // — and nothing to index past the end of the array either.
    const s = createInitialState();
    s.vehicle.vehicleMass = 1;
    expect(() => raptorAutoShutDown_KeepMinTWRBelow1(s, toggleRaptor)).not.toThrow();
    expect(s.engines.running.some(Boolean)).toBe(false);
  });
});

describe('the dynamic-pressure speed ceiling', () => {
  it('falls as the air thickens', () => {
    // v_max = sqrt(2000 * q_max / rho): denser air, lower safe speed.
    expect(getMaxSpeedWithSafeDynamicPressure(1.225)).toBeLessThan(
      getMaxSpeedWithSafeDynamicPressure(0.1),
    );
  });

  it('is unbounded in vacuum, which is correct and worth stating', () => {
    // REACHABLE: above about 1000 km the model's density is ~3e-15, and the
    // ceiling is then ~4.8e9 m/s — sixteen times the speed of light. That is
    // not a defect in this function: there is genuinely no dynamic-pressure
    // limit in vacuum, and the caller is the right place to care. Pinned so the
    // behaviour is a decision rather than a surprise.
    expect(getMaxSpeedWithSafeDynamicPressure(0)).toBe(Infinity);
    expect(getMaxSpeedWithSafeDynamicPressure(1e-15)).toBeGreaterThan(1e9);
  });
});

describe('the actuation layer', () => {
  it('controlTranslation does nothing at all when translation mode is off', () => {
    // The early return. Everything downstream of it must be untouched.
    const s = lit();
    s.status.translationModeOn = false;
    const before = {
      front: s.vehicle.frontFinExtension,
      aft: s.vehicle.aftFinExtension,
      gimbal: s.vehicle.gimbalPosition,
    };
    controlTranslation(s, 100, 1 / 60);
    expect(s.vehicle.frontFinExtension).toBe(before.front);
    expect(s.vehicle.aftFinExtension).toBe(before.aft);
    expect(s.vehicle.gimbalPosition).toBe(before.gimbal);
  });

  it('and moves them when it is on', () => {
    const s = lit();
    s.status.translationModeOn = true;
    const before = s.vehicle.gimbalPosition;
    controlTranslation(s, 100, 1 / 60);
    expect(s.vehicle.gimbalPosition).not.toBe(before);
  });

  it('slewToward snaps rather than oscillating once inside one step', () => {
    // The contract that stops a controller chattering: within perStep of the
    // goal it takes the goal exactly.
    expect(slewToward(10, 10.5, 1)).toBe(10.5);
    expect(slewToward(10, 9.5, 1)).toBe(9.5);
    // And outside it, moves by exactly one step toward it.
    expect(slewToward(10, 20, 1)).toBe(11);
    expect(slewToward(10, 0, 1)).toBe(9);
  });
});

describe('toggleAllRaptors is all-on or all-off, never a mixture', () => {
  it('commands ignition on every engine when none is lit', () => {
    // COMMANDS, not lights. Ignition is a countdown ticked by dt since M5 (it
    // was a wall-clock setTimeout in 2021), so nothing is running on the step
    // the button is pressed. Asserting `running` here would be asserting the
    // countdown's duration, which is a different contract.
    const s = createInitialState();
    toggleAllRaptors(s);
    for (const i of [0, 1, 2] as const) {
      expect(s.engines.ignitionCountdown[i], `engine ${i}`).not.toBeNull();
    }
  });

  it('shuts every engine when any is lit — including a partial set', () => {
    // The else branch: with a mixture, "toggle all" means shut down, not
    // invert. Inverting would leave the vehicle running on the engines that
    // were off, which is the opposite of what the button promises.
    const s = createInitialState();
    s.engines.running[1] = true;
    expect(s.engines.running.filter(Boolean).length).toBe(1);
    toggleAllRaptors(s);
    expect(s.engines.running.some(Boolean)).toBe(false);
  });
});
