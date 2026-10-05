/** Local terminal controls, never a prescribed preset return or catch override. */
import { describe, expect, it } from 'vitest';
import { createScenarioVehicle, PRESETS } from '$core/scenarios';
import ready from '../fixtures/booster-terminal-ready.json';
import { advanceMechanics } from '$core/step';
import admission from '../fixtures/booster-terminal-admission.json';
import { cloneState, type SimState } from '$core/state';
import { runBoosterPolicy } from '$core/autopilot/booster';
import { step } from '$core/step';
import { SUPER_HEAVY, CATCH } from '$core/vehicles/super-heavy';
import { createCatchPose, writeCatchPose } from '$core/physics/tower-catch';
import { getTotalMaxThrust } from '$core/physics/engines';
import { verticalGravityAcceleration } from '$core/physics/gravity';
import { rad } from '$core/units';
import * as C from '$core/constants';
import { createBoosterArrival, writeBoosterArrival } from '$core/control/booster-arrival';
import { HISTORICAL_SUPER_HEAVY } from '../reference/historical-vehicles';

function nearTower() {
  const s = createScenarioVehicle(PRESETS.find(p => p.id === 'rtls')!, 123).state;
  s.autopilot.autoLandOn = true;
  s.autopilot.boosterPhase = 'terminal';
  s.kinematics.altitude = 200;
  s.kinematics.downRangeDistance = C.starBaseXPos;
  s.kinematics.speedX = 0;
  s.kinematics.speedY = -20;
  s.kinematics.pitch = rad(0);
  s.kinematics.angularVelocity = 0;
  s.vehicle.propellantMass = 100000;
  s.engines.running.fill(false);
  for (let i = 0; i < 3; i++) s.engines.running[i] = true;
  s.vehicle.throttle = s.vehicle.throttleCurrent = 50;
  return s;
}

describe('physical terminal catch envelope', () => {
  it('keeps a finite terminal command through the recorded transient nominal cone rejection',()=>{
    // Historical first-job Raptor2 mechanical input: the frozen end demand
    // exceeds the nominal cone while its current bounded command is feasible.
    const s=cloneState(admission.state as unknown as SimState);
    s.damage = null;
    const demand=createBoosterArrival();writeBoosterArrival(s,0,HISTORICAL_SUPER_HEAVY,demand);
    expect(demand.lateralFeasible).toBe(false);
    const deadline=s.autopilot.boosterArrivalTime!;
    runBoosterPolicy(s,admission.dt,HISTORICAL_SUPER_HEAVY);
    expect(s.autopilot.boosterTerminalMissed).not.toBe(true);
    expect(s.engines.running.slice(0,3)).toEqual([true,true,true]);
    expect(s.autopilot.boosterArrivalTime).toBeCloseTo(deadline-admission.dt,10);
    expect(s.vehicle.throttle).toBeGreaterThanOrEqual(C.throttleLowerLimit);
    expect(s.vehicle.throttle).toBeLessThanOrEqual(100);
    // Finite expiry remains irreversible; a nominal estimate never resets it.
    s.autopilot.boosterArrivalTime=admission.dt/2;
    runBoosterPolicy(s,admission.dt,HISTORICAL_SUPER_HEAVY);
    expect(s.autopilot.boosterTerminalMissed).toBe(true);
    expect(s.engines.running.some(Boolean)).toBe(false);
  });

  it('does not size the terminal deadline around deceleration that only atmospheric drag can supply',()=>{
    const s=cloneState(admission.state as unknown as SimState);
    const demand=createBoosterArrival();writeBoosterArrival(s,0,SUPER_HEAVY,demand);
    const endAY=6*demand.height/demand.time**2+2*demand.vy/demand.time-8/demand.time;
    const endThrust=getTotalMaxThrust([true,true,true],C.SEA_LEVEL_PRESSURE_PA/1000,SUPER_HEAVY)/s.vehicle.vehicleMass;
    const endGravity=-verticalGravityAcceleration(C.planetRadius+CATCH.bodyCentreAltitude,0);
    expect(endAY).toBeLessThanOrEqual(endThrust-endGravity+1e-10);
    expect(demand.time).toBeLessThanOrEqual(60);
  });
  it('restores upright attitude before a slow near-box crossing instead of chasing zero lateral error with hull tilt',()=>{
    const s=nearTower();s.autopilot.boosterArrivalTime=.5;
    s.kinematics.altitude=CATCH.bodyCentreAltitude+1;
    s.kinematics.pitch=rad(.12);s.kinematics.speedX=-.2;s.kinematics.speedY=-2;
    s.kinematics.downRangeDistance=C.starBaseXPos-(CATCH.lugStation-SUPER_HEAVY.height/2)*Math.sin(.12)-.05;
    s.vehicle.vehicleMass=300000;
    s.forces.thrust=3*C.thrustPerRaptorAt(101.325)*.5;
    s.vehicle.gimbalPointingDirection=s.kinematics.pitch;
    s.kinematics.accelerationX=s.forces.thrust/300000*Math.sin(.12);
    s.kinematics.accelerationY=s.forces.thrust/300000*Math.cos(.12)-9.8;
    s.atmosphere.airPressure=101.325;
    runBoosterPolicy(s,1/120,SUPER_HEAVY);
    expect(s.autopilot.pitchControl).toBeLessThan(0);
    expect(s.autopilot.boosterTerminalMissed).not.toBe(true);
    expect(s.engines.running.slice(0,3)).toEqual([true,true,true]);
  });
  it.each(['booster-sep','rtls'] as const)('physically catches the recorded paid ready input %s with upright, bounded point motion',id=>{
    let s=cloneState(ready[id] as unknown as SimState),previous=s;
    for(let i=0;i<35*120 && !s.status.landed && !s.failures.crashed && !s.failures.inFlightBreakUp;i++){
      previous=s;s=advanceMechanics(s,1/120,runBoosterPolicy,SUPER_HEAVY);
    }
    expect(s.status.landed).toBe(true);expect(s.status.onTheGround).toBe(false);
    expect(s.vehicle.propellantMass).toBeGreaterThan(0);
    expect(Object.values(s.failures).some(Boolean)).toBe(false);
    expect(previous.status.landed).toBe(false);
    const lug=createCatchPose();writeCatchPose(s,SUPER_HEAVY,lug);
    expect(lug.altitude).toBeCloseTo(CATCH.planeAltitude,8);
    expect(Math.abs(lug.x-C.starBaseXPos)).toBeLessThanOrEqual(CATCH.halfWidth);
    expect(Math.abs(s.kinematics.pitch)).toBeLessThanOrEqual(CATCH.maxPitch);
    writeCatchPose(previous,SUPER_HEAVY,lug);
    expect(lug.speedY).toBeLessThan(0);expect(lug.speedY).toBeGreaterThanOrEqual(-CATCH.maxDownSpeed);
    expect(Math.abs(lug.speedX)).toBeLessThanOrEqual(CATCH.maxLateralSpeed);
  });
  it('does not reignite or spend propellant after a terminal miss has been declared',()=>{
    let s=nearTower();s.autopilot.boosterTerminalMissed=true;s.engines.running.fill(false);
    const draws=s.rng.counters.ignitionFailure, fuel=s.vehicle.propellantMass;
    for(let i=0;i<20;i++)s=step(s,1/120,{},SUPER_HEAVY);
    expect(s.rng.counters.ignitionFailure).toBe(draws);
    expect(s.vehicle.propellantMass).toBe(fuel);
    expect(s.engines.running.some(Boolean)).toBe(false);
    expect(s.status.landed).toBe(false);
  });
  it.each([
    { x: -14248.216742988676, height: 3026.574151492912, vx: 4.034696781656502, vy: -261.23402783894994, fuel: 148287.9355148848 },
    { x: -4955.058289054781, height: 2109.153738982121, vx: -12.565567938621179, vy: -228.0865254119449, fuel: 116025.38226299963 },
  ])('rejects the recorded distant handoff $x m as outside terminal lateral authority', ({ x, height, vx, vy, fuel }) => {
    const s = nearTower();
    s.kinematics.downRangeDistance = C.starBaseXPos + x;
    s.kinematics.altitude = CATCH.bodyCentreAltitude + height;
    s.kinematics.speedX = vx; s.kinematics.speedY = vy;
    s.vehicle.propellantMass = fuel; s.vehicle.vehicleMass = SUPER_HEAVY.dryMass + fuel;
    s.atmosphere.airPressure = 101.325;
    // Conservative sea-level no-drag case still has far less authority than
    // the recorded demand. Exact lug coordinates above come from saved traces.
    s.kinematics.accelerationX = 0;
    const out = createBoosterArrival();
    writeBoosterArrival(s, 0, SUPER_HEAVY, out);
    expect(out.lateralFeasible).toBe(false);
    // Also retain the historical >90m/s² demand assertion at its recorded
    // balanced deadline. The new thrust-bounded initialization is longer.
    s.autopilot.boosterArrivalTime=2*height/(-vy+2);
    writeBoosterArrival(s,0,SUPER_HEAVY,out);
    expect(out.ax).toBeGreaterThan(90);
    expect(out.lateralFeasible).toBe(false);
  });
  it('catches a nearby descending lug on its first crossing with paid fuel and no failures', () => {
    const initial = nearTower();
    const demand = createBoosterArrival();
    writeBoosterArrival(initial, 0, SUPER_HEAVY, demand);
    expect(demand.lateralFeasible).toBe(true);
    let state = initial, previous = initial;
    const lug = createCatchPose();
    for (let i = 0; i < 20 * 120 && !state.status.landed; i++) {
      previous = state;
      state = step(state, 1 / 120, {}, SUPER_HEAVY);
      expect(Object.values(state.failures).some(Boolean)).toBe(false);
    }
    expect(state.status.landed).toBe(true);
    expect(state.status.onTheGround).toBe(false);
    expect(previous.status.landed).toBe(false);
    writeCatchPose(previous, SUPER_HEAVY, lug);
    expect(lug.altitude).toBeGreaterThan(CATCH.planeAltitude);
    expect(lug.speedY).toBeLessThan(0);
    expect(lug.speedY).toBeGreaterThan(-CATCH.maxDownSpeed);
    expect(Math.abs(lug.speedX)).toBeLessThan(CATCH.maxLateralSpeed);
    writeCatchPose(state, SUPER_HEAVY, lug);
    expect(lug.altitude).toBeCloseTo(CATCH.planeAltitude, 8);
    expect(Math.abs(lug.x - C.starBaseXPos)).toBeLessThanOrEqual(CATCH.halfWidth);
    expect(state.vehicle.propellantMass).toBeGreaterThan(0);
    expect(state.vehicle.propellantMass).toBeLessThan(initial.vehicle.propellantMass);
    expect(state.engines.running.some(Boolean)).toBe(false);
    console.log(JSON.stringify({ seconds: state.world.environmentTime, fuel: state.vehicle.propellantMass,
      previousHeight: previous.kinematics.altitude, previousVX: previous.kinematics.speedX,
      previousVY: previous.kinematics.speedY, pitch: state.kinematics.pitch }));
  });
});
