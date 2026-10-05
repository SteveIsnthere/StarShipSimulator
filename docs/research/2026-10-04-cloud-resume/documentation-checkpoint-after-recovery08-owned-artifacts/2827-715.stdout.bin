// Frozen pre-terminal-grid numerical oracle. Source SHA256: 2946bd4a42778bc26dc97d663572de893ecb4719b3a077b9ce84bc9711735697
import type {SimState} from '$core/state';
import type {VehicleDefinition} from '$core/vehicle';
import {rad,type Rad} from '$core/units';
import * as C from '$core/constants';
import {gimballedShare} from '$core/physics/engines';
import {createMassProperties} from '$core/physics/mass';
import {createGridFinForces} from '$core/physics/grid-fins';
import {createDamageMassProperties} from '$core/physics/damage-mass';
import {writeFlightMassQuery} from '$core/physics/flight-mass-query';
import {writeFlightGridForces} from '$core/physics/damage-flight';
import {airVelocityX} from '$core/physics/wind';
const arms=createMassProperties(),retained=createDamageMassProperties(),grid=createGridFinForces();
const clamp=(value:number,low:number,high:number)=>Math.max(low,Math.min(high,value));
export function originalAlign(state: SimState, goal: Rad, time: number, model: VehicleDefinition): void {
  const k = state.kinematics, a = state.autopilot;
  const error = Math.atan2(Math.sin(goal - k.pitch), Math.cos(goal - k.pitch));
  writeFlightMassQuery(state, model, retained, arms);
  const torque = (error / time ** 2 - 2 * k.angularVelocity / time
    - (retained.engineSupportAvailable?state.forces.offAxisThrustDifferenceAcceleration:0)
    - state.forces.angularDragAcceleration) * (state.damage?retained.momentOfInertia:state.vehicle.vehicleMomentOfInertia);
  const steerable = (retained.engineSupportAvailable?state.forces.thrust:0) * gimballedShare(state.engines.running, state.atmosphere.airPressure, model);
  const fins = model.gridFins!;
  const vx = k.speedX - airVelocityX(state.world,k.altitude), vy = k.speedY - state.world.gustVertical;
  writeFlightGridForces(state,state.atmosphere.airDensity,vx,vy,k.pitch,arms,model,grid);
  // Credit delivered positions, not the targets they are still slewing toward.
  const deliveredGridTorque=grid.torque;
  const supplied=deliveredGridTorque + steerable*arms.engineArm
    *Math.sin(state.vehicle.gimbalPosition*.01*C.gimbalAngleLimit);
  if (steerable > 0) {
    const angle = Math.asin(clamp((torque-deliveredGridTorque) / (steerable * arms.engineArm), -Math.sin(C.gimbalAngleLimit), Math.sin(C.gimbalAngleLimit)));
    a.pitchControl = angle / C.gimbalAngleLimit * 100;
    a.boosterFinControl = 0;
    state.status.finActive = false;
  } else {
    a.pitchControl = 0;
    state.status.finActive = true;
    writeFlightGridForces(state,state.atmosphere.airDensity,vx,vy,k.pitch,arms,model,grid,rad(-fins.maxAngle));
    const lowTorque = grid.torque;
    writeFlightGridForces(state,state.atmosphere.airDensity,vx,vy,k.pitch,arms,model,grid,rad(fins.maxAngle));
    const highTorque = grid.torque;
    let low = -fins.maxAngle, high = fins.maxAngle;
    if (Math.abs(highTorque - lowTorque) > 1) {
      for (let i = 0; i < 14; i++) {
        const middle = (low + high) / 2;
        writeFlightGridForces(state,state.atmosphere.airDensity,vx,vy,k.pitch,arms,model,grid,rad(middle));
        if ((grid.torque < torque) === (highTorque > lowTorque)) low = middle;
        else high = middle;
      }
      const delta = (low + high) / 2;
      a.boosterFinControl = delta / fins.maxAngle * 100;
      writeFlightGridForces(state,state.atmosphere.airDensity,vx,vy,k.pitch,arms,model,grid,rad(delta));
    } else a.boosterFinControl = 0;
  }
  state.status.rcsActive = state.vehicle.rcsRunTimeRemaining > 0;
  a.rcsThrustCommand = state.status.rcsActive
    ? clamp((torque - supplied) / arms.rcsArm, -C.rcsMaxThrust, C.rcsMaxThrust) : 0;
  // Booster automatic RCS remains proportional even at full gimbal; actuation
  // pays the delivered command. Manual full-yoke retains its legacy behaviour.
}

