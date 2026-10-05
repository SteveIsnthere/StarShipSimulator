import { describe, expect, it,vi } from 'vitest';
import { createInitialState,cloneState,type SimState } from '$core/state';
import { cloneBoosterMechanics, ensureBoosterSource, prepareBoosterSourceCredit, recordBoosterSourceReceipt,advanceBoosterSource,boosterSourceCreditMatches,verifyBoosterSource } from '$core/control/booster-source';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import type { MechanicalAdvance, MechanicalControl } from '$core/control/mechanical';
const dt=1/120;
const policy:MechanicalControl=s=>{s.vehicle.throttle=100;};
const advance:MechanicalAdvance=(s,t,p,m)=>{const next=cloneBoosterMechanics(s);p(next,t,m);next.world.environmentTime+=t;return next;};
function fixture(){const s=createInitialState(1,SUPER_HEAVY);s.autopilot.manualControlOn=false;s.autopilot.autoBoostBackOn=true;s.autopilot.boosterPhase='align-boost';ensureBoosterSource(s);return s;}
function pay(s:ReturnType<typeof fixture>,time=s.world.environmentTime){const input=cloneBoosterMechanics(s);input.world.environmentTime=time;input.autopilot.boosterFallTime=99;input.autopilot.boosterCoastPitch=0 as never;input.autopilot.boosterForecastBurn=true;let pre:typeof input|undefined;const returned=advance(input,dt,(n,t,m)=>{pre=cloneBoosterMechanics(n);policy(n,t,m);},SUPER_HEAVY);recordBoosterSourceReceipt(s,input,pre,returned,dt,advance,policy,SUPER_HEAVY);}
describe('paid observer receipts',()=>{
 it('credits a paid full input and restores the three observer metadata fields',()=>{const s=fixture();pay(s);const credit=prepareBoosterSourceCredit(s,dt,advance,policy,SUPER_HEAVY);expect(credit).toBeDefined();expect(credit!.returned.autopilot.boosterForecastBurn).toBeUndefined();expect(credit!.returned.autopilot.boosterFallTime).toBeUndefined();});
 it.each(['rng','material','event','dt','model','policy','advance'] as const)('rejects %s divergence',kind=>{const s=fixture();pay(s);if(kind==='rng')s.autopilot.boosterSource!.returned.rng.counters.ignitionDelay++;if(kind==='material')s.autopilot.boosterSource!.returned.damage!.components[0]!.root.energy++;if(kind==='event')s.autopilot.boosterRangeError=44;expect(prepareBoosterSourceCredit(s,kind==='dt'?.1:dt,kind==='advance'?((...a)=>advance(...a)):advance,kind==='policy'?((...a)=>policy(...a)):policy,kind==='model'?{...SUPER_HEAVY}:SUPER_HEAVY)).toBeUndefined();});
 it('does not credit missing pre-policy callbacks or absent payments',()=>{const s=fixture();expect(prepareBoosterSourceCredit(s,dt,advance,policy,SUPER_HEAVY)).toBeUndefined();const input=cloneBoosterMechanics(s);recordBoosterSourceReceipt(s,input,undefined,input,dt,advance,policy,SUPER_HEAVY);expect(prepareBoosterSourceCredit(s,dt,advance,policy,SUPER_HEAVY)).toBeUndefined();});
 it('owns frozen receipts while preserving the earlier source queue',()=>{const s=fixture();const prior=s.autopilot.boosterSource!;pay(s);expect(prior.receipts).toBeUndefined();const receipt=s.autopilot.boosterSource!.receipts!.chunks[0]![0]!;expect(Object.isFrozen(receipt.input.damage!.components[0]!.root)).toBe(true);expect(Object.isFrozen(s.damage!.components[0]!.root)).toBe(false);});
 it('caps admission at1024 and cannot borrow an overflow payment',()=>{const s=fixture();for(let i=0;i<1025;i++)pay(s,i*dt);expect(s.autopilot.boosterSource!.receipts!.size).toBe(1024);});
});

import ready from '../fixtures/booster-terminal-ready.json';
import {advanceMechanics} from '$core/step';
import {runBoosterPolicy} from '$core/autopilot/booster';
import {advanceBoosterPrediction,type BoosterPrediction} from '$core/control/booster-prediction';
import {createBoosterForecastWork} from '$core/control/booster-forecast';
import {rad} from '$core/units';
it.each(['future','expired','rejected'] as const)('defers a four-step publication then revalidates %s next tick',condition=>{
 let terminal=cloneState(ready.rtls as unknown as SimState);
 const tail:SimState[]=[];
 for(let i=0;i<4000 && !terminal.status.landed && !terminal.failures.crashed;i++) {
  tail.push(terminal);if(tail.length>4)tail.shift();terminal=advanceMechanics(terminal,dt,runBoosterPolicy,SUPER_HEAVY);
 }
 expect(terminal.status.landed).toBe(true);expect(tail).toHaveLength(4);
 const live=fixture();live.autopilot.boosterRangeError=100;live.autopilot.boosterFallTime=99;
 let calls=0;const counted:MechanicalAdvance=(...a)=>{calls++;return advanceMechanics(...a);};
 const input=cloneBoosterMechanics(live);let pre:SimState|undefined;
 const paid=counted(input,dt,(s,t,m)=>{pre=cloneBoosterMechanics(s);runBoosterPolicy(s,t,m);},SUPER_HEAVY);
 calls=0;
 // The same paid transition must use the scheduler's advance identity.
 recordBoosterSourceReceipt(live,input,pre,paid,dt,counted,runBoosterPolicy,SUPER_HEAVY);
 const credit=prepareBoosterSourceCredit(live,dt,counted,runBoosterPolicy,SUPER_HEAVY)!;expect(credit).toBeDefined();
 const origin=cloneBoosterMechanics(live),rollout=createBoosterForecastWork(tail[0]!,rad(0));
 rollout.state=cloneBoosterMechanics(tail[0]!);rollout.step=dt;
 const selected={originTime:0,shutdownAt:100,burnDuration:1,coastPitch:rad(0),damageRevision:origin.damage!.revision,sourceLineage:live.autopilot.boosterSource!.lineageId,
 forecast:{reached:true,rangeError:0,time:100,fuel:100,pitch:0,steps:1,ignitionDraws:0,failed:false,speedX:0,speedY:0,handoff:{x:0,height:100,vx:0,vy:-1,time:10,lateralFeasible:true}}};
 live.autopilot.boosterPrediction={origin,rollout,stage:'validate',duration:1,firstDuration:1,lowerDuration:0,upperDuration:2,iterations:1,attemptedTicks:[120],selected,terminalOrigin:tail[0],sourceLineage:selected.sourceLineage,done:false} as BoosterPrediction;
 expect(advanceBoosterPrediction(live,dt,counted,runBoosterPolicy,SUPER_HEAVY,true)).toBe(4);
 expect(calls).toBe(4);expect(live.autopilot.boosterPrediction!.rollout.state.status.landed).toBe(true);
 expect(live.autopilot.boosterReturnPlan).toBeUndefined();expect(boosterSourceCreditMatches(live,credit)).toBe(true);
 expect(advanceBoosterSource(live,dt,counted,runBoosterPolicy,SUPER_HEAVY,credit)).toBe(0);expect(calls).toBe(4);
 const next=advanceMechanics(live,dt,(s,t,m)=>{expect(verifyBoosterSource(s,t)).toBe(true);runBoosterPolicy(s,t,m);},SUPER_HEAVY);
 if(condition==='expired')next.world.environmentTime=100;
 if(condition==='rejected')next.autopilot.boosterSource!.valid=false;
 const nextCredit=prepareBoosterSourceCredit(next,dt,counted,runBoosterPolicy,SUPER_HEAVY);expect(nextCredit).toBeUndefined();
 expect(advanceBoosterPrediction(next,dt,counted,runBoosterPolicy,SUPER_HEAVY)).toBe(0);
 if(condition==='future'){
  expect(next.autopilot.boosterReturnPlan!.shutdownAt).toBeGreaterThan(next.world.environmentTime);
  expect(advanceBoosterSource(next,dt,counted,runBoosterPolicy,SUPER_HEAVY)).toBe(1);expect(calls).toBe(5);
 }else{expect(next.autopilot.boosterReturnPlan).toBeUndefined();expect(next.autopilot.boosterPrediction!.published).toBeUndefined();}
});
import {createScenarioVehicle,PRESETS} from '$core/scenarios';
import {runBoosterAutopilot,runBoosterPostStep} from '$core/autopilot/booster';
it('spends three searches on a real miss then four searches with a real paid forecast receipt',()=>{
 let s=createScenarioVehicle(PRESETS.find(p=>p.id==='rtls')!,123).state;
 s.autopilot.autoLandOn=true;let calls=0;
 const counted:MechanicalAdvance=(...args)=>{calls++;return advanceMechanics(...args);};
 const frames:SimState[]=[];
 for(let tick=0;tick<3;tick++) {
  s=advanceMechanics(s,dt,(e,t,m)=>runBoosterAutopilot(e,t,m,counted),SUPER_HEAVY);
  const before=calls;runBoosterPostStep(s,dt,SUPER_HEAVY,counted);
  expect(calls-before).toBe(4);expect(s.autopilot.boosterSource!.valid).toBe(true);
  expect(s.autopilot.boosterPrediction!.rollout.result.steps).toBe(3+tick*4);
  frames.push(s);
 }
 expect(frames[0]!.autopilot.boosterPrediction!.rollout.result.steps).toBe(3);
 expect(frames[0]!.autopilot.boosterSource!.receipts!.size).toBe(3);
 expect(frames[2]!.autopilot.boosterSource!.receipts!.size).toBe(8);
});

it('rejects a mutated model even when object identity stays the same',()=>{
 const s=fixture(),model={...SUPER_HEAVY};const input=cloneBoosterMechanics(s);let pre:SimState|undefined;
 const returned=advance(input,dt,(n,t,m)=>{pre=cloneBoosterMechanics(n);policy(n,t,m);},model);
 recordBoosterSourceReceipt(s,input,pre,returned,dt,advance,policy,model);model.height++;
 expect(prepareBoosterSourceCredit(s,dt,advance,policy,model)).toBeUndefined();
});
it.each(['lineageId','revision'] as const)('rejects changed receipt %s',key=>{
 const s=fixture();pay(s);s.autopilot.boosterSource![key]++;
 expect(prepareBoosterSourceCredit(s,dt,advance,policy,SUPER_HEAVY)).toBeUndefined();
});

import * as sourceFunctions from '$core/control/booster-source';
it('owns823 monotonic receipts but clones only the exact-time head on lookup',()=>{
 const s=fixture();for(let i=0;i<823;i++)pay(s,i*dt);
 const queue=s.autopilot.boosterSource!.receipts!;expect(queue.size).toBe(823);
 const spy=vi.spyOn(sourceFunctions,'cloneBoosterMechanics');
 const credit=prepareBoosterSourceCredit(s,dt,advance,policy,SUPER_HEAVY);
 expect(credit).toBeDefined();expect(spy.mock.calls).toHaveLength(1);spy.mockRestore();
 expect(queue.size).toBe(823);expect(s.autopilot.boosterSource!.receipts!.size).toBe(822);
 expect(s.autopilot.boosterSource!.receipts!.chunks.slice(1)).toEqual(queue.chunks.slice(1));
 expect(s.autopilot.boosterSource!.receipts!.chunks[1]).toBe(queue.chunks[1]);
});
it('declines duplicate and rewind admission without cloning a paid tree',()=>{
 const s=fixture();pay(s,dt);const queue=s.autopilot.boosterSource!.receipts;
 const spy=vi.spyOn(sourceFunctions,'cloneBoosterMechanics');
 pay(s,dt);pay(s,0);
 // Only the test's input/mechanical callback/return clones occurred. Admission
 // itself adds no owned receipt clones after rejecting clock order.
 expect(s.autopilot.boosterSource!.receipts).toBe(queue);expect(spy.mock.calls).toHaveLength(6);spy.mockRestore();
});

it('rejects a real terminal transition with no policy callback',()=>{
 const s=fixture(),input=cloneBoosterMechanics(s);input.damage!.terminal.active=true;
 let pre:SimState|undefined,calls=0;
 const returned=advanceMechanics(input,dt,(n)=>{calls++;pre=cloneBoosterMechanics(n);},SUPER_HEAVY);
 expect(calls).toBe(0);expect(pre).toBeUndefined();
 recordBoosterSourceReceipt(s,input,pre,returned,dt,advanceMechanics,policy,SUPER_HEAVY);
 expect(prepareBoosterSourceCredit(s,dt,advanceMechanics,policy,SUPER_HEAVY)).toBeUndefined();
});
it('cannot credit overflow and pays the bounded fallback observer',()=>{
 const s=fixture();for(let i=0;i<1025;i++)pay(s,i*dt);
 s.world.environmentTime=1024*dt;s.autopilot.boosterSource!.returned.world.environmentTime=s.world.environmentTime;
 expect(prepareBoosterSourceCredit(s,dt,advance,policy,SUPER_HEAVY)).toBeUndefined();
 expect(s.autopilot.boosterReturnPlan).toBeUndefined();
 expect(advanceBoosterSource(s,dt,advance,policy,SUPER_HEAVY)).toBe(1);
});
import {advanceBoosterForecast,createBoosterReadyWork} from '$core/control/booster-forecast';
it('receipt capture leaves every original forecast output exact and avoids ineligible snapshots',()=>{
 const origin=createScenarioVehicle(PRESETS.find(p=>p.id==='rtls')!,123).state;origin.autopilot.autoLandOn=true;
 const original=createBoosterReadyWork(origin,rad(0),5),captured=createBoosterReadyWork(origin,rad(0),5),ineligible=createBoosterReadyWork(origin,rad(0),5);
 expect(advanceBoosterForecast(original,12,advanceMechanics,runBoosterPolicy,SUPER_HEAVY)).toBe(12);
 let payments=0;
 expect(advanceBoosterForecast(captured,12,advanceMechanics,runBoosterPolicy,SUPER_HEAVY,{eligible:()=>true,paid:()=>{payments++;}})).toBe(12);
 expect(payments).toBe(12);expect(captured).toEqual(original);
 const spy=vi.spyOn(sourceFunctions,'cloneBoosterMechanics');
 expect(advanceBoosterForecast(ineligible,12,advanceMechanics,runBoosterPolicy,SUPER_HEAVY,{eligible:()=>false,paid:()=>{throw new Error('ineligible');}})).toBe(12);
 expect(spy.mock.calls).toHaveLength(0);spy.mockRestore();expect(ineligible).toEqual(original);
});
