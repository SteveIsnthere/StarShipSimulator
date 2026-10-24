/** Immutable paid receipts. Admission is bounded; only the proven no-plan
 * automatic alignment/ignition domain may normalize its three metadata inputs. */
import type { SimState } from '../state';
import type { VehicleDefinition } from '../vehicle';
import type { MechanicalAdvance,MechanicalControl } from './mechanical';
import { RETURN_ENGINES } from '../vehicles/super-heavy';
import { cloneBoosterMechanics,equalBoosterTree } from './booster-source';
export interface BoosterReceipt {
 readonly input:SimState;readonly expected:SimState;readonly returned:SimState;
 readonly dt:number;readonly advance:MechanicalAdvance;readonly policy:MechanicalControl;
 readonly model:VehicleDefinition;readonly modelSnapshot:VehicleDefinition;
 readonly lineage:number;readonly revision:number;
}
export interface BoosterReceiptQueue {readonly chunks:readonly (readonly BoosterReceipt[])[];readonly size:number;}
export function receiptDomain(state:SimState,dt:number):boolean {
 const a=state.autopilot;
 return dt===1/120 && !!state.damage && !a.manualControlOn && (a.autoLandOn || a.autoBoostBackOn)
  && !a.boosterReturnPlan && (a.boosterPhase==='align-boost'
   || (a.boosterPhase==='boostback' && !RETURN_ENGINES.every(i=>state.engines.running[i])));
}
export function restoreReceiptMetadata(state:SimState,context:SimState):void {
 for(const key of ['boosterFallTime','boosterCoastPitch','boosterForecastBurn'] as const) {
  if(Object.hasOwn(context.autopilot,key))Object.assign(state.autopilot,{[key]:context.autopilot[key]});
  else delete state.autopilot[key];
 }
}
function freezeOwned<T>(value:T):T {
 if(value && typeof value==='object') {for(const key in value)freezeOwned(value[key]);Object.freeze(value);}
 return value;
}
function cloneModel<T>(value:T):T {
 if(!value || typeof value!=='object')return value;
 const copy=(Array.isArray(value)?[]:{}) as T;
 for(const key in value)copy[key]=cloneModel(value[key]);
 return copy;
}
export function paidReceipt(input:SimState,expected:SimState,returned:SimState,dt:number,
 advance:MechanicalAdvance,policy:MechanicalControl,model:VehicleDefinition,lineage:number,revision:number):BoosterReceipt {
 return Object.freeze({input:freezeOwned(cloneBoosterMechanics(input)),expected:freezeOwned(cloneBoosterMechanics(expected)),
  returned:freezeOwned(cloneBoosterMechanics(returned)),dt,advance,policy,model,modelSnapshot:freezeOwned(cloneModel(model)),lineage,revision});
}
export function admitsReceipt(queue:BoosterReceiptQueue|undefined,time:number):boolean {
 const chunks=queue?.chunks,last=chunks?.[chunks.length-1],tail=last?.[last.length-1];
 return (queue?.size ?? 0)<1024 && (!tail || time>tail.input.world.environmentTime)
  && (!last || last.length<32 || chunks!.length<32);
}
export function appendReceipt(queue:BoosterReceiptQueue|undefined,receipt:BoosterReceipt):BoosterReceiptQueue {
 if(!admitsReceipt(queue,receipt.input.world.environmentTime))return queue!;
 const chunks=[...(queue?.chunks ?? [])],last=chunks[chunks.length-1];
 if(last && last.length<32)chunks[chunks.length-1]=Object.freeze([...last,receipt]);
 else chunks.push(Object.freeze([receipt]));
 return Object.freeze({chunks:Object.freeze(chunks),size:(queue?.size ?? 0)+1});
}
export function takeReceipt(queue:BoosterReceiptQueue,input:SimState,dt:number,advance:MechanicalAdvance,
 policy:MechanicalControl,model:VehicleDefinition,lineage:number,revision:number):{receipt:BoosterReceipt|undefined;queue:BoosterReceiptQueue} {
 let chunkIndex=0,offset=0,removed=0;
 // Monotonic admission makes every later chunk a strictly later time. Only
 // stale heads are visited; future receipts require no tree clone/comparison.
 while(chunkIndex<queue.chunks.length) {
  const chunk=queue.chunks[chunkIndex]!;
  while(offset<chunk.length && chunk[offset]!.input.world.environmentTime<input.world.environmentTime){offset++;removed++;}
  if(offset<chunk.length)break;
  chunkIndex++;offset=0;
 }
 const head=queue.chunks[chunkIndex]?.[offset];let found:BoosterReceipt|undefined;
 if(head && head.input.world.environmentTime===input.world.environmentTime
  && head.lineage===lineage && head.revision===revision && head.dt===dt
  && head.advance===advance && head.policy===policy && head.model===model
  && equalBoosterTree(head.modelSnapshot,model)) {
  const normalized=cloneBoosterMechanics(head.input);restoreReceiptMetadata(normalized,input);
  if(equalBoosterTree(normalized,input)){found=head;offset++;removed++;}
 }
 if(!removed)return {receipt:found,queue};
 const chunks=queue.chunks.slice(chunkIndex);
 if(chunks[0]) {
  if(offset===chunks[0].length)chunks.shift();
  else if(offset>0)chunks[0]=Object.freeze(chunks[0].slice(offset));
 }
 return {receipt:found,queue:Object.freeze({chunks:Object.freeze(chunks),size:queue.size-removed})};
}
