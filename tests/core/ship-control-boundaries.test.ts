/** Commands set intent; actual actuators and physical state advance only on
 * paid steps. Neutral attitude has no fin command and ascent stows the fins. */
import { describe, expect, it } from 'vitest';
import { cloneState, createInitialState } from '$core/state';
import { autoTakeOff } from '$core/autopilot';
import { precisionAlignment } from '$core/control/primitives';
import { throttleControl } from '$core/control/actuation';
import { resetControls } from '$core/control/commands';
import { advanceMechanics } from '$core/step';
import { SHIP } from '$core/vehicle';
import { rad } from '$core/units';
const DT = 1 / 120;
describe('Ship physical control boundaries', () => {
  it('clears a stale fin command at zero attitude error, with both correction signs as controls', () => {
    const s = createInitialState(123);
    s.status.finActive = true; s.status.rcsActive = false;
    s.kinematics.speedY = -100; s.kinematics.pitch = rad(0); s.kinematics.angularVelocity = 0;
    s.forces.thrust = 0; s.forces.offAxisThrustDifferenceAcceleration = 0;
    s.autopilot.pitchControl = 25;
    const before = cloneState(s);
    precisionAlignment(s, rad(0), 3);
    expect(s.autopilot.pitchControl).toBe(0);
    expect(s.vehicle).toEqual(before.vehicle); expect(s.engines).toEqual(before.engines);
    const positive = cloneState(before), negative = cloneState(before);
    precisionAlignment(positive, rad(.2), 3); precisionAlignment(negative, rad(-.2), 3);
    expect(positive.autopilot.pitchControl).toBeGreaterThan(0);
    expect(negative.autopilot.pitchControl).toBeLessThan(0);
  });
  it('stows active ascent fins through real slew rather than moving their physical extension at initialization', () => {
    const s = createInitialState(123);
    s.status.finActive = true; s.status.finLocked = false;
    s.vehicle.frontFinExtension = 100; s.vehicle.aftFinExtension = 100;
    s.engines.running[0] = true; s.autopilot.autoTakeOffOn = true;
    const before = cloneState(s);
    autoTakeOff(s);
    expect(s.status.finActive).toBe(false); expect(s.status.finLocked).toBe(true);
    expect(s.autopilot.autoTakeOffInitialised).toBe(true);
    expect(s.vehicle.frontFinExtension).toBe(100); expect(s.vehicle.aftFinExtension).toBe(100);
    expect(s.rng).toEqual(before.rng); expect(s.engines).toEqual(before.engines);
    const next = advanceMechanics(s, DT, () => {}, SHIP);
    expect(next.vehicle.frontFinExtension).toBeLessThan(100);
    expect(next.vehicle.aftFinExtension).toBeLessThan(100);
    expect(next.vehicle.frontFinExtension).toBeGreaterThan(0);
    expect(s.vehicle.frontFinExtension).toBe(100);
  });
  it('sets and resets control intent while preserving delivered throttle, engines, fuel and motion', () => {
    const s = createInitialState(123);
    s.vehicle.throttleCurrent = 80; s.autopilot.pitchControl = 35;
    const before = cloneState(s);
    throttleControl(s, 60);
    expect(s.vehicle.throttle).toBe(60); expect(s.vehicle.throttleCurrent).toBe(80);
    resetControls(s);
    expect(s.vehicle.throttle).toBe(100); expect(s.autopilot.pitchControl).toBe(0);
    expect(s.vehicle.throttleCurrent).toBe(80);
    expect(s.vehicle.propellantMass).toBe(before.vehicle.propellantMass);
    expect(s.engines).toEqual(before.engines); expect(s.kinematics).toEqual(before.kinematics);
    expect(s.rng).toEqual(before.rng);
  });
});
