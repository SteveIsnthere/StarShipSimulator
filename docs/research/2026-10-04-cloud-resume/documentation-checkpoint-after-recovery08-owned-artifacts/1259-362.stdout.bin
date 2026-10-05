/** Synthetic search contracts only; these endpoints never claim physical flight. */
import {describe,it,expect} from 'vitest';
import {createInitialState,cloneState} from '$core/state';
import {SUPER_HEAVY} from '$core/vehicles/super-heavy';
import {rad} from '$core/units';
import {advanceMechanics} from '$core/step';
import {runBoosterPolicy} from '$core/autopilot/booster';
import {advanceBoosterPrediction,type BoosterPrediction} from '$core/control/booster-prediction';
import {createUnpoweredFallWork} from '$core/control/guidance-physics';
import {createBoosterReadyWork} from '$core/control/booster-forecast';
import type {BoosterBurnCandidate} from '$core/control/booster-return-plan';
function fixture(duration:number,range:number){
 const s=createInitialState(123,SUPER_HEAVY);s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='boostback';s.autopilot.boosterRangeError=100;
 const origin=cloneState(s);
 function candidate(d:number,r:number):BoosterBurnCandidate{return{...(origin.damage?{damageRevision:origin.damage.revision}:{}),originTime:origin.world.environmentTime,
  burnDuration:d,shutdownAt:d+20,coastPitch:rad(0),forecast:{reached:true,failed:false,fuel:100000,rangeError:r,time:100,pitch:0,
   steps:100,ignitionDraws:0,speedX:0,speedY:-20,handoff:{x:0,height:100,vx:0,vy:-20,time:10,lateralFeasible:true}}};}
 const rollout=createBoosterReadyWork(origin,rad(0),duration);rollout.done=true;rollout.shutdownAt=duration+20;rollout.result=candidate(duration,range).forecast;
 const job:BoosterPrediction&{bracketRefined?:boolean}={origin,rollout,stage:'upper',duration,firstDuration:duration,
  lowerDuration:0,upperDuration:20,iterations:1,attemptedTicks:[Math.round(duration*120)],done:false};
 s.autopilot.boosterPrediction=job;return{s,job,candidate};
}
describe('first physical bracket interior priority',()=>{
 it('pays one executable interior before fine proof of the new sign endpoint',()=>{
  const {s,job,candidate}=fixture(10,20);job.high=candidate(12,-10);job.highReady=cloneState(job.rollout.state);
  job.hintTried=true;job.hintRefined=true;job.iterations=3;job.attemptedTicks=[1440,1200];
  const before=JSON.stringify(job);
  expect(advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY)).toBe(4);
  const next=s.autopilot.boosterPrediction!;
  expect(next.stage).toBe('root');expect(next.duration).toBeGreaterThan(10);expect(next.duration).toBeLessThan(12);
  expect(next.iterations).toBe(4);expect(s.autopilot.boosterReturnPlan).toBeUndefined();expect(JSON.stringify(job)).toBe(before);
 });
 it('preserves fine priority for a supported unbracketed first endpoint before hint work',()=>{
  const {s,job}=fixture(12,-10);
  job.rollout.prefix={origin:job.origin,state:cloneState(job.origin),time:1,steps:1,advance:advanceMechanics,policy:runBoosterPolicy,
   model:SUPER_HEAVY,coastPitch:rad(0),initialTime:100,boostSteps:0,steadySteps:1,cutoffClock:1};
  advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
  const next=s.autopilot.boosterPrediction!;
  expect(next.stage).toBe('validate');expect(next.iterations).toBe(1);expect(next.hintScores).toBeUndefined();
  expect(next.rollout.step).toBe(1/120);expect(s.autopilot.boosterReturnPlan).toBeUndefined();
 });
 it('retains actual fine proof when no strictly interior live tick exists',()=>{
  const {s,job,candidate}=fixture(10+1/120,-1);job.low=candidate(10,1);job.lowReady=cloneState(job.rollout.state);
  job.hintTried=true;job.hintRefined=true;job.attemptedTicks=[1200,1201];
  advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
  expect(s.autopilot.boosterPrediction!.stage).toBe('validate');expect(s.autopilot.boosterReturnPlan).toBeUndefined();
 });
 it('does not keep postponing fine proof after the first bracket interior',()=>{
  const {s,job,candidate}=fixture(11,-1);job.low=candidate(10,1);job.lowReady=cloneState(job.rollout.state);
  job.hintTried=true;job.hintRefined=true;job.bracketRefined=true;job.attemptedTicks=[1200,1320];
  advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
  expect(s.autopilot.boosterPrediction!.stage).toBe('validate');expect(s.autopilot.boosterReturnPlan).toBeUndefined();
 });
 it('owns the resumed hint numeric state and charges at most512 midpoint iterations per live tick',()=>{
  const {s,job,candidate}=fixture(12,-10);job.stage='hint';job.hintAnchor=candidate(12,-10);
  job.hintDurations=[11.95,12.05];job.duration=11.95;job.hintScores=[];
  const held=cloneState(job.rollout.state);held.kinematics.altitude=60000;held.kinematics.speedX=0;held.kinematics.speedY=7000;
  job.hintFallWork=createUnpoweredFallWork(held,50,SUPER_HEAVY,rad(0));
  const before=JSON.stringify(job);let calls=0;
  const advance:typeof advanceMechanics=(state,dt,control,model)=>{calls++;return advanceMechanics(state,dt,control,model);};
  expect(advanceBoosterPrediction(s,1/120,advance,runBoosterPolicy,SUPER_HEAVY)).toBe(0);
  const next=s.autopilot.boosterPrediction!;
  expect(calls).toBe(0);expect(next.hintForceIterations).toBe(512);expect(next.hintForceSlices).toBe(1);
  expect(next.hintFallWork!.steps).toBe(512);expect(next.hintFallWork).not.toBe(job.hintFallWork);
  expect(next.stage).toBe('hint');expect(next.hintScores).toEqual([]);expect(s.autopilot.boosterReturnPlan).toBeUndefined();
  expect(JSON.stringify(job)).toBe(before);
 });

});
it('shares512total hint iterations across two carried cutoff stages',()=>{
 const {s,job,candidate}=fixture(1/120,10);job.stage='hint';job.hintAnchor=candidate(1/120,10);
 job.hintDurations=[1/120,2/120];job.duration=1/120;job.hintScores=[];
 job.origin.kinematics.altitude=60000;job.origin.kinematics.speedY=7000;
 job.origin.engines.running.fill(true);
 const held=cloneState(job.rollout.state);held.kinematics.altitude=50.01;held.kinematics.speedY=-1;
 job.hintFallWork=createUnpoweredFallWork(held,50,SUPER_HEAVY,rad(0));
 const before=JSON.stringify(job);let calls=0;
 const advance:typeof advanceMechanics=(state,dt,control,model)=>{
  calls++;const next=cloneState(state);control(next,dt,model);next.world.environmentTime+=dt;return next;
 };
 const used=advanceBoosterPrediction(s,1/120,advance,runBoosterPolicy,SUPER_HEAVY);
 const next=s.autopilot.boosterPrediction!;
 expect(used).toBe(2);expect(calls).toBe(2);expect(next.hintForceIterations).toBe(512);
 expect(next.hintForceSlices).toBe(2);expect(next.hintScores).toHaveLength(1);
 expect(next.duration).toBe(2/120);expect(next.hintFallWork!.steps).toBe(511);
 expect(next.done).toBe(false);expect(s.autopilot.boosterReturnPlan).toBeUndefined();expect(JSON.stringify(job)).toBe(before);
});
