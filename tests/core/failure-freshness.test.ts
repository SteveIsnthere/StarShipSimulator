/** Phase 6b Task 5: failures must judge the step being returned. */
import { describe, expect, it } from 'vitest';
import * as C from '$core/constants';
import { createScenarioState, getScenario } from '$core/scenarios';
import { step } from '$core/step';
import { gravityAt } from '$core/physics/gravity';
import { createMassProperties, writeMassProperties } from '$core/physics/mass';
import { rad } from '$core/units';

describe('breakup reads current forces', () => {
  it('breaks up on the first overpressure step even when the incoming pressure was safe', () => {
    const s = createScenarioState(getScenario('reentry')!);
    s.kinematics.altitude = 10_000;
    s.kinematics.speedX = 2_000;
    s.kinematics.speedY = 0;
    s.forces.dynamicPressure = 0;
    s.forces.perceivedG = 0;
    s.forces.surfaceTemperature = 0;
    const next = step(s, 1 / 120);
    expect(next.forces.dynamicPressure).toBeGreaterThan(C.dynamicPressureLimit);
    expect(next.failures.inFlightBreakUp).toBe(true);
  });

  it('does not break a safe vacuum state because its incoming pressure reading was stale', () => {
    const s = createScenarioState(getScenario('deorbit')!);
    s.forces.dynamicPressure = C.dynamicPressureLimit * 2;
    s.forces.perceivedG = 0;
    s.forces.surfaceTemperature = 0;
    const next = step(s, 1 / 120);
    expect(next.forces.dynamicPressure).toBeLessThan(C.dynamicPressureLimit);
    expect(next.failures.inFlightBreakUp).toBe(false);
  });

  it('cancels engines and pending ignition when current pressure breaks the vehicle', () => {
    const s = createScenarioState(getScenario('landing-burn')!);
    s.kinematics.altitude = 10_000;
    s.kinematics.distanceToPlanetCenter = C.planetRadius + 10_000;
    s.kinematics.speedX = 2000;
    s.engines.running = [true, true, true, false, false, false];
    s.engines.ignitionCountdown[3] = 1;
    const next = step(s, 1 / 120);
    expect(next.failures.inFlightBreakUp).toBe(true);
    expect(next.forces.thrust).toBeGreaterThan(0); // This step's paid impulse.
    expect(next.engines.running.every((running) => !running)).toBe(true);
    expect(next.engines.ignitionCountdown.every((remaining) => remaining === null)).toBe(true);
    expect(next.vehicle.propellantMass).toBe(0);
    expect(next.vehicle.vehicleMass).toBe(C.vehicleDryMass);
    const dry = createMassProperties();
    writeMassProperties(0, dry);
    expect(next.vehicle.vehicleMomentOfInertia).toBe(dry.momentOfInertia);
    expect(next.kinematics.angularVelocity).toBe(0);
    expect(step(next, 1 / 120).forces.thrust).toBe(0);
  });
});

describe('ground contact reads current thrust', () => {
  it('a crash shuts down before fuel use and cannot apply the incoming engine thrust', () => {
    const s = createScenarioState(getScenario('launch-pad')!);
    s.kinematics.speedY = -100;
    s.engines.running = [true, true, true, false, false, false];
    s.engines.ignitionCountdown[3] = 1;
    const next = step(s, 1 / 120);
    expect(next.failures.crashed).toBe(true);
    expect(next.forces.thrust).toBe(0);
    expect(next.vehicle.propellantMass).toBe(0);
    expect(next.vehicle.vehicleMass).toBe(C.vehicleDryMass);
    expect(next.engines.ignitionCountdown.every((remaining) => remaining === null)).toBe(true);
    expect(next.kinematics.altitude).toBe(s.kinematics.altitude);
    expect(next.kinematics.speedY).toBe(0);
  });

  it('releases the pad on the first lifting step despite an incoming zero-thrust reading', () => {
    const s = createScenarioState(getScenario('launch-pad')!);
    s.vehicle.propellantMass = 20_000;
    s.vehicle.vehicleMass = C.vehicleDryMass + s.vehicle.propellantMass;
    s.vehicle.throttle = s.vehicle.throttleCurrent = 100;
    s.engines.running = [true, true, true, false, false, false];
    s.status.onTheGround = true;
    s.forces.thrustAcceleration = 0;
    const next = step(s, 1 / 120);
    expect(next.forces.thrustAcceleration).toBeGreaterThan(gravityAt(C.planetRadius));
    expect(next.status.onTheGround).toBe(false);
    expect(next.kinematics.speedY).toBeGreaterThan(0);
    expect(next.kinematics.altitude).toBeGreaterThan(s.kinematics.altitude);
  });

  it('supports the unpowered vehicle immediately despite a stale high-thrust reading', () => {
    const s = createScenarioState(getScenario('launch-pad')!);
    s.status.onTheGround = false;
    s.forces.thrustAcceleration = 1000;
    const next = step(s, 1 / 120);
    expect(next.forces.thrustAcceleration).toBe(0);
    expect(next.status.onTheGround).toBe(true);
    expect(next.kinematics.altitude).toBe(s.kinematics.altitude);
    expect(next.kinematics.speedY).toBe(0);
  });
});

describe('felt g reads current forces', () => {
  it('breaks on current thrust and drag while pressure and temperature stay below their limits', () => {
    const s = createScenarioState(getScenario('landing-burn')!);
    s.kinematics.altitude = 20_000;
    s.kinematics.distanceToPlanetCenter = C.planetRadius + 20_000;
    // Six lit engines on near-dry tanks plus tail-first drag exceed 13 g
    // of specific force; gravity keeps the net acceleration below 13 g.
    s.vehicle.propellantMass = 1_000;
    s.vehicle.vehicleMass = C.vehicleDryMass + 1_000;
    s.vehicle.throttle = s.vehicle.throttleCurrent = 100;
    s.engines.running.fill(true);
    s.autopilot.autoLandOn = false;
    s.kinematics.speedY = -850;
    s.kinematics.pitch = rad(0);
    s.forces.perceivedG = 0;
    const next = step(s, 1 / 120);
    expect(next.forces.dynamicPressure).toBeLessThan(C.dynamicPressureLimit);
    expect(next.forces.surfaceTemperature).toBeLessThan(C.TILE_LIMIT_KELVIN);
    expect(next.kinematics.totalAcceleration / C.standardGravity).toBeLessThan(C.gLimit);
    expect(next.forces.perceivedG).toBeGreaterThan(C.gLimit);
    expect(next.failures.inFlightBreakUp).toBe(true);
  });
});
