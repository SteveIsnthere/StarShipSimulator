/**
 * M2.11, Bug-fix tier: the autopilot's proportional RCS command was dead code.
 *
 * THE DEFECT. `precisionAlignment` has three actuator branches. The RCS branch
 * (autoPilotLowLevelFunctions.js:48, ported verbatim) does one of two things
 * with the torque it wants:
 *
 *   - if the force needed EXCEEDS rcsMaxThrust, it slams the yoke to +-100 and
 *     lets `controlTranslation` fire the thrusters at full;
 *   - otherwise it writes `forces.rcsThrust = rcsForceRequired` directly, and
 *     leaves the yoke at 0.
 *
 * The second write can never take effect. updateBackEnd's phase order runs
 * rotational motion — the only consumer of `rcsThrust` — BEFORE controlsUpdate,
 * and `controlTranslation` runs immediately after the autopilot inside
 * controlsUpdate and unconditionally zeroes `rcsThrust` when the yoke is inside
 * +-99. So every proportional command is overwritten before anything reads it.
 *
 * WHAT THAT COSTS. It is not a rounding-level defect; it removes attitude
 * control outright. The damping term in the alignment law is `-2*omega/T`, so
 * as soon as the vehicle has picked up a little rotation the demand drops below
 * rcsMaxThrust — and at that moment the thrusters stop entirely. The vehicle is
 * left rotating at whatever rate it happened to reach, with nothing to slow it.
 *
 * Measured before the fix, on the Deorbit preset in vacuum where RCS is the
 * only actuator: the thrusters fire for 0.21 s, the vehicle reaches
 * -0.0372 rad/s, the demand falls to 787 kN against a cap of 800 kN, firing
 * stops, and the vehicle free-tumbles at that constant rate for the next
 * thirty-five minutes. It is not holding an attitude; it is spinning.
 *
 * The hardware was never the limit. 800 kN at 20 m on a 8.96e7 kg*m^2 vehicle
 * is 0.16 rad/s^2, enough for a minimum-time 180-degree flip in 8.9 s.
 *
 * These tests were written before the fix and observed to fail.
 */
import { describe, expect, it } from 'vitest';
import { createScenarioState, getScenario } from '$core/scenarios';
import { step } from '$core/step';
import * as cmd from '$core/control/commands';
import * as C from '$core/constants';
import { GOLDEN_SPECS } from '../golden/scenarios';

const DT = 1 / 120;

/** The Deorbit preset in vacuum, commanded to turn around. */
function turningInVacuum() {
  const s = createScenarioState(getScenario('deorbit')!);
  cmd.toggleAutoDeorbit(s);
  return s;
}

describe('the RCS actually holds an attitude', () => {
  it('a 180-degree flip in vacuum completes in under a minute', () => {
    // The hardware can do it in 8.9 s; the controller is allowed to be less
    // aggressive than a bang-bang optimum, but not by two orders of magnitude.
    let s = turningInVacuum();
    let flippedAt = -1;
    for (let i = 1; i <= 120 * 120; i++) {
      s = step(s, DT);
      if (Math.abs((s.kinematics.pitch as number) - -Math.PI / 2) < 0.1) {
        flippedAt = i / 120;
        break;
      }
    }
    expect(flippedAt, 'never reached retrograde in two minutes').toBeGreaterThan(0);
    expect(flippedAt, `took ${flippedAt.toFixed(1)} s`).toBeLessThan(60);
  });

  it('and then HOLDS it, rather than carrying on rotating', () => {
    // The real test of a controller. Fly ten minutes past the flip and check
    // the vehicle is still pointing where it was told to.
    let s = turningInVacuum();
    for (let i = 0; i < 120 * 600; i++) s = step(s, DT);
    expect(Math.abs((s.kinematics.pitch as number) - -Math.PI / 2), 'drifted off retrograde')
      .toBeLessThan(0.2);
    expect(Math.abs(s.kinematics.angularVelocity), 'still tumbling').toBeLessThan(0.02);
  });

  it('the thrusters fire below saturation, not only at the cap', () => {
    // The defect stated directly: before the fix, `forces.rcsThrust` was
    // non-zero on exactly the steps where the yoke was slammed to +-100, and
    // never on any other. A working proportional path breaks that equality.
    let s = turningInVacuum();
    let firingSteps = 0;
    let saturatedSteps = 0;
    for (let i = 0; i < 120 * 300; i++) {
      s = step(s, DT);
      if (s.forces.rcsThrust !== 0) firingSteps += 1;
      if (Math.abs(s.autopilot.pitchControl) > 99) saturatedSteps += 1;
    }
    expect(firingSteps, 'never fired at all').toBeGreaterThan(0);
    expect(firingSteps, 'fires only when saturated — the command is still dead').toBeGreaterThan(
      saturatedSteps,
    );
  });

  it('and firing costs propellant in proportion to how hard', () => {
    // Partial-authority attitude control must not be free: 2021 charged the
    // reserve only for full-deflection firing, which is exactly the case that
    // worked. Now that the proportional path fires, it has to be paid for.
    let s = turningInVacuum();
    const start = s.vehicle.rcsRunTimeRemaining;
    let saturatedSteps = 0;
    for (let i = 0; i < 120 * 60; i++) {
      s = step(s, DT);
      if (Math.abs(s.autopilot.pitchControl) > 99) saturatedSteps += 1;
    }
    const used = start - s.vehicle.rcsRunTimeRemaining;
    // More than the saturated steps alone would have cost, and less than if
    // every step had been at full thrust.
    expect(used).toBeGreaterThan(saturatedSteps * DT);
    expect(used).toBeLessThan(60);
    expect(s.vehicle.rcsRunTimeRemaining, 'a flip must not empty the tank').toBeGreaterThan(
      C.rcsRunTimeRemaining * 0.5,
    );
  });
});

describe('what the fix must not break', () => {
  it('the reserve still empties, and firing stops when it does', () => {
    let s = turningInVacuum();
    // Drain it by hand, then command a turn.
    s.vehicle.rcsRunTimeRemaining = 0.001;
    for (let i = 0; i < 120 * 10; i++) s = step(s, DT);
    // 2021's drain does not clamp — it steps straight past zero and the `> 0`
    // gate then stops the thrusters. Ported verbatim, and asserted as it is
    // rather than tidied: tests/proofs/rcs-reserve.test.ts is why that
    // expression is left alone.
    expect(s.vehicle.rcsRunTimeRemaining).toBeLessThanOrEqual(0);
    expect(s.forces.rcsThrust).toBe(0);
  });

  it('RCS off means no thrust, whatever the autopilot wants', () => {
    let s = turningInVacuum();
    for (let i = 0; i < 10; i++) s = step(s, DT);
    cmd.toggleRcs(s);
    expect(s.status.rcsActive).toBe(false);
    for (let i = 0; i < 120 * 10; i++) s = step(s, DT);
    expect(s.forces.rcsThrust).toBe(0);
  });

  it('the intro is untouched — CLAUDE.md says it must never change', () => {
    // Measured: the intro never reaches the RCS branch at all, so this fix
    // cannot move it. Asserted rather than assumed, because "the soul" is the
    // one thing no tier may quietly regenerate.
    const spec = GOLDEN_SPECS.find((g) => g.id === 'intro-demo')!;
    let s = spec.build();
    let everFired = false;
    for (let i = 0; i < spec.steps; i++) {
      s = step(s, DT);
      if (s.forces.rcsThrust !== 0) everFired = true;
    }
    expect(everFired, 'the intro fires RCS after all — check the fixture').toBe(false);
    expect(s.status.landed).toBe(true);
  });
});
