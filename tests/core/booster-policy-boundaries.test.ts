/** Return boundaries must retain real authority and reject impossible work,
 * rather than manufacture an engine command or capture from diagnostics. */
import { describe, expect, it } from 'vitest';
import { cloneState, createInitialState } from '$core/state';
import { SUPER_HEAVY, CATCH } from '$core/vehicles/super-heavy';
import { runBoosterAutopilot, runBoosterPolicy, runBoosterPostStep } from '$core/autopilot/booster';
import { advanceMechanics } from '$core/step';
import { IGNITION_DELAY_MAX_S } from '$core/physics/engines';
import { createBurnScratch, createFallResult, unpoweredFallInto } from '$core/control/guidance-physics';
import { rad } from '$core/units';
import * as C from '$core/constants';
const DT = 1 / 120;
function booster(altitude = 1000) {
  const s = createInitialState(123, SUPER_HEAVY);
  s.kinematics.altitude = altitude; s.kinematics.distanceToPlanetCenter = C.planetRadius + altitude;
  s.kinematics.downRangeDistance = C.starBaseXPos;
  s.kinematics.pitch = rad(0); s.kinematics.speedX = 0; s.kinematics.speedY = -20;
  s.status.onTheGround = false; s.autopilot.autoLandOn = true;
  return s;
}
describe('forecast-free return policy boundaries', () => {
  it.each(['manual', 'inactive', 'boostback-only'] as const)('respects operator mode %s', mode => {
    const s = booster();
    s.autopilot.boosterFinControl = 30;
    s.autopilot.pitchControl = 25;
    if (mode === 'manual') s.autopilot.manualControlOn = true;
    if (mode !== 'manual') s.autopilot.autoLandOn = false;
    if (mode === 'boostback-only') s.autopilot.autoBoostBackOn = true;
    const before = cloneState(s);
    runBoosterPolicy(s, DT, SUPER_HEAVY);
    if (mode === 'boostback-only') {
      expect(s.autopilot.boosterPhase).toBe('align-boost');
      expect(s.status.translationModeOn).toBe(true);
    } else {
      expect(s.autopilot.boosterFinControl).toBeUndefined();
      expect(s.autopilot.pitchControl).toBe(25);
      expect(s.vehicle).toEqual(before.vehicle); expect(s.engines).toEqual(before.engines);
    }
  });
  it.each(['landed', 'crashed', 'inFlightBreakUp'] as const)('cannot command a secured or failed %s body', terminal => {
    const s = booster();
    if (terminal === 'landed') s.status.landed = true; else s.failures[terminal] = true;
    const before = cloneState(s);
    runBoosterPolicy(s, DT, SUPER_HEAVY);
    expect(s).toEqual(before);
  });
  it('uses aerodynamic authority with no fictitious RCS once cold gas is exhausted', () => {
    const s = booster(15_000); s.autopilot.boosterPhase = 'coast';
    s.vehicle.rcsRunTimeRemaining = 0; s.kinematics.pitch = rad(.1);
    runBoosterPolicy(s, DT, SUPER_HEAVY);
    expect(s.status.rcsActive).toBe(false); expect(s.autopilot.rcsThrustCommand).toBe(0);
    expect(s.autopilot.boosterFinControl).toBeDefined();
    expect(s.engines.running.some(Boolean)).toBe(false);
  });
  it('leaves entry and shuts propulsion when descent has reversed', () => {
    const s = booster(15_000); s.autopilot.boosterPhase = 'entry'; s.kinematics.speedY = 1;
    s.engines.running.fill(true, 0, 13);
    runBoosterPolicy(s, DT, SUPER_HEAVY);
    expect(s.autopilot.boosterPhase).toBe('coast');
    expect(s.engines.running.some(Boolean)).toBe(false);
    expect(s.engines.ignitionCountdown.every(value => value === null)).toBe(true);
  });
  it('rejects terminal ignition still pending beyond the real maximum delay', () => {
    const s = booster(500); s.autopilot.boosterPhase = 'terminal';
    s.autopilot.boosterTerminalIgnitionTime = 0;
    s.world.environmentTime = IGNITION_DELAY_MAX_S + 3 * DT;
    s.engines.ignitionCountdown.fill(.1, 0, 3);
    runBoosterPolicy(s, DT, SUPER_HEAVY);
    expect(s.autopilot.boosterTerminalMissed).toBe(true);
    expect(s.engines.running.some(Boolean)).toBe(false);
    expect(s.engines.ignitionCountdown.every(value => value === null)).toBe(true);
    expect(s.status.landed).toBe(false);
  });
});
describe('force-only return diagnostics', () => {
  it('proposes a bounded coast correction from two actual force forecasts and caches only telemetry', () => {
    const s = booster(15_000); s.kinematics.downRangeDistance += 100;
    s.autopilot.boosterPhase = 'coast'; s.kinematics.speedY = -100;
    const scratch = createBurnScratch(), fall = createFallResult();
    unpoweredFallInto(s, CATCH.bodyCentreAltitude, scratch, fall, SUPER_HEAVY, rad(0));
    expect(fall.reached).toBe(true);
    const error = 100 + fall.downRange;
    unpoweredFallInto(s, CATCH.bodyCentreAltitude, scratch, fall, SUPER_HEAVY, rad(.05)); const plus = fall.downRange;
    unpoweredFallInto(s, CATCH.bodyCentreAltitude, scratch, fall, SUPER_HEAVY, rad(-.05)); const minus = fall.downRange;
    const slope = (plus - minus) / .1;
    expect(Math.abs(slope)).toBeGreaterThan(1);
    runBoosterAutopilot(s, DT, SUPER_HEAVY);
    expect(s.autopilot.boosterCoastPitch).toBe(Math.max(-.2, Math.min(.2, -error / slope)));
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
    const correction = s.autopilot.boosterCoastPitch;
    s.kinematics.downRangeDistance += 100;
    runBoosterAutopilot(s, DT, SUPER_HEAVY);
    expect(s.autopilot.boosterCoastPitch).toBe(correction);
  });
  it('keeps a zero-range plane diagnostic neutral and resolves a near-cutoff diagnostic at the actual dt', () => {
    const s = booster(CATCH.bodyCentreAltitude); s.kinematics.speedY = 0; s.autopilot.boosterPhase = 'coast';
    runBoosterAutopilot(s, DT, SUPER_HEAVY);
    expect(s.autopilot.boosterCoastPitch).toBe(0);
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
    s.autopilot.boosterPredictorCountdown = 0; s.autopilot.boosterPhase = 'boostback';
    runBoosterAutopilot(s, DT, SUPER_HEAVY);
    expect(s.autopilot.boosterPredictorCountdown).toBe(DT);
    expect(s.autopilot.boosterPhase).toBe('boostback');
  });
  it('does not advertise an unreached high-vacuum fall as a plan with or without mechanical prediction', () => {
    const s = booster(1e9); s.kinematics.speedY = 0; s.autopilot.boosterPhase = 'boostback';
    runBoosterAutopilot(s, DT, SUPER_HEAVY);
    expect(s.autopilot.boosterRangeError).toBeUndefined();
    expect(s.autopilot.boosterFallTime).toBeUndefined();
    expect(s.autopilot.boosterPredictorCountdown).toBe(.25);
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
    runBoosterPostStep(s, DT, SUPER_HEAVY, advanceMechanics);
    expect(s.autopilot.boosterPrediction!.published).toBeUndefined();
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
  });
});
