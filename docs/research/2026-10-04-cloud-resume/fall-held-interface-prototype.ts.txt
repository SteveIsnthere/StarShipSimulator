/** RESEARCH ONLY: candidate cycle2 attempt3; not imported by production.
 * Original canonical expressions/order copied from retained guidance-physics.
 * Only held zero-gust signature and control-area call boundary differ. */
import * as C from '$core/constants';
import {SHIP,type VehicleDefinition} from '$core/vehicle';
import type {SimState} from '$core/state';
import {rad,type Rad} from '$core/units';
import {createBurnScratch,type BurnScratch,type UnpoweredFallWork,type FallResult,FALL_STEP,FALL_STEP_CAP} from '$core/control/guidance-physics';
import {isaAtmosphereInto} from '$core/physics/isa';
import {speedOfSoundAt} from '$core/physics/atmosphere';
import {meanWindAt} from '$core/physics/wind';
import {wrappedAttackAngle,foldedIntoWind,getCrossSectionalArea,getBodyDragCoefficient,getDrag,getLift} from '$core/physics/aero';
import {writeAccelerationComponents} from '$core/physics/components';
import {tangentialAcceleration,verticalGravityAcceleration} from '$core/physics/gravity';
import {createDamageControlForces,validateDamageControlForcing,writeDamageControls} from '$core/physics/damage-controls';
import {damageModelFor} from '$core/physics/damage-model';
import {MAX_DAMAGE_COMPONENTS} from '$core/damage-state';
import {createDamageMassProperties} from '$core/physics/damage-mass';
import {writeFlightMassQuery} from '$core/physics/flight-mass-query';
const forceControls=createDamageControlForces(MAX_DAMAGE_COMPONENTS);
const queriedMass=createDamageMassProperties();
const MAX_FIN_LOAD_COEFFICIENT=Math.max(1,C.finDragCoefficient);
interface HeldContext {
 state:SimState|null;model:VehicleDefinition;pitch:Rad;mass:number;maxArea:number;referenceWind:number;held:UnpoweredFallWork|null;
}
export interface PrototypeScratch {readonly burn:BurnScratch;readonly context:HeldContext;}
export function createPrototypeScratch():PrototypeScratch {
 const burn=createBurnScratch();
 return {burn,context:{state:null,model:SHIP,pitch:rad(0),mass:0,maxArea:0,referenceWind:0,held:null}};
}
function heldControlArea(intoWind:number,speed:number,airDensity:number,context:HeldContext):number {
  const {state,model}=context;
  const held=context.held!; // Set only for the active captured invocation.
  let maxArea=context.maxArea;
  if (state?.damage) {
    const controlModel = held.controlModel ?? damageModelFor(model).controls;
    const q = .5 * airDensity * speed ** 2;
    if (held.zeroControlArea !== null
      && Number.isFinite(q * held.zeroControlColumnArea * MAX_FIN_LOAD_COEFFICIENT)) {
      // Incidence only validates this prepared branch. Finite angles have
      // valid sine incidence; preserve rejection of every nonfinite angle.
      validateDamageControlForcing(state.damage, controlModel, q, Number.isFinite(intoWind) ? 0 : NaN, forceControls);
      maxArea = held.zeroControlArea;
    } else {
      const frontCommand = model.gridFins
        ? (state.vehicle.frontFinExtension - 50) / 50 * model.gridFins.maxAngle
        : state.vehicle.frontFinExtension * .01 * C.finActuationMaxAngle;
      const aftCommand = state.vehicle.aftFinExtension * .01 * C.finActuationMaxAngle;
      writeDamageControls(state.damage, controlModel, q, Math.abs(Math.sin(intoWind)), frontCommand, aftCommand, forceControls);
      maxArea = model.maxArea + 1.8 * (forceControls.frontArea + forceControls.aftArea);
      if (frontCommand === 0 && aftCommand === 0) {
        held.zeroControlArea = maxArea;
        // A finite bound preserves the original force-scale validation even at
        // adversarial finite q whose multiplication by area could overflow.
        held.zeroControlColumnArea = 0;
        for (const column of controlModel.columns)
          held.zeroControlColumnArea = Math.max(held.zeroControlColumnArea, column.area);
      }
    }
  }
  return maxArea;
}
function heldForce(altitude:number,vx:number,vy:number,context:HeldContext,scratch:BurnScratch):void {
  const {pitch,mass,referenceWind,model}=context;
  const { inputs, acc } = scratch;
  const r = C.planetRadius + altitude;
  const air = scratch.atmosphere;
  isaAtmosphereInto(Math.max(altitude, 0), air);
  const rx = vx - meanWindAt(referenceWind, altitude);
  const ry = vy;
  const speed = Math.sqrt(rx * rx + ry * ry);
  const motion = Math.atan2(rx, ry);
  const attack = wrappedAttackAngle(pitch, motion);
  const intoWind = foldedIntoWind(attack);
  const maxArea=heldControlArea(intoWind,speed,air.airDensity,context);
  const area = getCrossSectionalArea(rad(intoWind), maxArea, model);
  const mach = speed / speedOfSoundAt(air.airTemperature);
  inputs.angleOfMotion = rad(motion);
  inputs.angleOfAttack = rad(attack);
  inputs.aerodynamicDragAcceleration = getDrag(air.airDensity, speed, area, getBodyDragCoefficient(mach)) / mass;
  inputs.aerodynamicLiftAcceleration = getLift(air.airDensity, speed, rad(intoWind), maxArea) / mass;
  writeAccelerationComponents(inputs, C.gravity, acc);
  acc.x = acc.x + tangentialAcceleration(r, vx, vy);
  acc.y = acc.y + C.gravity + verticalGravityAcceleration(r, vx);
}
function initializePrototypeFall(work:UnpoweredFallWork,state:SimState,groundAltitude:number,model:VehicleDefinition,pitch:Rad):void {
  if(state.damage)writeFlightMassQuery(state,model,queriedMass);
  work.state=state;work.model=model;work.groundAltitude=groundAltitude;work.pitch=pitch;
  work.mass=state.damage?queriedMass.totalMass:state.vehicle.vehicleMass;
  work.maxArea=state.vehicle.vehicleInFlightMaxArea;work.referenceWind=state.world.wind;
  work.zeroControlArea=null;work.zeroControlColumnArea=0;
  work.controlModel=state.damage?damageModelFor(model).controls:null;
  work.h=state.kinematics.altitude;work.x=0;work.vx=state.kinematics.speedX;work.vy=state.kinematics.speedY;
  work.steps=0;work.done=!(work.mass>0);
  work.result.reached=false;work.result.time=NaN;work.result.downRange=work.done?NaN:0;
}
function advancePrototypeCaptured(work:UnpoweredFallWork,budget:number,owned:PrototypeScratch):number {
  if(work.done)return 0;
  const scratch=owned.burn,context=owned.context;
  context.state=work.state;context.model=work.model;context.pitch=work.pitch;context.mass=work.mass;
  context.maxArea=work.maxArea;context.referenceWind=work.referenceWind;context.held=work;
  const acc=scratch.acc,half=FALL_STEP*.5;
  let h=work.h,x=work.x,vx=work.vx,vy=work.vy,steps=work.steps,used=0;
  const sliceLimit=Math.min(Math.floor(budget),FALL_STEP_CAP-steps);
  for(let slice=0;slice<sliceLimit;slice++) {
    heldForce(h,vx,vy,context,scratch);
    const mvx=vx+acc.x*half;
    const mvy=vy+acc.y*half;
    heldForce(h+vy*half,mvx,mvy,context,scratch);
    const nvx=vx+acc.x*FALL_STEP;
    const nvy=vy+acc.y*FALL_STEP;
    const nh=h+mvy*FALL_STEP;
    const nx=x+mvx*FALL_STEP;
    const index=steps;steps++;used++;
    if(nh<=work.groundAltitude) {
      const f=(h-work.groundAltitude)/(h-nh);
      work.result.reached=true;work.result.time=(index+f)*FALL_STEP;work.result.downRange=x+(nx-x)*f;
      h=nh;x=nx;vx=nvx;vy=nvy;work.done=true;break;
    }
    h=nh;x=nx;vx=nvx;vy=nvy;
  }
  work.h=h;work.x=x;work.vx=vx;work.vy=vy;work.steps=steps;
  if(!work.result.reached)work.result.downRange=x;
  if(steps>=FALL_STEP_CAP)work.done=true;
  return used;
}
export function advancePrototypeFall(work:UnpoweredFallWork,budget:number,owned:PrototypeScratch):number {
  try { return advancePrototypeCaptured(work,budget,owned); }
  finally {
    // New context fields must not prolong an external continuation/source's lifetime.
    // Leave original burn/work scratch state untouched, including thrown queries.
    owned.context.state=null;owned.context.held=null;owned.context.model=SHIP;
  }
}
export function prototypeFallInto(
  state:SimState,groundAltitude:number,owned:PrototypeScratch,out:FallResult,
  model:VehicleDefinition=SHIP,pitchOverride=state.kinematics.pitch,
):void {
  // Existing HUD/guidance callers keep their allocation-free synchronous API.
  const scratch=owned.burn;
  const work=scratch.fallWork;initializePrototypeFall(work,state,groundAltitude,model,pitchOverride);
  advancePrototypeFall(work,FALL_STEP_CAP,owned);
  out.reached=work.result.reached;out.time=work.result.time;out.downRange=work.result.downRange;
  work.state=null; // Do not retain a live frame through long-lived HUD scratch.
}
