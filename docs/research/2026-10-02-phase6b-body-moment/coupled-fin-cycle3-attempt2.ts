/** Reviewed cycle3 attempt2: prescribed fixed-angle sweep: known disturbance compensation with feedback deadzone. */
import { createScenarioState, getScenario } from '../../../src/core/scenarios';
import { toggleAutoDeorbit, toggleAutoLand } from '../../../src/core/control/commands';
import { writeFinControlFlowInto, type FinControlFlow } from '../../../src/core/control/fin-authority';
import { entryPitchOffset } from '../../../src/core/autopilot/entry';
import { wrappedAttackAngle } from '../../../src/core/physics/aero';
import { createMassProperties } from '../../../src/core/physics/mass';
import { step } from '../../../src/core/step';
import { rad } from '../../../src/core/units';

const flow: FinControlFlow = { speed: 0, attack: rad(0), hypersonic: false };
for (const angle of [45, 50, 55, 60, 65, 70, 75, 90]) for (const id of ['reentry', 'deorbit']) {
  let s = createScenarioState(getScenario(id)!);
  if (id === 'deorbit') toggleAutoDeorbit(s); else toggleAutoLand(s);
  const dt = 1 / 120;
  let nextSample = 0;
  let emptySeen = false, errorSeen = false, peak = 0;
  let emptySeconds: number | null = null;
  let tracked = false, entryStarted = false;
  let entryReserve: number | null = null, lastIntactReserve = s.vehicle.rcsRunTimeRemaining;
  let bodyImpulse = 0, finImpulse = 0, rcsImpulse = 0, gimbalImpulse = 0;
  let outcome = 'timeout', seconds = 0;
  for (let n = 1; n <= (id === 'deorbit' ? 4000 : 900) / dt; n++) {
    const priorReserve = s.vehicle.rcsRunTimeRemaining;
    const integratedRcsThrust = s.forces.rcsThrust;
    const integratedFrontExtension = s.vehicle.frontFinExtension;
    const integratedAftExtension = s.vehicle.aftFinExtension;
    s = step(s, dt, { entryAngleOfAttack: rad(angle * Math.PI / 180) });
    seconds = n * dt;
    writeFinControlFlowInto(s, flow);
    const k = s.kinematics, f = s.forces, v = s.vehicle;
    const props = createMassProperties(v.propellantMass);
    const entryStage = s.autopilot.autoLandOn && !s.autopilot.manualControlOn && !s.autopilot.aeroDescentCompleted;
    const goal = k.angleOfMotion - Math.PI / 2 + entryPitchOffset(k.machSpeed, k.speedX,
      rad(angle * Math.PI / 180));
    const error = wrappedAttackAngle(k.pitch, goal);
    peak = Math.max(peak, f.surfaceTemperature);
    if (!s.failures.inFlightBreakUp) {
    bodyImpulse += Math.abs(f.bodyAerodynamicMoment) * dt;
    finImpulse += Math.abs(f.frontFinDragAngularAcceleration + f.aftFinDragAngularAcceleration) * v.vehicleMomentOfInertia * dt;
    rcsImpulse += Math.abs(f.rcsThrustAngularAcceleration) * v.vehicleMomentOfInertia * dt;
    gimbalImpulse += Math.abs(f.thrustVectorAcceleration) * v.vehicleMomentOfInertia * dt;
    }
    const intact = !s.failures.inFlightBreakUp && !s.failures.crashed;
    const entryStart = !entryStarted && entryStage;
    if (entryStart) { entryStarted = true; entryReserve = priorReserve; }
    if (intact) lastIntactReserve = v.rcsRunTimeRemaining;
    if (entryStage && Math.abs(error) <= 0.1) tracked = true;
    const compensationDemand = -(f.bodyAerodynamicAcceleration + f.offAxisThrustDifferenceAcceleration) * v.vehicleMomentOfInertia;
    const feedbackDemand = Math.abs(error) > 0.1 ? (-error / 0.7 ** 2 - 2 * k.angularVelocity / 0.7) * v.vehicleMomentOfInertia : 0;
    const empty = !emptySeen && intact && priorReserve > 0 && v.rcsRunTimeRemaining <= 0;
    const lost = !errorSeen && tracked && entryStage && Math.abs(error) > Math.PI / 18 && f.dynamicPressure > 0.001;
    if (s.failures.inFlightBreakUp) outcome = 'brokeUp';
    else if (s.failures.crashed) outcome = 'crashed';
    else if (s.status.landed) outcome = 'landed';
    else if (entryStage && k.machSpeed <= 5) outcome = 'reached-Mach5';
    const final = outcome !== 'timeout';
    if ((entryStage && seconds >= nextSample) || entryStart || empty || lost || final) {
      console.log(JSON.stringify({ angle, id, seconds, event: final ? outcome : empty ? 'rcs-empty' : lost ? 'tracking-loss-10deg' : entryStart ? 'entry-start' : 'interval',
        entryStage, finActive: s.status.finActive, rcsActive: s.status.rcsActive, thrust: f.thrust, tracked, compensationDemand: intact && entryStage ? compensationDemand : null, feedbackDemand: intact && entryStage ? feedbackDemand : null, altitude: k.altitude, mach: k.machSpeed, qForcePhasePa: f.dynamicPressure * 1000,
        forcePhaseAttackDeg: k.angleOfAttack * 180 / Math.PI, controllerAttackDeg: flow.attack * 180 / Math.PI,
        controllerHypersonic: flow.hypersonic, errorDeg: error * 180 / Math.PI,
        pitchControl: s.autopilot.pitchControl, frontExtension: v.frontFinExtension, aftExtension: v.aftFinExtension,
        integratedFrontExtension, integratedAftExtension,
        angularVelocity: k.angularVelocity, angularAcceleration: k.angularAcceleration,
        integratedNetMoment: s.failures.inFlightBreakUp ? null : (f.bodyAerodynamicAcceleration + f.frontFinDragAngularAcceleration + f.aftFinDragAngularAcceleration + f.rcsThrustAngularAcceleration + f.thrustVectorAcceleration + f.angularDragAcceleration + f.offAxisThrustDifferenceAcceleration) * v.vehicleMomentOfInertia,
        integratedGimbalMoment: s.failures.inFlightBreakUp ? null : f.thrustVectorAcceleration * v.vehicleMomentOfInertia,
        integratedAngularDragMoment: s.failures.inFlightBreakUp ? null : f.angularDragAcceleration * v.vehicleMomentOfInertia,
        bodyMoment: f.bodyAerodynamicMoment, finMoment: (f.frontFinDragAngularAcceleration + f.aftFinDragAngularAcceleration) * v.vehicleMomentOfInertia,
        integratedRcsThrust, integratedRcsMoment: s.failures.inFlightBreakUp ? null : f.rcsThrustAngularAcceleration * v.vehicleMomentOfInertia,
        newlyIssuedRcsThrust: f.rcsThrust, reserve: v.rcsRunTimeRemaining, com: props.centreOfMass, propellant: v.propellantMass,
        temperature: f.surfaceTemperature, trimDeg: s.autopilot.entryRangeTrim * 180 / Math.PI,
        bodyArea: v.vehicleInFlightMaxArea, drag: f.aerodynamicDrag, lift: f.aerodynamicLift,
        miss: k.downRangeDistance - s.autopilot.landingSiteXPos }));

      nextSample = seconds + 20;
    }
    if (empty) { emptySeen = true; emptySeconds = seconds; }
    if (lost) errorSeen = true;
    if (final) break;
  }
  const total = finImpulse + rcsImpulse + gimbalImpulse;
  console.log(JSON.stringify({ angle, id, event: 'summary', seconds, outcome, peak, emptySeconds, entryReserve, lastIntactReserve, bodyImpulse, finImpulse,
    rcsImpulse, gimbalImpulse, rcsShare: total > 0 ? rcsImpulse / total : 0,
    qualification: 'Mach>=5 diagnostic only; no full-flight or low-Mach acceptance. Breakup-reset mass excluded from impulse totals; integrated moments versus newly issued commands labeled.' }));
}
