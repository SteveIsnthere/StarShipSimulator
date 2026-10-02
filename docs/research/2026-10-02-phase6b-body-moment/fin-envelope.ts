/** Read-only causal witnesses; candidate model fixed in fin-envelope-ruling.md. */
import * as C from '../../../src/core/constants';
import { createScenarioState, getScenario } from '../../../src/core/scenarios';
import { toggleAutoDeorbit, toggleAutoLand } from '../../../src/core/control/commands';
import { step } from '../../../src/core/step';
import { rad } from '../../../src/core/units';
import { entryPitchOffset } from '../../../src/core/autopilot/entry';
import { wrappedAttackAngle, bodyPotentialNormalArea, bodyCrossflowNormalArea, relativeAirspeed } from '../../../src/core/physics/aero';
import { BODY_CROSSFLOW_STATION, BODY_NOSE_FIRST_STATION, BODY_TAIL_FIRST_STATION, BODY_PLANFORM_AREA } from '../../../src/core/physics/body-moment';
import { createMassProperties, FRONT_FIN_STATION, AFT_FIN_STATION } from '../../../src/core/physics/mass';
import { airVelocityX } from '../../../src/core/physics/wind';

for (const id of ['reentry', 'deorbit']) {
  let s = createScenarioState(getScenario(id)!);
  if (id === 'deorbit') toggleAutoDeorbit(s); else toggleAutoLand(s);
  let nextSample = 0, exhausted = false, errorSeen = false;
  let generousRequiredImpulse = 0, candidateRequiredImpulse = 0, largestRcsArm = 0;
  const dt = 1 / 120;
  for (let n = 1; n <= (id === 'deorbit' ? 4000 : 900) / dt; n++) {
    s = step(s, dt);
    const k = s.kinematics, v = s.vehicle;
    const speed = relativeAirspeed(k.speedX, k.speedY, airVelocityX(s.world, k.altitude), s.world.gustVertical);
    const windAngle = Math.atan2(k.speedX - airVelocityX(s.world, k.altitude), k.speedY - s.world.gustVertical);
    const q = 0.5 * s.atmosphere.airDensity * speed ** 2;
    const props = createMassProperties(v.propellantMass);
    const entryStage = s.autopilot.autoLandOn && !s.autopilot.manualControlOn &&
      !s.autopilot.aeroDescentCompleted && Math.abs(k.speedX) > 20;
    const goal = k.angleOfMotion - Math.PI / 2 + entryPitchOffset(k.machSpeed, k.speedX,
      rad(C.ENTRY_LIFT_ANGLE + s.autopilot.entryRangeTrim));
    const intended = wrappedAttackAngle(rad(goal), rad(windAngle));
    const error = wrappedAttackAngle(k.pitch, rad(goal));
    const firstError = entryStage && !errorSeen && Math.abs(error) > Math.PI / 18 && q > 1;
    const firstEmpty = !exhausted && v.rcsRunTimeRemaining <= 0;
    const final = s.failures.inFlightBreakUp || s.failures.crashed || s.status.landed;
    // A hypothetical attitude-holding requirement along this observed path,
    // not the impulse of a newly flown fin model. Exclude post-breakup mass.
    if (entryStage && !final && k.machSpeed >= 5) {
      const station = Math.abs(intended) <= Math.PI / 2 ? BODY_NOSE_FIRST_STATION : BODY_TAIL_FIRST_STATION;
      const body = Math.sign(intended) * q * (bodyPotentialNormalArea(rad(intended)) * (station - props.centreOfMass) +
        bodyCrossflowNormalArea(k.machSpeed, rad(intended), BODY_PLANFORM_AREA) * (BODY_CROSSFLOW_STATION - props.centreOfMass));
      const need = -body;
      const frontArm = FRONT_FIN_STATION - props.centreOfMass, aftArm = AFT_FIN_STATION - props.centreOfMass;
      const generousFront = Math.sign(intended) * 2.4 * q * C.frontFinSurfaceArea * frontArm;
      const generousAft = Math.sign(intended) * 2.4 * q * C.aftFinSurfaceArea * aftArm;
      const generousMin = Math.min(0, generousFront) + Math.min(0, generousAft);
      const generousMax = Math.max(0, generousFront) + Math.max(0, generousAft);
      generousRequiredImpulse += Math.max(0, generousMin - need, need - generousMax) * dt;
      const pressure = 2 * q * Math.sign(intended) * Math.sin(intended) ** 2 * Math.sin(C.finActuationMaxAngle) ** 3;
      const front = pressure * C.frontFinSurfaceArea * frontArm, aft = pressure * C.aftFinSurfaceArea * aftArm;
      candidateRequiredImpulse += Math.max(0, Math.min(0, front) + Math.min(0, aft) - need,
        need - Math.max(0, front) - Math.max(0, aft)) * dt;
      largestRcsArm = Math.max(largestRcsArm, Math.abs(props.rcsArm));
    }
    if (n * dt >= nextSample || firstError || firstEmpty || final) {
      const attack = rad(intended);
      const station = Math.abs(attack) <= Math.PI / 2 ? BODY_NOSE_FIRST_STATION : BODY_TAIL_FIRST_STATION;
      const potentialMoment = Math.sign(attack) * q * bodyPotentialNormalArea(attack) * (station - props.centreOfMass);
      const crossflowMoment = Math.sign(attack) * q * bodyCrossflowNormalArea(k.machSpeed, attack, BODY_PLANFORM_AREA) * (BODY_CROSSFLOW_STATION - props.centreOfMass);
      const frontArm = FRONT_FIN_STATION - props.centreOfMass, aftArm = AFT_FIN_STATION - props.centreOfMass;
      const plate = 2 * q * Math.sign(attack) * Math.sin(attack) ** 2 * Math.sin(C.finActuationMaxAngle) ** 3;
      const front = plate * C.frontFinSurfaceArea * frontArm, aft = plate * C.aftFinSurfaceArea * aftArm;
      const min = Math.min(0, front) + Math.min(0, aft), max = Math.max(0, front) + Math.max(0, aft);
      const need = -(potentialMoment + crossflowMoment);
      console.log(JSON.stringify({ id, seconds: n * dt, event: final ? 'final' : firstEmpty ? 'rcs-empty' : firstError ? 'first-10deg-error' : 'interval',
        entryStage, h: k.altitude, q, mach: k.machSpeed, com: props.centreOfMass,
        actualAttackDeg: wrappedAttackAngle(k.pitch, windAngle) * 180 / Math.PI,
        storedStepAttackDeg: k.angleOfAttack * 180 / Math.PI, intendedAttackDeg: intended * 180 / Math.PI,
        errorDeg: error * 180 / Math.PI, angularVelocity: k.angularVelocity,
        temperature: s.forces.surfaceTemperature, reserve: v.rcsRunTimeRemaining,
        frontExtension: v.frontFinExtension, aftExtension: v.aftFinExtension,
        actualBodyMoment: s.forces.bodyAerodynamicMoment, potentialMoment, crossflowMoment, need, finMin: min, finMax: max,
        candidateResidual: Math.max(0, min - need, need - max),
        generousDirectionalMin: Math.min(0, Math.sign(attack) * 2.4 * q * C.frontFinSurfaceArea * frontArm) +
          Math.min(0, Math.sign(attack) * 2.4 * q * C.aftFinSurfaceArea * aftArm),
        generousDirectionalMax: Math.max(0, Math.sign(attack) * 2.4 * q * C.frontFinSurfaceArea * frontArm) +
          Math.max(0, Math.sign(attack) * 2.4 * q * C.aftFinSurfaceArea * aftArm),
        generousMagnitude: 2.4 * q * (C.frontFinSurfaceArea * Math.abs(frontArm) + C.aftFinSurfaceArea * Math.abs(aftArm)),
        outcome: s.failures.inFlightBreakUp ? 'brokeUp' : s.failures.crashed ? 'crashed' : s.status.landed ? 'landed' : 'flying' }));
      nextSample = n * dt + 20;
    }
    if (firstEmpty) exhausted = true;
    if (firstError) errorSeen = true;
    if (final) break;
  }
  console.log(JSON.stringify({ id, event: 'observed-path-impulse-screen', generousRequiredImpulse,
    candidateRequiredImpulse, generousFullRcsBudget: C.rcsMaxThrust * C.rcsRunTimeRemaining * largestRcsArm,
    largestRcsArm, qualification: 'Hypersonic observed path only; new fin translation/gimbal can change the path. Not a scenario-feasibility proof.' }));
}
