import {describe,it,expect} from 'vitest';
import {proposeBoosterCutoffHint,type BoosterCutoffScore} from '$core/control/booster-cutoff-hint';
import {createInitialState,cloneState} from '$core/state';
import {SHIP} from '$core/vehicle';
import {SUPER_HEAVY} from '$core/vehicles/super-heavy';
import {rad} from '$core/units';
import {advanceMechanics} from '$core/step';
import {runBoosterPolicy} from '$core/autopilot/booster';
import {createBoosterCutoffWork,advanceBoosterForecast,boosterRemainingAfterPrefix,mergeBoosterRollingPrefixes} from '$core/control/booster-forecast';
import * as C from '$core/constants';
import type {BoosterBurnCandidate} from '$core/control/booster-return-plan';
const origin=createInitialState();
function score(duration:number,range:number):BoosterCutoffScore{return{duration,range,origin,model:SUPER_HEAVY};}
const c:BoosterBurnCandidate={...(origin.damage?{damageRevision:origin.damage.revision}:{}),originTime:origin.world.environmentTime,burnDuration:12,shutdownAt:20,coastPitch:rad(0),
 forecast:{reached:true,failed:false,time:100,rangeError:-20,fuel:100,pitch:0,steps:100,speedX:0,speedY:-5,ignitionDraws:0,
 handoff:{x:0,height:100,vx:0,vy:-5,time:10,lateralFeasible:true}}};
describe('source-local cutoff hint supplies proposals only',()=>{
 it('derives seconds from actual residual and force-only range response',()=>{
  expect(proposeBoosterCutoffHint(c,score(11.95,105),score(12.05,95),0,30)).toBe(11.8);
 });
 it('is invariant to common positive range-unit scaling',()=>{
  expect(proposeBoosterCutoffHint({...c,forecast:{...c.forecast,rangeError:-200}},score(11.95,1050),score(12.05,950),0,30)).toBe(11.8);
 });
 it('rejects capped physical anchors, zero/nonfinite response, wrong source/model and strict bounds',()=>{
  expect(proposeBoosterCutoffHint(c,score(11.95,105),{...score(12.05,95),model:SHIP},0,30)).toBeUndefined();
  expect(proposeBoosterCutoffHint({...c,forecast:{...c.forecast,fuel:0}},score(11.95,105),score(12.05,95),0,30)).toBeUndefined();
  expect(proposeBoosterCutoffHint(c,score(11.95,100),score(12.05,100),0,30)).toBeUndefined();
  expect(proposeBoosterCutoffHint(c,score(11.95,NaN),score(12.05,95),0,30)).toBeUndefined();
  expect(proposeBoosterCutoffHint({...c,forecast:{...c.forecast,reached:false}},score(11.95,105),score(12.05,95),0,30)).toBeUndefined();
  expect(proposeBoosterCutoffHint(c,score(11.95,105),{...score(12.05,95),origin:createInitialState()},0,30)).toBeUndefined();
  expect(proposeBoosterCutoffHint(c,score(11.95,105),score(12.05,95),11.8,30)).toBeUndefined();
 });
 it('does not mutate anchor and cannot establish terminal proof',()=>{
  const snapshot=JSON.stringify(c);const proposal=proposeBoosterCutoffHint(c,score(11.95,105),score(12.05,95),0,30);
  expect(typeof proposal).toBe('number');expect(JSON.stringify(c)).toBe(snapshot);
 });
});

describe('paid cutoff checkpoints',()=>{
 it('shares exact earlier power-of-two boost states and charges remaining mechanics',()=>{
  const state=createInitialState(123,SUPER_HEAVY);state.autopilot.autoLandOn=true;
  state.autopilot.boosterPhase='boostback';state.autopilot.boostBackInitCompleted=true;state.autopilot.boostBackDirection=-1;
  state.kinematics.altitude=100000;state.kinematics.distanceToPlanetCenter=C.planetRadius+100000;
  state.kinematics.pitch=rad(-Math.PI/2);state.engines.ignitionCountdown.fill(null);state.engines.running.fill(false);
  for(let i=0;i<13;i++)state.engines.running[i]=true;
  const before=cloneState(state),base=createBoosterCutoffWork(state,rad(0),1.75);
  advanceBoosterForecast(base,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
  expect(base.state.autopilot.boosterPhase).toBe('coast');expect(base.result.handoff).toBeUndefined();
  expect(base.result.reached).toBe(false);expect(base.checkpoints!.length).toBeLessThanOrEqual(12);
  for(const duration of [1.55,1.95]){
   const checkpoint=base.checkpoints!.filter(p=>boosterRemainingAfterPrefix(duration,p)>0).at(-1)!;
   expect(Math.log2(checkpoint.steadySteps)%1).toBe(0);
   const preserved=JSON.stringify(checkpoint),plain=createBoosterCutoffWork(state,rad(0),duration);
   const cached=createBoosterCutoffWork(state,rad(0),duration,checkpoint);
   const full=advanceBoosterForecast(plain,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
   const charged=advanceBoosterForecast(cached,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
   expect(cached.state).toEqual(plain.state);expect(cached.result).toEqual(plain.result);
   expect(cached.shutdownAt).toBe(plain.shutdownAt);expect(full-charged).toBe(checkpoint.steps);
   expect(JSON.stringify(checkpoint)).toBe(preserved);
  }
  expect(state).toEqual(before);
 });
 it('retains only the last eight exact steady endpoints for nearby shorter rollback',()=>{
  const state=createInitialState(123,SUPER_HEAVY);state.autopilot.autoLandOn=true;
  state.autopilot.boosterPhase='boostback';state.autopilot.boostBackInitCompleted=true;state.autopilot.boostBackDirection=-1;
  state.kinematics.altitude=100000;state.kinematics.distanceToPlanetCenter=C.planetRadius+100000;
  state.kinematics.pitch=rad(-Math.PI/2);state.engines.ignitionCountdown.fill(null);state.engines.running.fill(false);
  for(let i=0;i<13;i++)state.engines.running[i]=true;
  const base=createBoosterCutoffWork(state,rad(0),1.75);
  advanceBoosterForecast(base,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
  const rolling=(base as typeof base & {rollingPrefixes?:readonly import('$core/control/booster-forecast').BoosterPrefix[]}).rollingPrefixes;
  expect(rolling).toHaveLength(8);
  expect(rolling!.map(p=>p.steadySteps)).toEqual([28,29,30,31,32,33,34,35]);
  const saved=JSON.stringify(rolling),older=rolling!.slice(0,4);
  expect(mergeBoosterRollingPrefixes(rolling,older)).toEqual(rolling);
  expect(mergeBoosterRollingPrefixes(rolling,[{...rolling![0]!,origin:cloneState(state)}])).toEqual(rolling);
  expect(JSON.stringify(rolling)).toBe(saved);
  const duration=1.55,checkpoint=rolling!.filter(p=>boosterRemainingAfterPrefix(duration,p)>0).at(-1)!;
  const before=JSON.stringify(rolling),cached=createBoosterCutoffWork(state,rad(0),duration,checkpoint);
  const plain=createBoosterCutoffWork(state,rad(0),duration);
  const calls=advanceBoosterForecast(cached,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
  advanceBoosterForecast(plain,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
  expect(calls).toBe(1);expect(cached.state).toEqual(plain.state);expect(cached.result).toEqual(plain.result);
  expect(JSON.stringify(rolling)).toBe(before);
 });

});
