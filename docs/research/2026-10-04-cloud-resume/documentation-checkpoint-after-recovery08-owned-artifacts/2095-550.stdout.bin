/** Continuing live-source provenance, not an exact coarse-candidate certificate.
 * An independent paid live-cadence lineage checks the next pre-policy endpoint.
 * Only explicit post-step planner inputs are replayed; mechanics are never healed.
 */
import { cloneState, type SimState } from '../state';
import type { VehicleDefinition } from '../vehicle';
import type { MechanicalAdvance, MechanicalControl } from './mechanical';
import type { BoosterReturnPlan } from './booster-return-plan';
import type { Rad } from '../units';
import {receiptDomain,restoreReceiptMetadata,paidReceipt,appendReceipt,takeReceipt,admitsReceipt,type BoosterReceiptQueue} from './booster-receipts';

export interface BoosterSourceEvent {
  readonly phase:'post-step';
  readonly time:number;
  readonly sequence:number;
  readonly rangeError:number|undefined;
  readonly fallTime:number|undefined;
  readonly coastPitch:Rad|undefined;
  readonly reached:boolean|undefined;
  readonly plan:BoosterReturnPlan|undefined;
}
export interface BoosterSource {
  /** Distinct from physical topology; a rejected id can never regain authority. */
  lineageId:number;
  revision:number;
  originTime:number;
  valid:boolean;
  checked:boolean;
  expected:SimState|undefined;
  expectedDt:number;
  returned:SimState;
  event:BoosterSourceEvent;
  receipts?:BoosterReceiptQueue;
}

export function cloneBoosterPlan(plan:BoosterReturnPlan|undefined):BoosterReturnPlan|undefined {
  return plan?{...plan,handoff:{...plan.handoff}}:undefined;
}
export function cloneBoosterSourceEvent(event:BoosterSourceEvent):BoosterSourceEvent {
  const plan=cloneBoosterPlan(event.plan);
  if(plan){Object.freeze(plan.handoff);Object.freeze(plan);}
  return Object.freeze({...event,plan});
}
/** No recursive observers/jobs in mechanical rollouts. All physical children own
 * their storage, including the retained accepted-plan policy input. */
export function cloneBoosterMechanics(state:SimState):SimState {
  const autopilot={...state.autopilot};
  delete autopilot.boosterSource;
  delete autopilot.boosterPrediction;
  return cloneState({...state,autopilot});
}
function issueEvent(state:SimState,sequence:number):BoosterSourceEvent {
  const a=state.autopilot;
  return cloneBoosterSourceEvent({phase:'post-step',time:state.world.environmentTime,sequence,
    rangeError:a.boosterRangeError,fallTime:a.boosterFallTime,coastPitch:a.boosterCoastPitch,
    reached:a.boosterForecastReached,plan:a.boosterReturnPlan});
}
function replayEvent(state:SimState,event:BoosterSourceEvent):void {
  const a=state.autopilot;
  if(event.rangeError===undefined)delete a.boosterRangeError;else a.boosterRangeError=event.rangeError;
  if(event.fallTime===undefined)delete a.boosterFallTime;else a.boosterFallTime=event.fallTime;
  if(event.coastPitch===undefined)delete a.boosterCoastPitch;else a.boosterCoastPitch=event.coastPitch;
  if(event.reached===undefined)delete a.boosterForecastReached;else a.boosterForecastReached=event.reached;
  const plan=cloneBoosterPlan(event.plan);
  if(plan)a.boosterReturnPlan=plan;else delete a.boosterReturnPlan;
}
function revoke(state:SimState):void {
  const a=state.autopilot;
  if(a.boosterSource)a.boosterSource.valid=false;
  delete a.boosterReturnPlan;
  delete a.boosterCoastPitch;
  delete a.boosterForecastReached;
  if(a.boosterPrediction?.published)a.boosterPrediction={...a.boosterPrediction,published:undefined};
  // Keep the bounded job, permanently ineligible under its rejected lineage.
}
/** Fixed-schema tree comparison: every physical/control child is covered. The
 * only omitted keys are the two recursive nonphysical forecast metadata trees.
 * for-in avoids allocating key arrays on this bounded per-step path. */
export function equalBoosterTree(left:unknown,right:unknown,autopilot=false):boolean {
  if(Object.is(left,right))return true;
  if(left===null || right===null || typeof left!=='object' || typeof right!=='object')return false;
  if(Array.isArray(left)!==Array.isArray(right))return false;
  if(Array.isArray(left) && left.length!==(right as unknown[]).length)return false;
  const a=left as Record<string,unknown>,b=right as Record<string,unknown>;
  for(const key in a) {
    if(autopilot && (key==='boosterSource' || key==='boosterPrediction'))continue;
    if(!(key in b) || !equalBoosterTree(a[key],b[key],key==='autopilot'))return false;
  }
  for(const key in b) {
    if(autopilot && (key==='boosterSource' || key==='boosterPrediction'))continue;
    if(!(key in a))return false;
  }
  return true;
}
/** Called at the actual pre-policy phase, after paid damage/physics. */
export function verifyBoosterSource(state:SimState,dt:number):boolean {
  if(!state.damage)return true;
  const a=state.autopilot,source=a.boosterSource;
  if(!source) {
    if(a.boosterReturnPlan){revoke(state);return false;}
    return true;
  }
  if(source.revision!==state.damage.revision) {revoke(state);return false;}
  if(!source.valid || !source.expected || source.expectedDt!==dt
    || !equalBoosterTree(source.expected,state)) {revoke(state);return false;}
  if(a.boosterReturnPlan && a.boosterReturnPlan.sourceLineage!==source.lineageId) {
    revoke(state);return false;
  }
  source.checked=true;
  return true;
}
/** New lineage only after physical epoch/reset or rejected bounded job ends.
 * Never replace a still-running rejected job with an unearned healthy source. */
export function ensureBoosterSource(state:SimState):void {
  if(!state.damage)return;
  const a=state.autopilot,prior=a.boosterSource;
  if(prior && prior.revision===state.damage.revision
    && (prior.valid || (a.boosterPrediction && !a.boosterPrediction.done)))return;
  if(prior)delete a.boosterPrediction;
  delete a.boosterReturnPlan;
  const returned=cloneBoosterMechanics(state);
  a.boosterSource={lineageId:(prior?.lineageId ?? 0)+1,revision:state.damage.revision,
    originTime:state.world.environmentTime,valid:true,checked:true,returned,
    expected:undefined,expectedDt:0,event:issueEvent(state,0)};
}
/** One paid observer advance. Ordinary post-step publication inputs have an
 * explicit immutable phase/time/order event; no actual mechanical value is copied. */
export function advanceBoosterSource(state:SimState,dt:number,advance:MechanicalAdvance,
  policy:MechanicalControl,model:VehicleDefinition,credit?:BoosterSourceCredit):number {
  const source=state.autopilot.boosterSource;
  if(!source || !source.valid)return 0;
  if(!source.checked || source.returned.world.environmentTime!==state.world.environmentTime) {
    revoke(state);return 0;
  }
  const event=issueEvent(state,source.event.sequence+1);
  const input=cloneBoosterMechanics(source.returned);
  replayEvent(input,event);
  if(credit) {
    if(!equalBoosterTree(event,credit.event)) {revoke(state);return 0;}
    state.autopilot.boosterSource={...source,event,returned:cloneBoosterMechanics(credit.returned),
      expected:cloneBoosterMechanics(credit.expected),expectedDt:dt,checked:false};
    return 0;
  }
  let expected:SimState|undefined;
  const returned=advance(input,dt,(endpoint,interval,vehicle)=>{
    expected=cloneBoosterMechanics(endpoint);
    policy(endpoint,interval,vehicle);
  },model);
  state.autopilot.boosterSource={...source,event,returned:cloneBoosterMechanics(returned),
    expected,expectedDt:dt,checked:false,valid:expected!==undefined};
  if(!expected)revoke(state);
  return 1;
}

export interface BoosterSourceCredit {event:BoosterSourceEvent;expected:SimState;returned:SimState;}
/** Prepared before search. No later miss may spend a fifth mechanical call. */
export function prepareBoosterSourceCredit(state:SimState,dt:number,advance:MechanicalAdvance,
 policy:MechanicalControl,model:VehicleDefinition):BoosterSourceCredit|undefined {
 const source=state.autopilot.boosterSource;
 if(!source?.valid || !source.checked || !source.receipts || source.returned.world.environmentTime!==state.world.environmentTime)return;
 const event=issueEvent(state,source.event.sequence+1),input=cloneBoosterMechanics(source.returned);
 replayEvent(input,event);
 if(!receiptDomain(input,dt))return;
 const taken=takeReceipt(source.receipts,input,dt,advance,policy,model,source.lineageId,source.revision);
 state.autopilot.boosterSource={...source,receipts:taken.queue};
 if(!taken.receipt)return;
 const expected=cloneBoosterMechanics(taken.receipt.expected),returned=cloneBoosterMechanics(taken.receipt.returned);
 restoreReceiptMetadata(expected,input);restoreReceiptMetadata(returned,input);
 return {event,expected,returned};
}
/** Records only an actual paid candidate advance, including its callback. */
export function recordBoosterSourceReceipt(state:SimState,input:SimState,expected:SimState|undefined,
 returned:SimState,dt:number,advance:MechanicalAdvance,policy:MechanicalControl,model:VehicleDefinition):void {
 const source=state.autopilot.boosterSource;
 if(!expected || !canRecordBoosterSourceReceipt(state,input,dt))return;
 const receipt=paidReceipt(input,expected,returned,dt,advance,policy,model,source!.lineageId,source!.revision);
 state.autopilot.boosterSource={...source!,receipts:appendReceipt(source!.receipts,receipt)};
}

export function boosterSourceCreditMatches(state:SimState,credit:BoosterSourceCredit):boolean {
 const source=state.autopilot.boosterSource;
 return !!source && equalBoosterTree(issueEvent(state,source.event.sequence+1),credit.event);
}

export function canRecordBoosterSourceReceipt(state:SimState,input:SimState,dt:number):boolean {
 const source=state.autopilot.boosterSource;
 return !!source?.valid && receiptDomain(input,dt) && admitsReceipt(source.receipts,input.world.environmentTime);
}
