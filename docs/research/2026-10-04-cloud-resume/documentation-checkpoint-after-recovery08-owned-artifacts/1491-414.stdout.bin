/** Paid observations and next hardware authority belong to distinct epochs. */
import { expect, it } from 'vitest';
import { cloneState, createInitialState } from '$core/state';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { advanceFreeBody } from '$core/mission-free-flight';
import { rad } from '$core/units';
import { damageModelFor } from '$core/physics/damage-model';
import { steelSpecificEnthalpy } from '$core/physics/damage-material';
import { createDamageMassProperties } from '$core/physics/damage-mass';
import { writeFlightMassQuery } from '$core/physics/flight-mass-query';
import { getTotalMaxThrust } from '$core/physics/engines';
import { createBoosterThrustRequest, writeBoosterThrustRequest, boosterDeliveredThrottle } from '$core/control/booster-arrival';
import { enforceEngineSupport } from '$core/physics/damage-flight';
import { step } from '$core/step';
import { throttleLowerLimit, gimbalAngleLimit } from '$core/constants';

it.each([13, 33])('subtracts the actual paid vector after warm grid loss with %i incoming engines', count => {
  const model=SUPER_HEAVY, catalogue=damageModelFor(model), initial=createInitialState(123, model);
  initial.kinematics.altitude=20000; initial.kinematics.speedY=-600;
  initial.kinematics.pitch=rad(.12); initial.kinematics.angularVelocity=.4;
  initial.vehicle.propellantMass=1000000;
  initial.vehicle.throttle=initial.vehicle.throttleCurrent=60;
  initial.vehicle.gimbalPosition=20;
  initial.vehicle.frontFinExtension=initial.vehicle.aftFinExtension=100;
  initial.status.finActive=true;
  for(let i=0;i<count;i++) initial.engines.running[i]=true;
  for(const [index, part] of catalogue.partition.components.entries()) if(part.kind==='grid-fin') {
    const root=initial.damage!.components[index]!.root;
    root.temperature=1160; root.energy=part.rootMass*steelSpecificEnthalpy(1160);
  }
  let observed=false;
  advanceFreeBody(initial, 1/120, {}, model, state=>{
    observed=true;
    expect(state.damage!.revision).toBe(1); expect(state.damage!.terminal.active).toBe(false);
    const paidMass=model.dryMass+state.vehicle.propellantMass, paid=state.forces.thrust/paidMass;
    const share=13/count, direction=.12-.2*gimbalAngleLimit;
    const paidX=paid*(share*Math.sin(direction)+(1-share)*Math.sin(.12));
    const paidY=paid*(share*Math.cos(direction)+(1-share)*Math.cos(.12));
    expect(state.forces.thrustAcceleration).toBe(paid);
    expect(state.forces.paidThrustAccelerationX).toBe(paidX);
    expect(state.forces.paidThrustAccelerationY).toBe(paidY);
    const requiredX=0-(state.kinematics.accelerationX-paidX), requiredY=10-(state.kinematics.accelerationY-paidY);
    const retained=createDamageMassProperties(); writeFlightMassQuery(state, model, retained);
    expect(retained.totalMass).toBeLessThan(paidMass);
    for(const nextCount of [3,13,33]) {
      state.engines.running.fill(false);for(let i=0;i<nextCount;i++)state.engines.running[i]=true;
      const out=createBoosterThrustRequest();writeBoosterThrustRequest(state,0,10,model,out);
      expect(out.requiredX).toBe(requiredX); expect(out.requiredY).toBe(requiredY);
      const nextShare=Math.min(nextCount,13)/nextCount;
      const nextDirectionY=nextShare*Math.cos(state.vehicle.gimbalPointingDirection)+(1-nextShare)*Math.cos(state.kinematics.pitch);
      const max=getTotalMaxThrust(state.engines.running,state.atmosphere.airPressure,model)/retained.totalMass;
      const expected=Math.max(throttleLowerLimit,Math.min(100,100*Math.max(0,requiredY)/(max*nextDirectionY)));
      expect(boosterDeliveredThrottle(state,10,model)).toBe(expected);
    }
    const cloned=cloneState(state);
    expect(cloned.forces.paidThrustAccelerationX).toBe(paidX);
    state.vehicle.gimbalPosition=-90;state.kinematics.pitch=rad(-.2);
    const out=createBoosterThrustRequest();writeBoosterThrustRequest(state,0,10,model,out);
    expect(out.requiredX).toBe(requiredX);expect(out.requiredY).toBe(requiredY);
    expect(cloned.forces.paidThrustAccelerationX).toBe(paidX);
    const support=catalogue.partition.components.findIndex(p=>p.kind==='engine-support');
    cloned.damage!.components[support]!.attached=false;
    enforceEngineSupport(cloned,model);
    writeBoosterThrustRequest(cloned,0,10,model,out);
    expect(out.deliveredX).toBe(0);expect(out.deliveredY).toBe(0);
    expect(boosterDeliveredThrottle(cloned,10,model)).toBe(100);
    expect(cloned.engines.running.some(Boolean)).toBe(false);
    expect(cloned.engines.ignitionCountdown.every(t=>t===null)).toBe(true);
    expect(cloned.forces.paidThrustAccelerationX).toBe(paidX);
    expect(cloned.forces.paidThrustAccelerationY).toBe(paidY);
  });expect(observed).toBe(true);
});

it('retains the exact healthy thirteen-engine measured subtraction and historical null-damage formula',()=>{
  const initial=createInitialState(123,SUPER_HEAVY);
  initial.kinematics.altitude=20000;initial.kinematics.pitch=rad(.12);
  initial.vehicle.propellantMass=1000000;initial.vehicle.throttle=initial.vehicle.throttleCurrent=60;
  initial.vehicle.gimbalPosition=20;for(let i=0;i<13;i++)initial.engines.running[i]=true;
  advanceFreeBody(initial,1/120,{},SUPER_HEAVY,state=>{
    const out=createBoosterThrustRequest(),mass=SUPER_HEAVY.dryMass+state.vehicle.propellantMass;
    const x=state.forces.thrust/mass*Math.sin(state.vehicle.gimbalPointingDirection);
    const y=state.forces.thrust/mass*Math.cos(state.vehicle.gimbalPointingDirection);
    writeBoosterThrustRequest(state,0,10,SUPER_HEAVY,out);
    expect(out.requiredX).toBe(0-(state.kinematics.accelerationX-x));expect(out.requiredY).toBe(10-(state.kinematics.accelerationY-y));
    const historical=cloneState(state);historical.damage=null;
    historical.forces.paidThrustAccelerationX=999;historical.forces.paidThrustAccelerationY=999;
    writeBoosterThrustRequest(historical,0,10,SUPER_HEAVY,out);
    expect(out.requiredX).toBe(0-(state.kinematics.accelerationX-x));expect(out.requiredY).toBe(10-(state.kinematics.accelerationY-y));
  });
});

it('records only the paid partial-fuel impulse and clears its next empty interval',()=>{
  const initial=createInitialState(123,SUPER_HEAVY);
  initial.kinematics.altitude=80000;initial.vehicle.propellantMass=.5;
  initial.vehicle.throttle=initial.vehicle.throttleCurrent=60;
  for(let i=0;i<13;i++)initial.engines.running[i]=true;
  const next=step(initial,1/120,{},SUPER_HEAVY);
  expect(next.vehicle.propellantMass).toBe(0);
  expect(next.forces.thrust).toBeGreaterThan(0);
  expect(next.forces.thrust).toBeLessThan(getTotalMaxThrust(initial.engines.running,next.atmosphere.airPressure,SUPER_HEAVY)*.6);
  expect(next.forces.paidThrustAccelerationX).toBe(0);
  expect(next.forces.paidThrustAccelerationY).toBe(next.forces.thrustAcceleration);
  const empty=step(next,1/120,{},SUPER_HEAVY);
  expect(empty.forces.paidThrustAccelerationX).toBe(0);expect(empty.forces.paidThrustAccelerationY).toBe(0);
});
