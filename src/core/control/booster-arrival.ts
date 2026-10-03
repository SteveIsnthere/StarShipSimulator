/** Booster command contracts. Targets are net inertial acceleration; delivered
 * aero/gravity are removed before allocating real, bounded engine thrust. */
import type { SimState } from '../state';
import type { VehicleDefinition } from '../vehicle';
import { rad,type Rad } from '../units';
import { getTotalMaxThrust,gimballedShare } from '../physics/engines';
import { writeCatchPose,createCatchPose } from '../physics/tower-catch';
import * as C from '../constants';
import { createBurnScratch, writeUnpoweredAcceleration } from './guidance-physics';
import { verticalGravityAcceleration } from '../physics/gravity';
import { CATCH } from '../vehicles/super-heavy';

const THRUST_PITCH_LIMIT=.3;

export interface BoosterThrustRequest { pitch:Rad;throttle:number;requiredX:number;requiredY:number;deliveredX:number;deliveredY:number }
export function createBoosterThrustRequest():BoosterThrustRequest {
  return {pitch:rad(0),throttle:100,requiredX:0,requiredY:0,deliveredX:0,deliveredY:0};
}
export function writeBoosterThrustRequest(state:SimState,ax:number,ay:number,model:VehicleDefinition,out:BoosterThrustRequest):void {
  const k=state.kinematics, mass=state.vehicle.vehicleMass;
  const share=gimballedShare(state.engines.running,state.atmosphere.airPressure,model);
  const measured=state.forces.thrust/mass;
  const measuredX=measured*(share*Math.sin(state.vehicle.gimbalPointingDirection)+(1-share)*Math.sin(k.pitch));
  const measuredY=measured*(share*Math.cos(state.vehicle.gimbalPointingDirection)+(1-share)*Math.cos(k.pitch));
  out.requiredX=ax-(k.accelerationX-measuredX);
  out.requiredY=ay-(k.accelerationY-measuredY);
  out.pitch=rad(Math.max(-THRUST_PITCH_LIMIT,Math.min(THRUST_PITCH_LIMIT,Math.atan2(out.requiredX,Math.max(0,out.requiredY)))));
  // Vertical arrest has priority at steering saturation. The unconstrained
  // vector's norm would produce a different vertical acceleration after clamp.
  const acceleration=Math.max(0,out.requiredY)/Math.cos(out.pitch);
  const max=getTotalMaxThrust(state.engines.running,state.atmosphere.airPressure,model)/mass;
  out.throttle=max>0?Math.max(C.throttleLowerLimit,Math.min(100,100*acceleration/max)):100;
  out.deliveredX=max*out.throttle*.01*Math.sin(out.pitch);
  out.deliveredY=max*out.throttle*.01*Math.cos(out.pitch);
}

const forceScratch=createBurnScratch();
const forceTrial=createBoosterThrustRequest();
/** Solve hull/throttle against the actual attitude-dependent aero law. The
 * thrust-only atan2 allocator has the wrong response sign at high pressure.
 * All candidates retain the existing pitch, minimum throttle and engine bounds.
 * This is a steady command proposal, never a substitute for actuator replay. */
function evaluateForce(state:SimState,ax:number,ay:number,model:VehicleDefinition,max:number,pitch:number):number {
  writeUnpoweredAcceleration(state,rad(pitch),model,forceScratch);
  forceTrial.requiredX=ax-forceScratch.acc.x;forceTrial.requiredY=ay-forceScratch.acc.y;
  forceTrial.pitch=rad(pitch);
  forceTrial.throttle=max>0?Math.max(C.throttleLowerLimit,Math.min(100,
    100*Math.max(0,forceTrial.requiredY)/(max*Math.cos(pitch)))):100;
  forceTrial.deliveredX=max*forceTrial.throttle*.01*Math.sin(pitch);
  forceTrial.deliveredY=max*forceTrial.throttle*.01*Math.cos(pitch);
  return forceTrial.deliveredX-forceTrial.requiredX;
}
function retainForce(out:BoosterThrustRequest,best:number):number {
  const cost=(forceTrial.deliveredX-forceTrial.requiredX)**2+(forceTrial.deliveredY-forceTrial.requiredY)**2;
  if(cost>=best)return best;
  Object.assign(out,forceTrial);return cost;
}
export function writeBoosterForceRequest(state:SimState,ax:number,ay:number,model:VehicleDefinition,out:BoosterThrustRequest,pitchLimit=THRUST_PITCH_LIMIT):void {
  const max=getTotalMaxThrust(state.engines.running,state.atmosphere.airPressure,model)/state.vehicle.vehicleMass;
  // Both thrust-dominated and aero-dominated branches are possible. Inspect
  // the full unchanged cone, then refine each observed sign crossing.
  const limit=Math.max(0,Math.min(THRUST_PITCH_LIMIT,pitchLimit));
  let previous=-limit;
  let previousError=evaluateForce(state,ax,ay,model,max,previous),best=retainForce(out,Infinity);
  for(let i=1;i<=16;i++){
    const pitch=-limit+2*limit*i/16;
    const error=evaluateForce(state,ax,ay,model,max,pitch);best=retainForce(out,best);
    if(previousError*error<0){
      let lo=previous,hi=pitch,left=previousError;
      for(let j=0;j<12;j++){
        const mid=(lo+hi)/2,value=evaluateForce(state,ax,ay,model,max,mid);best=retainForce(out,best);
        if(left*value<=0)hi=mid;else {lo=mid;left=value;}
      }
    }
    previous=pitch;previousError=error;
  }
}

/** Size vertical throttle against delivered engine direction/environment while
 * attitude approaches the steady force proposal. Requested pitch is not yet
 * actual thrust authority. Slew and minimum throttle remain in actuation. */
export function boosterDeliveredThrottle(state:SimState,ay:number,model:VehicleDefinition):number {
  const share=gimballedShare(state.engines.running,state.atmosphere.airPressure,model);
  const directionY=share*Math.cos(state.vehicle.gimbalPointingDirection)+(1-share)*Math.cos(state.kinematics.pitch);
  const environmentY=state.kinematics.accelerationY-state.forces.thrust/state.vehicle.vehicleMass*directionY;
  const max=getTotalMaxThrust(state.engines.running,state.atmosphere.airPressure,model)/state.vehicle.vehicleMass;
  if(max<=0 || directionY<=0)return 100;
  return Math.max(C.throttleLowerLimit,Math.min(100,100*Math.max(0,ay-environmentY)/(max*directionY)));
}

export interface BoosterArrival { x:number;height:number;vx:number;vy:number;time:number;ax:number;ay:number;bodyAX:number;bodyAY:number;centreAX:number;centreAY:number;lateralFeasible:boolean }
export function createBoosterArrival():BoosterArrival {return {x:0,height:0,vx:0,vy:0,time:0,ax:0,ay:0,bodyAX:0,bodyAY:0,centreAX:0,centreAY:0,lateralFeasible:true};}
const lug=createCatchPose();
const terminalEngines:readonly boolean[]=Object.freeze([true,true,true]);
const terminalDemand=createBoosterThrustRequest();
/** Cubic boundary acceleration for the remaining *fixed* deadline, with
 * final lug velocity(0,-2m/s). Never resets the horizon after an early stop.
 * Actuator limits still decide what portion of this demand is feasible. */
export function writeBoosterArrival(state:SimState,dt:number,model:VehicleDefinition,out:BoosterArrival):void {
  writeCatchPose(state,model,lug);
  out.x=lug.x-C.starBaseXPos;out.height=lug.altitude-CATCH.planeAltitude;
  out.vx=lug.speedX;out.vy=lug.speedY;
  const a=state.autopilot;
  if(a.boosterArrivalTime===undefined) {
    const height=Math.max(0,out.height),down=Math.max(0,-out.vy);
    const balanced=2*height/(down+2);
    // Atmospheric braking fades as descent slows. Bound the cubic's final
    // vertical acceleration by full sea-level thrust at the current mass and
    // catch-plane gravity; actual paid fuel loss can only increase authority.
    const finalNet=getTotalMaxThrust(terminalEngines,C.SEA_LEVEL_PRESSURE_PA/1000,model)/state.vehicle.vehicleMass
      +verticalGravityAcceleration(C.planetRadius+CATCH.bodyCentreAltitude,0);
    const thrustTime=finalNet>0?6*height/(Math.sqrt((down+4)**2+6*finalNet*height)+down+4):60;
    a.boosterArrivalTime=Math.max(.5,Math.min(60,Math.max(balanced,thrustTime)));
  }
  a.boosterArrivalTime=Math.max(0,a.boosterArrivalTime-dt);
  out.time=Math.max(.25,a.boosterArrivalTime);
  out.ax=-6*out.x/out.time**2-4*out.vx/out.time;
  out.ay=-6*out.height/out.time**2-4*out.vy/out.time+4/out.time;
  // The point target is not a hull-centre acceleration. Remove the delivered
  // tangential/centripetal acceleration of the lug; no torque is invented.
  const k=state.kinematics,arm=CATCH.lugStation-model.height/2;
  out.bodyAX=out.ax-arm*(Math.cos(k.pitch)*k.angularAcceleration-Math.sin(k.pitch)*k.angularVelocity**2);
  out.bodyAY=out.ay+arm*(Math.sin(k.pitch)*k.angularAcceleration+Math.cos(k.pitch)*k.angularVelocity**2);
  // The controlled boundary includes upright attitude, so its hull centre
  // ends at the lug's upright offset. Steer the body's translation and attitude
  // together; feeding measured point-alpha into a steady hull-angle inversion
  // couples the attitude loop back into itself (recorded failed experiment).
  out.centreAX=-6*(k.downRangeDistance-C.starBaseXPos)/out.time**2-4*k.speedX/out.time;
  out.centreAY=-6*(k.altitude-CATCH.bodyCentreAltitude)/out.time**2-4*k.speedY/out.time+4/out.time;
  // Nominal frozen-environment command estimate, not an arrival proof.
  // A cubic's acceleration is affine in time, so both endpoint demands must
  // fit the nominal steady thrust cone under that approximation. This is
  // only a search hint: environment/attitude evolve over the horizon. The
  // shared mechanical replay must
  // additionally prove ignition/slew, attitude, aero, minimum throttle/fuel
  // and actual eligible contact before a handoff is admitted.
  const maximum=getTotalMaxThrust(terminalEngines,state.atmosphere.airPressure,model)
    /state.vehicle.vehicleMass*Math.sin(THRUST_PITCH_LIMIT);
  writeBoosterThrustRequest(state,out.ax,out.ay,model,terminalDemand);
  const first=terminalDemand.requiredX;
  const endAX=6*out.x/out.time**2+2*out.vx/out.time;
  const endAY=6*out.height/out.time**2+2*out.vy/out.time-8/out.time;
  writeBoosterThrustRequest(state,endAX,endAY,model,terminalDemand);
  out.lateralFeasible=Number.isFinite(first) && Number.isFinite(terminalDemand.requiredX)
    && Math.abs(first)<=maximum && Math.abs(terminalDemand.requiredX)<=maximum;
}
