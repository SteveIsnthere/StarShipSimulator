/** Search-only witnesses. Synthetic endpoints prove proposal/scheduling rules;
 * they never establish real paid capture or source-matched cutoff authority. */
import { describe, expect, it } from 'vitest';
import { proposeBoosterProbe, type BoosterBurnCandidate } from '$core/control/booster-return-plan';
import { advanceBoosterPrediction, type BoosterPrediction } from '$core/control/booster-prediction';
import { createBoosterReadyWork } from '$core/control/booster-forecast';
import { createInitialState, cloneState } from '$core/state';
import { advanceMechanics } from '$core/step';
import { runBoosterPolicy } from '$core/autopilot/booster';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { rad } from '$core/units';

function endpoint(duration:number,range:number):BoosterBurnCandidate {
  return {originTime:0,damageRevision:0,sourceLineage:1,burnDuration:duration,shutdownAt:duration,
    coastPitch:rad(0),forecast:{reached:true,failed:false,rangeError:range,time:100,fuel:10000,
      speedX:0,speedY:-20,pitch:0,steps:100,ignitionDraws:0,
      handoff:{x:range,height:100,vx:0,vy:-20,time:10,lateralFeasible:false}}};
}
describe('same-source bidirectional adjacent probes',()=>{
  it('preserves the forward positive-side contract and mirrors a negative high',()=>{
    // f(t)=100−10t has the independent root10s on either side.
    expect(proposeBoosterProbe(endpoint(8,20),endpoint(9,10),20)).toBe(10);
    expect(proposeBoosterProbe(endpoint(12,-20),endpoint(11,-10),20)).toBe(10);
  });
  it('keeps a backward proposal strictly inside its available lower bound',()=>{
    expect(proposeBoosterProbe(endpoint(12,-20),endpoint(11,-10),20,9)).toBe(10);
    expect(proposeBoosterProbe(endpoint(12,-20),endpoint(11,-10),20,10)).toBeUndefined();
    expect(proposeBoosterProbe(endpoint(8,20),endpoint(9,10),10)).toBeUndefined();
  });
  it('rejects wrong direction, duplicate tick, bracketed and flat responses',()=>{
    expect(proposeBoosterProbe(endpoint(12,-20),endpoint(11,-30),20)).toBeUndefined();
    expect(proposeBoosterProbe(endpoint(12,-20),endpoint(12,-10),20)).toBeUndefined();
    expect(proposeBoosterProbe(endpoint(12,-20),endpoint(11,10),20)).toBeUndefined();
    expect(proposeBoosterProbe(endpoint(12,-20),endpoint(11,-20),20)).toBeUndefined();
  });
  it('rejects mismatched provenance and invalid physical endpoint status without mutation',()=>{
    const first=endpoint(12,-20),second=endpoint(11,-10),before=structuredClone(first);
    for(const other of [
      {...second,originTime:1},{...second,damageRevision:1},{...second,sourceLineage:2},
      {...second,coastPitch:rad(.1)},
      {...second,forecast:{...second.forecast,failed:true}},
      {...second,forecast:{...second.forecast,reached:false}},
      {...second,forecast:{...second.forecast,fuel:0}},
      {...second,forecast:{...second.forecast,rangeError:NaN}},
    ])expect(proposeBoosterProbe(first,other,20)).toBeUndefined();
    expect(first).toEqual(before);
  });
});

describe('first signed endpoint schedules bounded local work',()=>{
  for(const negative of [false,true])it(`probes one adjacent executable tick: first ${negative?'high':'low'}`,()=>{
    const s=createInitialState(123,SUPER_HEAVY);s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='boostback';
    s.autopilot.boosterRangeError=100;
    const origin=cloneState(s),rollout=createBoosterReadyWork(origin,rad(0),10);
    rollout.done=true;rollout.shutdownAt=10;
    rollout.result={...endpoint(10,negative?-100:100).forecast,fuel:s.vehicle.propellantMass};
    const job:BoosterPrediction={origin,rollout,stage:'upper',duration:10,firstDuration:10,
      lowerDuration:0,upperDuration:20,iterations:1,attemptedTicks:[1200],done:false};
    s.autopilot.boosterPrediction=job;
    const before=cloneState(s);
    expect(advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY)).toBe(4);
    expect(s.autopilot.boosterPrediction!.duration).toBe((1200+(negative?-1:1))/120);
    expect(s.autopilot.boosterPrediction!.iterations).toBe(2);
    expect(s.autopilot.boosterPrediction!.attemptedTicks).toHaveLength(2);
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
    expect(job).toEqual(before.autopilot.boosterPrediction);
  });
});
