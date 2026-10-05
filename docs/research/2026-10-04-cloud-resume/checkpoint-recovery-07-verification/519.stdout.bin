/** A forecast of the *commanded* return through the shared mechanical advance.
 * Forecasts own cloned state/RNG. No recursive guidance, second integrator,
 * separate force law, instantaneous attitude or borrowed engine impulse. */
import type { SimState } from '../state';
import { cloneBoosterMechanics as cloneState } from './booster-source';
import type { MechanicalAdvance,MechanicalControl } from './mechanical';
import type { VehicleDefinition } from '../vehicle';
import type { Rad } from '../units';
import { shutdownEngine } from '../physics/engines';
import { createCatchPose,writeCatchPose } from '../physics/tower-catch';
import { CATCH,CENTRE_ENGINES,RETURN_ENGINES } from '../vehicles/super-heavy';
import * as C from '../constants';
import { createBoosterArrival,writeBoosterArrival } from './booster-arrival';

export interface BoosterHandoff {
  x:number;height:number;vx:number;vy:number;time:number;lateralFeasible:boolean;
}
export interface BoosterForecast {
  handoff?:BoosterHandoff;
  reached:boolean;rangeError:number;time:number;fuel:number;speedX:number;speedY:number;
  pitch:number;steps:number;ignitionDraws:number;failed:boolean;
}
export function createBoosterForecast():BoosterForecast {
  return {reached:false,rangeError:0,time:0,fuel:0,speedX:0,speedY:0,pitch:0,steps:0,ignitionDraws:0,failed:false};
}
const before=createCatchPose(),after=createCatchPose();
const handoffArrival=createBoosterArrival();
/** Immutable common endpoint, after alignment or paid ignition.
 * Reuse pays no new impulse: it preserves the identical mechanical prefix. */
export interface BoosterPrefix {
  origin:SimState;state:SimState;time:number;steps:number;
  advance:MechanicalAdvance;policy:MechanicalControl;model:VehicleDefinition;
  coastPitch:Rad;initialTime:number;boostSteps:number;steadySteps:number;cutoffClock:number;
}
/** Proposals select whole executable live intervals before paying impulse. */
export function boosterBurnTicks(duration:number):number {
  const ticks=duration*120,nearest=Math.round(ticks);
  // Canonical tick durations must be idempotent even when multiplication
  // rounds just above an integer. A genuinely later float still rounds up.
  return duration===nearest/120?nearest:Math.ceil(ticks);
}
export function executableBoosterBurnDuration(duration:number):number {
  return boosterBurnTicks(duration)/120;
}
/** Count the same paid ticks as an uncached startup/full steady prefix. */
export function boosterRemainingAfterPrefix(duration:number,prefix:BoosterPrefix):number {
  return Math.max(0,boosterBurnTicks(duration)-prefix.boostSteps-6*prefix.steadySteps)/120;
}
export interface BoosterForecastWork {
  origin?:SimState;prefix?:BoosterPrefix;startupPrefix?:BoosterPrefix;reusePrefix?:BoosterPrefix;boostSteps?:number;steadySteps?:number;
  state:SimState;initialTime:number;initialDraws:number;burnRemaining:number;burnTicks:number;cutoffClock:number;done:boolean;result:BoosterForecast;
  checkpoints?:readonly BoosterPrefix[];rollingPrefixes?:readonly BoosterPrefix[];stopAtCutoff?:boolean;stopAtHandoff?:boolean;readyHandoff?:boolean;step?:number;shutdownAt?:number;
}
export function createBoosterForecastWork(initial:SimState,coastPitch:Rad,burnTime=0):BoosterForecastWork {
  const state=cloneState(initial);
  // A forecast contains mechanics/control state, never another forecast job.
  delete state.autopilot.boosterPrediction;
  delete state.autopilot.boosterForecastHandoff;
  if(state.autopilot.boosterPhase==='align-boost' || (state.autopilot.boosterPhase==='boostback' && burnTime<=0) || !state.autopilot.boosterPhase) {
    state.autopilot.boosterPhase='coast';
    for(let i=0;i<state.engines.running.length;i++)shutdownEngine(state,i);
  }
  state.autopilot.boosterCoastPitch=coastPitch;
  return {state,initialTime:state.autopilot.boosterFallTime ?? 900,
    initialDraws:state.rng.counters.ignitionFailure,burnRemaining:executableBoosterBurnDuration(burnTime),
    burnTicks:boosterBurnTicks(burnTime),cutoffClock:state.world.environmentTime,done:false,result:createBoosterForecast()};
}

/** Mutates an owned job. A scheduler must clone its previous job/state before
 * resuming it; the synchronous API below already owns its new job. */
export function advanceBoosterForecast(work:BoosterForecastWork,budget:number,advance:MechanicalAdvance,policy:MechanicalControl,model:VehicleDefinition,record?: {eligible:(input:SimState,dt:number)=>boolean;paid:(input:SimState,expected:SimState|undefined,returned:SimState,dt:number)=>void}):number {
  const out=work.result;let state=work.state,used=0;
  const prefix=work.reusePrefix;
  let remaining=work.burnRemaining;
  // Preserve the very same repeated subtraction as an uncached fine startup.
  // A short candidate cannot borrow a longer prefix or its fuel/impulse.
  if(prefix)remaining=boosterRemainingAfterPrefix(remaining,prefix);
  if(prefix && prefix.origin===work.origin && prefix.advance===advance
    && prefix.policy===policy && prefix.model===model && work.step===undefined
    && work.initialTime===prefix.initialTime
    && state.autopilot.boosterCoastPitch===prefix.coastPitch
    && remaining>0 && out.steps===0) {
    state=cloneState(prefix.state);state.autopilot.boosterForecastBurn=true;
    out.time=prefix.time;out.steps=prefix.steps;work.prefix=prefix;
    work.burnRemaining=remaining;work.burnTicks=Math.round(remaining*120);work.cutoffClock=prefix.cutoffClock;work.boostSteps=prefix.boostSteps;work.steadySteps=prefix.steadySteps;
  }
  delete work.reusePrefix;
  for(let i=0;i<budget && !work.done;i++) {
    writeCatchPose(state,model,before);
    // The same Verlet/actuator implementation, with smaller steps in the short
    // terminal burn. These are predictor steps, never a change to live dt.
    const phase=state.autopilot.boosterPhase;
    const powered=phase==='align-boost' || phase==='boostback' || phase==='entry' || phase==='terminal';
    const starting=phase==='boostback' && !RETURN_ENGINES.every(i=>state.engines.running[i]);
    // Discrete ignition/readiness is paid at the same cadence as live flight.
    const ignition=starting || (phase==='entry' && !(state.autopilot.boosterEntryCentreOnly?CENTRE_ENGINES:RETURN_ENGINES).every(i=>state.engines.running[i]))
      || (phase==='terminal' && !CENTRE_ENGINES.every(i=>state.engines.running[i]));
    const nominal=phase==='align-boost' || ignition
      || (phase==='terminal' && state.autopilot.boosterArrivalTime===undefined)?1/120
      :work.step ?? (work.stopAtHandoff && powered ? .05 :(state.kinematics.altitude<2000?.05:.25));
    const boosting=phase==='boostback' || (!work.stopAtHandoff && work.burnRemaining>0);
    // Pay the final partial coarse interval as whole live steps. A fractional
    // engine impulse cannot be executed by the fixed live clock.
    const dt=boosting && work.burnTicks>0
      ?(work.burnTicks<6?1/120:Math.min(nominal,.05)):nominal;
    if(work.burnRemaining>0)state.autopilot.boosterForecastBurn=true;
    state.autopilot.boosterFallTime=Math.max(2,work.initialTime-out.time);
    const capture=record?.eligible(state,dt);
    const input=capture?cloneState(state):undefined;let expected:SimState|undefined;
    state=advance(state,dt,capture?(endpoint,interval,vehicle)=>{
      expected=cloneState(endpoint);policy(endpoint,interval,vehicle);
    }:policy,model);out.steps++;used++;
    if(input)record!.paid(input,expected,state,dt);
    if(starting)work.boostSteps=(work.boostSteps ?? 0)+1;
    if(phase==='boostback' && !starting && dt===.05)work.steadySteps=(work.steadySteps ?? 0)+1;
    if(phase==='align-boost' || boosting) {
      // Retain the exact source-relative live clock arithmetic, including
      // floating-point accumulation, rather than rounding a timestamp later.
      for(let tick=0;tick<Math.round(dt*120);tick++)work.cutoffClock+=1/120;
    }
    if(boosting && work.burnTicks>0) {
      work.burnTicks=Math.max(0,work.burnTicks-Math.round(dt*120));
      work.burnRemaining=work.burnTicks/120;
    }
    if(work.readyHandoff && work.step===undefined && work.origin
      && ((phase==='align-boost' && state.autopilot.boosterPhase==='boostback')
        || (starting && work.burnRemaining>0 && RETURN_ENGINES.every(i=>state.engines.running[i]))
        || (phase==='boostback' && !starting && dt===.05))) {
      work.prefix={origin:work.origin,state:cloneState(state),time:out.time+dt,steps:out.steps,
        advance,policy,model,coastPitch:state.autopilot.boosterCoastPitch!,initialTime:work.initialTime,
        boostSteps:work.boostSteps ?? 0,steadySteps:work.steadySteps ?? 0,cutoffClock:work.cutoffClock};
      if(starting)work.startupPrefix=work.prefix;
      const n=work.prefix.steadySteps;
      if(n>0)work.rollingPrefixes=mergeBoosterRollingPrefixes(work.rollingPrefixes,[work.prefix]);
      if(n>0 && (n & (n-1))===0 && !(work.checkpoints ?? []).some(p=>p.steadySteps===n))
        work.checkpoints=[...(work.checkpoints ?? []),work.prefix];
    }
    if((boosting || (work.stopAtHandoff && state.autopilot.boosterPhase==='boostback')) && work.burnRemaining===0) {
      delete state.autopilot.boosterForecastBurn;
      state.autopilot.boosterPhase='coast';
      for(let j=0;j<state.engines.running.length;j++)shutdownEngine(state,j);
      work.shutdownAt=work.cutoffClock;
      if(work.stopAtCutoff)work.done=true;
    }
    writeCatchPose(state,model,after);
    const crossed=before.altitude>CATCH.planeAltitude && after.altitude<=CATCH.planeAltitude;
    out.time+=dt;
    if(work.stopAtHandoff && state.autopilot.boosterPhase==='terminal'
      && (!work.readyHandoff || (phase==='terminal' && CENTRE_ENGINES.every(i=>state.engines.running[i])))) {
      const oldDeadline=state.autopilot.boosterArrivalTime;
      writeBoosterArrival(state,0,model,handoffArrival);
      if(oldDeadline===undefined)delete state.autopilot.boosterArrivalTime;
      else state.autopilot.boosterArrivalTime=oldDeadline;
      out.handoff={x:handoffArrival.x,height:handoffArrival.height,
        vx:handoffArrival.vx,vy:handoffArrival.vy,time:handoffArrival.time,
        lateralFeasible:handoffArrival.lateralFeasible};
      // The actual terminal cubic controls the centre and ends upright.
      // Zero final centre acceleration is x+vx*T/3, not the old midpoint.
      out.rangeError=state.kinematics.downRangeDistance-C.starBaseXPos
        +state.kinematics.speedX*handoffArrival.time/3;
      out.speedX=handoffArrival.vx;out.speedY=handoffArrival.vy;
      out.reached=true;work.done=true;
    } else if(crossed) {
      const f=(before.altitude-CATCH.planeAltitude)/(before.altitude-after.altitude);
      out.rangeError=before.x+(after.x-before.x)*f-C.starBaseXPos;
      out.time-=dt*(1-f);
      out.speedX=before.speedX+(after.speedX-before.speedX)*f;
      out.speedY=before.speedY+(after.speedY-before.speedY)*f;
      out.reached=true;
      work.done=true;
    }
    if(state.status.landed || state.failures.crashed || state.failures.inFlightBreakUp || out.time>=900 || out.steps>=4000)work.done=true;
  }
  if(!out.reached) {
    out.rangeError=after.x-C.starBaseXPos;out.speedX=after.speedX;out.speedY=after.speedY;
  }
  out.fuel=state.vehicle.propellantMass;out.pitch=state.kinematics.pitch;
  out.ignitionDraws=state.rng.counters.ignitionFailure-work.initialDraws;
  out.failed=state.failures.crashed || state.failures.inFlightBreakUp || state.failures.fuelRunOut;
  work.state=state;
  return used;
}
export function forecastBoosterReturn(initial:SimState,coastPitch:Rad,advance:MechanicalAdvance,policy:MechanicalControl,model:VehicleDefinition,out:BoosterForecast):void {
  const work=createBoosterForecastWork(initial,coastPitch);
  advanceBoosterForecast(work,4000,advance,policy,model);
  Object.assign(out,work.result);
}

/** Paid return candidate: preserve the alignment before timing its boost. */
export function createBoosterHandoffWork(initial:SimState,coastPitch:Rad,burnTime:number,stepSize?:number):BoosterForecastWork {
  const work=createBoosterForecastWork(initial,coastPitch,burnTime);
  work.state=cloneState(initial);delete work.state.autopilot.boosterPrediction;
  if(!work.state.autopilot.boosterPhase)work.state.autopilot.boosterPhase='align-boost';
  if(work.state.autopilot.boosterPhase==='boostback' && burnTime<=0) {
    work.state.autopilot.boosterPhase='coast';
    for(let i=0;i<work.state.engines.running.length;i++)shutdownEngine(work.state,i);
    work.shutdownAt=initial.world.environmentTime;
  }
  delete work.state.autopilot.boosterReturnPlan;
  work.state.autopilot.boosterCoastPitch=coastPitch;
  work.stopAtHandoff=true;
  if(stepSize!==undefined)work.step=stepSize;
  return work;
}

/** Upstream return target after paid ignition, before the terminal command.
 * Unlike the diagnostic pre-ignition interface, this includes startup drift. */
export function createBoosterReadyWork(initial:SimState,coastPitch:Rad,burnTime:number,stepSize?:number,prefix?:BoosterPrefix):BoosterForecastWork {
  const work=createBoosterHandoffWork(initial,coastPitch,burnTime,stepSize);
  work.readyHandoff=true;work.origin=initial;
  if(prefix)work.reusePrefix=prefix;
  return work;
}

/** Paid cutoff only: no entry/terminal score or arrival authority. */
export function createBoosterCutoffWork(initial:SimState,coastPitch:Rad,burnTime:number,prefix?:BoosterPrefix):BoosterForecastWork {
  const work=createBoosterReadyWork(initial,coastPitch,burnTime,undefined,prefix);
  work.stopAtCutoff=true;return work;
}

/** Bounded exact common steady endpoints. Shorter trials never erase later
 * compatible paid history; older arrays/snapshots stay immutable. */
export function mergeBoosterRollingPrefixes(prior:readonly BoosterPrefix[]|undefined,incoming:readonly BoosterPrefix[]):readonly BoosterPrefix[] {
  const result=[...(prior ?? [])],reference=result[0] ?? incoming[0];
  for(const p of incoming) {
    if(!reference || p.steadySteps<=0 || p.origin!==reference.origin || p.advance!==reference.advance
      || p.policy!==reference.policy || p.model!==reference.model || p.coastPitch!==reference.coastPitch
      || p.initialTime!==reference.initialTime || p.boostSteps!==reference.boostSteps
      || result.some(q=>q.steadySteps===p.steadySteps))continue;
    result.push(p);
  }
  return result.sort((a,b)=>a.steadySteps-b.steadySteps).slice(-8);
}
