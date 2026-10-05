/** Forecast work is a deterministic, bounded physical guidance state machine;
 * wall-clock worker completion may never decide a flight's control commands. */
import { describe,expect,it } from 'vitest';
import { advanceBoosterPrediction } from '$core/control/booster-prediction';
import { advanceMechanics,step } from '$core/step';
import { runBoosterPolicy } from '$core/autopilot/booster';
import { createScenarioVehicle,PRESETS } from '$core/scenarios';
import { cloneState } from '$core/state';
import { createBoosterForecast } from '$core/control/booster-forecast';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { rad } from '$core/units';
import * as C from '$core/constants';

function sample(){
  const s=createScenarioVehicle(PRESETS.find(p=>p.id==='rtls')!,123).state;
  s.kinematics.altitude=500;s.kinematics.downRangeDistance=C.starBaseXPos;
  s.kinematics.pitch=rad(0);s.kinematics.angularVelocity=0;
  s.kinematics.speedX=0;s.kinematics.speedY=-50;
  s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='coast';s.autopilot.boosterFallTime=12;
  return s;
}
describe('bounded deterministic booster prediction',()=>{
  it('evaluates an executable duration before recording or forecasting the first paid candidate',()=>{
    const initial=createScenarioVehicle(PRESETS.find(p=>p.id==='rtls')!);initial.state.autopilot.autoLandOn=true;
    const job=step(initial.state,1/120,{},SUPER_HEAVY).autopilot.boosterPrediction!;
    expect(job.duration*120).toBe(Math.round(job.duration*120));
    expect(job.duration).toBe(job.rollout.burnRemaining); // no burn is paid during first alignment work
  });
  it('does not repeat a mapped live endpoint when a bracket contains no new executable interval',()=>{
    const s=sample();s.autopilot.boosterPhase='boostback';
    advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const j=s.autopilot.boosterPrediction!;
    const f=createBoosterForecast();f.reached=true;f.fuel=100000;f.rangeError=1;
    f.handoff={x:1,height:100,vx:0,vy:-20,time:10,lateralFeasible:false};
    j.low={...(j.origin.damage?{damageRevision:j.origin.damage.revision}:{}),originTime:0,burnDuration:5,shutdownAt:5,coastPitch:rad(0),forecast:f};
    j.high={...j.low,burnDuration:5+1/120,shutdownAt:6,forecast:{...f,rangeError:-1}};
    j.stage='validate';j.selected=j.low;j.rollout.done=true;j.rollout.state.failures.crashed=true;
    const count=j.iterations;
    advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    expect(s.autopilot.boosterPrediction!.done).toBe(true);
    expect(s.autopilot.boosterPrediction!.iterations).toBe(count);
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
  });

  it.each(['booster-sep','rtls'])('captures the complete returned live frame as the first planning source for %s',id=>{
    const initial=createScenarioVehicle(PRESETS.find(p=>p.id===id)!);
    initial.state.autopilot.autoLandOn=true;
    const first=step(initial.state,1/120,{},SUPER_HEAVY);
    const origin=first.autopilot.boosterPrediction!.origin;
    for(const key of ['world','vehicle','engines','rng','forces','kinematics','failures','status'] as const)
      expect(origin[key],key).toEqual(first[key]);
    expect(origin.autopilot.boosterPrediction).toBeUndefined();
  });
  it.each(['booster-sep','rtls'])('starts with a paid interior rather than spending the deadline on zero burn for %s',id=>{
    const initial=createScenarioVehicle(PRESETS.find(p=>p.id===id)!);initial.state.autopilot.autoLandOn=true;
    const first=step(initial.state,1/120,{},SUPER_HEAVY),job=first.autopilot.boosterPrediction!;
    expect(job.duration).toBeGreaterThan(0);expect(job.duration).toBeLessThan(job.upperDuration);
    expect(job.stage).toBe('upper');expect(job.low).toBeUndefined();expect(job.high).toBeUndefined();
    expect(first.autopilot.boosterReturnPlan).toBeUndefined();
  });
  it('fine-validates a retained physical bracket endpoint when no new live tick exists',()=>{
    const s=sample();s.autopilot.boosterPhase='boostback';
    advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const j=s.autopilot.boosterPrediction!,ready=cloneState(sample());
    ready.autopilot.boosterPhase='terminal';ready.autopilot.boosterCoastPitch=rad(0);
    const f=createBoosterForecast();f.reached=true;f.fuel=100000;f.rangeError=3;
    f.handoff={x:0,height:100,vx:0,vy:-20,time:10,lateralFeasible:true};
    j.low={...(j.origin.damage?{damageRevision:j.origin.damage.revision}:{}),originTime:0,burnDuration:5,shutdownAt:20,coastPitch:rad(0),forecast:f};
    j.high={...j.low,burnDuration:5+1/120,forecast:{...f,rangeError:-4}};
    j.lowReady=ready;j.highReady=cloneState(ready);
    j.stage='validate';j.selected={...j.low,burnDuration:4};
    j.rollout.done=true;j.rollout.state.failures.crashed=true;
    const before=JSON.stringify(ready),count=j.iterations;
    advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const next=s.autopilot.boosterPrediction!;
    expect(next.done).toBe(false);expect(next.stage).toBe('validate');
    expect(next.selected).toEqual(j.low);expect(next.terminalOrigin).toEqual(ready);
    let paidReady=cloneState(ready);
    for(let i=0;i<4;i++) {
      paidReady.autopilot.boosterFallTime=Math.max(2,(ready.autopilot.boosterFallTime ?? 900)-i/120);
      paidReady=advanceMechanics(paidReady,1/120,runBoosterPolicy,SUPER_HEAVY);
    }
    expect(next.rollout.result.steps).toBe(4);expect(next.rollout.state).toEqual(paidReady);
    expect(next.rollout.state).not.toBe(ready);expect(next.iterations).toBe(count);
    expect(JSON.stringify(ready)).toBe(before);expect(s.autopilot.boosterReturnPlan).toBeUndefined();
  });
  it('transports a boost forecast with its measured paid-burn range rate, not ballistic fall time',()=>{
    const s=sample();s.autopilot.boosterPhase='boostback';
    advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const f=createBoosterForecast();f.rangeError=1000;f.time=100;f.reached=true;
    const published={originTime:s.world.environmentTime,originX:s.kinematics.downRangeDistance,
      originVX:100,forecast:f,burnRangeRate:-200};
    s.autopilot.boosterPrediction!.published=published;
    s.world.environmentTime+=1;s.kinematics.downRangeDistance+=100;s.kinematics.speedX=90;
    advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    // The measured mechanical response includes powered entry/terminal range
    // feedback.100s of remainingfall is not its velocity sensitivity.
    expect(s.autopilot.boosterRangeError).toBe(800);
  });
  it('keeps telemetry phase-invariant and cannot authorize a cutoff from an injected old derivative',()=>{
    const s=sample();advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const f=createBoosterForecast();f.rangeError=1000;f.time=100;f.reached=true;
    s.autopilot.boosterPrediction!.published={originTime:0,originX:s.kinematics.downRangeDistance,
      originVX:100,forecast:f,burnRangeRate:-200};
    s.world.environmentTime=1;s.autopilot.boosterPhase='boostback';
    advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const error=s.autopilot.boosterRangeError;
    s.autopilot.boosterPhase='coast';
    advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    expect(s.autopilot.boosterRangeError).toBe(error);
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
  });
  it('searches a paid interior when the zero-burn candidate is physically invalid',()=>{
    const s=sample();s.autopilot.boosterPhase='align-boost';
    const reject:typeof advanceMechanics=(previous,dt)=>{
      const next=cloneState(previous);next.world.environmentTime+=dt;
      next.failures.inFlightBreakUp=true;next.vehicle.propellantMass=0;return next;
    };
    advanceBoosterPrediction(s,1/120,reject,runBoosterPolicy,SUPER_HEAVY);
    expect(s.autopilot.boosterPrediction!.done).toBe(false);
    expect(s.autopilot.boosterPrediction!.duration).toBeGreaterThan(0);
    expect(s.autopilot.boosterPrediction!.low).toBeUndefined();
    expect(s.autopilot.boosterPrediction!.high).toBeUndefined();
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
    expect(s.failures.inFlightBreakUp).toBe(false);
  });
  it('uses a failed underburn only to probe a larger interior, never as a valid bracket',()=>{
    const s=sample();s.autopilot.boosterPhase='boostback';
    s.kinematics.downRangeDistance=C.starBaseXPos+100;
    advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const j=s.autopilot.boosterPrediction!;
    j.stage='upper';j.duration=j.upperDuration/4;
    j.rollout.done=true;j.rollout.result.failed=true;
    j.rollout.result.reached=false;j.rollout.result.rangeError=1000;
    const previousDuration=j.duration;
    advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const next=s.autopilot.boosterPrediction!;
    expect(next.duration).toBeGreaterThan(previousDuration);
    expect(next.duration).toBeLessThan(next.upperDuration);
    expect(next.low).toBeUndefined();expect(next.high).toBeUndefined();
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
  });
  it('measures the first paid response at the nearest executable live tick, not another ignition-delay burn',()=>{
    const s=sample();s.autopilot.boosterPhase='boostback';
    advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const j=s.autopilot.boosterPrediction!;
    const f=createBoosterForecast();f.reached=true;f.fuel=100000;f.rangeError=200;
    f.handoff={x:1000,height:2000,vx:0,vy:-200,time:20,lateralFeasible:false};
    j.stage='upper';j.duration=4;j.firstDuration=4;j.upperDuration=12;
    j.rollout.done=true;j.rollout.result=f;j.rollout.shutdownAt=4;
    advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    expect(s.autopilot.boosterPrediction!.duration).toBe((4*120+1)/120);
    expect(s.autopilot.boosterPrediction!.high).toBeUndefined();
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
  });
  it('proposes an interior from two valid same-source responses before spending a wide probe',()=>{
    const s=sample();s.autopilot.boosterPhase='boostback';
    advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const j=s.autopilot.boosterPrediction!;
    const f=createBoosterForecast();f.reached=true;f.fuel=100000;f.rangeError=1000;
    f.handoff={x:1000,height:2000,vx:0,vy:-200,time:20,lateralFeasible:false};
    j.low={...(j.origin.damage?{damageRevision:j.origin.damage.revision}:{}),originTime:j.origin.world.environmentTime,burnDuration:0,shutdownAt:0,coastPitch:rad(0),forecast:f};
    j.stage='upper';j.duration=4;j.firstDuration=4;j.upperDuration=12;
    j.rollout.done=true;j.rollout.result={...f,rangeError:200};j.rollout.shutdownAt=4;
    advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    expect(s.autopilot.boosterPrediction!.duration).toBe(5);
    expect(s.autopilot.boosterPrediction!.high).toBeUndefined();
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
  });
  it('cannot publish a numerical candidate before fine validation of its original paid ready input',()=>{
    const s=sample();advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const j=s.autopilot.boosterPrediction!,ready=cloneState(j.rollout.state);
    delete ready.autopilot.boosterForecastHandoff;
    const f=createBoosterForecast();f.reached=true;f.fuel=100000;f.rangeError=0;
    f.handoff={x:0,height:100,vx:0,vy:-20,time:10,lateralFeasible:true};
    j.origin.autopilot.boosterPhase='boostback';
    j.stage='upper';j.duration=5;j.rollout.done=true;
    j.rollout.state=cloneState(ready);j.rollout.result=f;j.rollout.shutdownAt=5;
    advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const next=s.autopilot.boosterPrediction!;
    expect(next.stage).toBe('validate');expect(next.rollout.step).toBe(1/120);
    expect(next.terminalOrigin).toEqual(ready);
    let paidReady=cloneState(ready);
    for(let i=0;i<4;i++) {
      paidReady.autopilot.boosterFallTime=Math.max(2,(ready.autopilot.boosterFallTime ?? 900)-i/120);
      paidReady=advanceMechanics(paidReady,1/120,runBoosterPolicy,SUPER_HEAVY);
    }
    expect(next.rollout.result.steps).toBe(4);expect(next.rollout.state).toEqual(paidReady);
    expect(next.rollout.state).not.toBe(ready);
    expect(next.rollout.state.status.landed).toBe(false);
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
  });
  it('retains fine validation of a supported nonzero candidate at the iteration cap',()=>{
    const s=sample();advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const j=s.autopilot.boosterPrediction!;j.origin.autopilot.boosterPhase='boostback';
    j.stage='upper';j.duration=5;j.iterations=16;j.rollout.done=true;
    const f=createBoosterForecast();f.reached=true;f.fuel=100000;f.rangeError=100;
    f.handoff={x:0,height:100,vx:0,vy:-20,time:10,lateralFeasible:true};
    j.rollout.result=f;j.rollout.shutdownAt=5;
    advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    expect(s.autopilot.boosterPrediction!.stage).toBe('validate');
    expect(s.autopilot.boosterPrediction!.rollout.step).toBe(1/120);
    expect(s.autopilot.boosterPrediction!.selected!.forecast.rangeError).toBe(100);
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
  });
  it('preserves a valid paid bracket when a proposed terminal replay fails',()=>{
    const s=sample();s.autopilot.boosterPhase='boostback';
    advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const j=s.autopilot.boosterPrediction!;
    const f=createBoosterForecast();f.reached=true;f.fuel=100000;f.rangeError=141;
    f.handoff={x:0,height:100,vx:0,vy:-20,time:10,lateralFeasible:true};
    const low={...(j.origin.damage?{damageRevision:j.origin.damage.revision}:{}),originTime:0,burnDuration:5,shutdownAt:5,coastPitch:rad(0),forecast:f};
    const high={...low,burnDuration:6,shutdownAt:6,forecast:{...f,rangeError:-600}};
    j.stage='validate';j.low=low;j.high=high;j.selected=low;
    j.rollout.done=true;j.rollout.state.failures.crashed=true;
    advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const next=s.autopilot.boosterPrediction!;
    expect(next.done).toBe(false);expect(next.stage).toBe('root');
    expect(next.low).toEqual(low);expect(next.high).toEqual(high);
    expect(s.autopilot.boosterReturnPlan).toBeUndefined();
  });
  it('limits each live step to four shared mechanical forecast advances, without spending real fuel or RNG',()=>{
    const s=sample(),before=cloneState(s);let calls=0;
    const advance:typeof advanceMechanics=(...args)=>{calls++;return advanceMechanics(...args);};
    advanceBoosterPrediction(s,1/120,advance,runBoosterPolicy,SUPER_HEAVY);
    expect(calls).toBe(4);
    expect(s.vehicle).toEqual(before.vehicle);expect(s.engines).toEqual(before.engines);expect(s.rng).toEqual(before.rng);
    expect(s.autopilot.boosterPrediction?.rollout.state.autopilot.boosterPrediction).toBeUndefined();
  });
  it('does not mutate a prediction shared by a cloned previous frame and deterministically publishes a completed result',()=>{
    const a=sample();advanceBoosterPrediction(a,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    const old=JSON.stringify(a.autopilot.boosterPrediction);
    const b=cloneState(a);advanceBoosterPrediction(b,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    expect(JSON.stringify(a.autopilot.boosterPrediction)).toBe(old);
    const c=cloneState(a);advanceBoosterPrediction(c,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
    expect(c).toEqual(b);
    let work=0;
    const countedAdvance:typeof advanceMechanics=(...args)=>{work++;return advanceMechanics(...args);};
    for(let i=0;i<4000 && work<4000 && !b.autopilot.boosterPrediction?.published;i++) {
      const before=work;
      advanceBoosterPrediction(b,1/120,countedAdvance,runBoosterPolicy,SUPER_HEAVY);
      expect(work-before).toBeLessThanOrEqual(4);
    }
    expect(work).toBeLessThanOrEqual(4000);
    const result=b.autopilot.boosterPrediction?.published;
    expect(result).toBeDefined();expect(result!.forecast.reached).toBe(true);
    expect(result!.forecast.fuel).toBeLessThan(a.vehicle.propellantMass);
    expect(b.rng).toEqual(a.rng);
  });
});
