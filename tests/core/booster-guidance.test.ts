/** Missing booster dispatch, fictitious capture or borrowed/unpaid authority
 * must fail real preset-to-catch trajectories; no scenario seed or start tuning. */
import { describe,expect,it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { PRESETS,createScenarioVehicle } from '$core/scenarios';
import { cloneState,type SimState } from '$core/state';
import { runBoosterAutopilot } from '$core/autopilot/booster';
import { step } from '$core/step';
import { SUPER_HEAVY,CATCH } from '$core/vehicles/super-heavy';
import { createCatchPose,writeCatchPose } from '$core/physics/tower-catch';
import * as C from '$core/constants';

const DT=1/120;
function fly(initial:SimState,seconds=900,traceName='failed-engines'){
  const eventInputs:unknown[]=[];
  const mechanicalInput=(value:SimState)=>{const copy=cloneState(value);delete copy.autopilot.boosterPrediction;return copy;};
  let state=initial,previous=state;
  const trace:unknown[]=[];
  const lug=createCatchPose();
  for(let i=0;i<seconds/DT;i++){
    previous=state;state=step(state,DT,{},SUPER_HEAVY);
    writeCatchPose(state,SUPER_HEAVY,lug);
    const phaseChanged=previous.autopilot.boosterPhase!==state.autopilot.boosterPhase;
    const ignitionChanged=state.engines.ignitionCountdown.some((value,index)=>(value===null)!==(previous.engines.ignitionCountdown[index]===null));
    const enginesChanged=state.engines.running.some((value,index)=>value!==previous.engines.running[index]);
    const prediction=state.autopilot.boosterPrediction?.published;
    const forecastPublished=prediction?.originTime!==previous.autopilot.boosterPrediction?.published?.originTime
      || prediction?.decision?.shutdownAt!==previous.autopilot.boosterPrediction?.published?.decision?.shutdownAt;
    const candidateChanged=state.autopilot.boosterPrediction?.iterations!==previous.autopilot.boosterPrediction?.iterations
      || state.autopilot.boosterPrediction?.stage!==previous.autopilot.boosterPrediction?.stage;
    const pressureCrossed=[35000,50000].some(q=>(previous.forces.dynamicPressure>=q)!==(state.forces.dynamicPressure>=q));
    const planeCrossed=previous.kinematics.altitude+29.5*Math.cos(previous.kinematics.pitch)>120 && lug.altitude<=120;
    if(process.env.BOOSTER_EVENT_INPUTS && (phaseChanged || forecastPublished || planeCrossed || state.status.landed)) {
      const job=state.autopilot.boosterPrediction;
      eventInputs.push({tick:i+1,events:{phaseChanged,forecastPublished,planeCrossed},
        previous:mechanicalInput(previous),returned:mechanicalInput(state),
        prediction:job?{origin:mechanicalInput(job.origin),selected:job.selected,
          terminalOrigin:job.terminalOrigin?mechanicalInput(job.terminalOrigin):undefined}:undefined});
    }
    if(i%1200===0 || phaseChanged || ignitionChanged || enginesChanged || forecastPublished || candidateChanged || pressureCrossed || planeCrossed
      || (lug.altitude<500 && i%30===0) || state.status.landed || state.failures.crashed || state.failures.inFlightBreakUp) {
      trace.push({t:(i+1)*DT,h:state.kinematics.altitude,x:state.kinematics.downRangeDistance-C.starBaseXPos,
        events:{phaseChanged,ignitionChanged,enginesChanged,forecastPublished,candidateChanged,pressureCrossed,planeCrossed},
        vx:state.kinematics.speedX,vy:state.kinematics.speedY,pitch:state.kinematics.pitch,
        omega:state.kinematics.angularVelocity,fuel:state.vehicle.propellantMass,
        engines:state.engines.running.filter(Boolean).length,throttle:state.vehicle.throttleCurrent,
        rcs:state.vehicle.rcsRunTimeRemaining,fin:state.vehicle.frontFinExtension,
        control:state.autopilot.pitchControl,temperature:state.forces.surfaceTemperature,
        phase:state.autopilot.boosterPhase,q:state.forces.dynamicPressure,g:state.forces.perceivedG,
        returnPlan:state.autopilot.boosterReturnPlan,
      planner:state.autopilot.boosterPrediction?{stage:state.autopilot.boosterPrediction.stage,
        duration:state.autopilot.boosterPrediction.duration,iterations:state.autopilot.boosterPrediction.iterations,
        result:state.autopilot.boosterPrediction.rollout.result}:undefined,
      terminalMissed:state.autopilot.boosterTerminalMissed,
      terminalIgnitionTime:state.autopilot.boosterTerminalIgnitionTime,
      rangeError:state.autopilot.boosterRangeError,fallTime:state.autopilot.boosterFallTime,
        deadline:state.autopilot.boosterArrivalTime,lug:{x:lug.x-C.starBaseXPos,h:lug.altitude,vx:lug.speedX,vy:lug.speedY},
        prediction:prediction?{age:state.world.environmentTime-prediction.originTime,
          sourceX:prediction.originX-C.starBaseXPos,sourceVX:prediction.originVX,
          ...prediction.forecast,slope:prediction.slope,burnRangeRate:prediction.burnRangeRate}:undefined,
        actual:{gimbal:state.vehicle.gimbalPosition,fin:state.vehicle.frontFinExtension,throttle:state.vehicle.throttleCurrent,rcs:state.forces.rcsThrust},
        commanded:{gimbal:state.autopilot.pitchControl,fin:state.autopilot.boosterFinControl,throttle:state.vehicle.throttle},
        forces:{thrust:state.forces.thrust,drag:state.forces.aerodynamicDrag,lift:state.forces.aerodynamicLift,
          ax:state.kinematics.accelerationX,ay:state.kinematics.accelerationY,
          gimbalAlpha:state.forces.thrustVectorAcceleration,gridAlpha:state.forces.frontFinDragAngularAcceleration,
          rcsAlpha:state.forces.rcsThrustAngularAcceleration,angularDrag:state.forces.angularDragAcceleration,offAxis:state.forces.offAxisThrustDifferenceAcceleration},
        failures:state.failures});
    }
    if(state.status.landed || state.failures.crashed || state.failures.inFlightBreakUp)break;
  }
  if(process.env.BOOSTER_TRACE==='1') console.log(JSON.stringify(trace));
  if(process.env.BOOSTER_EVENT_INPUTS)writeFileSync(`${process.env.BOOSTER_EVENT_INPUTS}-${traceName}.json`,JSON.stringify(eventInputs,null,2));
  return {state,previous};
}
function assertFinite(value:unknown):void{
  if(typeof value==='number') {expect(Number.isFinite(value)).toBe(true);return;}
  if(Array.isArray(value))value.forEach(assertFinite);
  else if(value && typeof value==='object')Object.values(value).forEach(assertFinite);
}

describe('actual booster scenarios are secured at the tower',()=>{
  for(const id of ['booster-sep','rtls'])it(`${id}: autopilot catches the actual33-engine booster within900s`,()=>{
    const preset=PRESETS.find(p=>p.id===id)!;
    const {state:initial}=createScenarioVehicle(preset);
    initial.autopilot.autoLandOn=true;
    const {state,previous}=fly(initial,900,id);
    expect(state.status.landed,JSON.stringify({id,h:state.kinematics.altitude,x:state.kinematics.downRangeDistance-C.starBaseXPos,fuel:state.vehicle.propellantMass,failures:state.failures})).toBe(true);
    expect(state.status.onTheGround).toBe(false);
    for(const [failure,flag]of Object.entries(state.failures))expect(flag,failure).toBe(false);
    expect(state.vehicle.propellantMass).toBeGreaterThan(0);
    const lug=createCatchPose();writeCatchPose(state,SUPER_HEAVY,lug);
    expect(lug.altitude).toBe(120);expect(Math.abs(lug.x-C.starBaseXPos)).toBeLessThanOrEqual(2.25);
    expect(state.kinematics.speedX).toBe(0);expect(state.kinematics.speedY).toBe(0);
    expect(Math.abs(state.kinematics.pitch)).toBeLessThanOrEqual(CATCH.maxPitch);
    expect(previous.status.landed).toBe(false);
    assertFinite(state);
    const held=step(cloneState(state),DT,{},SUPER_HEAVY);
    expect(held.status.landed).toBe(true);expect(held.kinematics.altitude).toBe(state.kinematics.altitude);
  });
  it('cannot fabricate a catch when every engine is failed',()=>{
    const {state}=createScenarioVehicle(PRESETS.find(p=>p.id==='rtls')!,123);
    state.engines.failed.fill(true);state.autopilot.autoLandOn=true;
    const result=fly(state);
    expect(result.state.status.landed).toBe(false);
    expect(result.state.engines.running.some(Boolean)).toBe(false);
    expect(result.state.failures.crashed || result.state.failures.inFlightBreakUp).toBe(true);
    assertFinite(result.state);
  });
});


describe('booster engine authority follows shared ignition contracts',()=>{
  it('draws the ignition failure stream for each commanded return engine exactly once',()=>{
    const {state}=createScenarioVehicle(PRESETS[0]!,123);
    state.autopilot.autoLandOn=true;state.autopilot.boosterPhase='boostback';
    state.autopilot.boosterPredictorCountdown=1;state.autopilot.boosterRangeError=100000;
    runBoosterAutopilot(state,DT,SUPER_HEAVY);
    expect(state.rng.counters.ignitionFailure).toBe(13);
    expect(state.rng.counters.ignitionDelay).toBe(13);
    runBoosterAutopilot(state,DT,SUPER_HEAVY);
    expect(state.rng.counters.ignitionFailure).toBe(13);
    expect(state.rng.counters.ignitionDelay).toBe(13);
  });
});
