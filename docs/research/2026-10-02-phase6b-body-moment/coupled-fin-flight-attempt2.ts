/** Cycle2 attempt2: corrected residual allocation, existing deadzone;: actual coupled force/controller, no disabled failures. */
import * as C from '../../../src/core/constants';
import { createScenarioState, getScenario } from '../../../src/core/scenarios';
import { toggleAutoDeorbit, toggleAutoLand } from '../../../src/core/control/commands';
import { writeFinControlFlowInto, type FinControlFlow } from '../../../src/core/control/fin-authority';
import { entryPitchOffset } from '../../../src/core/autopilot/entry';
import { wrappedAttackAngle } from '../../../src/core/physics/aero';
import { createMassProperties } from '../../../src/core/physics/mass';
import { step } from '../../../src/core/step';
import { rad } from '../../../src/core/units';

const flow: FinControlFlow = { speed: 0, attack: rad(0), hypersonic: false };
for (const id of ['reentry', 'deorbit']) {
  let s = createScenarioState(getScenario(id)!);
  if (id === 'deorbit') toggleAutoDeorbit(s); else toggleAutoLand(s);
  const dt = 1 / 120;
  let nextSample = 0, emptySeen = false, errorSeen = false, peak = 0;
  let bodyImpulse = 0, finImpulse = 0, rcsImpulse = 0, gimbalImpulse = 0;
  let outcome = 'timeout', seconds = 0;
  for (let n = 1; n <= (id === 'deorbit' ? 4000 : 900) / dt; n++) {
    const integratedRcsThrust = s.forces.rcsThrust;
    const integratedFrontExtension = s.vehicle.frontFinExtension;
    const integratedAftExtension = s.vehicle.aftFinExtension;
    s = step(s, dt);
    seconds = n * dt;
    writeFinControlFlowInto(s, flow);
    const k = s.kinematics, f = s.forces, v = s.vehicle;
    const props = createMassProperties(v.propellantMass);
    const entryStage = s.autopilot.autoLandOn && !s.autopilot.manualControlOn && !s.autopilot.aeroDescentCompleted;
    const goal = k.angleOfMotion - Math.PI / 2 + entryPitchOffset(k.machSpeed, k.speedX,
      rad(C.ENTRY_LIFT_ANGLE + s.autopilot.entryRangeTrim));
    const error = wrappedAttackAngle(k.pitch, goal);
    peak = Math.max(peak, f.surfaceTemperature);
    if (!s.failures.inFlightBreakUp) {
    bodyImpulse += Math.abs(f.bodyAerodynamicMoment) * dt;
    finImpulse += Math.abs(f.frontFinDragAngularAcceleration + f.aftFinDragAngularAcceleration) * v.vehicleMomentOfInertia * dt;
    rcsImpulse += Math.abs(f.rcsThrustAngularAcceleration) * v.vehicleMomentOfInertia * dt;
    gimbalImpulse += Math.abs(f.thrustVectorAcceleration) * v.vehicleMomentOfInertia * dt;
    }
    const empty = !emptySeen && v.rcsRunTimeRemaining <= 0;
    const lost = !errorSeen && entryStage && Math.abs(error) > Math.PI / 18 && f.dynamicPressure > 0.001;
    if (s.failures.inFlightBreakUp) outcome = 'brokeUp';
    else if (s.failures.crashed) outcome = 'crashed';
    else if (s.status.landed) outcome = 'landed';
    else if (entryStage && k.machSpeed <= 5) outcome = 'reached-Mach5';
    const final = outcome !== 'timeout';
    if (seconds >= nextSample || empty || lost || final) {
      console.log(JSON.stringify({ id, seconds, event: final ? outcome : empty ? 'rcs-empty' : lost ? 'first-10deg-error' : 'interval',
        entryStage, altitude: k.altitude, mach: k.machSpeed, qForcePhasePa: f.dynamicPressure * 1000,
        forcePhaseAttackDeg: k.angleOfAttack * 180 / Math.PI, controllerAttackDeg: flow.attack * 180 / Math.PI,
        controllerHypersonic: flow.hypersonic, errorDeg: error * 180 / Math.PI,
        pitchControl: s.autopilot.pitchControl, frontExtension: v.frontFinExtension, aftExtension: v.aftFinExtension,
        integratedFrontExtension, integratedAftExtension,
        bodyMoment: f.bodyAerodynamicMoment, finMoment: (f.frontFinDragAngularAcceleration + f.aftFinDragAngularAcceleration) * v.vehicleMomentOfInertia,
        integratedRcsThrust, integratedRcsMoment: s.failures.inFlightBreakUp ? null : f.rcsThrustAngularAcceleration * v.vehicleMomentOfInertia,
        newlyIssuedRcsThrust: f.rcsThrust, reserve: v.rcsRunTimeRemaining, com: props.centreOfMass, propellant: v.propellantMass,
        temperature: f.surfaceTemperature, trimDeg: s.autopilot.entryRangeTrim * 180 / Math.PI,
        bodyArea: v.vehicleInFlightMaxArea, drag: f.aerodynamicDrag, lift: f.aerodynamicLift,
        miss: k.downRangeDistance - s.autopilot.landingSiteXPos }));
      nextSample = seconds + 20;
    }
    if (empty) emptySeen = true;
    if (lost) errorSeen = true;
    if (final) break;
  }
  const total = finImpulse + rcsImpulse + gimbalImpulse;
  console.log(JSON.stringify({ id, event: 'summary', seconds, outcome, peak, bodyImpulse, finImpulse,
    rcsImpulse, gimbalImpulse, rcsShare: total > 0 ? rcsImpulse / total : 0,
    qualification: 'Mach>=5 diagnostic only; no full-flight or low-Mach acceptance. Breakup-reset mass excluded from impulse totals; integrated moments versus newly issued commands labeled.' }));
}
