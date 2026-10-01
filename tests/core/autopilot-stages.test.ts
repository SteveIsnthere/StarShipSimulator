/**
 * M10.6 — the autopilot's stage machines, driven directly.
 *
 * `autopilot/index.ts` is 704 lines and 234 branches, more than a third of all
 * the branches in `core/`. Before this file the only thing reaching them was
 * seven nominal golden flights, which walk one path each. That is the worst
 * possible coverage shape for a stage machine, because a wrong branch here does
 * not crash: it produces a plausible flight, and a golden fixture then records
 * that flight as the truth.
 *
 * THE METHOD, and why it works. The stage machine is not an enum — it is a set
 * of independent booleans on `state.autopilot` (`boostBackInitCompleted`,
 * `flipStageInitialised`, `horizontalAdjustmentStageCompleted`,
 * `finalDescentStageInitialised`, and the rest). Stage is DATA, so a test can
 * construct any configuration and call a controller against it, reaching
 * transitions no trajectory visits without flying anything at all. Every test
 * below sets the state it needs and asserts what the controller did to it.
 *
 * Not every combination of those booleans is reachable, and chasing raw
 * combination coverage would be the same mistake as chasing line coverage.
 * These tests name transitions.
 */
import { describe, expect, it } from 'vitest';
import * as C from '$core/constants';
import { rad, type Rad } from '$core/units';
import {
  autoBoostBack,
  autoDeorbit,
  autoLand,
  autoTakeOff,
  finalDescentStageController,
} from '$core/autopilot/index';
import { step } from '$core/step';
import * as cmd from '$core/control/commands';
import { createInitialState, type SimState } from '$core/state';

/** A vehicle with `count` engines burning. */
function litCount(count: number): SimState {
  const s = createInitialState();
  for (let i = 0; i < count; i++) s.engines.running[i] = true;
  s.vehicle.throttle = 100;
  s.vehicle.throttleCurrent = 100;
  return s;
}

describe('autoTakeOff follows a pitch programme by altitude', () => {
  /**
   * The pitch programme, as documented: linear to `aomAt_25km` by 25 km, linear
   * on to `aomAt_80km` by 80 km, then held.
   */
  const expectedGoal = (altitude: number): number => {
    if (altitude < 25_000) return (C.aomAt_25km * altitude) / 25_000;
    if (altitude < 80_000) {
      return C.aomAt_25km + ((C.aomAt_80km - C.aomAt_25km) * (altitude - 25_000)) / 55_000;
    }
    return C.aomAt_80km;
  };

  /**
   * How hard the mode corrects when the vehicle is ALREADY pointing at `pitch`.
   *
   * Asserted this way round on purpose. Reading the goal back out of
   * `precisionAlignment` is unreliable — with fins inactive it writes
   * `pitchControl = 0` and puts the proportional command in `rcsThrustCommand`,
   * and below a 0.1 rad error it writes neither. The inverse is clean: if the
   * commanded goal is what the programme says, then pointing the vehicle there
   * must produce no correction at all, and pointing it elsewhere must produce
   * one.
   */
  function correctionAt(altitude: number, pitch: number): number {
    const s = litCount(3);
    cmd.toggleAutoTakeOff(s);
    s.autopilot.autoTakeOffInitialised = true;
    s.kinematics.altitude = altitude;
    s.kinematics.pitch = rad(pitch) as Rad;
    s.kinematics.angularVelocity = 0;
    s.forces.offAxisThrustDifferenceAcceleration = 0;
    s.forces.thrust = 0;
    s.status.rcsActive = true;
    s.autopilot.rcsThrustCommand = 0;
    autoTakeOff(s);
    return Math.abs(s.autopilot.rcsThrustCommand);
  }

  it('commands the programme angle in all three altitude bands', () => {
    // Asserted by SYMMETRY, which is sensitive where a single reading is not.
    // `precisionAlignment` writes nothing below a 0.1 rad error, so "pointing
    // at the goal asks for no correction" cannot distinguish the true goal from
    // one 0.09 rad away — an earlier draft asserted exactly that and a 0.09 rad
    // bias in either band survived.
    //
    // Instead: probe equally far either side of the claimed goal. If the goal
    // is right the two corrections are mirror images, equal in size and
    // opposite in sign. If it is off by e, the magnitudes differ by ~2e.
    const probe = 0.3;
    for (const altitude of [12_500, 50_000, 120_000]) {
      const goal = expectedGoal(altitude);
      const above = correctionAt(altitude, goal + probe);
      const below = correctionAt(altitude, goal - probe);
      expect(above, `above, at ${altitude} m`).toBeGreaterThan(0);
      expect(below, `below, at ${altitude} m`).toBeGreaterThan(0);
      expect(above / below, `symmetry at ${altitude} m`).toBeCloseTo(1, 2);
    }
  });

  it('and a goal even slightly off would break that symmetry', () => {
    // Guards the test above: the symmetry check must actually discriminate.
    // Probing around a goal displaced by 0.05 rad — half the dead zone, and
    // well under what the previous draft could see — is visibly lopsided.
    const probe = 0.3;
    const altitude = 50_000;
    const wrong = expectedGoal(altitude) + 0.05;
    const above = correctionAt(altitude, wrong + probe);
    const below = correctionAt(altitude, wrong - probe);
    expect(Math.abs(above / below - 1)).toBeGreaterThan(0.05);
  });

  it('and the ramp is continuous across the 25 km seam', () => {
    // Asserted against the CONTROLLER, not against the test's own formula.
    // Comparing expectedGoal(25_001) with expectedGoal(24_999) compares the
    // test with itself and would pass through a real 0.05 rad step in the code.
    const probe = 0.3;
    const seamGoal = expectedGoal(24_999);
    for (const altitude of [24_999, 25_001]) {
      const above = correctionAt(altitude, seamGoal + probe);
      const below = correctionAt(altitude, seamGoal - probe);
      expect(above / below, `at ${altitude} m`).toBeCloseTo(1, 2);
    }
  });

  it('lights the engines and arms max thrust when it initialises', () => {
    // The init branch, with nothing lit: it must command ignition and enable
    // autoMaxThrust. Reached once per flight and never again.
    const s = createInitialState();
    cmd.toggleAutoTakeOff(s);
    expect(s.autopilot.autoTakeOffInitialised).toBe(false);
    expect(s.engines.running.some(Boolean)).toBe(false);

    autoTakeOff(s);

    expect(s.autopilot.autoTakeOffInitialised).toBe(true);
    expect(s.autopilot.autoMaxThrustOn).toBe(true);
    // Ignition is a countdown, so what is observable now is that it was
    // COMMANDED on every engine.
    for (const i of [0, 1, 2] as const) {
      expect(s.engines.ignitionCountdown[i], `engine ${i}`).not.toBeNull();
    }
  });

  it('does not re-light engines that are already burning', () => {
    const s = litCount(3);
    cmd.toggleAutoTakeOff(s);
    autoTakeOff(s);
    expect(s.engines.running.every(Boolean)).toBe(true);
  });

  it('shuts down and hands back control when the propellant runs low', () => {
    // The end-of-ascent branch. A nominal golden ends before this fires.
    const s = litCount(3);
    cmd.toggleAutoTakeOff(s);
    s.autopilot.autoTakeOffInitialised = true;
    s.kinematics.altitude = 60_000;
    s.vehicle.propellantMass = C.dumpLimit - 1;

    autoTakeOff(s);

    expect(s.autopilot.autoTakeOffOn).toBe(false);
    expect(s.engines.running.some(Boolean)).toBe(false);
  });

  it('and does nothing at all under manual control', () => {
    const s = litCount(3);
    cmd.toggleAutoTakeOff(s);
    s.autopilot.manualControlOn = true;
    const before = s.autopilot.autoTakeOffInitialised;
    autoTakeOff(s);
    expect(s.autopilot.autoTakeOffInitialised).toBe(before);
  });
});

describe('autoBoostBack picks which way to turn from where it is', () => {
  function initialisedAt(downRange: number): SimState {
    const s = litCount(3);
    cmd.toggleBoostBack(s);
    s.kinematics.downRangeDistance = downRange;
    autoBoostBack(s, 1 / 60);
    return s;
  }

  it('turns one way beyond the landing site and the other way short of it', () => {
    // Both sides of the direction choice. Getting this backwards would fly the
    // booster away from the pad, and a golden started on one side of the
    // threshold can only ever exercise one of them.
    const beyond = initialisedAt(C.starBaseXPos - C.flipInducedXPosChange + 1_000);
    const short = initialisedAt(C.starBaseXPos - C.flipInducedXPosChange - 1_000);

    expect(beyond.autopilot.boostBackDirection).toBeCloseTo(-Math.PI * 0.5, 9);
    expect(short.autopilot.boostBackDirection).toBeCloseTo(Math.PI * 0.5, 9);
    expect(Math.sign(beyond.autopilot.boostBackDirection)).not.toBe(
      Math.sign(short.autopilot.boostBackDirection),
    );
  });

  it('configures the vehicle once, and marks itself initialised', () => {
    const s = initialisedAt(0);
    expect(s.autopilot.boostBackInitCompleted).toBe(true);
    expect(s.status.rcsActive).toBe(true);
    expect(s.autopilot.autoMaxThrustOn).toBe(true);
  });

  it('turns off auto take-off if it was still running', () => {
    // Boost-back and ascent must not both be steering.
    const s = litCount(3);
    cmd.toggleBoostBack(s);
    cmd.toggleAutoTakeOff(s);
    expect(s.autopilot.autoTakeOffOn).toBe(true);
    autoBoostBack(s, 1 / 60);
    expect(s.autopilot.autoTakeOffOn).toBe(false);
  });

  it('hands over to autoLand when it finishes low and descending', () => {
    // The finish condition — altitude under 700 m and falling — and the
    // handover it performs. This is the transition that ends the mode, and a
    // golden that stops before touchdown never sees it.
    const s = litCount(3);
    cmd.toggleBoostBack(s);
    s.autopilot.boostBackInitCompleted = true;
    s.autopilot.accelerationStageCompleted = true;
    s.autopilot.boostBackDecelerationStageInitCompleted = true;
    s.kinematics.altitude = 500;
    s.kinematics.speedY = -50;
    // Above the low-speed finish, so the ALTITUDE condition is what fires.
    // At speedX 0 the `Math.abs(speedX) < 3` branch ends the mode first and
    // this test would pass for the wrong reason.
    s.kinematics.speedX = 100;

    autoBoostBack(s, 1 / 60);

    expect(s.autopilot.autoBoostBackOn).toBe(false);
    expect(s.autopilot.autoLandOn).toBe(true);
    // And the stage flags are reset, so a second boost-back starts clean.
    expect(s.autopilot.boostBackInitCompleted).toBe(false);
    expect(s.autopilot.accelerationStageCompleted).toBe(false);
  });

  it('also finishes once it has almost stopped moving downrange', () => {
    // The other finish condition, and the one that fires first at rest:
    // |speedX| < 3. Separated from the altitude test above so each names the
    // branch it actually exercises.
    const s = litCount(3);
    cmd.toggleBoostBack(s);
    s.autopilot.boostBackInitCompleted = true;
    s.autopilot.accelerationStageCompleted = true;
    s.autopilot.boostBackDecelerationStageInitCompleted = true;
    s.kinematics.altitude = 20_000;
    s.kinematics.speedX = 1;

    autoBoostBack(s, 1 / 60);

    expect(s.autopilot.autoBoostBackOn).toBe(false);
    expect(s.autopilot.autoLandOn).toBe(true);
  });

  it('does not finish while still high, even when descending', () => {
    const s = litCount(3);
    cmd.toggleBoostBack(s);
    s.autopilot.boostBackInitCompleted = true;
    s.autopilot.accelerationStageCompleted = true;
    s.autopilot.boostBackDecelerationStageInitCompleted = true;
    s.kinematics.altitude = 20_000;
    s.kinematics.speedY = -50;
    s.kinematics.speedX = 100;

    autoBoostBack(s, 1 / 60);

    expect(s.autopilot.autoBoostBackOn).toBe(true);
    expect(s.autopilot.autoLandOn).toBe(false);
  });
});

describe('the final descent compensates for which engines are lit', () => {
  /**
   * The commanded yoke for a given engine configuration, at touchdown-approach
   * attitude.
   *
   * With an asymmetric engine set the thrust does not act through the
   * centreline, so the controller biases its steering to compensate — a
   * different bias per configuration (-0.8, +0.8, +0.72, 0). At these attitudes
   * the yoke SATURATES, so the discriminating signal is the sign of the
   * command, not its size: magnitude compares equal across branches and would
   * prove nothing.
   */
  function steeringFor(running: [boolean, boolean, boolean]): number {
    const s = createInitialState();
    for (const i of [0, 1, 2] as const) s.engines.running[i] = running[i];
    s.vehicle.throttle = 100;
    s.vehicle.throttleCurrent = 100;
    s.kinematics.altitude = 2_000;
    s.kinematics.speedY = -50;
    s.kinematics.speedX = 0;
    s.autopilot.landingSiteXPos = 0;
    s.kinematics.downRangeDistance = 0;
    s.autopilot.finalDescentStageInitialised = true;
    s.status.rcsActive = true;
    s.forces.thrust = 0;
    s.kinematics.pitch = rad(0) as Rad;
    s.kinematics.angularVelocity = 0;
    return s.autopilot.pitchControl === 0
      ? (finalDescentStageController(s, 1 / 60), s.autopilot.pitchControl)
      : s.autopilot.pitchControl;
  }

  it('steers the OPPOSITE way for the two mirrored engine configurations', () => {
    // The strongest claim available here, and the one that matters: a vehicle
    // on its centre engine alone and a vehicle on both outboards must lean in
    // opposite directions. Getting these two branches the wrong way round would
    // push the vehicle away from the pad on one engine set — a plausible wrong
    // landing that a golden flying only the other set would never reveal.
    const centreOnly = steeringFor([true, false, false]);
    const bothOutboard = steeringFor([false, true, true]);

    expect(Math.sign(centreOnly)).toBe(-1);
    expect(Math.sign(bothOutboard)).toBe(1);
    expect(Math.sign(centreOnly)).not.toBe(Math.sign(bothOutboard));
  });

  it('and the two single-outboard cases are treated alike, and lean the same way as both', () => {
    // `!n1 && ((n2 && !n3) || (!n2 && n3))` deliberately treats either outboard
    // the same way. Symmetry alone is not enough, though: it holds even if the
    // bias's SIGN is flipped, which is the "wrong way round" failure this file
    // exists to catch. So assert the direction too.
    const second = steeringFor([false, true, false]);
    const third = steeringFor([false, false, true]);
    expect(second).toBe(third);
    expect(Math.sign(second)).toBe(1);
    expect(Math.sign(second)).toBe(Math.sign(steeringFor([false, true, true])));
  });

  it('and every configuration produces a bounded command', () => {
    const configs: [boolean, boolean, boolean][] = [
      [true, false, false],
      [false, true, true],
      [false, true, false],
      [false, false, true],
      [true, true, true],
      [false, false, false],
    ];
    for (const running of configs) {
      const c = steeringFor(running);
      expect(Number.isFinite(c), JSON.stringify(running)).toBe(true);
      expect(Math.abs(c), JSON.stringify(running)).toBeLessThanOrEqual(100);
    }
  });

  it('dumps fuel and shuts down on touchdown', () => {
    // The touchdown branch, with no onTouchdown override: throttle to the
    // floor, engines off, force dump, autoLand released.
    const s = litCount(3);
    cmd.toggleAutoLand(s);
    s.autopilot.finalDescentStageInitialised = true;
    s.kinematics.altitude = C.vehicleHeight * 0.5;
    s.kinematics.speedY = -0.1;

    finalDescentStageController(s, 1 / 60);

    expect(s.vehicle.throttle).toBe(C.throttleLowerLimit);
    expect(s.engines.running.some(Boolean)).toBe(false);
    expect(s.status.forceDump).toBe(true);
    expect(s.status.dumpingFuel).toBe(true);
    expect(s.autopilot.autoLandOn).toBe(false);
  });

  it('and calls the touchdown hook instead when one is given', () => {
    // The demo landing supplies its own hook; this is the branch that lets it.
    const s = litCount(3);
    s.autopilot.finalDescentStageInitialised = true;
    s.kinematics.altitude = C.vehicleHeight * 0.5;
    let called = 0;
    finalDescentStageController(s, 1 / 60, -5, () => {
      called += 1;
    });
    expect(called).toBe(1);
    // The hook replaces the default path rather than running alongside it.
    expect(s.status.forceDump).toBe(false);
  });

  it('holds attitude rather than steering once it is very low', () => {
    // Below the no-steering height it stops trying to translate and simply
    // points the vehicle upright.
    const high = litCount(3);
    high.autopilot.finalDescentStageInitialised = true;
    high.kinematics.altitude = C.vehicleHeight * 0.5 + C.noSteeringHeight + 100;
    high.kinematics.downRangeDistance = 500;
    high.autopilot.landingSiteXPos = 0;
    finalDescentStageController(high, 1 / 60);

    const low = litCount(3);
    low.autopilot.finalDescentStageInitialised = true;
    low.kinematics.altitude = C.vehicleHeight * 0.5 + 1;
    low.kinematics.downRangeDistance = 500;
    low.autopilot.landingSiteXPos = 0;
    low.kinematics.pitch = rad(0) as Rad;
    finalDescentStageController(low, 1 / 60);

    // Upright and on target, the low case commands essentially nothing;
    // the high case is still trying to close 500 m of downrange error.
    expect(Math.abs(low.autopilot.pitchControl)).toBeLessThan(
      Math.abs(high.autopilot.pitchControl),
    );
  });
});

describe('autoDeorbit configures, and declines when it cannot burn', () => {
  it('turns on RCS and shuts the engines down at configure', () => {
    // The mode burns later; at configure it wants the vehicle stable and cold.
    //
    // The engine assertion has to be isolated: the SAME call can reach the
    // burn-start, which also calls toggleAllRaptors, so on a vehicle where the
    // burn fires the engines end up off either way and the configure branch
    // could be deleted without this noticing. Parking the vehicle far from any
    // firing point keeps the two apart.
    const s = litCount(3);
    cmd.toggleAutoDeorbit(s);
    s.kinematics.altitude = 200_000;
    s.kinematics.distanceToPlanetCenter = C.planetRadius + 200_000;
    s.kinematics.speedX = 7_800;
    s.kinematics.downRangeDistance = 0;
    s.autopilot.landingSiteXPos = C.planetCircumference / 2;
    expect(s.status.rcsActive).toBe(false);

    autoDeorbit(s);

    expect(s.autopilot.deorbitInitCompleted).toBe(true);
    expect(s.status.rcsActive).toBe(true);
    expect(s.engines.running.some(Boolean)).toBe(false);
    // Isolation check: the burn did NOT start on this call, so the engines
    // being off is the configure branch's doing.
    expect(s.autopilot.deorbitBurnStarted).toBe(false);
  });

  it('leaves RCS alone if it was already on', () => {
    const s = litCount(3);
    cmd.toggleAutoDeorbit(s);
    cmd.toggleRcs(s);
    expect(s.status.rcsActive).toBe(true);
    autoDeorbit(s);
    expect(s.status.rcsActive).toBe(true);
  });

  /**
   * M10.7, Bug-fix tier. The inverted Infinity sentinel.
   *
   * `predictedDeorbitRange` returns Infinity to mean "this burn cannot bring
   * the vehicle down" — every engine failed, or an orbit the fixed delta-v
   * cannot lower. But the firing test was
   * `distanceToLandingSite(state) <= predictedDeorbitRange(state)`, and every
   * finite distance is <= Infinity, so the sentinel did the exact opposite of
   * its intent: the burn fired IMMEDIATELY rather than never.
   *
   * The consequence was not a crash but a wedge. The mode committed to a burn
   * that could not happen — nothing lit, no delta-v spent, the completion
   * condition never arrived — and it never handed over to autoLand.
   */
  it('declines to fire when the burn cannot bring the vehicle down', () => {
    const s = createInitialState();
    cmd.toggleAutoDeorbit(s);
    s.engines.failed = [true, true, true];
    s.kinematics.altitude = 200_000;
    s.kinematics.distanceToPlanetCenter = C.planetRadius + 200_000;
    s.kinematics.speedX = 7_800;

    for (let i = 0; i < 500; i++) autoDeorbit(s);

    // It must never commit. Asserting `deorbitBurnStarted` directly, because
    // "no engine is running" is ALSO true of a burn that fired and lit nothing
    // — an earlier version of this test checked only that and passed against
    // the defect.
    expect(s.autopilot.deorbitBurnStarted).toBe(false);
    expect(s.autopilot.deorbitTargetSpeed).toBeUndefined();
    expect(s.engines.running.some(Boolean)).toBe(false);
  });

  it('and still fires normally when the burn is achievable', () => {
    // The other side, so the fix cannot be "never fire". A healthy vehicle in
    // orbit must still reach its firing point and commit.
    const s = createInitialState();
    cmd.toggleAutoDeorbit(s);
    s.kinematics.altitude = 200_000;
    s.kinematics.distanceToPlanetCenter = C.planetRadius + 200_000;
    s.kinematics.speedX = 7_800;
    s.autopilot.landingSiteXPos = 0;

    let fired = false;
    for (let i = 0; i < 5_000 && !fired; i++) {
      autoDeorbit(s);
      fired = s.autopilot.deorbitBurnStarted;
      // Walk the vehicle round its orbit so a firing point arrives.
      s.kinematics.downRangeDistance =
        (s.kinematics.downRangeDistance + 7_800) % C.planetCircumference;
    }
    expect(fired).toBe(true);
  });

  it('and does nothing at all under manual control', () => {
    const s = createInitialState();
    cmd.toggleAutoDeorbit(s);
    s.autopilot.manualControlOn = true;
    autoDeorbit(s);
    expect(s.autopilot.deorbitInitCompleted).toBe(false);
  });
});

describe('autoLand dispatches to exactly one stage at a time', () => {
  /** A vehicle already configured, so the dispatch below is what is observed. */
  function landing(flags: Partial<Record<string, boolean>>): SimState {
    const s = litCount(3);
    cmd.toggleAutoLand(s);
    s.autopilot.initVehicleConfigCompleted = true;
    s.kinematics.altitude = 3_000;
    s.kinematics.speedY = -80;
    Object.assign(s.autopilot, flags);
    return s;
  }

  it('configures the vehicle once, on the first call', () => {
    // Fins and RCS on, throttle to the floor, fuel dumping, engines off — the
    // belly-flop configuration. Everything after depends on it.
    const s = litCount(3);
    cmd.toggleAutoLand(s);
    expect(s.autopilot.initVehicleConfigCompleted).toBe(false);

    autoLand(s, 1 / 60);

    expect(s.autopilot.initVehicleConfigCompleted).toBe(true);
    expect(s.status.finActive).toBe(true);
    expect(s.status.rcsActive).toBe(true);
    expect(s.vehicle.throttle).toBe(C.throttleLowerLimit);
    expect(s.engines.running.some(Boolean)).toBe(false);
  });

  it('runs the flip stage once aero descent is done, and not before', () => {
    // The second arm of the dispatch. Reached only after aeroDescentCompleted,
    // which a golden that stops before the flip never sets.
    const beforeFlip = landing({ aeroDescentCompleted: false });
    autoLand(beforeFlip, 1 / 60);
    expect(beforeFlip.autopilot.flipStageInitialised).toBe(false);

    const atFlip = landing({ aeroDescentCompleted: true, flipCompleted: false });
    atFlip.kinematics.pitch = rad(1.2) as Rad;
    // Dumping must be RUNNING first, or "it stops the dump" is vacuous.
    cmd.toggleDumpFuel(atFlip);
    expect(atFlip.status.dumpingFuel).toBe(true);
    autoLand(atFlip, 1 / 60);
    expect(atFlip.autopilot.flipStageInitialised).toBe(true);
    expect(atFlip.status.dumpingFuel).toBe(false);
  });

  it('opens the throttle wide once the nose has come through vertical', () => {
    // `pitch < 0` — the moment the vehicle is past upright and needs thrust.
    const s = landing({ aeroDescentCompleted: true, flipCompleted: false });
    s.autopilot.flipStageInitialised = true;
    // Start at the FLOOR. The fixture is otherwise already at 100, so the
    // assertion would hold with the branch deleted.
    s.vehicle.throttle = C.throttleLowerLimit;
    s.kinematics.pitch = rad(-0.1) as Rad;
    autoLand(s, 1 / 60);
    expect(s.vehicle.throttle).toBe(C.throttleUpperLimit);

    // And with the nose still short of vertical it stays where it was.
    const short = landing({ aeroDescentCompleted: true, flipCompleted: false });
    short.autopilot.flipStageInitialised = true;
    short.vehicle.throttle = C.throttleLowerLimit;
    short.kinematics.pitch = rad(0.5) as Rad;
    autoLand(short, 1 / 60);
    expect(short.vehicle.throttle).toBe(C.throttleLowerLimit);
  });

  it('and declares the flip complete once past the goal angle', () => {
    const s = landing({ aeroDescentCompleted: true, flipCompleted: false });
    s.autopilot.flipStageInitialised = true;
    s.kinematics.pitch = rad(C.flipGoalAngle - 0.1) as Rad;
    autoLand(s, 1 / 60);
    expect(s.autopilot.flipCompleted).toBe(true);
  });

  it('moves on to horizontal adjustment, which locks the fins', () => {
    // The third arm. Locking the fins is its signature.
    const s = landing({ aeroDescentCompleted: true, flipCompleted: true });
    s.status.finActive = true;
    autoLand(s, 1 / 60);
    expect(s.autopilot.horizontalAdjustmentStageInitialised).toBe(true);
    expect(s.status.finLocked).toBe(true);
    expect(s.status.finActive).toBe(false);
  });

  it('and tightens its limits when flying on fewer than three engines', () => {
    // The degraded-engine branch: a vehicle with less thrust available is given
    // a slower vertical limit and a wider horizontal one. Nothing else reaches
    // this — every golden landing has all three.
    const full = landing({ aeroDescentCompleted: true, flipCompleted: true });
    const beforeV = full.autopilot.horizontalAdjustmentVerticalSpeedLimit;
    autoLand(full, 1 / 60);
    expect(full.autopilot.horizontalAdjustmentVerticalSpeedLimit).toBe(beforeV);

    const degraded = landing({ aeroDescentCompleted: true, flipCompleted: true });
    const beforeH = degraded.autopilot.horizontalAdjustmentHorizontalSpeedLimit;
    degraded.engines.running[2] = false;
    autoLand(degraded, 1 / 60);
    expect(degraded.autopilot.horizontalAdjustmentVerticalSpeedLimit).toBeCloseTo(beforeV / 1.5, 9);
    // BOTH limits move. Asserting only the vertical one leaves the horizontal
    // doubling free to become a halving.
    expect(degraded.autopilot.horizontalAdjustmentHorizontalSpeedLimit).toBeCloseTo(beforeH * 2, 9);
  });

  it('and finally to the descent controller', () => {
    const s = landing({
      aeroDescentCompleted: true,
      flipCompleted: true,
      horizontalAdjustmentStageCompleted: true,
      finalDescentStageCompleted: false,
    });
    autoLand(s, 1 / 60);
    expect(s.autopilot.finalDescentStageInitialised).toBe(true);
  });

  it('and does nothing at all under manual control', () => {
    // The guard autoTakeOff and autoDeorbit both have tests for; autoLand had
    // none, so removing its guard survived every other assertion here.
    const s = litCount(3);
    cmd.toggleAutoLand(s);
    s.autopilot.manualControlOn = true;
    autoLand(s, 1 / 60);
    expect(s.autopilot.initVehicleConfigCompleted).toBe(false);
  });

  it('and does nothing once every stage is complete', () => {
    // All four arms exhausted: the mode must fall through rather than
    // re-entering the last one.
    const s = landing({
      aeroDescentCompleted: true,
      flipCompleted: true,
      horizontalAdjustmentStageCompleted: true,
      finalDescentStageCompleted: true,
    });
    s.autopilot.finalDescentStageInitialised = false;
    autoLand(s, 1 / 60);
    expect(s.autopilot.finalDescentStageInitialised).toBe(false);
  });
});

describe('step() at its own branch edges', () => {
  it('a throttle command overrides the autopilot for that step', () => {
    // `input.throttle !== undefined` — the branch every manual slider goes
    // through, and one no golden exercises because goldens fly with no input.
    const before = litCount(3);
    const after = step(before, 1 / 60, { throttle: 63 });
    expect(after.vehicle.throttle).toBe(63);
  });

  it('a pitch command likewise', () => {
    const before = litCount(3);
    const after = step(before, 1 / 60, { pitchControl: -42 });
    expect(after.autopilot.pitchControl).toBe(-42);
  });

  it('and omitting them leaves the autopilot in charge', () => {
    // The other side of both branches: undefined must not be written through
    // as a value.
    const before = litCount(3);
    before.vehicle.throttle = 77;
    const after = step(before, 1 / 60, {});
    expect(after.vehicle.throttle).not.toBe(undefined);
    expect(Number.isFinite(after.vehicle.throttle)).toBe(true);
  });
});

describe('the world wraps around the planet, both ways', () => {
  it('a vehicle flying past the far side comes back at zero', () => {
    // downRangeDistance is an arc length around the planet, so it must wrap. A
    // golden flight never travels far enough to reach either branch.
    // In vacuum: at pad altitude the drag on 600 m/s of air is enormous and
    // kills the speed inside one one-second step, so the wrap never triggers
    // and the test would measure drag instead.
    const s = litCount(0);
    s.kinematics.altitude = 500_000;
    s.kinematics.distanceToPlanetCenter = C.planetRadius + 500_000;
    s.kinematics.downRangeDistance = C.planetCircumference - 1;
    s.kinematics.speedX = 600;
    const after = step(s, 1);
    expect(after.kinematics.downRangeDistance).toBeGreaterThanOrEqual(0);
    expect(after.kinematics.downRangeDistance).toBeLessThan(C.planetCircumference);
    // Wrapped: it is near zero rather than near the circumference.
    expect(after.kinematics.downRangeDistance).toBeLessThan(1_000);
  });

  it('and one flying backwards past zero comes back at the far side', () => {
    // The mirror branch, `downRangeDistanceNextFrame < 0`. Without it a
    // retrograde vehicle would accumulate negative downrange for ever.
    const s = litCount(0);
    s.kinematics.altitude = 500_000;
    s.kinematics.distanceToPlanetCenter = C.planetRadius + 500_000;
    s.kinematics.downRangeDistance = 1;
    s.kinematics.speedX = -600;
    const after = step(s, 1);
    expect(after.kinematics.downRangeDistance).toBeGreaterThan(0);
    // Wrapped the other way: near the circumference rather than negative.
    expect(after.kinematics.downRangeDistance).toBeGreaterThan(C.planetCircumference - 1_000);
    expect(after.kinematics.downRangeDistance).toBeLessThan(C.planetCircumference);
  });

  it('pitch folds back into (-pi, pi] from either side', () => {
    // Both wrap branches. The fold happens BEFORE integration, so a step can
    // leave pitch a little outside the interval until the next one folds it —
    // which is why these assert the fold, not the interval.
    const over = litCount(3);
    over.kinematics.pitch = rad(Math.PI + 0.5) as Rad;
    over.kinematics.angularVelocity = 0;
    expect(step(over, 1 / 60).kinematics.pitch).toBeCloseTo(-Math.PI + 0.5, 9);

    const under = litCount(3);
    under.kinematics.pitch = rad(-Math.PI - 0.5) as Rad;
    under.kinematics.angularVelocity = 0;
    expect(step(under, 1 / 60).kinematics.pitch).toBeCloseTo(Math.PI - 0.5, 9);
  });
});

describe('the descent shutdown threshold is what separates demo from real', () => {
  it('shuts engines down above the threshold and leaves them lit below it', () => {
    // `finalDescentStageController(state, dt, speedYShutdownThreshold)` decides
    // when `raptorAutoShutDown` is consulted. demoAutoLand passes -20 where a
    // real landing uses -5, and the file's header calls that the only
    // difference between the two — but nothing asserted it, so flipping the
    // comparison survived.
    function litAfter(speedY: number, threshold: number): number {
      const s = litCount(3);
      s.autopilot.finalDescentStageInitialised = true;
      s.kinematics.altitude = 2_000;
      s.kinematics.speedY = speedY;
      // Light enough that minimum thrust would hold it up, so the shutdown has
      // something to do when it is consulted.
      // M11.2: the controller reads thrust at the state's ambient pressure,
      // which a hand-built state carries as 0 (vacuum) until a step sets it.
      s.vehicle.vehicleMass =
        (3 * C.thrustPerRaptorAt(s.atmosphere.airPressure) * C.throttleLowerLimit * 0.01) /
        C.gravity /
        2;
      finalDescentStageController(s, 1 / 60, threshold);
      return s.engines.running.filter(Boolean).length;
    }

    // Descending slower than the threshold: consulted, so one engine goes.
    expect(litAfter(-1, -5)).toBeLessThan(3);
    // Falling faster than it: not consulted, all three stay lit.
    expect(litAfter(-50, -5)).toBe(3);
    // And the demo's looser threshold moves that boundary, which is the point.
    expect(litAfter(-10, -20)).toBeLessThan(3);
    expect(litAfter(-10, -5)).toBe(3);
  });
});
