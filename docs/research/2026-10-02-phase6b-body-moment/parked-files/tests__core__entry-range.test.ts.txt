import { expect, it } from 'vitest';
import * as C from '$core/constants';
import { createScenarioState, getScenario } from '$core/scenarios';
import { createBurnScratch } from '$core/control/guidance-physics';
import { createEntryPrediction, predictEntryRangeInto, solveEntryRangeTrimInto } from '$core/control/entry-range';
import { updateVehicleInFlightMaxArea } from '$core/physics/aero';
import { entryPitchOffset } from '$core/autopilot/entry';
import { step } from '$core/step';
import { rad } from '$core/units';

it.each([[-1, 0], [1, 0], [-1, 2], [1, -2]] as const)('predicts direction %i with a measured %i-degree tracking bias', (direction, biasDegrees) => {
  const bias = rad(biasDegrees * Math.PI / 180);
  let s = createScenarioState(getScenario('reentry')!);
  s.kinematics.speedX *= direction;
  s.vehicle.propellantMass = 22_000;
  s.vehicle.vehicleMass = C.vehicleDryMass + 22_000;
  s.vehicle.frontFinExtension = 100;
  s.vehicle.aftFinExtension = 100;
  s.vehicle.vehicleInFlightMaxArea = updateVehicleInFlightMaxArea(100, 100).vehicleInFlightMaxArea;
  s.status.finActive = false;
  s.status.finLocked = false; // inactive, unlocked fins stay fully extended
  const origin = s.kinematics.downRangeDistance;
  const scratch = createBurnScratch();
  const prediction = createEntryPrediction();
  predictEntryRangeInto(s, C.ENTRY_LIFT_ANGLE, scratch, prediction, 0.5, bias);
  expect(prediction.reached).toBe(true);
  const halfStep = createEntryPrediction();
  predictEntryRangeInto(s, C.ENTRY_LIFT_ANGLE, scratch, halfStep, 0.25, bias);
  expect(Math.abs(prediction.downRange - halfStep.downRange)).toBeLessThan(1_000);
  let peakKelvin = 0;
  for (let n = 0; n < 120 * 1200 && s.kinematics.altitude > 1000; n++) {
    const motion = Math.atan2(s.kinematics.speedX, s.kinematics.speedY);
    s.kinematics.pitch = rad(motion - Math.PI / 2 +
      entryPitchOffset(s.kinematics.machSpeed, s.kinematics.speedX, C.ENTRY_LIFT_ANGLE) + bias);
    s.kinematics.angularVelocity = 0;
    s = step(s, 1 / 120);
    peakKelvin = Math.max(peakKelvin, s.forces.surfaceTemperature);
    expect(s.failures.inFlightBreakUp).toBe(false);
  }
  expect(s.kinematics.altitude).toBeLessThanOrEqual(1000);
  expect(Math.abs(prediction.peakKelvin - peakKelvin)).toBeLessThan(1);
  expect(Math.abs(prediction.peakKelvin - halfStep.peakKelvin)).toBeLessThan(1);
  const flown = s.kinematics.downRangeDistance - origin;
  expect(Math.abs(prediction.downRange - flown)).toBeLessThan(2_000);
});

it('reports a cap rather than inventing a touchdown for a vehicle in orbit', () => {
  const s = createScenarioState(getScenario('deorbit')!);
  const out = createEntryPrediction();
  predictEntryRangeInto(s, C.ENTRY_LIFT_ANGLE, createBurnScratch(), out);
  expect(out.reached).toBe(false);
  expect(Number.isNaN(out.time)).toBe(true);
});

it('solves the range trim in both directions and preserves three-degree authority', async () => {
  const { entryRangeTrim } = await import('$core/control/entry-range');
  const limit = Math.PI / 60;
  // Reducing the attack angle lengthens the outward-lift entry.
  expect(entryRangeTrim(1200, 1200, 800)).toBeCloseTo(-limit, 12);
  expect(entryRangeTrim(800, 1200, 800)).toBeCloseTo(limit, 12);
  expect(entryRangeTrim(1000, 1200, 800)).toBeCloseTo(0, 12);
  expect(entryRangeTrim(-1200, -1200, -800)).toBeCloseTo(-limit, 12);
  expect(entryRangeTrim(-800, -1200, -800)).toBeCloseTo(limit, 12);
  expect(entryRangeTrim(5000, 1200, 800)).toBeCloseTo(-limit, 12);
  expect(entryRangeTrim(0, 1200, 800)).toBeCloseTo(limit, 12);
  expect(entryRangeTrim(1000, 1000, 1000)).toBe(0);
});

it('keeps feedback deterministic, resets its countdown, and leaves fixed-angle sweeps open-loop', async () => {
  const { toggleAutoLand } = await import('$core/control/commands');
  const s = createScenarioState(getScenario('reentry')!);
  toggleAutoLand(s);
  const once = step(s, 1 / 120);
  expect(once.autopilot.entryRangeCountdown).toBe(1);
  expect(step(s, 1 / 120)).toEqual(once);
  const fixed = step(s, 1 / 120, { entryAngleOfAttack: C.ENTRY_LIFT_ANGLE });
  expect(fixed.autopilot.entryRangeCountdown).toBe(0);
  expect(fixed.autopilot.entryRangeTrim).toBe(0);
  toggleAutoLand(once);
  expect(once.autopilot.entryRangeCountdown).toBe(0);
  expect(once.autopilot.entryRangeTrim).toBe(0);
});

it('preserves a safe range solution and chooses the coolest feasible prediction when it is unsafe', async () => {
  const { thermallyConstrainedTrim } = await import('$core/control/entry-range');
  const candidate = { ...createEntryPrediction(), reached: true, peakKelvin: 1540 };
  const low = { ...candidate, peakKelvin: 1530 };
  const high = { ...candidate, peakKelvin: 1535 };
  const trim = rad(Math.PI / 180);
  const limit = Math.PI / 60;
  expect(thermallyConstrainedTrim(trim, candidate, low, high)).toBeCloseTo(-limit, 12);
  expect(thermallyConstrainedTrim(trim, candidate, high, low)).toBeCloseTo(limit, 12);
  expect(thermallyConstrainedTrim(trim, { ...candidate, peakKelvin: 1520 }, low, high)).toBe(trim);
  // Even when every forecast is unsafe, choose the lowest predicted peak;
  // do not invent a feasible result or exceed the existing authority.
  expect(thermallyConstrainedTrim(trim, { ...candidate, peakKelvin: 1550 },
    { ...low, peakKelvin: 1545 }, { ...high, peakKelvin: 1542 })).toBeCloseTo(limit, 12);
  expect(thermallyConstrainedTrim(trim, { ...candidate, reached: false },
    { ...low, reached: false }, { ...high, reached: false })).toBe(0);
});


it('checks the nonlinear candidate range while trim authority is still available', async () => {
  const { autoLand } = await import('$core/autopilot');
  const { getPitchDifference } = await import('$core/control/primitives');
  // The unchanged rotating flight at 2331.692 s: the endpoint interpolation
  // predicted a safe candidate 17.8 km short despite using only 0.05 deg trim.
  const s = createScenarioState(getScenario('deorbit')!);
  s.kinematics.altitude = 79028.75752702639;
  s.kinematics.speedX = 7260.457129788748;
  s.kinematics.speedY = -191.04131180025303;
  s.kinematics.angleOfMotion = rad(Math.atan2(s.kinematics.speedX, s.kinematics.speedY));
  s.kinematics.machSpeed = 25.584635767039238;
  s.kinematics.downRangeDistance = 17147488.407222938;
  s.vehicle.propellantMass = 21974.706931718207;
  s.vehicle.vehicleMass = C.vehicleDryMass + s.vehicle.propellantMass;
  s.vehicle.vehicleInFlightMaxArea = 512.3689638230042;
  s.status.dumpingFuel = false;
  s.autopilot.autoLandOn = true;
  s.autopilot.initVehicleConfigCompleted = true;
  s.autopilot.entryRangeTrim = rad(-0.36221068642132426 * Math.PI / 180);
  const previousGoal = rad(s.kinematics.angleOfMotion - Math.PI / 2 + entryPitchOffset(
    s.kinematics.machSpeed, s.kinematics.speedX, rad(C.ENTRY_LIFT_ANGLE + s.autopilot.entryRangeTrim),
  ));
  s.kinematics.pitch = rad(previousGoal + 0.44219111248362475 * Math.PI / 180);
  s.kinematics.angularVelocity = 0;
  const bias = rad(getPitchDifference(s.kinematics.pitch, previousGoal));
  autoLand(s, 1 / 120);
  const candidate = createEntryPrediction();
  predictEntryRangeInto(s, rad(C.ENTRY_LIFT_ANGLE + s.autopilot.entryRangeTrim),
    createBurnScratch(), candidate, 0.5, bias);
  expect(candidate.reached).toBe(true);
  expect(candidate.peakKelvin).toBeLessThan(C.TILE_LIMIT_KELVIN);
  expect(Math.abs(s.autopilot.entryRangeTrim)).toBeLessThan(C.aeroDescentMaxCorrectionAngle);
  expect(Math.abs(candidate.downRange - (s.autopilot.landingSiteXPos - s.kinematics.downRangeDistance)))
    .toBeLessThan(100);
});


it.each([-1, 1])('solves real nonlinear entry forecasts in direction %i and clamps unreachable targets', (direction) => {
  const s = createScenarioState(getScenario('reentry')!);
  s.kinematics.speedX = direction * 6000;
  s.kinematics.speedY = -200;
  s.vehicle.propellantMass = C.landingReserve;
  s.vehicle.vehicleMass = C.vehicleDryMass + C.landingReserve;
  s.vehicle.vehicleInFlightMaxArea = updateVehicleInFlightMaxArea(100, 100).vehicleInFlightMaxArea;
  const scratch = createBurnScratch();
  const low = createEntryPrediction(), high = createEntryPrediction(), known = createEntryPrediction();
  const limit = C.aeroDescentMaxCorrectionAngle;
  predictEntryRangeInto(s, rad(C.ENTRY_LIFT_ANGLE - limit), scratch, low);
  predictEntryRangeInto(s, rad(C.ENTRY_LIFT_ANGLE + limit), scratch, high);
  expect(low.reached && high.reached).toBe(true);
  // Independent forward forecast establishes a reachable interior target.
  const exactTrim = rad(direction * Math.PI / 180);
  predictEntryRangeInto(s, rad(C.ENTRY_LIFT_ANGLE + exactTrim), scratch, known);
  const out = createEntryPrediction();
  const trim = solveEntryRangeTrimInto(s, C.ENTRY_LIFT_ANGLE, known.downRange, rad(0), scratch, low, high, out);
  expect(out.reached).toBe(true);
  expect(Math.abs(out.downRange - known.downRange)).toBeLessThanOrEqual(100);
  expect(Math.abs(trim - exactTrim)).toBeLessThan(Math.PI / 1800);
  expect(Math.abs(trim)).toBeLessThanOrEqual(limit);
  for (const [endpoint, other, expected] of [[low, high, -limit], [high, low, limit]] as const) {
    const target = endpoint.downRange + Math.sign(endpoint.downRange - other.downRange) * 1_000_000;
    expect(solveEntryRangeTrimInto(s, C.ENTRY_LIFT_ANGLE, target, rad(0), scratch, low, high, out)).toBe(expected);
    expect(out.downRange).toBe(endpoint.downRange);
    expect(out.peakKelvin).toBe(endpoint.peakKelvin);
  }
});

it('keeps an orbital cap explicit when the range solver has no reachable bracket', () => {
  const s = createScenarioState(getScenario('deorbit')!);
  const scratch = createBurnScratch(), low = createEntryPrediction(), high = createEntryPrediction(), out = createEntryPrediction();
  predictEntryRangeInto(s, rad(C.ENTRY_LIFT_ANGLE - C.aeroDescentMaxCorrectionAngle), scratch, low);
  predictEntryRangeInto(s, rad(C.ENTRY_LIFT_ANGLE + C.aeroDescentMaxCorrectionAngle), scratch, high);
  expect(low.reached || high.reached).toBe(false);
  expect(solveEntryRangeTrimInto(s, C.ENTRY_LIFT_ANGLE, 1000, rad(0), scratch, low, high, out)).toBe(0);
  expect(out.reached).toBe(false);
  expect(Number.isNaN(out.time)).toBe(true);
});
