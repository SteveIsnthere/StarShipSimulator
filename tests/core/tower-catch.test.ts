/** Reject false tower success from ground touchdown, upward crossing,
 * missed physical lug, overspeed, attitude or a failed vehicle. */
import { describe,expect,it } from 'vitest';
import { catchEligible, secureTowerCatch, writeCatchPose, createCatchPose } from '$core/physics/tower-catch';
import { SUPER_HEAVY, CATCH } from '$core/vehicles/super-heavy';
import { SHIP } from '$core/vehicle';
import { createInitialState,cloneState } from '$core/state';
import { rad } from '$core/units';
import { step } from '$core/step';
import * as C from '$core/constants';

function nextUp(n:number):number {
  const bytes=new ArrayBuffer(8),view=new DataView(bytes);
  view.setFloat64(0,n);view.setBigUint64(0,view.getBigUint64(0)+1n);return view.getFloat64(0);
}
function crossing(){
  const previous=createInitialState(123,SUPER_HEAVY);
  previous.kinematics.altitude=90.6;previous.kinematics.distanceToPlanetCenter=C.planetRadius+90.6;
  previous.kinematics.downRangeDistance=C.starBaseXPos;
  previous.kinematics.speedY=-1;previous.status.onTheGround=false;
  const current=cloneState(previous);current.kinematics.altitude=90.4;
  current.kinematics.distanceToPlanetCenter=C.planetRadius+90.4;
  return {previous,current};
}

describe('physical catch eligibility',()=>{
  it('requires a descending airborne lug crossing, and accepts the frozen speed/position boundaries',()=>{
    const {previous,current}=crossing();
    previous.kinematics.speedX=current.kinematics.speedX=1;
    previous.kinematics.speedY=current.kinematics.speedY=-4.5;
    previous.kinematics.downRangeDistance=current.kinematics.downRangeDistance=C.starBaseXPos+2.25;
    expect(catchEligible(previous,current,SUPER_HEAVY)).toBe(true);
    expect(catchEligible(previous,current,SHIP)).toBe(false);
    expect(catchEligible(current,previous,SUPER_HEAVY)).toBe(false);
    expect(catchEligible(previous,previous,SUPER_HEAVY)).toBe(false);
  });
  it('rejects the next representable speed or position beyond each fixed bound',()=>{
    for(const field of ['speedX','speedY','downRangeDistance'] as const){
      const {previous,current}=crossing();
      const outside=field==='speedX'?nextUp(1):field==='speedY'?-nextUp(4.5):nextUp(C.starBaseXPos+2.25);
      previous.kinematics[field]=current.kinematics[field]=outside;
      expect(catchEligible(previous,current,SUPER_HEAVY),field).toBe(false);
    }
  });
  it('checks the actual rotated lug and terminal angular motion rather than body altitude alone',()=>{
    const {previous,current}=crossing();
    previous.kinematics.pitch=current.kinematics.pitch=rad(CATCH.maxPitch);
    const offset=29.5*Math.sin(CATCH.maxPitch);
    previous.kinematics.downRangeDistance=current.kinematics.downRangeDistance=C.starBaseXPos-offset;
    previous.kinematics.altitude=120-29.5*Math.cos(CATCH.maxPitch)+.1;
    current.kinematics.altitude=previous.kinematics.altitude-.2;
    expect(catchEligible(previous,current,SUPER_HEAVY)).toBe(true);
    previous.kinematics.pitch=current.kinematics.pitch=rad(nextUp(CATCH.maxPitch));
    expect(catchEligible(previous,current,SUPER_HEAVY)).toBe(false);
    previous.kinematics.pitch=current.kinematics.pitch=rad(0);
    previous.kinematics.angularVelocity=current.kinematics.angularVelocity=1;
    expect(catchEligible(previous,current,SUPER_HEAVY)).toBe(false);
  });
  it('rejects failed vehicles and ground contact',()=>{
    for(const failure of ['crashed','inFlightBreakUp','fuelRunOut'] as const){
      const {previous,current}=crossing();current.failures[failure]=true;
      expect(catchEligible(previous,current,SUPER_HEAVY)).toBe(false);
    }
    const {previous,current}=crossing();current.kinematics.altitude=35;
    expect(catchEligible(previous,current,SUPER_HEAVY)).toBe(false);
  });
});

describe('secured tower contact',()=>{
  it('rejects even a quarter-metre-per-second booster ground descent, while zero-speed support remains safe',()=>{
    for (const model of [SHIP, SUPER_HEAVY]) {
      const s=createInitialState(123,model);
      s.kinematics.altitude=model.height/2;
      s.kinematics.distanceToPlanetCenter=C.planetRadius+s.kinematics.altitude;
      s.status.onTheGround=false;s.kinematics.speedY=-.25;
      const grounded=step(s,1/120,{},model);
      expect(grounded.failures.crashed).toBe(model.id==='super-heavy');
      expect(grounded.status.landed).toBe(false);
      expect(grounded.kinematics.speedY).toBe(0);
      s.kinematics.speedY=0;
      const supported=step(s,1/120,{},model);
      expect(supported.failures.crashed).toBe(false);
      expect(supported.status.landed).toBe(false);expect(supported.status.onTheGround).toBe(true);
      expect(supported.kinematics.altitude).toBe(model.height/2);
    }
  });
  it('secures the actual interpolated crossing pose, cancels all engines and preserves remaining fuel',()=>{
    const {previous,current}=crossing();
    previous.kinematics.downRangeDistance=C.starBaseXPos-1;
    current.kinematics.downRangeDistance=C.starBaseXPos+1;
    current.engines.running.fill(true);current.engines.ignitionCountdown.fill(.7);
    const fuel=current.vehicle.propellantMass;
    expect(secureTowerCatch(previous,current,SUPER_HEAVY)).toBe(true);
    const pose=createCatchPose();writeCatchPose(current,SUPER_HEAVY,pose);
    expect(pose.altitude).toBe(120);expect(pose.x).toBe(C.starBaseXPos);
    expect(current.status.landed).toBe(true);expect(current.status.onTheGround).toBe(false);
    expect(current.kinematics.speedX).toBe(0);expect(current.kinematics.speedY).toBe(0);
    expect(current.kinematics.angularVelocity).toBe(0);
    expect(current.engines.running.some(Boolean)).toBe(false);
    expect(current.engines.ignitionCountdown.every(v=>v===null)).toBe(true);
    expect(current.vehicle.propellantMass).toBe(fuel);
    for(let i=0;i<10;i++) {
      const held=step(current,1/120,{},SUPER_HEAVY);
      expect(held.status.landed).toBe(true);expect(held.kinematics.altitude).toBe(current.kinematics.altitude);
    }
  });
  it('cannot report a slow ground touchdown as a catch',()=>{
    const s=createInitialState(123,SUPER_HEAVY);
    s.kinematics.altitude=35.4;s.kinematics.distanceToPlanetCenter=C.planetRadius+35.4;
    s.kinematics.speedY=-1;s.status.onTheGround=false;
    const next=step(s,1/120,{},SUPER_HEAVY);
    expect(next.status.landed).toBe(false);
    expect(next.failures.crashed).toBe(true);
  });
  it('does not move or stop a missed crossing',()=>{
    const {previous,current}=crossing();
    previous.kinematics.downRangeDistance=current.kinematics.downRangeDistance=C.starBaseXPos+3;
    const original=cloneState(current);
    expect(secureTowerCatch(previous,current,SUPER_HEAVY)).toBe(false);
    expect(current).toEqual(original);
  });
  it('captures through the real integrator and remains airborne on following steps',()=>{
    const s=createInitialState(123,SUPER_HEAVY);
    s.kinematics.altitude=90.501;s.kinematics.distanceToPlanetCenter=C.planetRadius+90.501;
    s.kinematics.downRangeDistance=C.starBaseXPos;s.kinematics.speedY=-1;s.status.onTheGround=false;
    const caught=step(s,1/120,{},SUPER_HEAVY);
    expect(caught.status.landed).toBe(true);expect(caught.status.onTheGround).toBe(false);
    expect(caught.kinematics.altitude).toBe(90.5);
    expect(step(caught,1/120,{},SUPER_HEAVY).status.landed).toBe(true);
  });
});
