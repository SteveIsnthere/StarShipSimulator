/** Short command witnesses, not additional full-flight diagnosis attempts. */
import { describe,expect,it } from 'vitest';
import { createScenarioVehicle,PRESETS } from '$core/scenarios';
import { controlTranslation } from '$core/control/actuation';
import { runBoosterAutopilot } from '$core/autopilot/booster';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import * as C from '$core/constants';
import admission from '../fixtures/booster-terminal-admission.json';
import { cloneState,createInitialState, type SimState } from '$core/state';
import { createCatchPose, writeCatchPose } from '$core/physics/tower-catch';
import { getAttackAngles, getAngleOfMotion } from '$core/physics/aero';
import { advanceMechanics,step } from '$core/step';
import { rad } from '$core/units';
import { landingBurnStartAltitude,createBurnScratch } from '$core/control/guidance-physics';
import { IGNITION_DELAY_MAX_S } from '$core/physics/engines';
import { verticalGravityAcceleration } from '$core/physics/gravity';
import { createBoosterArrival,writeBoosterArrival,createBoosterThrustRequest,writeBoosterThrustRequest,writeBoosterForceRequest,boosterDeliveredThrottle } from '$core/control/booster-arrival';

function booster(){return createScenarioVehicle(PRESETS.find(p=>p.id==='booster-sep')!,123).state;}

describe('booster delivered attitude authority',()=>{
  it('constructs finite actual pitch history before immutable first-source planning',()=>{
    const spawn=createInitialState(123,SUPER_HEAVY);
    expect(spawn.kinematics.pitchRecord).toEqual([spawn.kinematics.pitch,spawn.kinematics.pitch]);
    for(const id of ['booster-sep','rtls']) {
      const initial=createScenarioVehicle(PRESETS.find(p=>p.id===id)!,123).state;
      expect(initial.kinematics.pitchRecord).toEqual([initial.kinematics.pitch,initial.kinematics.pitch]);
      initial.autopilot.autoLandOn=true;
      const returned=step(initial,1/120,{},SUPER_HEAVY);
      for(const value of [returned,returned.autopilot.boosterPrediction!.origin]) {
        expect(value.kinematics.pitchRecord.every(Number.isFinite)).toBe(true);
        expect(Number.isFinite(value.kinematics.pitchRateOfChange)).toBe(true);
      }
    }
  });
  it('retains and pays bounded proportional RCS while the automatic gimbal saturates',()=>{
    const s=booster();s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='entry';
    s.autopilot.boosterFinControl=0;s.autopilot.rcsThrustCommand=200000;
    s.status.rcsActive=true;s.status.translationModeOn=true;
    const reserve=s.vehicle.rcsRunTimeRemaining;
    controlTranslation(s,100,.01,SUPER_HEAVY);
    expect(s.forces.rcsThrust).toBe(200000);
    expect(s.vehicle.rcsRunTimeRemaining).toBeCloseTo(reserve-.0025,12);
    expect(s.vehicle.gimbalPosition).toBe(6);
    expect(s.autopilot.rcsThrustCommand).toBe(0);
  });
  it('retains the manual full-yoke RCS capability on the actual booster',()=>{
    const s=booster();s.autopilot.manualControlOn=true;s.autopilot.boosterFinControl=100;
    s.autopilot.rcsThrustCommand=200000;s.status.rcsActive=true;
    const reserve=s.vehicle.rcsRunTimeRemaining;
    controlTranslation(s,-100,.01,SUPER_HEAVY);
    expect(s.forces.rcsThrust).toBe(-C.rcsMaxThrust);
    expect(s.vehicle.rcsRunTimeRemaining).toBeCloseTo(reserve-.01,12);
  });
  it('lets an explicit manual input override automatic proportional RCS',()=>{
    const s=booster();s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='entry';
    s.autopilot.boosterFinControl=0;s.autopilot.rcsThrustCommand=200000;
    s.status.rcsActive=true;
    controlTranslation(s,-100,.01,SUPER_HEAVY,true);
    expect(s.forces.rcsThrust).toBe(-C.rcsMaxThrust);
  });
  it('does not credit requested gimbal torque before the actuator reaches it',()=>{
    const s=booster();s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='boostback';
    s.autopilot.boostBackInitCompleted=true;s.autopilot.boostBackDirection=1;
    s.autopilot.boosterPredictorCountdown=1;s.autopilot.boosterRangeError=-10000;
    s.kinematics.pitch=rad(0);s.kinematics.angularVelocity=0;
    s.vehicle.gimbalPosition=0;s.forces.thrust=1000000;
    s.engines.running.fill(false);s.engines.running[0]=true;
    runBoosterAutopilot(s,1/120,SUPER_HEAVY);
    expect(s.autopilot.pitchControl).toBe(100);
    expect(s.status.rcsActive).toBe(true);
    expect(s.autopilot.rcsThrustCommand).toBe(C.rcsMaxThrust);
  });
});


describe('booster continuous entry handoff',()=>{
  it('reserves startup distance for cold centres but not already delivered landing thrust',()=>{
    const s=booster();s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='entry';
    s.autopilot.boosterEntryCentreOnly=true;s.kinematics.pitch=rad(0);s.kinematics.angularVelocity=0;
    s.kinematics.speedX=0;s.kinematics.speedY=-250;s.kinematics.downRangeDistance=C.starBaseXPos;
    s.vehicle.propellantMass=130000;s.vehicle.vehicleMass=330000;
    s.engines.running.fill(false);for(let i=0;i<3;i++)s.engines.running[i]=true;
    const scratch=createBurnScratch(),gravity=-verticalGravityAcceleration(C.planetRadius+8000,0);
    const ready=landingBurnStartAltitude(3,330000,250,90.5,scratch,SUPER_HEAVY)!;
    const cold=landingBurnStartAltitude(3,330000,250+gravity*IGNITION_DELAY_MAX_S,90.5,scratch,SUPER_HEAVY)!;
    const delayed=cold+250*IGNITION_DELAY_MAX_S+.5*gravity*IGNITION_DELAY_MAX_S**2;
    expect(delayed).toBeGreaterThan(ready);s.kinematics.altitude=(ready+delayed)/2;
    const unlit=cloneState(s);unlit.engines.running.fill(false);
    const throttled=cloneState(s);throttled.vehicle.throttleCurrent=40;
    runBoosterAutopilot(s,1/120,SUPER_HEAVY);
    runBoosterAutopilot(unlit,1/120,SUPER_HEAVY);
    runBoosterAutopilot(throttled,1/120,SUPER_HEAVY);
    expect(s.autopilot.boosterPhase).toBe('entry');
    expect(unlit.autopilot.boosterPhase).toBe('terminal');
    expect(throttled.autopilot.boosterPhase).toBe('terminal');
    expect(s.engines.running.slice(0,3)).toEqual([true,true,true]);
  });

  it('reduces paid13-engine entry to three feasible centres without repeated shutdown/ignition',()=>{
    const s=booster();s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='entry';
    s.kinematics.altitude=8000;s.kinematics.pitch=rad(0);s.kinematics.angularVelocity=0;
    s.kinematics.speedX=0;s.kinematics.speedY=-250;
    s.kinematics.downRangeDistance=C.starBaseXPos;
    s.kinematics.accelerationX=0;s.kinematics.accelerationY=-9.8;
    s.vehicle.propellantMass=130000;s.vehicle.vehicleMass=330000;
    s.vehicle.gimbalPointingDirection=rad(0);s.atmosphere.airPressure=101.325;s.forces.thrust=0;
    s.engines.running.fill(false);for(let i=0;i<13;i++)s.engines.running[i]=true;
    const draws=s.rng.counters.ignitionFailure;
    runBoosterAutopilot(s,1/120,SUPER_HEAVY);
    expect(s.autopilot.boosterPhase).toBe('entry');
    expect(s.engines.running.filter(Boolean)).toHaveLength(3);
    expect(s.engines.running.slice(0,3)).toEqual([true,true,true]);
    expect(s.engines.ignitionCountdown.every(v=>v===null)).toBe(true);
    expect(s.vehicle.throttle).toBeGreaterThan(40);expect(s.vehicle.throttle).toBeLessThan(100);
    runBoosterAutopilot(s,1/120,SUPER_HEAVY);
    expect(s.engines.running.filter(Boolean)).toHaveLength(3);
    expect(s.rng.counters.ignitionFailure).toBe(draws);
  });
});

describe('booster finite descending terminal command',()=>{
  it('uses delivered gimbal for translation while paid torque control keeps the terminal hull upright',()=>{
    let s=booster();s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='terminal';
    s.autopilot.boosterArrivalTime=15;s.kinematics.altitude=1000;
    s.kinematics.downRangeDistance=C.starBaseXPos-20;s.kinematics.pitch=rad(0);s.kinematics.angularVelocity=0;
    s.kinematics.speedX=0;s.kinematics.speedY=-100;
    s.vehicle.propellantMass=100000;s.vehicle.vehicleMass=300000;
    s.engines.running.fill(false);for(let i=0;i<3;i++)s.engines.running[i]=true;
    s.vehicle.throttle=s.vehicle.throttleCurrent=60;
    const reserve=s.vehicle.rcsRunTimeRemaining;
    for(let i=0;i<120;i++)s=advanceMechanics(s,1/120,(state,dt,model)=>runBoosterAutopilot(state,dt,model,advanceMechanics),SUPER_HEAVY);
    expect(s.kinematics.speedX).toBeGreaterThan(0);
    expect(Math.abs(s.kinematics.pitch)).toBeLessThan(.5*Math.PI/180);
    expect(Math.abs(s.vehicle.gimbalPosition)).toBeGreaterThan(0);
    expect(s.vehicle.rcsRunTimeRemaining).toBeLessThan(reserve);
    expect(s.vehicle.rcsRunTimeRemaining).toBeGreaterThan(0);
    expect(Object.values(s.failures).some(Boolean)).toBe(false);
  });

  it('keeps its deadline falling when vertical velocity stops or reverses',()=>{
    const s=booster();s.kinematics.pitch=rad(0);s.kinematics.angularVelocity=0;
    s.kinematics.altitude=200;s.kinematics.speedY=-20;
    const out=createBoosterArrival();
    writeBoosterArrival(s,.1,SUPER_HEAVY,out);const first=out.time;
    s.kinematics.speedY=0;writeBoosterArrival(s,.1,SUPER_HEAVY,out);
    expect(out.time).toBeCloseTo(first-.1,12);
    s.kinematics.speedY=2;writeBoosterArrival(s,.1,SUPER_HEAVY,out);
    expect(out.time).toBeCloseTo(first-.2,12);
    expect(out.ay).toBeLessThan(0);
  });
  it('accounts for measured rotational point acceleration in the commanded body target',()=>{
    const s=booster();s.kinematics.downRangeDistance=C.starBaseXPos;
    s.kinematics.altitude=500;s.kinematics.pitch=rad(.12);
    s.kinematics.angularVelocity=.05;s.kinematics.angularAcceleration=.1;
    s.kinematics.speedX=-2;s.kinematics.speedY=-30;
    const out=createBoosterArrival();writeBoosterArrival(s,0,SUPER_HEAVY,out);
    const ax=out.bodyAX;
    const ay=out.bodyAY;
    const pose=createCatchPose();writeCatchPose(s,SUPER_HEAVY,pose);
    const x0=pose.x,y0=pose.altitude,h=.01;
    const points=[-h,h].map(t=>{
      const p=cloneState(s),k=p.kinematics;
      k.downRangeDistance+=k.speedX*t+.5*ax*t*t;
      k.altitude+=k.speedY*t+.5*ay*t*t;
      k.pitch=rad(k.pitch+k.angularVelocity*t+.5*k.angularAcceleration*t*t);
      const lug=createCatchPose();writeCatchPose(p,SUPER_HEAVY,lug);return lug;
    });
    // Independent second difference of the actual rotated geometry. At10ms
    // the Taylor/coordinate roundoff bound is below1e-3m/s² for this witness.
    expect((points[0]!.x+points[1]!.x-2*x0)/h**2).toBeCloseTo(out.ax,3);
    expect((points[0]!.altitude+points[1]!.altitude-2*y0)/h**2).toBeCloseTo(out.ay,3);
  });
  it('targets the rotating lug instead of the hull centre',()=>{
    const s=booster();s.kinematics.downRangeDistance=C.starBaseXPos;
    s.kinematics.pitch=rad(Math.PI/6);s.kinematics.angularVelocity=.1;
    s.kinematics.altitude=200;s.kinematics.speedX=3;s.kinematics.speedY=-20;
    const out=createBoosterArrival();writeBoosterArrival(s,0,SUPER_HEAVY,out);
    expect(out.x).toBeCloseTo(14.75,8);
    expect(out.height).toBeCloseTo(80+29.5*Math.cos(Math.PI/6),12);
    expect(out.vx).toBeCloseTo(3+2.95*Math.cos(Math.PI/6),12);
    expect(out.vy).toBeCloseTo(-21.475,12);
  });
  it('requests resumed descent instead of gravity cancellation after an early stop',()=>{
    const s=booster();s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='terminal';
    s.autopilot.boosterPredictorCountdown=1;
    s.kinematics.altitude=200;s.kinematics.speedX=0;s.kinematics.speedY=0;
    s.kinematics.downRangeDistance=C.starBaseXPos;
    s.kinematics.pitch=rad(0);s.kinematics.angularVelocity=0;
    s.vehicle.propellantMass=100000;s.vehicle.vehicleMass=300000;
    s.engines.running.fill(false);s.engines.running[0]=s.engines.running[1]=s.engines.running[2]=true;
    s.atmosphere.airPressure=101.325;s.forces.thrust=0;
    s.kinematics.accelerationX=0;s.kinematics.accelerationY=-9.8;
    runBoosterAutopilot(s,1/120,SUPER_HEAVY);
    const hover=300000*9.8/(3*C.thrustPerRaptorAt(101.325))*100;
    expect(s.vehicle.throttle).toBeLessThan(hover);
    expect(s.vehicle.throttle).toBeGreaterThanOrEqual(40);
  });
});

describe('booster feasible translational thrust',()=>{
  it('corrects the actual high-pressure force response instead of steering against it',()=>{
    const initial=cloneState(admission.state as unknown as SimState);
    const targetX=1,targetY=11,out=createBoosterThrustRequest();
    writeBoosterForceRequest(initial,targetX,targetY,SUPER_HEAVY,out);
    const commanded=cloneState(initial);
    commanded.kinematics.pitch=out.pitch;commanded.kinematics.angularVelocity=0;
    // This is a steady force proposal, not an instantaneous physical slew.
    // The incoming area uses the previous frame's attack angle in step().
    const angles=getAttackAngles(out.pitch,getAngleOfMotion(commanded.kinematics.speedX,commanded.kinematics.speedY));
    commanded.kinematics.angleOfAttack=angles.angleOfAttack;
    commanded.kinematics.angleInToTheWind=angles.angleInToTheWind;
    commanded.vehicle.gimbalPosition=0;
    commanded.vehicle.throttle=commanded.vehicle.throttleCurrent=out.throttle;
    const delivered=advanceMechanics(commanded,.001,()=>{},SUPER_HEAVY);
    // The independent physical advance must correct right at this recorded
    // descending state. Positive hull pitch instead produces leftward lift.
    expect(delivered.kinematics.accelerationX).toBeGreaterThan(0);
    expect(Math.abs(delivered.kinematics.accelerationX-targetX)).toBeLessThan(.1);
    expect(Math.abs(delivered.kinematics.accelerationY-targetY)).toBeLessThan(.1);
  });

  it('allocates vertical throttle along the delivered direction while the hull is still slewing',()=>{
    const s=cloneState(admission.state as unknown as SimState);
    const out=createBoosterThrustRequest();
    writeBoosterForceRequest(s,1,11,SUPER_HEAVY,out);
    const measuredY=s.forces.thrust/s.vehicle.vehicleMass*Math.cos(s.vehicle.gimbalPointingDirection);
    const environmentY=s.kinematics.accelerationY-measuredY;
    const max=3*C.thrustPerRaptorAt(s.atmosphere.airPressure)/s.vehicle.vehicleMass;
    const throttle=boosterDeliveredThrottle(s,11,SUPER_HEAVY);
    const actualY=environmentY+max*throttle*.01*Math.cos(s.vehicle.gimbalPointingDirection);
    expect(actualY).toBeCloseTo(11,10);
  });
  it('subtracts measured aero/gravity and preserves vertical demand when horizontal steering saturates',()=>{
    const s=booster();s.vehicle.vehicleMass=300000;s.kinematics.pitch=rad(0);
    s.vehicle.gimbalPointingDirection=rad(0);
    s.engines.running.fill(false);for(let i=0;i<13;i++)s.engines.running[i]=true;
    s.atmosphere.airPressure=101.325;s.forces.thrust=3000000;
    // Previous paid engine acceleration10m/s²; environmental residual(+3,-8).
    s.kinematics.accelerationX=3;s.kinematics.accelerationY=2;
    const out=createBoosterThrustRequest();writeBoosterThrustRequest(s,-100,2,SUPER_HEAVY,out);
    expect(out.requiredX).toBe(-103);expect(out.requiredY).toBe(10);
    expect(out.pitch).toBe(-.3);
    // Actual13-engine40% minimum exceeds this deliberately modest demand.
    expect(out.throttle).toBe(40);
    expect(out.deliveredY).toBeCloseTo(13*C.thrustPerRaptorAt(101.325)/300000*.4*Math.cos(.3),12);
    // A feasible demand uses the clamped angle, not hypot(-103,50).
    writeBoosterThrustRequest(s,-100,42,SUPER_HEAVY,out);
    expect(out.requiredY).toBe(50);
    expect(out.throttle).toBeLessThan(100);
    expect(out.deliveredY).toBeCloseTo(50,12);
  });
});
