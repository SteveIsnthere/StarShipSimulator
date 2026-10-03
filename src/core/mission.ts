/** Physical, bounded hot-stage demonstration. Geometric hull centres remain
 * the existing renderer/contact positions. Velocities and accelerations share that hull reference point; mass-COM
 * quantities are explicitly converted without a separation kick.
 * Standalone Ship's established position convention is unchanged. */
import * as C from './constants';
import { SHIP, type VehicleDefinition } from './vehicle';
import { SUPER_HEAVY, CENTRE_ENGINES } from './vehicles/super-heavy';
import { PRESETS, createScenarioState, createScenarioVehicle } from './scenarios';
import { cloneState, DEFAULT_SEED, type SimState } from './state';
import { centreOfMass, momentOfInertia, writeMassProperties } from './physics/mass';
import { circularOrbitalSpeed, tangentialAcceleration, verticalGravityAcceleration } from './physics/gravity';
import { relativeAirspeed } from './physics/aero';
import { airVelocityX } from './physics/wind';
import { speedOfSoundAt } from './physics/atmosphere';
import { createStepDynamics, prepareDynamics, integrateTranslation, finishTranslation,
  predictRotation, writeRotationForces, finishRotation, type TranslationBody } from './physics/step-dynamics';
import { finishMechanicalStep } from './control/mechanical';
import { toggleRaptor } from './control/commands';
import { shutdownEngine } from './physics/engines';
import { NO_INPUT, type StepInput } from './step';
import { stepMissionBody } from './mission-free-flight';

export interface StackMassProperties {
  /** kg — actual combined wet mass. */
  mass: number;
  /** m — above the booster engine plane. */
  centreStation: number;
  /** kg m² — about the combined COM. */
  inertia: number;
  /** m — individual mass COM stations above the booster engine plane. */
  boosterStation: number;
  shipStation: number;
}

export interface MissionState {
  phase: 'attached' | 'separated';
  booster: SimState;
  ship: SimState;
  /** Rigid aggregate physics at its real COM; never shown as a third vehicle. */
  aggregate: TranslationBody;
  /** s — one elapsed clock, shared by both physical bodies. */
  elapsedTime: number;
  stageRequested: boolean;
  stagingFailed: boolean;
}

export interface MissionInput {
  readonly stage?: boolean;
  readonly ship?: StepInput;
  readonly booster?: StepInput;
}
export const NO_MISSION_INPUT: MissionInput = {};

export function stackMassProperties(booster: SimState, ship: SimState): StackMassProperties {
  const mb = SUPER_HEAVY.dryMass + booster.vehicle.propellantMass;
  const ms = SHIP.dryMass + ship.vehicle.propellantMass;
  const boosterStation = centreOfMass(booster.vehicle.propellantMass, SUPER_HEAVY);
  const shipStation = SUPER_HEAVY.height + centreOfMass(ship.vehicle.propellantMass, SHIP);
  const mass = mb + ms;
  const centreStation = (mb * boosterStation + ms * shipStation) / mass;
  const inertia = momentOfInertia(booster.vehicle.propellantMass, SUPER_HEAVY)
    + momentOfInertia(ship.vehicle.propellantMass, SHIP)
    + mb * (boosterStation - centreStation) ** 2 + ms * (shipStation - centreStation) ** 2;
  return { mass, centreStation, inertia, boosterStation, shipStation };
}

/** Convert canonical hull-point position and velocity into actual mass COM. */
export function bodyMassPose(state: SimState, model: VehicleDefinition): { x: number; altitude: number; speedX: number; speedY: number } {
  const k = state.kinematics;
  const offset = centreOfMass(state.vehicle.propellantMass, model) - model.height / 2;
  return { x: k.downRangeDistance + offset * Math.sin(k.pitch),
    altitude: k.altitude + offset * Math.cos(k.pitch),
    speedX: k.speedX + offset * k.angularVelocity * Math.cos(k.pitch),
    speedY: k.speedY - offset * k.angularVelocity * Math.sin(k.pitch) };
}

export function createHotStageMission(seed = DEFAULT_SEED): MissionState {
  const preset = PRESETS.find(p => p.id === 'booster-sep')!;
  const booster = createScenarioVehicle(preset, seed).state;
  // A fixed per-vehicle salt separates draws while keeping restart deterministic.
  const ship = createScenarioState({ ...preset, id: 'hot-stage', propellant: 1200 }, seed ^ 0x53484950);
  const axisX = Math.sin(booster.kinematics.pitch), axisY = Math.cos(booster.kinematics.pitch);
  const hullOffset = (SUPER_HEAVY.height + SHIP.height) / 2;
  ship.kinematics.downRangeDistance += hullOffset * axisX;
  ship.kinematics.altitude += hullOffset * axisY;
  ship.kinematics.pitchRecord.fill(ship.kinematics.pitch);
  const properties = stackMassProperties(booster, ship);
  const comOffset = properties.centreStation - SUPER_HEAVY.height / 2;
  const aggregate: TranslationBody = { kinematics: { ...booster.kinematics,
    pitchRecord: [...booster.kinematics.pitchRecord],
    downRangeDistance: booster.kinematics.downRangeDistance + comOffset * axisX,
    altitude: booster.kinematics.altitude + comOffset * axisY },
    forces: { ...booster.forces }, status: { ...booster.status }, failures: { ...booster.failures } };
  aggregate.kinematics.distanceToPlanetCenter = C.planetRadius + aggregate.kinematics.altitude;
  aggregate.kinematics.orbitalVelocityAtCurrentAltitude = circularOrbitalSpeed(aggregate.kinematics.distanceToPlanetCenter);
  aggregate.kinematics.downRangeDistanceNextFrame = aggregate.kinematics.downRangeDistance;
  const mission: MissionState = { phase: 'attached', booster, ship, aggregate,
    elapsedTime: 0, stageRequested: false, stagingFailed: false };
  deriveBodies(mission, properties);
  return mission;
}

/** Workspace is overwritten synchronously, and never stored in returned state. */
const boosterWork = createStepDynamics(), shipWork = createStepDynamics();
const aggregateAngular = { omega0: 0, alpha0: 0 };
const noControls = (): void => {};
const STACK_GEOMETRY: VehicleDefinition = { ...SHIP, height: SUPER_HEAVY.height + SHIP.height };

function deriveBody(body: SimState, model: VehicleDefinition, aggregate: TranslationBody,
  hullStation: number, massStation: number, properties: StackMassProperties): void {
  const k = body.kinematics, a = aggregate.kinematics;
  const ux = Math.sin(a.pitch), uy = Math.cos(a.pitch);
  const hullOffset = hullStation - properties.centreStation;
  const massOffset = massStation - properties.centreStation;
  k.downRangeDistance = a.downRangeDistance + hullOffset * ux;
  k.downRangeDistanceNextFrame = k.downRangeDistance;
  k.altitude = a.altitude + hullOffset * uy;
  k.distanceToPlanetCenter = C.planetRadius + k.altitude;
  k.orbitalVelocityAtCurrentAltitude = circularOrbitalSpeed(k.distanceToPlanetCenter);
  k.pitch = a.pitch;
  k.angularVelocity = a.angularVelocity;
  k.angularAcceleration = a.angularAcceleration;
  // Pitch is clockwise: omega × (x,y) = (omega*y, -omega*x).
  k.speedX = a.speedX + a.angularVelocity * hullOffset * uy;
  k.speedY = a.speedY - a.angularVelocity * hullOffset * ux;
  k.accelerationX = a.accelerationX + a.angularAcceleration * hullOffset * uy
    - a.angularVelocity ** 2 * hullOffset * ux;
  k.accelerationY = a.accelerationY - a.angularAcceleration * hullOffset * ux
    - a.angularVelocity ** 2 * hullOffset * uy;
  k.totalAcceleration = Math.hypot(k.accelerationX, k.accelerationY);
  k.trueSpeed = Math.hypot(k.speedX, k.speedY);
  k.machSpeed = relativeAirspeed(k.speedX, k.speedY, airVelocityX(body.world, k.altitude), body.world.gustVertical)
    / speedOfSoundAt(body.atmosphere.airTemperature);
  body.vehicle.vehicleMomentOfInertia = momentOfInertia(body.vehicle.propellantMass, model);
  // The rigid constraint carries both translation and rotational acceleration.
  // Remove local gravity/polar terms to report the load borne by this body.
  const massRadius = C.planetRadius + a.altitude + massOffset * uy;
  const massVx = a.speedX + a.angularVelocity * massOffset * uy;
  const massVy = a.speedY - a.angularVelocity * massOffset * ux;
  const massAx = a.accelerationX + a.angularAcceleration * massOffset * uy - a.angularVelocity ** 2 * massOffset * ux;
  const massAy = a.accelerationY - a.angularAcceleration * massOffset * ux - a.angularVelocity ** 2 * massOffset * uy;
  const gx = (massAx - tangentialAcceleration(massRadius, massVx, massVy)) / C.standardGravity;
  const gy = (massAy - verticalGravityAcceleration(massRadius, massVx)) / C.standardGravity;
  body.forces.perceivedG_X = gx;
  body.forces.perceivedG_Y = gy;
  body.forces.perceivedG = Math.sqrt(gx ** 2 + gy ** 2);
}

function deriveBodies(m: MissionState, properties: StackMassProperties): void {
  deriveBody(m.booster, SUPER_HEAVY, m.aggregate, SUPER_HEAVY.height / 2, properties.boosterStation, properties);
  deriveBody(m.ship, SHIP, m.aggregate, SUPER_HEAVY.height + SHIP.height / 2, properties.shipStation, properties);
}

function requestStage(m: MissionState): void {
  m.stageRequested = true;
  m.booster.vehicle.throttle = m.ship.vehicle.throttle = 100;
  for (let i = 0; i < SUPER_HEAVY.engines.length; i++)
    if (!CENTRE_ENGINES.includes(i)) shutdownEngine(m.booster, i);
  for (const i of CENTRE_ENGINES) if (!m.booster.engines.running[i] && m.booster.engines.ignitionCountdown[i] === null)
    toggleRaptor(m.booster, i);
  for (let i = 0; i < SHIP.engines.length; i++) if (!m.ship.engines.running[i] && m.ship.engines.ignitionCountdown[i] === null)
    toggleRaptor(m.ship, i);
}

export function stepMission(previous: MissionState, dt: number, input: MissionInput = NO_MISSION_INPUT): MissionState {
  if (previous.phase === 'separated') return { ...previous,
    ship: stepMissionBody(previous.ship, dt, input.ship ?? NO_INPUT, SHIP),
    booster: stepMissionBody(previous.booster, dt, input.booster ?? NO_INPUT, SUPER_HEAVY),
    elapsedTime: previous.elapsedTime + dt };
  const m: MissionState = { ...previous, ship: cloneState(previous.ship), booster: cloneState(previous.booster),
    aggregate: { kinematics: { ...previous.aggregate.kinematics, pitchRecord: [...previous.aggregate.kinematics.pitchRecord] },
      forces: { ...previous.aggregate.forces }, status: { ...previous.aggregate.status }, failures: { ...previous.aggregate.failures } },
    elapsedTime: previous.elapsedTime + dt };
  const oldProperties = stackMassProperties(previous.booster, previous.ship);
  prepareDynamics(m.booster, dt, SUPER_HEAVY, boosterWork);
  prepareDynamics(m.ship, dt, SHIP, shipWork);
  const properties = stackMassProperties(m.booster, m.ship);
  const a = m.aggregate.kinematics;
  const ux = Math.sin(a.pitch), uy = Math.cos(a.pitch);
  const shift = properties.centreStation - oldProperties.centreStation;
  a.downRangeDistance += shift * ux;
  a.altitude += shift * uy;
  a.speedX += a.angularVelocity * shift * uy;
  a.speedY -= a.angularVelocity * shift * ux;
  a.distanceToPlanetCenter = C.planetRadius + a.altitude;
  const mb = m.booster.vehicle.vehicleMass, ms = m.ship.vehicle.vehicleMass;
  const fxB = boosterWork.bodyAccelerationX * mb, fyB = boosterWork.bodyAccelerationY * mb;
  const fxS = shipWork.bodyAccelerationX * ms, fyS = shipWork.bodyAccelerationY * ms;
  const bodyAX = (fxB + fxS) / properties.mass, bodyAY = (fyB + fyS) / properties.mass;
  const held = integrateTranslation(m.aggregate, dt, bodyAX, bodyAY, STACK_GEOMETRY);
  predictRotation(m.aggregate, dt, held, aggregateAngular);
  deriveBodies(m, properties);
  finishTranslation(m.booster, dt, boosterWork);
  finishTranslation(m.ship, dt, shipWork);
  writeMassProperties(m.booster.vehicle.propellantMass, boosterWork.massProperties, SUPER_HEAVY);
  writeMassProperties(m.ship.vehicle.propellantMass, shipWork.massProperties, SHIP);
  const tauB = writeRotationForces(m.booster, SUPER_HEAVY, boosterWork) * boosterWork.massProperties.momentOfInertia;
  const tauS = writeRotationForces(m.ship, SHIP, shipWork) * shipWork.massProperties.momentOfInertia;
  const nx = Math.sin(a.pitch), ny = Math.cos(a.pitch);
  const leverB = (properties.boosterStation - properties.centreStation) * (ny * fxB - nx * fyB);
  const leverS = (properties.shipStation - properties.centreStation) * (ny * fxS - nx * fyS);
  finishRotation(m.aggregate, dt, held, aggregateAngular.omega0, aggregateAngular.alpha0, (tauB + tauS + leverB + leverS) / properties.inertia);
  deriveBodies(m, properties);
  finishMechanicalStep(previous.booster, m.booster, dt, input.booster ?? NO_INPUT, SUPER_HEAVY, noControls, boosterWork, false);
  finishMechanicalStep(previous.ship, m.ship, dt, input.ship ?? NO_INPUT, SHIP, noControls, shipWork, false);
  if (input.stage && !m.stageRequested) requestStage(m);
  if (m.stageRequested) {
    if (m.ship.engines.failed.every(Boolean) || m.ship.failures.inFlightBreakUp || m.booster.failures.inFlightBreakUp)
      m.stagingFailed = true;
    // Actual paid world forces determine whether the upper stage can pull away.
    const shipAxial = (nx * fxS + ny * fyS) / ms;
    const boosterAxial = (nx * fxB + ny * fyB) / mb;
    if (!m.stagingFailed && m.ship.forces.thrust > 0 && CENTRE_ENGINES.every(i => m.booster.engines.running[i])
      && shipAxial > boosterAxial) m.phase = 'separated';
  }
  return m;
}
