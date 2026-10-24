/** Flight-owned, deterministic work for paid future shutdown plans. A numeric
 * proposal cannot command a cutoff until its terminal replay is accepted. */
import type { SimState } from '../state';
import { cloneBoosterMechanics as cloneState,recordBoosterSourceReceipt,canRecordBoosterSourceReceipt } from './booster-source';
import type { VehicleDefinition } from '../vehicle';
import { rad } from '../units';
import * as C from '../constants';
import { engineMassFlow } from '../physics/propulsion';
import { createDamageMassProperties } from '../physics/damage-mass';
import { writeFlightMassQuery } from '../physics/flight-mass-query';
import { getTotalMaxThrust } from '../physics/engines';
import { verticalGravityAcceleration } from '../physics/gravity';
import { CATCH, RETURN_ENGINES } from '../vehicles/super-heavy';
import type { MechanicalAdvance,MechanicalControl } from './mechanical';
import { advanceBoosterForecast,mergeBoosterRollingPrefixes,createBoosterForecastWork,createBoosterReadyWork,createBoosterCutoffWork,boosterRemainingAfterPrefix,
  executableBoosterBurnDuration,boosterBurnTicks,type BoosterForecastWork,type BoosterForecast,type BoosterPrefix } from './booster-forecast';
import {createBurnScratch,createUnpoweredFallWork,advanceUnpoweredFall,type UnpoweredFallWork} from './guidance-physics';
import {proposeBoosterCutoffHint,type BoosterCutoffScore} from './booster-cutoff-hint';
import { proposeBoosterBurn,proposeBoosterProbe,proposeBoosterRefinement,acceptBoosterReturnPlan,invalidateStaleBoosterReturn,type BoosterBurnCandidate,type BoosterReturnPlan } from './booster-return-plan';

interface PublishedPrediction {
  originTime:number;originX:number;originVX:number;forecast:BoosterForecast;
  decision?:BoosterReturnPlan;
  /** Historical diagnostic only. Never engine cutoff or coast authority. */
  slope?:number|undefined;burnRangeRate?:number|undefined;
}
export interface BoosterPrediction {
  sourceLineage?:number;
  origin:SimState;
  prefix?:BoosterPrefix;
  startupPrefix?:BoosterPrefix;
  rollout:BoosterForecastWork;
  stage:'low'|'upper'|'root'|'validate'|'hint';
  checkpoints?:readonly BoosterPrefix[];rollingPrefixes?:readonly BoosterPrefix[];bracketRefined?:boolean;hintAnchor?:BoosterBurnCandidate;hintScores?:readonly BoosterCutoffScore[];
  hintFallWork?:UnpoweredFallWork;hintForceIterations?:number;hintForceSlices?:number;hintDurations?:readonly number[];hintTicks?:readonly number[];hintTried?:boolean;hintRefined?:boolean;
  duration:number;
  firstDuration:number;
  probeDuration?:number;
  terminalOrigin?:SimState;
  lowerDuration:number;
  upperDuration:number;
  low?:BoosterBurnCandidate;
  high?:BoosterBurnCandidate;
  lowReady?:SimState;
  highReady?:SimState;
  validatedTicks?:number[];
  selected?:BoosterBurnCandidate;
  lastCandidate?:BoosterBurnCandidate;
  previousCandidate?:BoosterBurnCandidate;
  iterations:number;
  attemptedTicks:number[];
  published?:PublishedPrediction|undefined;
  done:boolean;
}
const retained = createDamageMassProperties();
const hintScratch=createBurnScratch();
/** Largest power-of-two slice below the measured1ms force-call allowance. */
const HINT_FALL_ITERATIONS=512;
const returnMask:readonly boolean[]=Object.freeze(RETURN_ENGINES.map(()=>true));
function begin(state:SimState,model:VehicleDefinition,published?:PublishedPrediction):BoosterPrediction {
  const origin=cloneState(state);delete origin.autopilot.boosterPrediction;
  const upperDuration=Math.floor(120*origin.vehicle.propellantMass/(RETURN_ENGINES.length*engineMassFlow(model.propulsion,'sea-level')))/120;
  writeFlightMassQuery(origin, model, retained);
  // A startup search hint may not credit failed planned engines. Its paid
  // mechanical rollout remains the sole cutoff/catch acceptance authority.
  const availableMask=RETURN_ENGINES.some(i=>origin.engines.failed[i])
    ?returnMask.map((active,i)=>active && !origin.engines.failed[i]):returnMask;
  const acceleration=retained.engineSupportAvailable && retained.hasMass
    ?getTotalMaxThrust(availableMask,origin.atmosphere.airPressure,model)/retained.totalMass:0;
  const initial=Math.abs(origin.autopilot.boosterRangeError ?? 0)/(acceleration*(origin.autopilot.boosterFallTime ?? 0));
  const firstDuration=executableBoosterBurnDuration(Number.isFinite(initial) && initial>0 && initial<upperDuration
    ?Math.max(upperDuration/4,initial):upperDuration/4);
  const paid=origin.autopilot.boosterPhase==='align-boost' || origin.autopilot.boosterPhase==='boostback';
  const duration=paid?firstDuration:0;
  return {...(state.autopilot.boosterSource?{sourceLineage:state.autopilot.boosterSource.lineageId}:{}),origin,rollout:createBoosterReadyWork(origin,rad(0),duration),stage:paid?'upper':'low',duration,lowerDuration:0,
    upperDuration,firstDuration,
    iterations:paid?1:0,attemptedTicks:paid?[Math.round(duration*120)]:[],published,done:false};
}
function candidate(job:BoosterPrediction):BoosterBurnCandidate {
  return {...(job.sourceLineage===undefined?{}:{sourceLineage:job.sourceLineage}),...(job.origin.damage?{damageRevision:job.origin.damage.revision}:{}),
    originTime:job.origin.world.environmentTime,burnDuration:job.duration,
    shutdownAt:job.rollout.shutdownAt ?? job.origin.world.environmentTime,
    coastPitch:rad(0),forecast:{...job.rollout.result}};
}
function valid(c:BoosterBurnCandidate):boolean {
  return c.forecast.reached && !c.forecast.failed && c.forecast.fuel>0
    && c.forecast.handoff!==undefined && Number.isFinite(c.forecast.rangeError);
}
function schedule(job:BoosterPrediction,proposal:number,stage:'upper'|'root'):void {
  if(job.iterations>=16){if(!validateRetainedEndpoint(job))job.done=true;return;}
  const low=job.low?.burnDuration ?? job.lowerDuration;
  const high=job.high?.burnDuration ?? job.upperDuration;
  const first=boosterBurnTicks(low)+1,last=boosterBurnTicks(high)-1;
  const requested=Math.max(first,Math.min(last,boosterBurnTicks(proposal)));
  let chosen:number|undefined;
  // At most16 retained trial endpoints. Inspect neighbours of the proposal,
  // not every possible fuel interval; duplicate proposals pay no new trial.
  for(let offset=0;offset<=job.attemptedTicks.length && first<=last;offset++) {
    for(const tick of [requested-offset,requested+offset]) {
      if(tick>=first && tick<=last && !job.attemptedTicks.includes(tick)){chosen=tick;break;}
    }
    if(chosen!==undefined)break;
  }
  if(chosen===undefined){if(!validateRetainedEndpoint(job))job.done=true;return;}
  const duration=chosen/120;
  job.attemptedTicks=[...job.attemptedTicks,chosen];
  job.duration=duration;job.stage=stage;job.iterations++;
  const prefix=earlierPrefix(job,duration);
  job.rollout=createBoosterReadyWork(job.origin,rad(0),duration,undefined,prefix);
}
function earlierPrefix(job:BoosterPrediction,duration:number):BoosterPrefix|undefined {
  return [job.prefix,job.startupPrefix,...(job.checkpoints ?? []),...(job.rollingPrefixes ?? [])]
    .filter((p):p is BoosterPrefix=>!!p && boosterRemainingAfterPrefix(duration,p)>0)
    .sort((a,b)=>b.steps-a.steps)[0];
}
function rememberPrefixes(job:BoosterPrediction):void {
  job.rollingPrefixes=mergeBoosterRollingPrefixes(job.rollingPrefixes,job.rollout.rollingPrefixes ?? []);
  if(job.rollout.startupPrefix)job.startupPrefix=job.rollout.startupPrefix;
  if(job.rollout.prefix && (!job.prefix || job.rollout.prefix.steadySteps<job.prefix.steadySteps))job.prefix=job.rollout.prefix;
  for(const p of job.rollout.checkpoints ?? [])
    if(!(job.checkpoints ?? []).some(q=>q.steadySteps===p.steadySteps))job.checkpoints=[...(job.checkpoints ?? []),p];
}
function scheduleHint(job:BoosterPrediction,duration:number):void {
  job.hintTicks=[...(job.hintTicks ?? []),boosterBurnTicks(duration)];job.iterations++;
  job.duration=duration;job.stage='hint';job.rollout=createBoosterCutoffWork(job.origin,rad(0),duration,earlierPrefix(job,duration));
}
function beginHint(job:BoosterPrediction,c:BoosterBurnCandidate):boolean {
  if(!job.rollout.prefix || job.rollout.shutdownAt===undefined || job.hintTried || job.iterations+2>16 || job.origin.autopilot.boosterPhase==='coast')return false;
  job.hintTried=true;
  const durations=[(boosterBurnTicks(c.burnDuration)-6)/120,(boosterBurnTicks(c.burnDuration)+6)/120];
  if(durations.some(d=>d<=job.lowerDuration || d>=job.upperDuration || (job.attemptedTicks.includes(boosterBurnTicks(d)) || (job.hintTicks ?? []).includes(boosterBurnTicks(d)))))return false;
  job.hintAnchor=c;job.hintScores=[];job.hintDurations=durations;scheduleHint(job,durations[0]!);return true;
}
function completeHint(job:BoosterPrediction,model:VehicleDefinition,forceBudget:number):number {
  let paid=0;
  rememberPrefixes(job);
  const state=job.rollout.state;
  if(!job.hintFallWork && job.rollout.shutdownAt!==undefined && state.vehicle.propellantMass>0
    && !job.rollout.result.failed && !state.damage?.terminal.active)
    job.hintFallWork=createUnpoweredFallWork(state,CATCH.bodyCentreAltitude,model,rad(0));
  if(job.hintFallWork) {
    // First bounded slice runs on the actual cutoff completion tick. Later
    // slices own numeric state while referencing that immutable cutoff input.
    const used=advanceUnpoweredFall(job.hintFallWork,forceBudget,hintScratch);
    paid=used;
    job.hintForceIterations=(job.hintForceIterations ?? 0)+used;
    if(used>0)job.hintForceSlices=(job.hintForceSlices ?? 0)+1;
    if(!job.hintFallWork.done)return paid;
    const result=job.hintFallWork.result;
    if(result.reached && Number.isFinite(result.downRange))job.hintScores=[...(job.hintScores ?? []),
      {duration:job.duration,range:state.kinematics.downRangeDistance-C.starBaseXPos+result.downRange,origin:job.origin,model}];
    delete job.hintFallWork;
  }
  if(job.duration===job.hintDurations![0]){scheduleHint(job,job.hintDurations![1]!);return paid;}
  const scores=job.hintScores ?? [];
  const proposal=scores.length===2?proposeBoosterCutoffHint(job.hintAnchor!,scores[0]!,scores[1]!,job.lowerDuration,job.upperDuration):undefined;
  if(proposal!==undefined)schedule(job,proposal,'root');else continueSearch(job);
  return paid;
}
function beginTerminal(job:BoosterPrediction):void {
  job.stage='validate';
  job.rollout=createBoosterForecastWork(job.terminalOrigin!,job.selected!.coastPitch);
  // Fine validation always starts from the immutable paid ready input,
  // retaining actual slew/fuel/RNG/contact. Coarse catches are not proof.
  job.rollout.step=1/120;
}
function validate(job:BoosterPrediction,c:BoosterBurnCandidate,ready=job.rollout.state):void {
  job.validatedTicks=[...(job.validatedTicks ?? []),boosterBurnTicks(c.burnDuration)];
  job.selected=c;job.terminalOrigin=cloneState(ready);
  beginTerminal(job);
}
function nominalFinalPitch(c:BoosterBurnCandidate):number {
  const h=c.forecast.handoff!,t=h.time;
  const ax=6*h.x/t**2+2*h.vx/t;
  const ay=6*h.height/t**2+2*h.vy/t-8/t
    -verticalGravityAcceleration(C.planetRadius+CATCH.bodyCentreAltitude,0);
  return Math.atan2(ax,Math.max(0,ay));
}
function supportsTrial(c:BoosterBurnCandidate):boolean {
  return c.forecast.handoff!.lateralFeasible && Math.abs(nominalFinalPitch(c))<=CATCH.maxPitch;
}
/** Quantization may exhaust interior ticks before a terminal trial. Retained
 * physical endpoints remain eligible for actual fine proof, never interpolation. */
function validateRetainedEndpoint(job:BoosterPrediction):boolean {
  const endpoints=[{candidate:job.low,ready:job.lowReady},{candidate:job.high,ready:job.highReady}]
    .filter((e):e is {candidate:BoosterBurnCandidate;ready:SimState}=>!!e.candidate && !!e.ready)
    .sort((a,b)=>Math.abs(a.candidate.forecast.rangeError)-Math.abs(b.candidate.forecast.rangeError));
  for(const e of endpoints) {
    if(supportsTrial(e.candidate) && !(job.validatedTicks ?? []).includes(boosterBurnTicks(e.candidate.burnDuration))) {
      validate(job,e.candidate,e.ready);return true;
    }
  }
  return false;
}
function physicallyCaught(state:SimState):boolean {
  // randomFailure is an ignition-risk preference; only realized faults veto
  // a successful paid capture. Keep every actual failure field in the check.
  return state.status.landed && !state.status.onTheGround
    && state.vehicle.propellantMass>0
    && !Object.entries(state.failures).some(([key,failed])=>key!=='randomFailure' && failed);
}
function continueSearch(job:BoosterPrediction):void {
  if(job.iterations>=16){if(!validateRetainedEndpoint(job))job.done=true;return;}
  if(job.low && job.high) {
    const recent=job.previousCandidate && job.lastCandidate
      ?proposeBoosterRefinement(job.previousCandidate,job.lastCandidate,job.low,job.high):undefined;
    const proposal=recent ?? proposeBoosterBurn(job.low,job.high);
    if(proposal===undefined)job.done=true;else schedule(job,proposal,'root');
    return;
  }
  const lo=job.low?.burnDuration ?? job.lowerDuration;
  const hi=job.high?.burnDuration ?? job.upperDuration;
  // A first valid signed endpoint is already near the stopping neighborhood.
  // Probe its adjacent executable tick in either direction before spending a
  // capped forecast far away; the measured response proposes work, not cutoff.
  const proposed=job.probeDuration ?? (job.low && !job.high && lo===job.firstDuration
    ?Math.min((boosterBurnTicks(lo)+1)/120,hi)
    :job.high && !job.low && hi===job.firstDuration
      ?Math.max((boosterBurnTicks(hi)-1)/120,lo):(lo+hi)/2);
  delete job.probeDuration;
  if(proposed<=lo || proposed>=hi) {
    const midpoint=(lo+hi)/2;
    if(midpoint<=lo || midpoint>=hi)job.done=true;else schedule(job,midpoint,'upper');
  } else schedule(job,proposed,'upper');
}
function completeCandidate(job:BoosterPrediction):void {
  const c=candidate(job);
  rememberPrefixes(job);
  if(job.lastCandidate)job.previousCandidate=job.lastCandidate;
  else delete job.previousCandidate;
  job.lastCandidate=c;
  const original=Math.sign(job.origin.autopilot.boosterRangeError
    ?? job.origin.kinematics.downRangeDistance-C.starBaseXPos) || 1;
  if(job.stage==='low') {
    if(valid(c)) {
      job.low=c;job.lowReady=cloneState(job.rollout.state);
      if(job.origin.autopilot.boosterPhase==='coast' || supportsTrial(c)) {
        validate(job,c);return;
      }
    }
    // An invalid zero coast says nothing about paid interior candidates.
    schedule(job,job.firstDuration,'upper');return;
  }
  if(valid(c)) {
    if(c.forecast.rangeError*original>=0){
      const probe=job.low?proposeBoosterProbe(job.low,c,job.upperDuration):undefined;
      if(probe!==undefined)job.probeDuration=probe;
      job.low=c;job.lowReady=cloneState(job.rollout.state);
    } else {
      const probe=job.high?proposeBoosterProbe(job.high,c,job.upperDuration,job.lowerDuration):undefined;
      if(probe!==undefined)job.probeDuration=probe;
      job.high=c;job.highReady=cloneState(job.rollout.state);
    }
    // Balanced error is an optimization target, not a physical catch bound.
    // The actual finite terminal replay is still required before publication.
    // Prioritize each nominally supported paid endpoint once. A stage label
    // or balanced-error neighbourhood is not physical catch acceptance.
    // A supported unbracketed endpoint already deserves actual fine proof.
    // Do not delay it with proposal work (including the first RTLS endpoint).
    if((!job.low || !job.high) && supportsTrial(c)){validate(job,c);return;}
    // Exactly once, pay the first executable genuine-bracket interior before
    // spending fine proof on the endpoint that first established that bracket.
    if(job.low && job.high && !job.bracketRefined) {
      job.bracketRefined=true;
      const proposal=proposeBoosterBurn(job.low,job.high);
      const tick=proposal===undefined?undefined:boosterBurnTicks(proposal);
      if(tick!==undefined && tick>boosterBurnTicks(job.low.burnDuration)
        && tick<boosterBurnTicks(job.high.burnDuration)
        && !job.attemptedTicks.includes(tick) && job.iterations<16){schedule(job,proposal!,'root');return;}
    }
    if(beginHint(job,c))return;
    // Spend one full paid secant refinement before the first fine proof.
    // The hint's sign is never a physical bracket endpoint.
    if(job.hintAnchor && !job.hintRefined && c!==job.hintAnchor) {
      job.hintRefined=true;
      const proposal=job.low && job.high?proposeBoosterBurn(job.low,job.high)
        :proposeBoosterProbe(job.hintAnchor,c,job.upperDuration,job.lowerDuration);
      if(proposal!==undefined){schedule(job,proposal,'root');return;}
    }
    if(supportsTrial(c)) {validate(job,c);return;}
  } else {
    // A failed trajectory is no bracket endpoint or cutoff authority. Its
    // observed direction only chooses which paid interior to inspect next.
    if(Number.isFinite(c.forecast.rangeError) && c.forecast.rangeError*original>0)
      job.lowerDuration=job.duration;
    else job.upperDuration=job.duration;
  }
  continueSearch(job);
}

/** Four shared mechanical advances per1/120s live step, independent of CPU or
 * worker timing. Resume only into owned clones; older live frames stay pure. */
export function advanceBoosterPrediction(state:SimState,dt:number,advance:MechanicalAdvance,policy:MechanicalControl,model:VehicleDefinition,credited=false):number {
  invalidateStaleBoosterReturn(state);
  const a=state.autopilot,prior=a.boosterPrediction;
  const next=!prior || prior.done?begin(state,model,prior?.published):{
    ...prior,...(prior.hintFallWork?{hintFallWork:{...prior.hintFallWork,result:{...prior.hintFallWork.result}}}:{}),
    rollout:{...prior.rollout,state:cloneState(prior.rollout.state),result:{...prior.rollout.result}},
  };
  const budget=Math.max(1,Math.floor(480*dt));
  const searchBudget=a.boosterSource && !credited?Math.max(0,budget-1):budget;
  let used=0,forceUsed=0;
  for(let carry=0;carry<32 && !next.done;carry++) {
    const beforeRollout=next.rollout;
    used+=advanceBoosterForecast(next.rollout,searchBudget-used,advance,policy,model,
      a.boosterSource?{eligible:(input,interval)=>canRecordBoosterSourceReceipt(state,input,interval),paid:(input,expected,returned,interval)=>recordBoosterSourceReceipt(state,input,expected,returned,interval,advance,policy,model)}:undefined);
  if(next.rollout.done) {
    if(next.stage==='hint')forceUsed+=completeHint(next,model,HINT_FALL_ITERATIONS-forceUsed);
    else if(next.stage==='validate') {
      // Changed publication needs an observer paid under its new event. Keep
      // the completed proof, then recheck lineage/future cutoff next tick.
      if(credited && used===budget)break;
      const terminal=next.rollout.state;
      const caught=physicallyCaught(terminal);
      const sourceMatches=(!a.boosterSource || (a.boosterSource.valid && a.boosterSource.checked
          && next.sourceLineage===a.boosterSource.lineageId))
        && next.origin.damage?.revision===state.damage?.revision
        && next.selected!.damageRevision===next.origin.damage?.revision;
      const decision=sourceMatches?acceptBoosterReturnPlan(next.selected!,caught,state.world.environmentTime):undefined;
      // A coast diagnostic has no future boost to command, but still requires
      // genuine terminal validation before being advertised as reached.
      if(sourceMatches && (decision || (caught && next.origin.autopilot.boosterPhase==='coast'))) {
        const forecast={...next.selected!.forecast,fuel:terminal.vehicle.propellantMass};
        next.published={originTime:next.origin.world.environmentTime,
          originX:next.origin.kinematics.downRangeDistance,originVX:next.origin.kinematics.speedX,
          forecast,...(decision?{decision}:{})};
        if(decision){a.boosterReturnPlan=decision;a.boosterCoastPitch=decision.coastPitch;}
      }
      if(decision || caught || next.origin.autopilot.boosterPhase==='coast')next.done=true;
      else continueSearch(next);
    } else completeCandidate(next);
  }
    if(next.done || used>=searchBudget || forceUsed>=HINT_FALL_ITERATIONS || next.rollout===beforeRollout)break;
  }
  a.boosterPrediction=next;
  const p=next.published;
  if(p) {
    // Compatibility telemetry has a single interpretation in every phase.
    // Production publications have no derivative. Neither this scalar nor a
    // later telemetry replacement is allowed to command engines or fins.
    const elapsed=Math.max(0,state.world.environmentTime-p.originTime);
    a.boosterRangeError=p.forecast.rangeError+(p.burnRangeRate ?? 0)*elapsed;
    a.boosterFallTime=Math.max(0,p.forecast.time-elapsed);
    a.boosterForecastReached=p.forecast.reached;
  }
  return used;
}
