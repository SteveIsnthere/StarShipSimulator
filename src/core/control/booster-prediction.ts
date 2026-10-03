/** Flight-owned, deterministic work for paid future shutdown plans. A numeric
 * proposal cannot command a cutoff until its terminal replay is accepted. */
import { cloneState,type SimState } from '../state';
import type { VehicleDefinition } from '../vehicle';
import { rad } from '../units';
import * as C from '../constants';
import { getTotalMaxThrust } from '../physics/engines';
import { verticalGravityAcceleration } from '../physics/gravity';
import { CATCH, RETURN_ENGINES } from '../vehicles/super-heavy';
import type { MechanicalAdvance,MechanicalControl } from './mechanical';
import { advanceBoosterForecast,createBoosterForecastWork,createBoosterReadyWork,boosterRemainingAfterPrefix,
  executableBoosterBurnDuration,boosterBurnTicks,type BoosterForecastWork,type BoosterForecast,type BoosterPrefix } from './booster-forecast';
import { proposeBoosterBurn,proposeBoosterProbe,proposeBoosterRefinement,acceptBoosterReturnPlan,type BoosterBurnCandidate,type BoosterReturnPlan } from './booster-return-plan';

interface PublishedPrediction {
  originTime:number;originX:number;originVX:number;forecast:BoosterForecast;
  decision?:BoosterReturnPlan;
  /** Historical diagnostic only. Never engine cutoff or coast authority. */
  slope?:number|undefined;burnRangeRate?:number|undefined;
}
export interface BoosterPrediction {
  origin:SimState;
  prefix?:BoosterPrefix;
  startupPrefix?:BoosterPrefix;
  rollout:BoosterForecastWork;
  stage:'low'|'upper'|'root'|'validate';
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
const returnMask:readonly boolean[]=Object.freeze(RETURN_ENGINES.map(()=>true));
function begin(state:SimState,model:VehicleDefinition,published?:PublishedPrediction):BoosterPrediction {
  const origin=cloneState(state);delete origin.autopilot.boosterPrediction;
  const upperDuration=Math.floor(120*origin.vehicle.propellantMass/(RETURN_ENGINES.length*C.maxFuelFlowPerRaptor))/120;
  const acceleration=getTotalMaxThrust(returnMask,origin.atmosphere.airPressure,model)/origin.vehicle.vehicleMass;
  const initial=Math.abs(origin.autopilot.boosterRangeError ?? 0)/(acceleration*(origin.autopilot.boosterFallTime ?? 0));
  const firstDuration=executableBoosterBurnDuration(Number.isFinite(initial) && initial>0 && initial<upperDuration
    ?Math.max(upperDuration/4,initial):upperDuration/4);
  const paid=origin.autopilot.boosterPhase==='align-boost' || origin.autopilot.boosterPhase==='boostback';
  const duration=paid?firstDuration:0;
  return {origin,rollout:createBoosterReadyWork(origin,rad(0),duration),stage:paid?'upper':'low',duration,lowerDuration:0,
    upperDuration,firstDuration,
    iterations:paid?1:0,attemptedTicks:paid?[Math.round(duration*120)]:[],published,done:false};
}
function candidate(job:BoosterPrediction):BoosterBurnCandidate {
  return {originTime:job.origin.world.environmentTime,burnDuration:job.duration,
    shutdownAt:job.rollout.shutdownAt ?? job.origin.world.environmentTime,
    coastPitch:rad(0),forecast:{...job.rollout.result}};
}
function valid(c:BoosterBurnCandidate):boolean {
  return c.forecast.reached && !c.forecast.failed && c.forecast.fuel>0
    && c.forecast.handoff!==undefined && Number.isFinite(c.forecast.rangeError);
}
function schedule(job:BoosterPrediction,proposal:number,stage:'upper'|'root'):void {
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
  const prefix=job.prefix && boosterRemainingAfterPrefix(duration,job.prefix)>0?job.prefix:job.startupPrefix;
  job.rollout=createBoosterReadyWork(job.origin,rad(0),duration,undefined,prefix);
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
  // Start inside the physical interval, then expand a valid low endpoint.
  // Do not spend a full forecast at the all-fuel limit when it cannot catch.
  const proposed=job.probeDuration ?? (job.low && !job.high && lo===job.firstDuration
    ?Math.min((boosterBurnTicks(lo)+1)/120,hi):(lo+hi)/2);
  delete job.probeDuration;
  if(proposed<=lo || proposed>=hi) {
    const midpoint=(lo+hi)/2;
    if(midpoint<=lo || midpoint>=hi)job.done=true;else schedule(job,midpoint,'upper');
  } else schedule(job,proposed,'upper');
}
function completeCandidate(job:BoosterPrediction):void {
  const c=candidate(job);
  if(job.rollout.startupPrefix)job.startupPrefix=job.rollout.startupPrefix;
  if(job.rollout.prefix && (!job.prefix || job.rollout.prefix.steadySteps<job.prefix.steadySteps))
    job.prefix=job.rollout.prefix;
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
    } else {job.high=c;job.highReady=cloneState(job.rollout.state);}
    // Balanced error is an optimization target, not a physical catch bound.
    // The actual finite terminal replay is still required before publication.
    // Prioritize each nominally supported paid endpoint once. A stage label
    // or balanced-error neighbourhood is not physical catch acceptance.
    if(supportsTrial(c)) {
      validate(job,c);return;
    }
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
export function advanceBoosterPrediction(state:SimState,dt:number,advance:MechanicalAdvance,policy:MechanicalControl,model:VehicleDefinition):number {
  const a=state.autopilot,prior=a.boosterPrediction;
  const next=!prior || prior.done?begin(state,model,prior?.published):{
    ...prior,rollout:{...prior.rollout,state:cloneState(prior.rollout.state),result:{...prior.rollout.result}},
  };
  const used=advanceBoosterForecast(next.rollout,Math.max(1,Math.floor(480*dt)),advance,policy,model);
  if(next.rollout.done) {
    if(next.stage==='validate') {
      const terminal=next.rollout.state;
      const caught=physicallyCaught(terminal);
      const decision=acceptBoosterReturnPlan(next.selected!,caught,state.world.environmentTime);
      // A coast diagnostic has no future boost to command, but still requires
      // genuine terminal validation before being advertised as reached.
      if(decision || (caught && next.origin.autopilot.boosterPhase==='coast')) {
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
