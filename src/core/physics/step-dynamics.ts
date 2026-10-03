/** Existing paid force/integration phases, extracted without arithmetic changes.
 * The caller owns/clones state and sequences prepare -> translation -> finish
 * translation -> rotation -> controls -> failures. Attached missions reuse
 * these kernels rather than inventing a second force or time integrator. */
import * as C from '../constants';
import type { VehicleDefinition } from '../vehicle';
import { createGridFinForces, writeGridFinForces } from './grid-fins';
import { speedOfSoundAt, updateAtmosphere } from './atmosphere';
import { getReentryHeatPower, radiativeSinkKelvin, surfaceTemperature } from './thermal';
import * as aero from './aero';
import * as comp from './components';
import * as gravity from './gravity';
import * as eng from './engines';
import * as wind from './wind';
import { createMassProperties, writeMassProperties } from './mass';
import type { SimState } from '../state';
import { rad } from '../units';

export type TranslationBody = Pick<SimState, 'kinematics' | 'forces' | 'status' | 'failures'>;

/** Owned by one body/advance. No prepared force survives into another body. */
export interface AngularStep {
  /** rad/s — incoming angular velocity. */
  omega0: number;
  /** rad/s² — incoming angular acceleration, cancelled while held. */
  alpha0: number;
}

export interface StepDynamics extends AngularStep {
  /** m/s² — paid non-gravitational world acceleration. */
  bodyAccelerationX: number;
  bodyAccelerationY: number;
  /** 0..1 — fraction of this interval's requested impulse paid by fuel. */
  burnedFraction: number;
  /** N — paid gimballed engine thrust. */
  gimballedThrust: number;
  /** m/s — translated relative speed before next-step gust sampling. */
  airspeed: number;
  massProperties: ReturnType<typeof createMassProperties>;
  gridFinForces: ReturnType<typeof createGridFinForces>;
}

export function createStepDynamics(): StepDynamics {
  return { omega0: 0, alpha0: 0, bodyAccelerationX: 0, bodyAccelerationY: 0, burnedFraction: 0,
    gimballedThrust: 0, airspeed: 0, massProperties: createMassProperties(),
    gridFinForces: createGridFinForces() };
}

/** physics.js:468 — pushes the newest pitch and reads the oldest of two. */
function updatePitchRateOfChange(s: SimState, dt: number): void {
  const { kinematics } = s;
  kinematics.pitchRecord.push(kinematics.pitch);
  kinematics.pitchRecord.shift();
  const lastPitch = kinematics.pitchRecord[0]!;

  // M2.4, Bug fix. 2021 wrote `(pitch - lastPitch) / renderTimeInterval * 3600`,
  // and since 1/renderTimeInterval IS dt, dividing by it MULTIPLIES by dt. The
  // expression computed `dPitch * dt * 3600` — units of rad*s, not rad/s, wrong
  // by dt^2 * 3600. At exactly 60 fps that factor is 1, so it was accidentally
  // correct at one frame rate and nowhere else: 4x high at 30 fps, 5.76x low at
  // 144 fps. pitchHold gates on this value, so the autopilot behaved differently
  // depending on the player's display.
  //
  // A rate of change is dPitch / dt.
  kinematics.pitchRateOfChange = (kinematics.pitch - lastPitch) / dt;
}

/**
 * physics.js:394 — where the orbital "relief" hack used to be.
 *
 * 2021 computed `orbitGravityAccCompensation` here: a term subtracted from felt
 * gravity that was linear in speedX where the truth is quadratic, divided by an
 * orbital velocity fixed at spawn, and clamped at exactly g — which made a
 * stable orbit structurally impossible. M2.6 replaced it with real -GM/r^2
 * gravity plus a centrifugal contribution; M2.10 deleted the field. The
 * expression survives as `gravity.legacyOrbitRelief` for the parity record.
 *
 * What remains is the orbital geometry: the radius, and the circular speed at
 * it. 2021 called it at the END of spatial motion; since M11.3 it is called as
 * soon as the position is integrated, because the Verlet velocity update needs
 * gravity at the NEW radius (see the header). `orbitalVelocityAtCurrentAltitude`
 * is kept honest step by step — 2021 wrote it once at spawn (initBackEnd.js:50)
 * and never again — because the HUD reads it and there is no reason to leave a
 * stale number lying there.
 */
function updateOrbitalGeometry(s: Pick<SimState, 'kinematics'>): void {
  const { kinematics } = s;
  kinematics.distanceToPlanetCenter = C.planetRadius + kinematics.altitude;
  kinematics.orbitalVelocityAtCurrentAltitude = gravity.circularOrbitalSpeed(
    kinematics.distanceToPlanetCenter,
  );
}

/** physics.js:365 — ground contact: land, crash, or rest. */
function checkIfCrash(s: SimState, model: VehicleDefinition): void {
  const { kinematics, status, failures, vehicle, engines } = s;

  if (
    kinematics.altitude <=
    model.height * Math.abs(Math.cos(kinematics.pitch)) * 0.5
  ) {
    if (kinematics.speedY < -0.5 || (model.id === 'super-heavy' && kinematics.speedY < 0)) {
      if (
        model.id === 'ship' &&
        Math.abs(kinematics.speedX) < 2 &&
        Math.abs(kinematics.speedY) < C.touchDownSpeedLimit &&
        Math.abs(kinematics.pitch) < C.touchDownPitchLimit
      ) {
        // configLanded(). The 2021 `firstTimeLanded` branch is a UI concern
        // (it revealed the tilt-permission button); the sim half is identical.
        status.landed = true;
        kinematics.speedX = 0;
        kinematics.speedY = 0;
        kinematics.angularVelocity = 0;
      } else {
        // configCrashed()
        failures.crashed = true;
        kinematics.speedX = 0;
        kinematics.speedY = 0;
        kinematics.angularVelocity = 0;
        kinematics.pitch = rad(0);
        vehicle.propellantMass = 0;
        engines.running.fill(false);
        vehicle.rcsRunTimeRemaining = 0;
      }
    }
  } else {
    status.landed = false;
    status.onTheGround = false;
  }
}

/** Ground support uses the current vertical force, including gimbal direction. */
function updateGroundContact(s: TranslationBody, verticalSpecificForce: number, model: VehicleDefinition): void {
  const { kinematics, status } = s;
  const contactHeight = model.height * Math.abs(Math.cos(kinematics.pitch)) * 0.5;
  if (kinematics.altitude > contactHeight || kinematics.speedY < -0.5) return;
  if (s.failures.crashed || status.landed) return;
  status.onTheGround = verticalSpecificForce <= gravity.verticalWeight(kinematics.distanceToPlanetCenter);
  if (status.onTheGround) {
    kinematics.speedX = 0;
    kinematics.speedY = 0;
    kinematics.angularVelocity = 0;
  }
}

/**
 * physics.js:420 — structural limits.
 *
 * The g-limit judges FELT g, the specific force the airframe carries (thrust
 * and aerodynamics), not the net acceleration with gravity in it (Phase 6,
 * Bug fix: a free fall read nearly 1 g, and a hard burn upward read a whole g
 * light).
 */
export function checkIfBreakUp(s: SimState, model: VehicleDefinition, work: StepDynamics): void {
  const { kinematics, forces, failures, vehicle, engines } = s;
  if (
    forces.perceivedG > C.gLimit ||
    // The tile itself, against its limit: the temperature, which includes the
    // surroundings, so the reading and the verdict cannot disagree (Phase 6's
    // independent review: judging the flux let a tile read 1,533.04 K whole).
    forces.surfaceTemperature > C.TILE_LIMIT_KELVIN ||
    forces.dynamicPressure > C.dynamicPressureLimit
  ) {
    failures.inFlightBreakUp = true;
    kinematics.angularVelocity = 0;
    vehicle.propellantMass = 0;
    vehicle.vehicleMass = model.dryMass;
    writeMassProperties(0, work.massProperties, model);
    vehicle.vehicleMomentOfInertia = work.massProperties.momentOfInertia;
    engines.running.fill(false);
    engines.ignitionCountdown.fill(null);
    vehicle.rcsRunTimeRemaining = 0;
    forces.rcsThrust = 0;
  }
}

/** physics.js:432 */
function checkIfOutOfFuel(s: SimState): void {
  if (s.vehicle.propellantMass <= 0) s.failures.fuelRunOut = true;
}

/**
 * physics.js:246 — felt acceleration: the specific force, in g0.
 *
 * The acceleration less what gravity and the polar terms contribute, which is
 * what thrust, aerodynamics and the ground supply: zero in free fall, the local
 * gravity on the pad. Phase 6, Bug fix: this added back a flat 9.807 m/s², so a
 * free fall read 0.03 g at 150 km and the pad read 1.008 g.
 */
function updatePerceivedG(s: Pick<SimState, 'forces'>, specificX: number, specificY: number): void {
  // The current force decomposition already excludes gravity/polar terms.
  // Ground support supplies their opposite when held. Reading it directly
  // avoids both the previous acceleration and a mismatched Verlet velocity.
  const { forces } = s;
  forces.perceivedG_Y = specificY / C.standardGravity;
  forces.perceivedG_X = specificX / C.standardGravity;
  forces.perceivedG = Math.sqrt(forces.perceivedG_Y ** 2 + forces.perceivedG_X ** 2);
}


export function prepareDynamics(s: SimState, dt: number, model: VehicleDefinition, work: StepDynamics): void {
  const { massProperties, gridFinForces } = work;
  /*
    M11.1, Fidelity: the aerodynamics act through the RELATIVE wind, and this
    is the airspeed the forces below are computed from. Read from the INCOMING
    speeds here, before phase 2 can zero them on a crash, so that at zero wind
    it is bit-for-bit the `trueSpeed` the previous step stored from those same
    speeds — including the crash frame, where the stored value was already
    stale in exactly the same way. Local, not stored: nothing outside the
    physics needs it, and adding a field would move every fixture for its shape.
  */
  const incomingAirspeed = aero.relativeAirspeed(
    s.kinematics.speedX,
    s.kinematics.speedY,
    wind.airVelocityX(s.world, s.kinematics.altitude),
    s.world.gustVertical,
  );

  s.world.updatedFrameCount += 1;

  // --- 1. environmentUpDate ------------------------------------------------
  const atmosphere = updateAtmosphere(s.kinematics.altitude);
  s.atmosphere.airTemperature = atmosphere.airTemperature;
  s.atmosphere.airPressure = atmosphere.airPressure;
  s.atmosphere.airDensity = atmosphere.airDensity;

  // --- 2. vehicleStatusUpDate ----------------------------------------------
  checkIfCrash(s, model);
  checkIfOutOfFuel(s);

  const burnedFraction = eng.updatePropellant(s, dt, model);
  eng.updateRaptorStatus(s);
  // The tank emptied this step: the burn above was paid for by the engines
  // already running, so nothing still counting down may light on it (Phase 6,
  // Bug fix found in review). fuelRunOut follows next step, as it always has.
  if (s.vehicle.propellantMass <= 0) s.engines.ignitionCountdown.fill(null);

  // Ignition is a dt-ticked countdown now, not a wall-clock timer (M1.4).
  eng.tickIgnition(s, dt);

  // --- 3. FlightParamsUpDate -----------------------------------------------

  // 3a. updateBasicParams
  const finAreas = aero.updateVehicleInFlightMaxArea(
    s.vehicle.frontFinExtension,
    s.vehicle.aftFinExtension,
    model,
  );
  s.forces.frontFinEffectiveAreaFraction = finAreas.frontFinEffectiveAreaFraction;
  s.forces.aftFinEffectiveAreaFraction = finAreas.aftFinEffectiveAreaFraction;
  s.vehicle.vehicleInFlightMaxArea = finAreas.vehicleInFlightMaxArea;

  s.forces.crossSectionalArea = aero.getCrossSectionalArea(
    s.kinematics.angleInToTheWind,
    s.vehicle.vehicleInFlightMaxArea,
    model,
  );
  s.kinematics.angleOfMotion = aero.getAngleOfMotion(s.kinematics.speedX, s.kinematics.speedY);
  // M11.1: the aerodynamic angles are measured from the relative wind, which is
  // the ground track only in still air. `angleOfMotion` stays the ground track
  // for guidance and the HUD. Equal bits at zero wind — see aero.ts.
  const angleOfRelativeWind = aero.relativeWindAngle(
    s.kinematics.speedX,
    s.kinematics.speedY,
    wind.airVelocityX(s.world, s.kinematics.altitude),
    s.world.gustVertical,
  );
  const angles = aero.getAttackAngles(s.kinematics.pitch, angleOfRelativeWind);
  s.kinematics.angleOfAttack = angles.angleOfAttack;
  s.kinematics.angleInToTheWind = angles.angleInToTheWind;
  s.vehicle.gimbalPointingDirection = eng.getGimbalPointingDirection(
    s.kinematics.pitch,
    s.vehicle.gimbalPosition,
  );

  // updateThermal_DynamicPressure.
  //
  // M2.2, Bug fix: this passed `crossSectionalArea` where getReentryHeatPower
  // expects a nose RADIUS. The Sutton-Graves correlation takes a radius in
  // metres; the area is 63-500 m^2 and varies eightfold with attitude, so the
  // 2021 model understated heating by sqrt(area / radius) - a factor that
  // CHANGED as the vehicle rotated, and in the wrong direction. Turning
  // broadside raised the area, which lowered the computed heat.
  s.forces.thermalPower = getReentryHeatPower(
    incomingAirspeed,
    s.atmosphere.airDensity,
    model.diameter / 2,
    s.kinematics.angleInToTheWind,
  );
  s.forces.surfaceTemperature = surfaceTemperature(
    s.forces.thermalPower,
    radiativeSinkKelvin(s.kinematics.altitude, s.atmosphere.airTemperature),
  );
  s.forces.dynamicPressure = aero.getDynamicPressure(
    s.atmosphere.airDensity,
    incomingAirspeed,
  );

  updatePitchRateOfChange(s, dt);

  s.forces.aerodynamicDrag = aero.getDrag(
    s.atmosphere.airDensity,
    incomingAirspeed,
    s.forces.crossSectionalArea,
    aero.getBodyDragCoefficient(s.kinematics.machSpeed),
  );
  s.forces.aerodynamicLift = aero.getLift(
    s.atmosphere.airDensity,
    incomingAirspeed,
    s.kinematics.angleInToTheWind,
    s.vehicle.vehicleInFlightMaxArea,
  );
  // M11.2: thrust at the ambient pressure phase 1 just set from the altitude.
  // Scaled on the step the tank runs dry: only the propellant left was burned.
  s.forces.thrust =
    eng.getThrust(s.engines.running, s.vehicle.throttleCurrent, s.atmosphere.airPressure, model) *
    burnedFraction;

  // 3b. updateSpactialMotion — velocity Verlet since M11.3 (see the header).
  //
  // The accelerations that do not change within the step: the aerodynamic
  // and thrust components, from the forces phase 3a took off the incoming
  // state. Gravity and the polar terms are added at each end of the step.
  s.forces.aerodynamicDragAcceleration = aero.getAcceleration(
    s.forces.aerodynamicDrag,
    s.vehicle.vehicleMass,
  );
  s.forces.aerodynamicLiftAcceleration = aero.getAcceleration(
    s.forces.aerodynamicLift,
    s.vehicle.vehicleMass,
  );
  s.forces.thrustAcceleration = aero.getAcceleration(s.forces.thrust, s.vehicle.vehicleMass);
  s.forces.twr = s.forces.thrustAcceleration / C.gravity;
  // The sea-level engines gimbal; the RVacs push along the hull. With no RVac
  // lit the share is exactly 1 and the fixed part an exact +0.
  const gimballedThrust =
    s.forces.thrust * eng.gimballedShare(s.engines.running, s.atmosphere.airPressure, model);
  const fixedThrust = s.forces.thrust - gimballedThrust;

  const accelInputs: comp.AccelerationInputs = {
    // M11.1: drag opposes the relative wind and lift is normal to it, so the
    // decomposition takes the relative-wind angle. The field keeps its 2021
    // name; at zero wind the two angles are the same bits.
    angleOfMotion: angleOfRelativeWind,
    angleOfAttack: s.kinematics.angleOfAttack,
    gimbalPointingDirection: s.vehicle.gimbalPointingDirection,
    aerodynamicDragAcceleration: s.forces.aerodynamicDragAcceleration,
    aerodynamicLiftAcceleration: s.forces.aerodynamicLiftAcceleration,
    thrustAcceleration: aero.getAcceleration(gimballedThrust, s.vehicle.vehicleMass),
    fixedThrustAcceleration: aero.getAcceleration(fixedThrust, s.vehicle.vehicleMass),
    pitch: s.kinematics.pitch,
  };
  if (model.gridFins) {
    writeMassProperties(s.vehicle.propellantMass,massProperties,model);
    writeGridFinForces(s.atmosphere.airDensity,
      s.kinematics.speedX - wind.airVelocityX(s.world,s.kinematics.altitude),
      s.kinematics.speedY - s.world.gustVertical,
      rad((s.vehicle.frontFinExtension-50)/50*model.gridFins.maxAngle),
      s.kinematics.pitch,massProperties.centreOfMass,model,gridFinForces);
  }
  const bodyAccelerationX = model.gridFins ? comp.getHorizontalAcceleration(accelInputs) + gridFinForces.forceX/s.vehicle.vehicleMass : comp.getHorizontalAcceleration(accelInputs);
  // M2.6, Fidelity. getVerticalAcceleration applies a constant -gravity;
  // adding C.gravity back and applying real gravity plus the centrifugal term
  // per end of the step is deliberate: it is what made M2.10's unification
  // provably bit-identical, and float addition is not associative.
  const bodyAccelerationY = model.gridFins ? comp.getVerticalAcceleration(accelInputs, C.gravity) + C.gravity + gridFinForces.forceY/s.vehicle.vehicleMass : comp.getVerticalAcceleration(accelInputs, C.gravity) + C.gravity;

  work.bodyAccelerationX = bodyAccelerationX;
  work.bodyAccelerationY = bodyAccelerationY;
  work.burnedFraction = burnedFraction;
  work.gimballedThrust = gimballedThrust;

}

/** Returns whether ground support cancels motion and torque this interval. */
export function integrateTranslation(s: TranslationBody, dt: number, bodyAccelerationX: number, bodyAccelerationY: number, model: VehicleDefinition): boolean {
  updateGroundContact(s, bodyAccelerationY, model);

  // a_n: at the incoming position and velocity.
  const r0 = s.kinematics.distanceToPlanetCenter;
  const vx0 = s.kinematics.speedX;
  const vy0 = s.kinematics.speedY;
  let ax0 = bodyAccelerationX + gravity.tangentialAcceleration(r0, vx0, vy0);
  let ay0 = bodyAccelerationY + gravity.verticalGravityAcceleration(r0, vx0);

  // GROUND CONTACT — M11.3. A vehicle resting on the pad (current support has just
  // zeroed its speeds) with less than a g of thrust is HELD by the ground: the
  // normal force cancels the net downward acceleration and friction the
  // sideways one, so it neither sinks nor creeps. The pre-M11.3 order hid
  // this — position moved by a speed that had just been zeroed — where the
  // a dt^2 / 2 term would sink it 0.3 mm a step. It also puts the stored
  // acceleration right: a vehicle on the pad reads 1 g on the HUD, not 0.
  const held =
    (s.status.onTheGround || s.status.landed || s.failures.crashed) && ay0 <= 0;
  if (held) {
    ax0 = 0;
    ay0 = 0;
  }

  updatePerceivedG(s,
    held ? -gravity.tangentialAcceleration(r0, vx0, vy0) : bodyAccelerationX,
    held ? -gravity.verticalGravityAcceleration(r0, vx0) : bodyAccelerationY,
  );

  // x_{n+1} = x_n + v_n dt + a_n dt^2 / 2.
  const halfDtSquared = 0.5 * dt * dt;
  s.kinematics.altitude += vy0 * dt + ay0 * halfDtSquared;

  s.kinematics.downRangeDistanceNextFrame =
    s.kinematics.downRangeDistance + vx0 * dt + ax0 * halfDtSquared;
  if (s.kinematics.downRangeDistanceNextFrame > C.planetCircumference) {
    s.kinematics.downRangeDistance =
      s.kinematics.downRangeDistanceNextFrame - C.planetCircumference;
  } else if (s.kinematics.downRangeDistanceNextFrame < 0) {
    s.kinematics.downRangeDistance =
      s.kinematics.downRangeDistanceNextFrame + C.planetCircumference;
  } else {
    s.kinematics.downRangeDistance = s.kinematics.downRangeDistanceNextFrame;
  }

  // a_{n+1}: gravity at the new radius, the polar terms at the new radius
  // with the Euler-predicted velocity — which is exactly the velocity the
  // pre-M11.3 scheme would have produced, so this evaluation point is the
  // one the goldens always used; what Verlet changes is the update itself.
  updateOrbitalGeometry(s);
  const r1 = s.kinematics.distanceToPlanetCenter;
  const vx1 = vx0 + ax0 * dt;
  const vy1 = vy0 + ay0 * dt;
  const ax1 = held ? 0 : bodyAccelerationX + gravity.tangentialAcceleration(r1, vx1, vy1);
  const ay1 = held ? 0 : bodyAccelerationY + gravity.verticalGravityAcceleration(r1, vx1);

  // v_{n+1} = v_n + (a_n + a_{n+1}) dt / 2.
  s.kinematics.speedX = vx0 + 0.5 * (ax0 + ax1) * dt;
  s.kinematics.speedY = vy0 + 0.5 * (ay0 + ay1) * dt;

  // What the HUD and the autopilot read: the acceleration at the returned state.
  s.kinematics.accelerationX = ax1;
  s.kinematics.accelerationY = ay1;
  s.kinematics.totalAcceleration = Math.sqrt(ax1 ** 2 + ay1 ** 2);

  s.kinematics.trueSpeed = Math.sqrt(s.kinematics.speedX ** 2 + s.kinematics.speedY ** 2);
  return held;

}

export function finishTranslation(s: SimState, dt: number, work: StepDynamics): void {
  // M11.1: the same magnitude against the relative wind, from the speeds just
  // integrated. Mach and the fin forces read this; the HUD reads trueSpeed.
  const airspeed = aero.relativeAirspeed(
    s.kinematics.speedX,
    s.kinematics.speedY,
    wind.airVelocityX(s.world, s.kinematics.altitude),
    s.world.gustVertical,
  );
  // M2.7, Fidelity. 2021 used a constant 343 m/s everywhere — the sea-level
  // value — so Mach ran ~16% low through the upper atmosphere. That understated
  // the body drag coefficient too, since it is a function of Mach.
  // M11.1: Mach is a ratio to the speed of sound in the air the vehicle moves
  // through, so it is the airspeed over the local speed of sound.
  s.kinematics.machSpeed = airspeed / speedOfSoundAt(s.atmosphere.airTemperature);

  // Phase 6, Task 10: the gusts for the next step, at the altitude just
  // reached. Calm air draws nothing and leaves them at zero (physics/wind.ts).
  wind.updateTurbulence(s.world, s.rng, s.kinematics.altitude, s.kinematics.speedX, s.kinematics.speedY, dt);

  work.airspeed = airspeed;

}

/** Predict the shared angular Verlet position and velocity. */
export function predictRotation(s: Pick<SimState, 'kinematics'>, dt: number, held: boolean, out: AngularStep): void {
  const halfDtSquared = 0.5 * dt * dt;
  // Wrap BEFORE integrating, exactly as 2021 does, so a step can leave pitch
  // slightly outside (-pi, pi] until the next one folds it back.
  if (s.kinematics.pitch > Math.PI) {
    s.kinematics.pitch = rad(s.kinematics.pitch - 2 * Math.PI);
  } else if (s.kinematics.pitch < -Math.PI) {
    s.kinematics.pitch = rad(s.kinematics.pitch + 2 * Math.PI);
  }

  const omega0 = s.kinematics.angularVelocity;
  // Held on the ground, the pad takes the torque too: no rotation.
  const alpha0 = held ? 0 : s.kinematics.angularAcceleration;
  s.kinematics.pitch = rad(s.kinematics.pitch + omega0 * dt + alpha0 * halfDtSquared);
  // The angular drag reads the predicted omega_n + alpha_n dt; it is written
  // back so the drag term below reads it, and replaced by the Verlet update
  // once alpha_{n+1} is known.
  s.kinematics.angularVelocity = omega0 + alpha0 * dt;

  out.omega0 = omega0;
  out.alpha0 = alpha0;
}

/** Evaluate actual body torques at its translated/predicted pose. */
export function writeRotationForces(s: SimState, model: VehicleDefinition, work: StepDynamics): number {
  const { massProperties, gridFinForces, gimballedThrust, burnedFraction, airspeed } = work;
  s.forces.thrustVectorForce = eng.getThrustVectorForce(gimballedThrust, s.vehicle.gimbalPosition);
  s.forces.frontFinDrag = aero.getFrontFinDrag(
    s.atmosphere.airDensity,
    airspeed,
    s.kinematics.angleOfAttack,
    s.kinematics.angleInToTheWind,
    s.forces.frontFinEffectiveAreaFraction,
    model,
  );
  s.forces.aftFinDrag = aero.getAftFinDrag(
    s.atmosphere.airDensity,
    airspeed,
    s.kinematics.angleOfAttack,
    s.kinematics.angleInToTheWind,
    s.forces.aftFinEffectiveAreaFraction,
    model,
  );

  const I = s.vehicle.vehicleMomentOfInertia;
  s.forces.thrustVectorAcceleration = aero.getAngularAcceleration(
    s.forces.thrustVectorForce,
    massProperties.engineArm,
    I,
  );
  s.forces.angularDragAcceleration = aero.getAngularDragAcceleration(
    s.atmosphere.airDensity,
    s.kinematics.angularVelocity,
    I,
    massProperties.rCubedIntegral,
    model,
  );
  s.forces.frontFinDragAngularAcceleration = aero.getAngularAcceleration(
    s.forces.frontFinDrag,
    massProperties.frontFinArm,
    I,
  );
  s.forces.aftFinDragAngularAcceleration = aero.getAngularAcceleration(
    s.forces.aftFinDrag,
    massProperties.aftFinArm,
    I,
  );
  s.forces.rcsThrustAngularAcceleration = aero.getAngularAcceleration(
    s.forces.rcsThrust,
    massProperties.rcsArm,
    I,
  );
  s.forces.offAxisThrustDifferenceAcceleration = aero.getAngularAcceleration(
    eng.getOffAxisThrustDifference(
      s.engines.running,
      s.vehicle.throttleCurrent,
      s.atmosphere.airPressure,
      model,
    ),
    massProperties.engineArm,
    I,
  );

  if (model.gridFins) {
    writeGridFinForces(s.atmosphere.airDensity,
      s.kinematics.speedX - wind.airVelocityX(s.world,s.kinematics.altitude),
      s.kinematics.speedY - s.world.gustVertical,
      rad((s.vehicle.frontFinExtension-50)/50*model.gridFins.maxAngle),
      s.kinematics.pitch,massProperties.centreOfMass,model,gridFinForces);
    s.forces.frontFinDrag = gridFinForces.lift;
    s.forces.frontFinDragAngularAcceleration = gridFinForces.torque/I;
    s.forces.offAxisThrustDifferenceAcceleration = eng.getOffAxisThrustTorque(
      s.engines.running,s.vehicle.throttleCurrent,s.atmosphere.airPressure,
      rad(s.vehicle.gimbalPosition*.01*C.gimbalAngleLimit),model)*burnedFraction/I;
  }

  return s.forces.thrustVectorAcceleration +
    s.forces.angularDragAcceleration +
    s.forces.frontFinDragAngularAcceleration +
    s.forces.aftFinDragAngularAcceleration +
    s.forces.rcsThrustAngularAcceleration +
    s.forces.offAxisThrustDifferenceAcceleration;
}

/** Complete the same angular Verlet kernel for a vehicle or rigid aggregate. */
export function finishRotation(s: Pick<SimState, 'kinematics'>, dt: number, held: boolean, omega0: number, alpha0: number, alpha1: number): void {
  // omega_{n+1} = omega_n + (alpha_n + alpha_{n+1}) dt / 2 — unless held, in
  // which case the pad takes the torque and the stored acceleration is zero,
  // as the translational one is.
  s.kinematics.angularVelocity = held ? 0 : omega0 + 0.5 * (alpha0 + alpha1) * dt;
  s.kinematics.angularAcceleration = held ? 0 : alpha1;

}

export function integrateRotation(s: SimState, dt: number, model: VehicleDefinition, work: StepDynamics, held: boolean): void {
  writeMassProperties(s.vehicle.propellantMass, work.massProperties, model);
  s.vehicle.vehicleMomentOfInertia = work.massProperties.momentOfInertia;
  predictRotation(s, dt, held, work);
  const alpha1 = writeRotationForces(s, model, work);
  finishRotation(s, dt, held, work.omega0, work.alpha0, alpha1);
}
