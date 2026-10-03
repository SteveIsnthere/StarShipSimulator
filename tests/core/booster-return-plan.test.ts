/** Decision provenance/validity is separate from raw forecast telemetry. */
import { describe, expect, it } from 'vitest';
import { proposeBoosterBurn, proposeBoosterRefinement, acceptBoosterReturnPlan } from '$core/control/booster-return-plan';
import { createBoosterForecast } from '$core/control/booster-forecast';
import { rad } from '$core/units';

function candidate(duration:number,error:number,origin=10) {
  const forecast=createBoosterForecast();
  forecast.reached=true; forecast.rangeError=error;forecast.fuel=100000;
  forecast.handoff={x:error,height:109.5,vx:0,vy:-20,time:10,lateralFeasible:true};
  return {originTime:origin,burnDuration:duration,shutdownAt:origin+duration,coastPitch:rad(0),forecast};
}
describe('source-consistent paid booster return decisions',()=>{
  it('proposes a paid continuation strictly inside a mechanically observed sign bracket',()=>{
    const low=candidate(2,800),high=candidate(6,-800);
    expect(proposeBoosterBurn(low,high)).toBe(4);
  });
  it('uses recent valid responses only for a proposal strictly inside the unchanged physical bracket',()=>{
    const low=candidate(2,1000),high=candidate(3,-100),previous=candidate(4,-400);
    const saved=JSON.stringify([low,high,previous]);
    expect(proposeBoosterRefinement(previous,high,low,high)).toBeCloseTo(8/3,14);
    expect(proposeBoosterRefinement({...previous,originTime:11},high,low,high)).toBeUndefined();
    expect(proposeBoosterRefinement(candidate(4,-101),high,low,high)).toBeUndefined();
    expect(proposeBoosterRefinement(previous,high,low,candidate(3,100))).toBeUndefined();
    expect(JSON.stringify([low,high,previous])).toBe(saved);
    expect(acceptBoosterReturnPlan(high,false,0)).toBeUndefined();
  });
  it('rejects mixed origins, failed/non-reaching and unbracketed candidates',()=>{
    const low=candidate(2,800),high=candidate(6,-800);
    expect(proposeBoosterBurn(low,{...high,originTime:11})).toBeUndefined();
    expect(proposeBoosterBurn(low,candidate(6,100))).toBeUndefined();
    high.forecast.failed=true;expect(proposeBoosterBurn(low,high)).toBeUndefined();
    high.forecast.failed=false;high.forecast.reached=false;
    expect(proposeBoosterBurn(low,high)).toBeUndefined();
  });
  it('admits a supported nonzero handoff only after actual terminal validation',()=>{
    const c=candidate(6,141.37314675606575);
    c.forecast.handoff={x:-123.56940898299217,height:2485.8666152310698,
      vx:26.058477937235978,vy:-242.4979069791646,time:20.33446131252901,lateralFeasible:true};
    expect(acceptBoosterReturnPlan(c,false,12)).toBeUndefined();
    expect(acceptBoosterReturnPlan(c,true,12)?.shutdownAt).toBe(16);
  });
  it('requires terminal validation, an in-envelope handoff and an unexpired actual shutdown before publication',()=>{
    const c=candidate(6,0);
    expect(acceptBoosterReturnPlan(c,false,12)).toBeUndefined();
    c.forecast.handoff!.lateralFeasible=false;
    expect(acceptBoosterReturnPlan(c,true,12)).toBeUndefined();
    c.forecast.handoff!.lateralFeasible=true;
    expect(acceptBoosterReturnPlan(c,true,16)).toBeUndefined();
    c.forecast.failed=true;expect(acceptBoosterReturnPlan(c,true,12)).toBeUndefined();
    c.forecast.failed=false;
    const plan=acceptBoosterReturnPlan(c,true,12)!;
    expect(plan.shutdownAt).toBe(16);expect(plan.originTime).toBe(10);
    expect(plan.coastPitch).toBe(0);
    // Phase/raw range/derivative changes cannot reinterpret a paid deadline.
    c.forecast.rangeError=9000;
    expect(plan.shutdownAt).toBe(16);
  });
});
