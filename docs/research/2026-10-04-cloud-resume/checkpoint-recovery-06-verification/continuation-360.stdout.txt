import { describe, expect, it } from 'vitest';
import { createInitialState, cloneState } from '$core/state';
import { SUPER_HEAVY, RETURN_ENGINES } from '$core/vehicles/super-heavy';
import { advanceBoosterPrediction } from '$core/control/booster-prediction';
import { runBoosterPolicy, alignBooster } from '$core/autopilot/booster';
import { damageModelFor } from '$core/physics/damage-model';
import { acceptBoosterReturnPlan, proposeBoosterBurn } from '$core/control/booster-return-plan';
import { rad } from '$core/units';

function live() {
  const s = createInitialState(123, SUPER_HEAVY);
  s.autopilot.autoBoostBackOn = true;
  s.autopilot.manualControlOn = false;
  s.autopilot.boosterPhase = 'boostback';
  s.autopilot.boosterFallTime = 100;
  s.autopilot.boosterRangeError = 1000;
  s.kinematics.altitude = 10000;
  return s;
}
const idleAdvance = (s: ReturnType<typeof live>) => cloneState(s);
const idlePolicy = () => {};

describe('damage forecast source ownership', () => {
  it('restarts a pending source epoch before paying more forecast work', () => {
    const s = live();
    advanceBoosterPrediction(s, 1/120, idleAdvance, idlePolicy, SUPER_HEAVY);
    const old = s.autopilot.boosterPrediction!;
    s.damage!.revision++;
    advanceBoosterPrediction(s, 1/120, idleAdvance, idlePolicy, SUPER_HEAVY);
    expect(s.autopilot.boosterPrediction!.origin.damage!.revision).toBe(s.damage!.revision);
    expect(old.origin.damage!.revision).toBe(0);
    expect(s.autopilot.boosterPrediction!.origin.damage).not.toBe(s.damage);
  });

  it('does not restart owned work merely because the live root warms', () => {
    const s = live(); let calls = 0;
    const advance = (input: typeof s) => { calls++; return cloneState(input); };
    advanceBoosterPrediction(s, 1/120, advance, idlePolicy, SUPER_HEAVY);
    const origin = s.autopilot.boosterPrediction!.origin;
    s.damage!.components[0]!.root.temperature += 1;
    advanceBoosterPrediction(s, 1/120, advance, idlePolicy, SUPER_HEAVY);
    expect(s.autopilot.boosterPrediction!.origin).toBe(origin);
    expect(origin.damage!.components[0]!.root.temperature).not.toBe(s.damage!.components[0]!.root.temperature);
    expect(calls).toBe(8);
  });

  it('revokes stale cutoff and coast authority before executing policy', () => {
    const s = live();
    s.autopilot.boosterReturnPlan = { originTime: 0, shutdownAt: 0, coastPitch: rad(.1),
      handoff: { x:0, height:100, vx:0, vy:-20, time:10, lateralFeasible:true }, damageRevision: 0 };
    s.autopilot.boosterCoastPitch = rad(.1);
    s.autopilot.boosterForecastReached = true;
    s.damage!.revision++;
    runBoosterPolicy(s, 1/120, SUPER_HEAVY);
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
    expect(s.autopilot.boosterCoastPitch).toBeUndefined();
    expect(s.autopilot.boosterForecastReached).toBeUndefined();
    expect(s.autopilot.boosterPhase).toBe('boostback');
    expect(RETURN_ENGINES.some(i => s.engines.ignitionCountdown[i] !== null)).toBe(true);
  });

  it('rejects live cutoff authority without damage provenance', () => {
    const s = live();
    s.autopilot.boosterReturnPlan = { originTime:0, shutdownAt:0, coastPitch:rad(0),
      handoff:{x:0,height:100,vx:0,vy:-20,time:10,lateralFeasible:true} };
    runBoosterPolicy(s,1/120,SUPER_HEAVY);
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
    expect(s.autopilot.boosterPhase).toBe('boostback');
  });

  it('cannot publish a candidate whose topology differs from its retained source', () => {
    const s = live();
    advanceBoosterPrediction(s,1/120,idleAdvance,idlePolicy,SUPER_HEAVY);
    const j = s.autopilot.boosterPrediction!;
    j.stage = 'validate'; j.rollout.done = true;
    j.rollout.state.status.landed = true; j.rollout.state.status.onTheGround = false;
    j.selected = { originTime:0, burnDuration:1, shutdownAt:10, coastPitch:rad(0), damageRevision:1,
      forecast:{...j.rollout.result, reached:true, failed:false, fuel:100,
        handoff:{x:0,height:100,vx:0,vy:-20,time:10,lateralFeasible:true}} };
    advanceBoosterPrediction(s,1/120,idleAdvance,idlePolicy,SUPER_HEAVY);
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
    expect(s.autopilot.boosterPrediction!.published).toBeUndefined();
  });

  it('does not combine candidate brackets from different damage epochs', () => {
    const forecast = { reached:true, failed:false, fuel:100, rangeError:1, time:20,
      speedX:0, speedY:-1, pitch:0, steps:1, ignitionDraws:0,
      handoff:{x:0,height:100,vx:0,vy:-1,time:10,lateralFeasible:true} };
    const low = { originTime:0, burnDuration:1, shutdownAt:10, coastPitch:rad(0), forecast, damageRevision:2 };
    const high = { ...low, burnDuration:2, forecast:{...forecast,rangeError:-1}, damageRevision:3 };
    expect(proposeBoosterBurn(low, high)).toBeUndefined();
    expect(acceptBoosterReturnPlan(low,true,0)!.damageRevision).toBe(2);
  });

  it('gives removed grids no alignment authority and leaves proposed probes read-only', () => {
    const s = live();
    damageModelFor(SUPER_HEAVY).partition.components.forEach((c, i) => {
      if (c.kind === 'grid-fin') s.damage!.components[i]!.attached = false;
    });
    s.kinematics.speedY = -100;
    s.kinematics.pitch = rad(.2);
    s.atmosphere.airDensity = 1;
    s.forces.thrust = 0;
    s.vehicle.frontFinExtension = 100;
    const before = structuredClone(s.damage);
    alignBooster(s, rad(0), 1.5, SUPER_HEAVY);
    expect(s.autopilot.boosterFinControl).toBe(0);
    expect(s.damage).toEqual(before);
  });
});
