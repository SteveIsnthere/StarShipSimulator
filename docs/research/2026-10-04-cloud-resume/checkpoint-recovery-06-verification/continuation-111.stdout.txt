import {describe,expect,it} from 'vitest';
import raw from '../fixtures/booster-terminal-allocation.json';
import {cloneState,type SimState} from '$core/state';
import {createScenarioVehicle,PRESETS} from '$core/scenarios';
import {runBoosterPolicy,alignBooster} from '$core/autopilot/booster';
import {originalAlign} from '../proofs/fixtures/booster-alignment-before-terminal-grid';
import {SUPER_HEAVY} from '$core/vehicles/super-heavy';
import {damageModelFor} from '$core/physics/damage-model';
import {controlTranslation,frontFinActuation} from '$core/control/actuation';
import {createMassProperties} from '$core/physics/mass';
import {createDamageMassProperties} from '$core/physics/damage-mass';
import {writeFlightMassQuery} from '$core/physics/flight-mass-query';
import {writeFlightGridForces} from '$core/physics/damage-flight';
import {createGridFinForces} from '$core/physics/grid-fins';
import {rad} from '$core/units';
import * as C from '$core/constants';
const DT=1/120;
function state(time:'320'|'330'='330'):SimState {
 const initial=createScenarioVehicle(PRESETS.find(p=>p.id==='booster-sep')!).state;
 const snapshot=raw.states[time];expect(initial.world.wind).toBe(0);expect(snapshot.rng.counters.turbulence).toBe(0);
 return cloneState({...initial,...snapshot,world:{...initial.world,environmentTime:snapshot.time}} as unknown as SimState);
}
function gridTorque(s:SimState):number {
 const arms=createMassProperties(),mass=createDamageMassProperties(),out=createGridFinForces();writeFlightMassQuery(s,SUPER_HEAVY,mass,arms);
 writeFlightGridForces(s,s.atmosphere.airDensity,s.kinematics.speedX,s.kinematics.speedY,s.kinematics.pitch,arms,SUPER_HEAVY,out);
 return out.torque;
}
describe('active terminal delivered grid and finite RCS allocation',()=>{
 it.each(['320','330'] as const)('requests physical grid help on the retained actual %ss input without instant torque credit',time=>{
  const s=state(time),before=cloneState(s),old=cloneState(s);originalAlign(old,rad(0),.5,SUPER_HEAVY);
  runBoosterPolicy(s,DT,SUPER_HEAVY);
  expect(s.status.finActive).toBe(true);expect(s.autopilot.boosterFinControl).toBeLessThan(0);
  expect(Math.abs(s.autopilot.boosterFinControl!)).toBeLessThanOrEqual(100);
  expect(s.autopilot.rcsThrustCommand).toBe(old.autopilot.rcsThrustCommand);
  expect(s.forces).toEqual(before.forces);expect(s.vehicle.rcsRunTimeRemaining).toBe(before.vehicle.rcsRunTimeRemaining);
  expect(s.vehicle.frontFinExtension).toBe(before.vehicle.frontFinExtension);expect(s.kinematics).toEqual(before.kinematics);
  expect(s.damage).toEqual(before.damage);expect(s.rng).toEqual(before.rng);
 });
 it('pays only current delivery, slews one physical percentage, and reduces the next delivered residual',()=>{
  const s=state(),before=cloneState(s),old=cloneState(s);originalAlign(old,rad(0),.5,SUPER_HEAVY);
  const first=old.autopilot.rcsThrustCommand;
  runBoosterPolicy(s,DT,SUPER_HEAVY);expect(s.autopilot.rcsThrustCommand).toBe(first);
  const requested=50+s.autopilot.boosterFinControl!/2;
  frontFinActuation(s,requested,DT);
  expect(s.vehicle.frontFinExtension).toBe(before.vehicle.frontFinExtension-1);
  expect(s.forces).toEqual(before.forces);expect(s.vehicle.rcsRunTimeRemaining).toBe(before.vehicle.rcsRunTimeRemaining);
  expect(gridTorque(s)).toBeLessThan(gridTorque(before));
  // Isolated next allocation at the same recorded body state. Only delivered
  // fin position differs; this is an actuator witness, never a new flight.
  runBoosterPolicy(s,DT,SUPER_HEAVY);
  expect(Math.abs(s.autopilot.rcsThrustCommand)).toBeLessThan(Math.abs(first));
  const reserve=s.vehicle.rcsRunTimeRemaining,command=s.autopilot.rcsThrustCommand;
  controlTranslation(s,s.autopilot.pitchControl,DT,SUPER_HEAVY);
  expect(s.forces.rcsThrust).toBe(command);
  expect(s.vehicle.rcsRunTimeRemaining).toBe((reserve*(1/DT)-Math.abs(command)/C.rcsMaxThrust)/(1/DT));
  expect(Math.abs(s.vehicle.frontFinExtension-before.vehicle.frontFinExtension)).toBeLessThanOrEqual(2);
 });
 it.each(['zero-pressure','absent-grid'] as const)('cannot borrow target torque with %s',cause=>{
  const s=state();if(cause==='zero-pressure')s.atmosphere.airDensity=0;
  else {const components=damageModelFor(SUPER_HEAVY).partition.components;for(let i=0;i<components.length;i++)if(components[i]!.kind==='grid-fin')s.damage!.components[i]!.attached=false;}
  const old=cloneState(s);originalAlign(old,rad(0),.5,SUPER_HEAVY);runBoosterPolicy(s,DT,SUPER_HEAVY);
  expect(gridTorque(s)).toBe(0);expect(s.autopilot.boosterFinControl).toBe(0);
  expect(s.autopilot.rcsThrustCommand).toBe(old.autopilot.rcsThrustCommand);
 });
 it('keeps a depleted RCS reserve finite while grids still request actual slew',()=>{
  const s=state();s.vehicle.rcsRunTimeRemaining=0;runBoosterPolicy(s,DT,SUPER_HEAVY);
  expect(s.status.finActive).toBe(true);expect(s.autopilot.boosterFinControl).toBeLessThan(0);
  expect(s.autopilot.rcsThrustCommand).toBe(0);controlTranslation(s,s.autopilot.pitchControl,DT,SUPER_HEAVY);
  expect(s.forces.rcsThrust).toBe(0);expect(s.vehicle.rcsRunTimeRemaining).toBe(0);
  expect(s.vehicle.frontFinExtension).toBe(49);
 });
});
describe('unchanged ordinary alignment numerical proof',()=>{
 it('matches every full old output exactly outside explicit active terminal allocation',()=>{
  for(const powered of [false,true])for(const phase of ['coast','boostback','align-boost','entry','terminal'] as const)
   for(const goal of [-.4,0,.7])for(const time of [.5,1.5])for(const hardware of ['retained','absent-grid'] as const) {
    const s=state();s.autopilot.boosterPhase=phase;
    if(!powered){s.forces.thrust=0;s.engines.running.fill(false);}
    if(hardware==='absent-grid'){const parts=damageModelFor(SUPER_HEAVY).partition.components;for(let i=0;i<parts.length;i++)if(parts[i]!.kind==='grid-fin')s.damage!.components[i]!.attached=false;}
    const original=cloneState(s);originalAlign(original,rad(goal),time,SUPER_HEAVY);alignBooster(s,rad(goal),time,SUPER_HEAVY);
    expect(s).toEqual(original);
   }
 });
});
