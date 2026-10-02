/** Read-only Task2 measurement: actual actuator angular impulses, no model copy. */
import { createScenarioState, getScenario } from '../../../src/core/scenarios';
import { toggleAutoLand, toggleAutoDeorbit } from '../../../src/core/control/commands';
import * as C from '../../../src/core/constants';
import { getFrontFinDrag, getAftFinDrag, relativeAirspeed } from '../../../src/core/physics/aero';
import { airVelocityX } from '../../../src/core/physics/wind';
import { createMassProperties } from '../../../src/core/physics/mass';
import { step } from '../../../src/core/step';

for (const id of ['before-flip', 'reentry', 'deorbit']) {
  let state = createScenarioState(getScenario(id)!);
  if (id === 'deorbit') toggleAutoDeorbit(state);
  else toggleAutoLand(state);
  const dt = 1 / 120;
  const cap = id === 'deorbit' ? 4000 : 900;
  let rcsImpulse = 0, finImpulse = 0, gimbalImpulse = 0, bodyImpulse = 0;
  let peakMoment = 0, saturatedRcsSteps = 0, saturatedPitchSteps = 0;
  let peakTemperature = 0, seconds = 0, finCannotHoldSteps = 0;
  let worstStaticResidual = 0;
  for (let i = 0; i < cap / dt; i++) {
    const before = state;
    state = step(state, dt);
    const f = state.forces, inertia = state.vehicle.vehicleMomentOfInertia;
    rcsImpulse += Math.abs(f.rcsThrustAngularAcceleration) * inertia * dt;
    finImpulse += Math.abs(f.frontFinDragAngularAcceleration + f.aftFinDragAngularAcceleration) * inertia * dt;
    gimbalImpulse += Math.abs(f.thrustVectorAcceleration) * inertia * dt;
    bodyImpulse += Math.abs(f.bodyAerodynamicMoment) * dt;
    peakMoment = Math.max(peakMoment, Math.abs(f.bodyAerodynamicMoment));
    peakTemperature = Math.max(peakTemperature, f.surfaceTemperature);
    const props = createMassProperties(state.vehicle.propellantMass);
    const speed = relativeAirspeed(state.kinematics.speedX, state.kinematics.speedY,
      airVelocityX(before.world, state.kinematics.altitude), before.world.gustVertical);
    const front = getFrontFinDrag(state.atmosphere.airDensity, speed, state.kinematics.angleOfAttack,
      state.kinematics.angleInToTheWind, Math.sin(C.finActuationMaxAngle)) * props.frontFinArm;
    const aft = getAftFinDrag(state.atmosphere.airDensity, speed, state.kinematics.angleOfAttack,
      state.kinematics.angleInToTheWind, Math.sin(C.finActuationMaxAngle)) * props.aftFinArm;
    const need = -f.bodyAerodynamicMoment;
    const residual = Math.max(0, Math.min(front, aft) - need, need - Math.max(front, aft));
    if (residual > 1) finCannotHoldSteps++;
    worstStaticResidual = Math.max(worstStaticResidual, residual);
    if (Math.abs(f.rcsThrust) >= C.rcsMaxThrust) saturatedRcsSteps++;
    if (Math.abs(state.autopilot.pitchControl) >= 99) saturatedPitchSteps++;
    seconds = (i + 1) * dt;
    if (state.status.landed || state.failures.crashed || state.failures.inFlightBreakUp) break;
  }
  const total = rcsImpulse + finImpulse + gimbalImpulse;
  console.log(JSON.stringify({ id, seconds,
    outcome: state.status.landed ? 'landed' : state.failures.inFlightBreakUp ? 'brokeUp' : state.failures.crashed ? 'crashed' : 'timeout',
    miss: state.kinematics.downRangeDistance - state.autopilot.landingSiteXPos,
    peakTemperature, peakMoment, bodyImpulse, rcsImpulse, finImpulse, gimbalImpulse,
    rcsShare: total > 0 ? rcsImpulse / total : 0, saturatedRcsSteps, saturatedPitchSteps,
    finCannotHoldSteps, worstStaticResidual,
    gasRuntimeRemaining: state.vehicle.rcsRunTimeRemaining }));
}
