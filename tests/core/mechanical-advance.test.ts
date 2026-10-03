/** The forecast seam uses the actual integrator, replacing only its control
 * callback. These short witnesses are not prescribed scenario flights. */
import { describe,expect,it } from 'vitest';
import { advanceMechanics,step } from '$core/step';
import { createInitialState,cloneState,type SimState } from '$core/state';
import { SHIP } from '$core/vehicle';
import { toggleAllRaptors } from '$core/control/commands';

describe('shared mechanical advance',()=>{
  it('uses exactly the same uncontrolled Ship mechanics',()=>{
    const s=createInitialState(123);s.kinematics.altitude=10000;
    s.kinematics.speedX=100;s.kinematics.speedY=-50;
    const before=cloneState(s);
    expect(advanceMechanics(s,1/120,()=>{},SHIP)).toEqual(step(s,1/120,{},SHIP));
    expect(s).toEqual(before);
  });
  it('runs the supplied control law once after motion, without recursing into the real autopilot',()=>{
    const s=createInitialState(123);s.autopilot.autoTakeOffOn=true;
    const before=cloneState(s);let calls=0;
    const control=(next:SimState)=>{calls++;next.vehicle.throttle=73;toggleAllRaptors(next);};
    const next=advanceMechanics(s,1/120,control,SHIP);
    expect(calls).toBe(1);expect(next.autopilot.autoTakeOffInitialised).toBe(false);
    expect(next.vehicle.throttle).toBe(73);expect(next.rng.counters.ignitionFailure).toBe(3);
    expect(s).toEqual(before);expect(s.rng.counters.ignitionFailure).toBe(0);
    expect(next.world.updatedFrameCount).toBe(s.world.updatedFrameCount+1);
  });
});
