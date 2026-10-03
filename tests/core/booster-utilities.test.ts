import { describe, expect, it } from 'vitest';
import { createScenarioVehicle, getScenario } from '$core/scenarios';
import { cloneState } from '$core/state';
import { runBoosterPolicy } from '$core/autopilot/booster';
import { runAutopilot, autoMaxThrust } from '$core/autopilot';
import { controlTranslation } from '$core/control/actuation';
import { getTotalMaxThrust } from '$core/physics/engines';
import { localGravity } from '$core/control/guidance-physics';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { rad } from '$core/units';
import * as C from '$core/constants';
import { centreOfMass } from '$core/physics/mass';

const booster = () => createScenarioVehicle(getScenario('rtls')!).state;

describe('booster utility autopilot modes', () => {
  it.each([25_000, 52_500, 80_000, 100_000])('continues an already lit ascent through the pitch programme at %s metres', altitude => {
    const state = booster();
    state.kinematics.altitude = altitude; state.kinematics.pitch = rad(0);
    state.kinematics.speedX = state.kinematics.speedY = state.kinematics.angularVelocity = 0;
    state.atmosphere.airDensity = 0; state.forces.thrust = 0;
    state.engines.running[0] = true; state.autopilot.autoTakeOffOn = true;
    const draws = structuredClone(state.rng);
    const goal = altitude === 25_000 ? C.aomAt_25km
      : altitude === 52_500 ? (C.aomAt_25km + C.aomAt_80km) / 2 : C.aomAt_80km;
    const demand = goal / 9 * state.vehicle.vehicleMomentOfInertia
      / (SUPER_HEAVY.rcsStation - centreOfMass(state.vehicle.propellantMass, SUPER_HEAVY));
    runAutopilot(state, 1 / 120, SUPER_HEAVY);
    expect(state.engines.running.filter(Boolean)).toHaveLength(1);
    expect(state.engines.ignitionCountdown.every(value => value === null)).toBe(true);
    expect(state.rng).toEqual(draws);
    expect(state.autopilot.rcsThrustCommand).toBe(Math.min(C.rcsMaxThrust, demand));
    expect(state.autopilot.autoTakeOffInitialised).toBe(true);
  });
  it('sets the pressure guard throttle using actual thirteen-engine thrust', () => {
    const state = booster();
    state.engines.running.fill(false);
    state.engines.running.fill(true, 0, 13);
    state.kinematics.trueSpeed = 0;
    state.autopilot.autoMaxThrustOn = true;
    state.vehicle.throttle = 100;
    const goal = Math.max(40, Math.min(100,
      4 * localGravity(state) * state.vehicle.vehicleMass
      / getTotalMaxThrust(state.engines.running, state.atmosphere.airPressure, SUPER_HEAVY) * 100));
    expect(goal).toBeLessThan(100);
    runAutopilot(state, 1 / 120, SUPER_HEAVY);
    expect(state.vehicle.throttle).toBe(goal);
    const standalone = booster();
    standalone.engines.running = [...state.engines.running];
    standalone.kinematics.trueSpeed = 0;
    standalone.autopilot.autoMaxThrustOn = true;
    autoMaxThrust(standalone, SUPER_HEAVY);
    expect(standalone.vehicle.throttle).toBe(goal);
  });

  it('holds attitude through physical fin and proportional paid RCS authority', () => {
    const state = booster();
    state.autopilot.pitchHoldOn = true;
    state.autopilot.holdingPitch = rad(.3);
    state.kinematics.pitch = rad(0);
    state.kinematics.pitchRateOfChange = 1;
    runAutopilot(state, 1 / 120, SUPER_HEAVY);
    expect(state.autopilot.boosterFinControl).toBeDefined();
    expect(state.autopilot.rcsThrustCommand).not.toBe(0);
    const commanded = state.autopilot.rcsThrustCommand;
    controlTranslation(state, state.autopilot.pitchControl, 1 / 120, SUPER_HEAVY);
    expect(state.forces.rcsThrust).toBe(commanded);
    expect(state.autopilot.rcsThrustCommand).toBe(0);
    expect(state.vehicle.rcsRunTimeRemaining).toBeLessThan(25);
  });

  it('initialises ascent with the actual return engine group and no Ship flap lock', () => {
    const state = booster();
    state.autopilot.autoTakeOffOn = true;
    runAutopilot(state, 1 / 120, SUPER_HEAVY);
    expect(state.engines.ignitionCountdown.filter(value => value !== null)).toHaveLength(13);
    expect(state.autopilot.autoTakeOffInitialised).toBe(true);
    expect(state.autopilot.autoMaxThrustOn).toBe(true);
    expect(state.status.finLocked).toBe(false);
    expect(state.autopilot.boosterFinControl).toBeDefined();
  });

  it('retains the exact forecast control law while return guidance has priority', () => {
    const state = booster();
    state.autopilot.autoLandOn = true;
    state.autopilot.autoMaxThrustOn = true;
    state.autopilot.pitchHoldOn = true;
    state.autopilot.autoTakeOffOn = true;
    const expected = cloneState(state);
    expected.autopilot.boosterPhase = 'align-boost';
    runBoosterPolicy(expected, 1 / 120, SUPER_HEAVY);
    runAutopilot(state, 1 / 120, SUPER_HEAVY, previous => previous);
    expect(state).toEqual(expected);
    expect(state.autopilot.autoTakeOffInitialised).toBe(false);
    state.autopilot.autoLandOn = false;
    runAutopilot(state, 1 / 120, SUPER_HEAVY);
    expect(state.autopilot.autoTakeOffInitialised).toBe(true);
  });

  it('suspends utility attitude commands under the manual yoke', () => {
    const state = booster();
    state.autopilot.manualControlOn = true;
    state.autopilot.pitchHoldOn = true;
    state.autopilot.autoTakeOffOn = true;
    state.autopilot.pitchControl = 35;
    runAutopilot(state, 1 / 120, SUPER_HEAVY);
    expect(state.autopilot.pitchControl).toBe(35);
    expect(state.autopilot.autoTakeOffInitialised).toBe(false);
    expect(state.engines.ignitionCountdown.every(value => value === null)).toBe(true);
  });

  it('shuts down every lit engine at the preserved ascent fuel threshold', () => {
    const state = booster();
    state.autopilot.autoTakeOffOn = true;
    state.autopilot.autoTakeOffInitialised = true;
    state.vehicle.propellantMass = 11_999;
    state.engines.running.fill(true);
    runAutopilot(state, 1 / 120, SUPER_HEAVY);
    expect(state.engines.running.some(Boolean)).toBe(false);
    expect(state.autopilot.autoTakeOffOn).toBe(false);
  });
});
