/** A mission body publishes hull-point kinematics, while translation belongs
 * to its physical mass centre. Standalone step() keeps its original convention. */
import * as C from './constants';
import { cloneState, type SimState } from './state';
import { SHIP, type VehicleDefinition } from './vehicle';
import { SUPER_HEAVY } from './vehicles/super-heavy';
import { centreOfMass, writeMassProperties } from './physics/mass';
import { writeFlightMass } from './physics/damage-flight';
import { writeReferenceShift } from './physics/body-reference';
import { advanceDamageDebris } from './physics/damage-debris';
import { damageModelFor } from './physics/damage-model';
import { clearTerminalPropulsion } from './physics/damage-terminal';
import { circularOrbitalSpeed } from './physics/gravity';
import { relativeAirspeed } from './physics/aero';
import { speedOfSoundAt } from './physics/atmosphere';
import { airVelocityX } from './physics/wind';
import { createStepDynamics, prepareDynamics, integrateTranslation, finishTranslation,
  predictRotation, writeRotationForces, finishRotation } from './physics/step-dynamics';
import { finishMechanicalStep, type MechanicalControl } from './control/mechanical';
import { invalidateBoosterReturn } from './control/booster-return-plan';
import { runAutopilot } from './autopilot';
import { runBoosterPostStep } from './autopilot/booster';
import { NO_INPUT, type StepInput } from './step';

const work = createStepDynamics();
// Only contact height differs at a translated reference point. These mutable
// workspace copies never change either immutable physical vehicle definition.
const shipContact = { ...SHIP }, boosterContact = { ...SUPER_HEAVY };

function hullFromMass(s: SimState, mass: SimState['kinematics'], d: number, dx: number) {
  const k = s.kinematics, sin = Math.sin(k.pitch), cos = Math.cos(k.pitch);
  if (s.damage) {
    // Translation scratch gets the just-integrated rigid orientation first.
    mass.pitch = k.pitch;
    mass.angularVelocity = k.angularVelocity;
    mass.angularAcceleration = k.angularAcceleration;
    writeReferenceShift(mass, -dx, -d, k);
  } else {
  k.downRangeDistance = mass.downRangeDistance - d * sin;
  k.downRangeDistanceNextFrame = k.downRangeDistance;
  k.altitude = mass.altitude - d * cos;
  k.distanceToPlanetCenter = C.planetRadius + k.altitude;
  k.orbitalVelocityAtCurrentAltitude = circularOrbitalSpeed(k.distanceToPlanetCenter);
  k.speedX = mass.speedX - d * k.angularVelocity * cos;
  k.speedY = mass.speedY + d * k.angularVelocity * sin;
  k.accelerationX = mass.accelerationX - d * (k.angularAcceleration * cos - k.angularVelocity ** 2 * sin);
  k.accelerationY = mass.accelerationY + d * (k.angularAcceleration * sin + k.angularVelocity ** 2 * cos);
  k.totalAcceleration = Math.hypot(k.accelerationX, k.accelerationY);
  }
  k.trueSpeed = Math.hypot(k.speedX, k.speedY);
  k.machSpeed = relativeAirspeed(k.speedX, k.speedY, airVelocityX(s.world, k.altitude), s.world.gustVertical)
    / speedOfSoundAt(s.atmosphere.airTemperature);
}

export function advanceFreeBody(previous: SimState, dt: number, input: StepInput, model: VehicleDefinition, control: MechanicalControl): SimState {
  const s = cloneState(previous);
  if (model.id === 'super-heavy' && previous.status.landed) {
    if (s.damage) advanceDamageDebris(s.damage, damageModelFor(model).debris, dt);
    s.engines.running.fill(false); s.engines.ignitionCountdown.fill(null);
    s.world.environmentTime += dt; s.world.updatedFrameCount += 1;
    return s;
  }
  if (model.id === 'super-heavy' && (input.pitchControl !== undefined || input.throttle !== undefined))
    invalidateBoosterReturn(s.autopilot);
  // Collision/environment/paid fuel remain evaluated at the physical hull.
  if (s.damage?.terminal.active) {
    advanceDamageDebris(s.damage, damageModelFor(model).debris, dt);
    clearTerminalPropulsion(s);
    s.world.environmentTime += dt;
    s.world.updatedFrameCount++;
    return s;
  }
  prepareDynamics(s, dt, model, work);
  if (s.damage) advanceDamageDebris(s.damage, damageModelFor(model).debris, dt);
  if (s.damage?.terminal.active) {
    s.engines.running.fill(false);
    s.engines.ignitionCountdown.fill(null);
    s.world.environmentTime += dt;
    return s;
  }
  writeFlightMass(s, model, work.massProperties);
  const k = s.kinematics;
  const d = (s.damage ? work.massProperties.centreOfMass : centreOfMass(s.vehicle.propellantMass, model)) - model.height / 2;
  const dx = s.damage ? work.massProperties.centreOfMassX : 0;
  const sin = Math.sin(k.pitch), cos = Math.cos(k.pitch);
  // Fuel loss moves the remaining body's mass station along its rigid hull;
  // its new point velocity includes the corresponding omega cross offset.
  const mass = { ...k, downRangeDistance: k.downRangeDistance + d * sin,
    altitude: k.altitude + d * cos,
    speedX: k.speedX + d * k.angularVelocity * cos,
    speedY: k.speedY - d * k.angularVelocity * sin };
  if (s.damage) writeReferenceShift(k, dx, d, mass);
  mass.distanceToPlanetCenter = C.planetRadius + mass.altitude;
  const geometry = model.id === 'ship' ? shipContact : boosterContact;
  geometry.height = model.height + 2 * d * Math.sign(cos);
  const held = integrateTranslation({ kinematics: mass, forces: s.forces, status: s.status, failures: s.failures },
    dt, work.bodyAccelerationX, work.bodyAccelerationY, geometry,
    s.damage ? model.height * Math.abs(cos) / 2 + (mass.altitude - k.altitude) : undefined);
  if (held) k.angularVelocity = 0;
  if (s.damage) writeFlightMass(s, model, work.massProperties);
  else writeMassProperties(s.vehicle.propellantMass, work.massProperties, model);
  s.vehicle.vehicleMomentOfInertia = work.massProperties.momentOfInertia;
  predictRotation(s, dt, held, work);
  hullFromMass(s, mass, d, dx);
  // Sample gusts once, using the translated/predicted physical hull point.
  finishTranslation(s, dt, work);
  const alpha = writeRotationForces(s, model, work);
  finishRotation(s, dt, held, work.omega0, work.alpha0, alpha);
  hullFromMass(s, mass, d, dx);
  return finishMechanicalStep(previous, s, dt, input, model, control, work);
}

function flightControls(state: SimState, dt: number, model: VehicleDefinition) {
  runAutopilot(state, dt, model, advanceMissionMechanics);
}

/** The planner must replay the same reference-point mechanics as the mission. */
export function advanceMissionMechanics(previous: SimState, dt: number, control: MechanicalControl, model: VehicleDefinition): SimState {
  return advanceFreeBody(previous, dt, NO_INPUT, model, control);
}

export function stepMissionBody(previous: SimState, dt: number, input: StepInput, model: VehicleDefinition): SimState {
  const next = advanceFreeBody(previous, dt, input, model, flightControls);
  if (model.id === 'super-heavy' && !next.damage?.terminal.active) runBoosterPostStep(next, dt, model, advanceMissionMechanics);
  return next;
}
