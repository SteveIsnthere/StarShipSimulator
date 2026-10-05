/** Force laws must reject absent flow, mirror correctly, saturate and do no
 * positive aerodynamic work; real step/actuator tests follow the helper laws. */
import { describe, expect, it } from 'vitest';
import { createGridFinForces, writeGridFinForces } from '$core/physics/grid-fins';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { rad } from '$core/units';
import { createInitialState, cloneState } from '$core/state';
import { step } from '$core/step';
import * as C from '$core/constants';

describe('three V3 grid-fin force laws',()=>{
  const evaluate=(rho:number,vx:number,vy:number,delta:number,pitch=0,com=72 / 2)=>{
    const out=createGridFinForces();
    writeGridFinForces(rho,vx,vy,rad(delta),rad(pitch),com,SUPER_HEAVY,out);
    return out;
  };
  it('produces no force without density, speed or deflection',()=>{
    for(const args of [[0,0,-100,.2],[1,0,0,.2],[1,0,-100,0]]) {
      expect(evaluate(...args as [number,number,number,number])).toEqual({forceX:0,forceY:0,torque:0,drag:0,lift:0});
    }
  });
  it('applies the bounded flat-plate lift and drag at the physical upper station',()=>{
    const f=evaluate(1,0,-100,Math.PI/4);
    const lift = .5 * 100 ** 2 * 27;
    const drag = lift * 1.2 * Math.sin(Math.PI / 4) ** 2;
    const arm = 0.90 * 72 - 36;
    expect(f.forceX).toBeCloseTo(lift,8);
    expect(f.forceY).toBeCloseTo(drag,8);
    expect(f.torque).toBeCloseTo(arm * lift,6);
    expect(f.drag).toBeCloseTo(drag,8);
    const mirror=evaluate(1,0,-100,-Math.PI/4);
    expect(mirror.forceX).toBe(-f.forceX);expect(mirror.forceY).toBe(f.forceY);
    expect(mirror.torque).toBe(-f.torque);
    expect(evaluate(1,0,-100,Math.PI/2)).toEqual(f);
    expect(evaluate(1,0,-100,-Math.PI/2)).toEqual(mirror);
  });
  it('never adds kinetic energy and rotates the station torque with the body',()=>{
    for(const vx of [-100,0,100]) for(const vy of [-100,0,100]) for(const delta of [-1,-.2,0,.2,1]) {
      const f=evaluate(1,vx,vy,delta,Math.PI/2);
      expect(f.forceX*vx+f.forceY*vy).toBeLessThanOrEqual(1e-8);
      expect(f.torque).toBeCloseTo(-(0.90 * 72 - 36) * f.forceY,6);
    }
  });
});

describe('physical grid fins and actuator propagation',()=>{
  it('deflects from neutral with finite slew and produces real lateral acceleration/torque',()=>{
    const s=createInitialState(123,SUPER_HEAVY);
    expect(s.vehicle.frontFinExtension).toBe(50);
    s.kinematics.altitude=1000;s.kinematics.distanceToPlanetCenter=C.planetRadius+1000;
    s.kinematics.speedY=-100;s.status.onTheGround=false;s.status.finActive=true;
    const neutral=step(cloneState(s),1/120,{},SUPER_HEAVY);
    const deflected=cloneState(s);deflected.vehicle.frontFinExtension=100;
    const fin=step(deflected,1/120,{},SUPER_HEAVY);
    expect(fin.kinematics.speedX).toBeGreaterThan(neutral.kinematics.speedX);
    expect(fin.forces.frontFinDragAngularAcceleration).toBeGreaterThan(0);
    const commanded=step(s,1/120,{pitchControl:100},SUPER_HEAVY);
    expect(commanded.vehicle.frontFinExtension).toBe(51);
    expect(s.vehicle.frontFinExtension).toBe(50);
  });
  it('locked or inactive fins return to neutral rather than applying a permanent steering force',()=>{
    for(const finLocked of [true,false]) {
      const s=createInitialState(123,SUPER_HEAVY);
      s.kinematics.altitude=1000;s.kinematics.distanceToPlanetCenter=C.planetRadius+1000;
      s.vehicle.frontFinExtension=60;s.status.finActive=false;s.status.finLocked=finLocked;
      expect(step(s,1/120,{pitchControl:100},SUPER_HEAVY).vehicle.frontFinExtension).toBe(59);
    }
  });
});
