/**
 * Closed-loop behaviour of the ported autopilot.
 *
 * The parity tests prove each primitive computes the same number as 2021 did.
 * These prove the modes still fly — that the loop closes, converges, and lands.
 * M1.8 turns the good ones into golden fixtures.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState, type SimState } from '$core/state';
import { step } from '$core/step';
import * as cmd from '$core/control/commands';

const DT = 1 / 120;

function fly(state: SimState, seconds: number, stopWhen?: (s: SimState) => boolean): SimState {
  let s = state;
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    s = step(s, DT);
    if (stopWhen?.(s)) return s;
  }
  return s;
}

describe('pitchHold', () => {
  it('arrests a rotation and holds the attitude it settles at', () => {
    // pitchHold does not fly to a target. Its controller re-latches
    // `holdingPitch` to the current pitch on every step where rotation is slow
    // (|pitchRateOfChange| < 0.4), so it is a damper: it stops you turning and
    // pins you where you stopped. Setting holdingPitch by hand is pointless -
    // the next step overwrites it.
    const start = createInitialState();
    start.kinematics.altitude = 30_000;
    start.kinematics.speedY = -100;
    start.kinematics.pitch = 0.6 as never;
    start.kinematics.angularVelocity = 0.3;
    start.engines.running = [true, true, true];
    start.vehicle.throttle = 100;
    start.vehicle.throttleCurrent = 100;
    cmd.togglePitchHold(start);

    const end = fly(start, 20);
    expect(Math.abs(end.kinematics.angularVelocity), 'rotation should be arrested')
      .toBeLessThan(0.02);

    // And it stays put once settled.
    const later = fly(end, 10);
    expect(Math.abs(later.kinematics.pitch - end.kinematics.pitch)).toBeLessThan(0.05);
  });

  it('without it, the same rotation keeps going', () => {
    // The control case, so the test above is measuring the autopilot and not
    // aerodynamic damping.
    const start = createInitialState();
    start.kinematics.altitude = 30_000;
    start.kinematics.speedY = -100;
    start.kinematics.pitch = 0.6 as never;
    start.kinematics.angularVelocity = 0.3;
    start.engines.running = [true, true, true];
    start.vehicle.throttle = 100;
    start.vehicle.throttleCurrent = 100;

    const end = fly(start, 20);
    expect(Math.abs(end.kinematics.angularVelocity)).toBeGreaterThan(0.02);
  });

  it('cannot steer on RCS alone, because controlTranslation overwrites rcsThrust', () => {
    // A real 2021 behaviour, pinned rather than fixed. In presisionAlignment's
    // RCS branch, a force within rcsMaxThrust is written straight to rcsThrust
    // and yokePosition is left alone. But controlsUpdate() runs
    // autoPilotControlInput() and THEN controlTranslation(), and rcsControl()
    // recomputes rcsThrust from pitchControl - zeroing it unless the command
    // exceeds +-99. So proportional RCS steering never reaches the physics;
    // RCS only ever fires at full authority.
    //
    // Not a bug fix here: changing it would move every landing. If it is ever
    // addressed it belongs in M2 with a tier and a before/after diff.
    const start = createInitialState();
    start.kinematics.altitude = 30_000;
    start.kinematics.speedY = -100;
    start.kinematics.pitch = 0.6 as never;
    start.status.rcsActive = true;
    cmd.togglePitchHold(start);
    start.autopilot.holdingPitch = 0.5 as never;

    const after = step(start, DT);
    // The autopilot asked for a modest correction, so pitchControl stayed 0...
    expect(Math.abs(after.autopilot.pitchControl)).toBeLessThan(99);
    // ...and rcsControl therefore zeroed the thrust the autopilot had set.
    expect(after.forces.rcsThrust).toBe(0);
  });

  it('does nothing while manual control is on', () => {
    const start = createInitialState();
    start.kinematics.altitude = 30_000;
    start.kinematics.pitch = 0.6 as never;
    cmd.togglePitchHold(start);
    cmd.setManualControl(start, true);
    const end = step(start, DT);
    expect(end.autopilot.pitchControl).toBe(0);
  });
});

describe('autoTakeOff', () => {
  it('lights the engines and climbs', () => {
    const start = createInitialState();
    cmd.toggleAutoTakeOff(start);
    const end = fly(start, 30);
    expect(end.autopilot.autoTakeOffInited).toBe(true);
    expect(end.kinematics.altitude).toBeGreaterThan(1000);
    expect(end.kinematics.speedY).toBeGreaterThan(0);
  });

  it('follows the pitch programme, tilting over as it climbs', () => {
    const start = createInitialState();
    cmd.toggleAutoTakeOff(start);
    const at10s = fly(start, 10);
    const at60s = fly(at10s, 50);
    // aomAt_25km is 55 deg; pitch should be heading that way, not straight up.
    expect(at60s.kinematics.altitude).toBeGreaterThan(at10s.kinematics.altitude);
    expect(at60s.kinematics.pitch).toBeGreaterThan(at10s.kinematics.pitch);
  });
});

describe('the intro demo — CLAUDE.md lists this under "what must never change"', () => {
  /** utilities/welcome.js:66 — startRunningGame()'s initial conditions. */
  function introState(): SimState {
    const s = createInitialState();
    // renderBoxPhysicalHeight is a view constant; the demo starts near the top
    // of the visible box falling at a quarter of that per second.
    const renderBoxPhysicalHeight = 1000;
    s.kinematics.altitude = renderBoxPhysicalHeight - 1;
    s.kinematics.speedY = -renderBoxPhysicalHeight / 4;
    s.vehicle.propellantMass = 12_000;
    s.vehicle.vehicleMass = 120_000 + 12_000;
    s.status.finLocked = true;
    s.autopilot.demoAutoLandOn = true;
    cmd.toggleAllRaptors(s);
    return s;
  }

  it('lands, and hands the vehicle back ready to fly', () => {
    const end = fly(introState(), 60, (s) => !s.autopilot.demoAutoLandOn);

    expect(end.autopilot.demoAutoLandOn, 'demo should have completed').toBe(false);
    expect(end.failures.crashed, 'the intro must not crash').toBe(false);
    expect(end.failures.inFightBreakUp).toBe(false);
    expect(end.kinematics.altitude).toBeLessThan(26);

    // welcome.js's checkIfTD hands control back to the player.
    expect(end.status.finLocked).toBe(false);
    expect(end.vehicle.propellantMass).toBe(350_000);
    expect(end.vehicle.throttle).toBe(100);
    expect(end.autopilot.pitchControl).toBe(0);
  });

  it('is deterministic — the same intro twice is the same flight', () => {
    const a = fly(introState(), 60, (s) => !s.autopilot.demoAutoLandOn);
    const b = fly(introState(), 60, (s) => !s.autopilot.demoAutoLandOn);
    expect(a.kinematics.altitude).toBe(b.kinematics.altitude);
    expect(a.kinematics.speedY).toBe(b.kinematics.speedY);
    expect(a.world.updatedFrameCount).toBe(b.world.updatedFrameCount);
  });

  it('slows down on the way in rather than arriving fast', () => {
    const start = introState();
    const end = fly(start, 60, (s) => !s.autopilot.demoAutoLandOn);
    expect(Math.abs(end.kinematics.speedY)).toBeLessThan(Math.abs(start.kinematics.speedY));
  });
});

describe('autoLand', () => {
  it('configures the vehicle on entry: fins and RCS out, engines off, throttle low', () => {
    const start = createInitialState();
    start.kinematics.altitude = 20_000;
    start.kinematics.speedY = -300;
    start.kinematics.speedX = 100;
    start.engines.running = [true, true, true];
    cmd.toggleAutoLand(start);

    const end = step(start, DT);
    expect(end.autopilot.initVehicleConfigCompleted).toBe(true);
    expect(end.status.finActive).toBe(true);
    expect(end.status.rcsActive).toBe(true);
    expect(end.vehicle.throttle).toBeLessThanOrEqual(40);
  });

  it('computes a belly-flop trigger altitude and ends the aero descent below it', () => {
    const start = createInitialState();
    start.kinematics.altitude = 8_000;
    start.kinematics.speedY = -250;
    start.kinematics.speedX = 5;
    start.kinematics.pitch = 1.5 as never;
    start.vehicle.propellantMass = 30_000;
    start.vehicle.vehicleMass = 150_000;
    cmd.toggleAutoLand(start);

    const end = fly(start, 120, (s) => s.autopilot.aeroDesentCompleted);
    expect(end.autopilot.bellyFlopTriggerAltitude).toBeGreaterThan(0);
    expect(end.autopilot.aeroDesentCompleted).toBe(true);
    // The exit condition is altitude below the trigger, or below 300 m outright.
    expect(
      end.kinematics.altitude < end.autopilot.bellyFlopTriggerAltitude ||
        end.kinematics.altitude < 300,
    ).toBe(true);
  });
});

describe('autopilot runs entirely in core', () => {
  it('needs no DOM', () => {
    expect(typeof globalThis.document).toBe('undefined');
    const s = createInitialState();
    cmd.toggleAutoLand(s);
    cmd.togglePitchHold(s);
    cmd.toggleAutoTakeOff(s);
    cmd.toggleAutoMaxThrust(s);
    cmd.toggleBoostBack(s);
    s.autopilot.demoAutoLandOn = true;
    s.kinematics.altitude = 5_000;
    expect(() => fly(s, 5)).not.toThrow();
  });

  it('every mode is reachable from a command, not a button', () => {
    const s = createInitialState();
    for (const toggle of [
      cmd.togglePitchHold,
      cmd.toggleAutoMaxThrust,
      cmd.toggleAutoTakeOff,
      cmd.toggleBoostBack,
      cmd.toggleAutoLand,
    ]) {
      toggle(s);
    }
    expect(s.autopilot.pitchHoldOn).toBe(true);
    expect(s.autopilot.autoMaxThrustOn).toBe(true);
    expect(s.autopilot.autoTakeOffOn).toBe(true);
    expect(s.autopilot.autoBoostBackOn).toBe(true);
    expect(s.autopilot.autoLandOn).toBe(true);
  });
});
