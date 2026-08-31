/**
 * M10.10 — the fourteen branches `docs/VERIFICATION-PLAN.md` named as debt.
 *
 * They were left uncovered at M10.8 rather than papered over with tests that
 * execute a line without asserting anything. This file covers the twelve that
 * are reachable, and states the argument for the two that are not.
 *
 * ONE OF THE FOURTEEN WAS MISREAD WHEN IT WAS NAMED. `primitives.ts:156` was
 * recorded as the negative-force path. v8 reports the uncovered branch at that
 * line because that is where the `else if` opens, but the uncovered HALF is its
 * implicit else — the exactly-zero case, whose statement is line 163. The
 * negative path was already covered before this file existed.
 *
 * MOST OF THEM ARE IDEMPOTENCE GUARDS, and that is worth saying plainly because
 * it makes the assertions look trivial when they are not. The shape is
 *
 *     if (!autopilot.autoLandOn) cmd.toggleAutoLand(state);
 *
 * and the uncovered half is the one where the flag is ALREADY set. Without the
 * guard, `toggle` would turn the thing OFF at exactly the moment the flight
 * needs it on. So each of these tests asserts that entering a transition from
 * an already-correct state leaves it correct — a test that fails if the guard
 * is deleted, which is the whole bar.
 *
 * Every test here drives an exported entry point with constructed state. None
 * reaches into a private function, and none asserts on a value it also set.
 */
import { describe, expect, it } from 'vitest';
import * as C from '$core/constants';
import { createInitialState, type SimState } from '$core/state';
import {
  autoBoostBack,
  autoDeorbit,
  autoLand,
  finalDescentStageController,
} from '$core/autopilot';
import { toggleAllRaptors } from '$core/control/commands';
import { controlHorizontalAccelerationByAeroBreaking, precisionAlignment } from '$core/control/primitives';
import { rad } from '$core/units';

const DT = 1 / 120;

/** A vehicle in flight, with the autopilot's init phases already behind it. */
function inFlight(): SimState {
  const s = createInitialState();
  s.kinematics.altitude = 40_000;
  s.kinematics.speedY = -200;
  s.kinematics.speedX = 500;
  s.vehicle.propellantMass = 200_000;
  return s;
}

describe('autoBoostBack — the already-on guards on the way out', () => {
  /** Past init, so the propellant check at the foot of the function is reached. */
  function boostingBack(): SimState {
    const s = inFlight();
    s.autopilot.autoBoostBackOn = true;
    s.autopilot.boostBackInitCompleted = true;
    return s;
  }

  it('hands over to autoLand when it finishes', () => {
    // The covered half, here for contrast: without it the assertion below
    // would pass on a function that never hands over at all.
    const s = boostingBack();
    s.vehicle.propellantMass = C.dumpLimit - 1;
    s.autopilot.autoLandOn = false;

    autoBoostBack(s, DT);

    expect(s.autopilot.autoLandOn, 'autoLand picked up the flight').toBe(true);
    expect(s.autopilot.autoBoostBackOn, 'and boost-back stood down').toBe(false);
  });

  it('and does NOT toggle autoLand back off when it is already on (line 100)', () => {
    // The uncovered half. `cmd.toggleAutoLand` flips, so calling it here would
    // switch autoLand OFF at the moment boost-back is handing the flight to it,
    // leaving nothing flying the vehicle.
    const s = boostingBack();
    s.vehicle.propellantMass = C.dumpLimit - 1;
    s.autopilot.autoLandOn = true;

    autoBoostBack(s, DT);

    expect(s.autopilot.autoLandOn, 'autoLand stayed on').toBe(true);
    expect(s.autopilot.autoBoostBackOn).toBe(false);
  });

  it('does NOT switch autoMaxThrust on when completing the acceleration stage without it (line 129)', () => {
    // Reaching the completion test needs the burn to be close enough to the
    // pad: both halves of the guard at :125 must hold.
    const s = boostingBack();
    s.kinematics.speedX = 10;
    s.kinematics.downRangeDistance = C.starBaseXPos - 100;
    s.autopilot.accelerationStageCompleted = false;
    s.autopilot.autoMaxThrustOn = false;
    s.engines.running = [true, true, true];

    autoBoostBack(s, DT);

    expect(s.autopilot.accelerationStageCompleted, 'the stage did complete').toBe(true);
    // The guard's point: toggleAutoMaxThrust would have turned it ON, arming a
    // mode the stage is in the middle of standing down from.
    expect(s.autopilot.autoMaxThrustOn, 'and autoMaxThrust stayed off').toBe(false);
  });

  it('keeps aero deceleration when the measured deceleration is already strong enough (line 143)', () => {
    // The 5 s countdown exists to ask, once, whether the air is doing the job.
    // If it is, the engines must NOT light. `decelerationStageHorizontalAcc` is
    // negative (gravity * 1.6 with gravity negative), so a large POSITIVE
    // accelerationX is comfortably above the threshold.
    const s = boostingBack();
    s.autopilot.accelerationStageCompleted = true;
    s.autopilot.boostBackDecelerationStageInitCompleted = true;
    s.autopilot.boostBackDecelerationCheckCountdown = DT / 2;
    s.kinematics.accelerationX = Math.abs(C.decelerationStageHorizontalAcc) * 100;
    s.engines.running = [false, false, false];

    autoBoostBack(s, DT);

    expect(s.autopilot.boostBackDecelerationCheckCountdown, 'the check ran').toBeNull();
    expect(s.autopilot.boostBackAeroDeceleration, 'air is still doing the work').toBe(true);
    expect(s.engines.running, 'so no engine was lit').toEqual([false, false, false]);
  });
});

describe('autoLand — the landing-target offsets by engine configuration', () => {
  /**
   * Parked in the horizontal-adjustment stage.
   *
   * The offsets are a correction for thrust that is off the vehicle's axis, so
   * which engines are lit changes where the autopilot aims. The observable is
   * `horizontalAdjustmentDesiredSpeed`, which is `targetDifference` divided by
   * the time left — so a change in the offset shows up there, scaled.
   */
  function adjusting(running: [boolean, boolean, boolean]): SimState {
    const s = inFlight();
    s.kinematics.altitude = 3_000;
    s.kinematics.speedY = -100;
    s.kinematics.downRangeDistance = 1_000;
    s.autopilot.autoLandOn = true;
    s.autopilot.initVehicleConfigCompleted = true;
    s.autopilot.aeroDescentCompleted = true;
    s.autopilot.flipCompleted = true;
    s.autopilot.horizontalAdjustmentStageCompleted = false;
    s.autopilot.horizontalAdjustmentStageInitialised = true;
    s.autopilot.landingSiteXPos = 1_000;
    s.engines.running = running;
    return s;
  }

  /** desiredSpeed * timeLeft recovers targetDifference, before any clamping. */
  const targetDifferenceOf = (s: SimState): number =>
    (s.autopilot.horizontalAdjustmentDesiredSpeed as number) *
    (s.autopilot.horizontalAdjustmentTimeLeft as number);

  it('offsets by -12 m when only the first engine is lit (line 369)', () => {
    const one = adjusting([true, false, false]);
    const all = adjusting([true, true, true]);
    autoLand(one, DT);
    autoLand(all, DT);

    // landingSiteXPos === downRangeDistance, so the unoffset difference is 0
    // and the offset is the whole of it.
    expect(targetDifferenceOf(all), 'no offset with all three lit').toBeCloseTo(0, 6);
    expect(targetDifferenceOf(one), 'a single centre engine aims 12 m short').toBeCloseTo(-12, 6);
  });

  it('offsets by +4 m when the first is out and one other is lit (line 373)', () => {
    // The third arm of the ladder: !n1 && exactly one of n2/n3. The uncovered
    // half was specifically `(!n2 && n3)` — engine 3 alone.
    const third = adjusting([false, false, true]);
    const second = adjusting([false, true, false]);
    autoLand(third, DT);
    autoLand(second, DT);

    expect(targetDifferenceOf(third), 'engine 3 alone').toBeCloseTo(4, 6);
    expect(targetDifferenceOf(second), 'engine 2 alone, the same arm').toBeCloseTo(4, 6);
  });

  it('clamps the fine-tune fraction to 1 above the fine-tune speed (line 312)', () => {
    // aeroDescentController, inside the last five seconds before the site. The
    // fraction scales the correction angle, so without the clamp a fast vehicle
    // would command more than the maximum correction the stage allows.
    // The window is narrow and every term matters, so it is constructed rather
    // than flown to: |speedX| <= 20 so the first arm is not taken, distanceToSite
    // negative so the third is, and timeToSite = -distanceToSite/speedX inside
    // (0, 5). With speedX = 10 and distanceToSite = -20, timeToSite is 2.
    const s = inFlight();
    s.kinematics.altitude = 20_000;
    s.kinematics.speedY = -300;
    s.kinematics.speedX = 10;
    s.autopilot.landingSiteXPos = C.starBaseXPos;
    s.kinematics.downRangeDistance = C.starBaseXPos - 120;
    s.autopilot.autoLandOn = true;
    s.autopilot.initVehicleConfigCompleted = true;
    s.autopilot.aeroDescentCompleted = false;

    autoLand(s, DT);

    // 10 m/s is twice fineTuneMaxSpeed, so the fraction is CLAMPED at 1 rather
    // than the 2.0 the proportional arm would give. Without the clamp the
    // correction angle would be twice the stage's stated maximum.
    expect(Math.abs(s.kinematics.speedX)).toBeGreaterThan(C.fineTuneMaxSpeed);
    expect(s.autopilot.fineTunePercentage, 'clamped, not proportional').toBe(1);
  });
});

describe('finalDescentStageController — touchdown with fuel already dumping', () => {
  it('does not stop the dump it is trying to start (line 477)', () => {
    const s = inFlight();
    s.kinematics.altitude = C.vehicleHeight * 0.5;
    s.kinematics.speedY = -1;
    s.autopilot.autoLandOn = true;
    s.status.dumpingFuel = true;
    s.engines.running = [true, true, true];

    finalDescentStageController(s, DT);

    expect(s.status.forceDump, 'touchdown forces the dump').toBe(true);
    // toggleDumpFuel would have switched it off, on the ground, with the
    // vehicle full of propellant it is explicitly trying to be rid of.
    expect(s.status.dumpingFuel, 'and the dump kept running').toBe(true);
  });
});

describe('autoDeorbit — the two guards at the end of the burn', () => {
  function burning(): SimState {
    const s = inFlight();
    s.kinematics.altitude = 200_000;
    s.kinematics.speedX = 7_500;
    s.kinematics.speedY = 5;
    s.autopilot.autoDeorbitOn = true;
    s.autopilot.deorbitInitCompleted = true;
    s.autopilot.deorbitBurnStarted = true;
    s.autopilot.deorbitBurnCompleted = false;
    // spent = deorbitTargetSpeed - speedX, so this is past the dV ceiling.
    s.autopilot.deorbitTargetSpeed = s.kinematics.speedX + C.DEORBIT_DELTA_V_MAX + 1;
    return s;
  }

  it('completes the burn without toggling engines that are already out (line 694)', () => {
    const s = burning();
    s.engines.running = [false, false, false];

    autoDeorbit(s);

    expect(s.autopilot.deorbitBurnCompleted, 'the burn ended').toBe(true);
    // toggleAllRaptors on an all-off set COMMANDS all three to light — and
    // ignition is dt-ticked, so `running` stays false for several steps either
    // way. Asserting on `running` here proved nothing: with the guard deleted
    // the mutation survived. The countdown is the observable that discriminates.
    expect(
      s.engines.ignitionCountdown.map((c) => c !== null),
      'and no ignition was commanded on the way out',
    ).toEqual([false, false, false]);
    expect(s.engines.running).toEqual([false, false, false]);
  });

  it('and shuts the engines down when they are still lit', () => {
    // The covered half, so the assertion above cannot pass vacuously.
    const s = burning();
    s.engines.running = [true, true, true];

    autoDeorbit(s);

    expect(s.autopilot.deorbitBurnCompleted).toBe(true);
    expect(s.engines.running).toEqual([false, false, false]);
  });

  it('does not toggle autoLand off when handing over with it already on (line 703)', () => {
    const s = burning();
    s.autopilot.deorbitBurnCompleted = true;
    s.kinematics.speedY = -1;
    s.autopilot.autoLandOn = true;

    autoDeorbit(s);

    expect(s.autopilot.autoDeorbitOn, 'deorbit stood down').toBe(false);
    expect(s.autopilot.autoLandOn, 'and autoLand was left on').toBe(true);
  });
});

describe('precisionAlignment — the negative RCS dead zone', () => {
  it('commands a proportional negative thrust inside the limit (already covered)', () => {
    // NOT one of the fourteen. This path was already covered before M10.10; it
    // is kept because it is the mirror of the zero case below and makes that
    // test legible — without it, "exactly zero" has nothing to be exactly zero
    // in contrast to. Below the RCS maximum the command is proportional and the
    // yoke stays out of it; only saturation moves the yoke.
    const s = createInitialState();
    s.kinematics.altitude = 60_000;
    s.status.rcsActive = true;
    s.status.translationModeOn = true;
    s.engines.running = [false, false, false];
    s.vehicle.throttleCurrent = 0;
    s.forces.thrust = 0;
    // The error's sign sets the command's sign: pitchDifference = pitch - goal,
    // and the commanded acceleration is -pitchDifference/T^2, so a POSITIVE
    // pitch error yields the negative force this branch is about.
    s.kinematics.pitch = rad(0.2);
    s.kinematics.angularVelocity = 0;

    precisionAlignment(s, rad(0), 8);

    expect(s.autopilot.rcsThrustCommand, 'a proportional command, not a saturated one')
      .toBeLessThan(0);
    expect(Math.abs(s.autopilot.rcsThrustCommand)).toBeLessThan(C.rcsMaxThrust);
    expect(Math.abs(s.autopilot.pitchControl), 'the yoke stayed out of it').toBeLessThan(100);
  });
});

describe('precisionAlignment — the exactly-zero RCS command', () => {
  it('commands nothing when the rotation already nulls the error (the branch v8 reports at line 156)', () => {
    // THIS is the uncovered fourteenth. v8 attributes it to line 156, where the
    // `else if (rcsForceRequired < 0)` opens, because the uncovered half is that
    // else-if's implicit else; the statement it guards is line 163.
    //
    // The third arm: rcsForceRequired is neither positive nor negative but
    // exactly 0. That is not a degenerate case — it is the vehicle already
    // turning at precisely the rate that will erase its attitude error, so the
    // correct command is no command.
    //
    // Constructed rather than stumbled on. The commanded acceleration is
    //     -pitchDifference/T^2  -  2*omega/T  -  offAxisThrust
    // so with offAxisThrust zero the first two cancel when omega =
    // -pitchDifference/(2T). At pitchDifference = 0.2 and T = 8 that is
    // -0.0125, and both terms evaluate to the same double, so the difference is
    // exactly zero rather than merely small.
    const s = createInitialState();
    s.kinematics.altitude = 60_000;
    s.status.rcsActive = true;
    s.status.translationModeOn = true;
    s.engines.running = [false, false, false];
    s.vehicle.throttleCurrent = 0;
    s.forces.thrust = 0;
    s.forces.offAxisThrustDifferenceAcceleration = 0;
    s.kinematics.pitch = rad(0.2);
    s.kinematics.angularVelocity = -0.0125;

    precisionAlignment(s, rad(0), 8);

    expect(s.autopilot.rcsThrustCommand, 'no thruster command').toBe(0);
    expect(s.autopilot.pitchControl, 'and the yoke centred').toBe(0);
  });
});

describe('controlHorizontalAccelerationByAeroBreaking — the correction angle', () => {
  const noop = (): void => {};

  it('backs the angle off when it is already over-decelerating (line 455)', () => {
    const s = createInitialState();
    s.status.finActive = true;
    s.autopilot.horizontalAccelerationByAeroBreakingCorrectionAngle = rad(0.5);
    s.kinematics.accelerationX = 100;

    controlHorizontalAccelerationByAeroBreaking(s, 1, 1, noop);

    expect(
      s.autopilot.horizontalAccelerationByAeroBreakingCorrectionAngle,
      'over the goal, so present less area',
    ).toBeLessThan(0.5);
  });

  it('and never lets the angle go negative (line 469)', () => {
    // A negative correction angle would mean turning INTO the airflow to
    // decelerate less, which is not what this controller is for. One step from
    // near zero, while over-decelerating, would otherwise cross it.
    const s = createInitialState();
    s.status.finActive = true;
    s.autopilot.horizontalAccelerationByAeroBreakingCorrectionAngle = rad(0.0001);
    s.kinematics.accelerationX = 100;

    controlHorizontalAccelerationByAeroBreaking(s, 1, 1, noop);

    expect(s.autopilot.horizontalAccelerationByAeroBreakingCorrectionAngle).toBe(0);
  });
});

/**
 * The two that are NOT reachable, with the argument rather than a test.
 *
 * Writing a test for either would mean writing one that cannot fail, which is
 * worse than leaving the branch uncovered because it would read as covered.
 */
describe('the unreachable pair, argued rather than tested', () => {
  it('toggleAllRaptors: the "already running" skip inside the all-off branch', () => {
    // commands.ts:48. The structure is
    //
    //     if (running[0] || running[1] || running[2]) {
    //       for (...) if (running[i]) toggleRaptor(state, i);   // shut down
    //     } else {
    //       for (...) if (!running[i]) toggleRaptor(state, i);  // light up
    //     }
    //
    // Inside the else, no engine is running, so `!running[i]` is true for every
    // i — its false half cannot be taken. Each index is visited once, so the
    // mutation `toggleRaptor` makes cannot bring it back either.
    //
    // What CAN be asserted is the property that makes the branch redundant.
    // Ignition is dt-ticked (wall 5), so lighting an engine COMMANDS it rather
    // than setting `running` — the observable is the countdown, not the flag.
    const allOff = createInitialState();
    allOff.engines.running = [false, false, false];
    toggleAllRaptors(allOff);
    expect(
      allOff.engines.ignitionCountdown.map((c) => c !== null),
      'all off means command all three to light',
    ).toEqual([true, true, true]);

    // And the mixed case takes the other arm, shutting down only what is lit.
    const mixed = createInitialState();
    mixed.engines.running = [true, false, true];
    toggleAllRaptors(mixed);
    expect(mixed.engines.running, 'any lit means shut the lit ones down').toEqual([
      false,
      false,
      false,
    ]);
  });

  it('horizontalAdjustmentStageController: the `?? 0` fallback on the desired speed', () => {
    // autopilot/index.ts:413. Twenty lines above the read,
    //
    //     autopilot.horizontalAdjustmentDesiredSpeed =
    //       targetDifference / autopilot.horizontalAdjustmentTimeLeft;
    //
    // assigns a number unconditionally, and the two clamps that follow assign
    // numbers too. A division always produces a number — possibly NaN, never
    // undefined — and `??` fires only on null or undefined. The field's type is
    // `number | undefined`, so the `0` is defensive against an undefined the
    // TYPE permits and the code path forbids: the assignment above is
    // unconditional and twenty lines earlier in the same function.
    //
    // The reachable claim is that the field is a number by the time it is read.
    const s = createInitialState();
    s.kinematics.altitude = 3_000;
    s.kinematics.speedY = -100;
    s.autopilot.autoLandOn = true;
    s.autopilot.initVehicleConfigCompleted = true;
    s.autopilot.aeroDescentCompleted = true;
    s.autopilot.flipCompleted = true;
    s.autopilot.horizontalAdjustmentStageInitialised = true;
    s.autopilot.horizontalAdjustmentDesiredSpeed = undefined;

    autoLand(s, DT);

    expect(s.autopilot.horizontalAdjustmentDesiredSpeed).toBeDefined();
    expect(typeof s.autopilot.horizontalAdjustmentDesiredSpeed).toBe('number');
  });
});
