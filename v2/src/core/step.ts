/**
 * The simulation step. Ported from backend/updateBackEnd.js.
 *
 * `step(state, dt, input)` is pure: same state, same dt, same input, identical
 * output, always. It returns a NEW SimState and never touches the one it is
 * given. That is the property golden fixtures are built on, and the reason this
 * file may not read the clock, the DOM, or a global.
 *
 * ORDER IS THE CONTRACT. updateBackEnd() runs its phases in a specific sequence,
 * and several of them read values the previous phase just wrote — spatial motion
 * integrates using accelerations computed at the END of the previous step, not
 * this one. Reordering anything here is a physics change, not a tidy-up.
 *
 * The 2021 order, preserved exactly:
 *   1. environmentUpDate      atmosphere from altitude
 *   2. vehicleStatusUpDate    failures, propellant, engine status
 *   3. FlightParamsUpDate     basic params, spatial motion, rotational motion
 *   4. controlsUpdate         autopilot, translation, throttle
 *
 * On `dt`: 2021 divided per-second rates by `renderTimeInterval`, which equals
 * `frameRate / timeAccel` and so is the reciprocal of simulated seconds per
 * frame. `X / renderTimeInterval` is therefore exactly `X * dt`.
 */
import * as C from './constants';
import { speedOfSoundAt, updateAtmosphere } from './physics/atmosphere';
import { getReentryHeatPower } from './physics/thermal';
import * as aero from './physics/aero';
import * as comp from './physics/components';
import * as gravity from './physics/gravity';
import * as eng from './physics/engines';
import * as act from './control/actuation';
import { runAutopilot } from './autopilot';
import { cloneState, type SimState } from './state';
import { rad } from './units';

/**
 * Everything the outside world can tell the simulation in one step.
 *
 * In 2021 these were read straight from DOM sliders inside the physics loop
 * (updateBackEnd.js:197 and :201). Passing them in is what removes wall 2 from
 * the hot path and what makes a step replayable.
 */
export interface StepInput {
  /** % — commanded throttle, 0..100. Undefined leaves the current command. */
  throttle?: number | undefined;
  /** % — pitch command, -100..100. Undefined leaves the current command. */
  pitchControl?: number | undefined;
}

export const NO_INPUT: StepInput = {};

// ---------------------------------------------------------------------------

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
 * physics.js:394 — the orbital "relief" hack, and its replacement.
 *
 * Mutates `distanceToPlanetCenter` and `orbitGravityAccCompensation`. Called at
 * the END of spatial motion, exactly where 2021 calls it, so the value used by
 * this step's integration is the one computed last step.
 *
 * With `planetCenteredGravity` off this is the 2021 term verbatim, including
 * its stale denominator and its clamp at g. With the flag on, the relief term
 * is not corrected but deleted: gravity itself becomes -GM/r^2 with a
 * centrifugal contribution, and orbital motion needs no special case. The field
 * is then zero and kept only so the HUD and fixtures have a stable shape.
 */
function updateOrbitGravityAccCompensation(s: SimState): void {
  const { kinematics } = s;
  kinematics.distanceToPlanetCenter = C.planetRadius + kinematics.altitude;

  if (s.flags.planetCenteredGravity) {
    // M2.6: orbital motion is in the gravity term now. Keeping the stale
    // orbitalVelocity field updated as well, since the HUD reads it and it
    // costs nothing to make it honest.
    kinematics.orbitalVelocityAtCurrentAltitude = gravity.circularOrbitalSpeed(
      kinematics.distanceToPlanetCenter,
    );
    kinematics.orbitGravityAccCompensation = 0;
    return;
  }

  // The 2021 term. Note the stale denominator: orbitalVelocityAtCurrentAltitude
  // is written once at spawn (initBackEnd.js:50) and never updated, so this
  // uses the sea-level orbital velocity for the whole flight. It is also linear
  // in speedX where the true relief is quadratic, and clamped at exactly g,
  // which makes a stable orbit structurally impossible.
  kinematics.orbitGravityAccCompensation = gravity.legacyOrbitRelief(
    kinematics.speedX,
    kinematics.orbitalVelocityAtCurrentAltitude,
  );
}

/** physics.js:365 — ground contact: land, crash, or rest. */
function checkIfCrash(s: SimState): void {
  const { kinematics, status, failures, vehicle, engines, forces } = s;

  if (
    kinematics.altitude <=
    C.vehicleHeight * Math.abs(Math.cos(kinematics.pitch)) * 0.5
  ) {
    if (kinematics.speedY < -0.5) {
      if (
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
        engines.running = [false, false, false];
        vehicle.rcsRunTimeRemaining = 0;
      }
    } else if (forces.thrustAcceleration <= C.gravity) {
      // configOnTheGround()
      status.onTheGround = true;
      kinematics.speedX = 0;
      kinematics.speedY = 0;
      kinematics.angularVelocity = 0;
    }
  } else {
    status.landed = false;
    status.onTheGround = false;
  }
}

/** physics.js:420 — structural limits. */
function checkIfBreakUp(s: SimState): void {
  const { kinematics, forces, failures, vehicle, engines } = s;
  if (
    kinematics.totalAcceleration > C.gLimit * C.gravity ||
    forces.thermalPower > C.heatLimit ||
    forces.dynamicPressure > C.dynamicPressureLimit
  ) {
    failures.inFlightBreakUp = true;
    kinematics.angularVelocity = 0;
    vehicle.propellantMass = 0;
    engines.running = [false, false, false];
    vehicle.rcsRunTimeRemaining = 0;
  }
}

/** physics.js:432 */
function checkIfOutOfFuel(s: SimState): void {
  if (s.vehicle.propellantMass <= 0) s.failures.fuelRunOut = true;
}

/** physics.js:246 — felt acceleration, including the orbital relief term. */
function updatePerceivedG(s: SimState): void {
  const { kinematics, forces } = s;
  forces.perceivedG_Y =
    (kinematics.accelerationY + kinematics.orbitGravityAccCompensation + C.gravity) / C.gravity;
  forces.perceivedG_X = kinematics.accelerationX / C.gravity;
  forces.perceivedG = Math.sqrt(forces.perceivedG_Y ** 2 + forces.perceivedG_X ** 2);
}

// ---------------------------------------------------------------------------

/**
 * Advance the simulation by one fixed timestep.
 *
 * @param previous the state to advance; never mutated
 * @param dt simulated seconds, > 0
 * @param input commands from the player or autopilot this step
 * @returns a new SimState
 */
export function step(previous: SimState, dt: number, input: StepInput = NO_INPUT): SimState {
  const s = cloneState(previous);

  s.world.updatedFrameCount += 1;

  // --- 1. environmentUpDate ------------------------------------------------
  const atmosphere = updateAtmosphere(s.kinematics.altitude);
  s.atmosphere.airTemperature = atmosphere.airTemperature;
  s.atmosphere.airPressure = atmosphere.airPressure;
  s.atmosphere.airDensity = atmosphere.airDensity;

  // --- 2. vehicleStatusUpDate ----------------------------------------------
  checkIfBreakUp(s);
  checkIfCrash(s);
  checkIfOutOfFuel(s);

  eng.updatePropellant(s, dt);
  eng.updateRaptorStatus(s);

  // Ignition is a dt-ticked countdown now, not a wall-clock timer (M1.4).
  eng.tickIgnition(s, dt);

  // --- 3. FlightParamsUpDate -----------------------------------------------

  // 3a. updateBasicParams
  const finAreas = aero.updateVehicleInFlightMaxArea(
    s.vehicle.frontFinExtension,
    s.vehicle.aftFinExtension,
  );
  s.forces.frontFinEffectiveAreaFraction = finAreas.frontFinEffectiveAreaFraction;
  s.forces.aftFinEffectiveAreaFraction = finAreas.aftFinEffectiveAreaFraction;
  s.vehicle.vehicleInFlightMaxArea = finAreas.vehicleInFlightMaxArea;

  s.forces.crossSectionalArea = aero.getCrossSectionalArea(
    s.kinematics.angleInToTheWind,
    s.vehicle.vehicleInFlightMaxArea,
  );
  s.kinematics.angleOfMotion = aero.getAngleOfMotion(s.kinematics.speedX, s.kinematics.speedY);
  const angles = aero.getAttackAngles(s.kinematics.pitch, s.kinematics.angleOfMotion);
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
    s.kinematics.trueSpeed,
    s.atmosphere.airDensity,
    C.NOSE_RADIUS,
  );
  s.forces.dynamicPressure = aero.getDynamicPressure(
    s.atmosphere.airDensity,
    s.kinematics.trueSpeed,
  );

  updatePitchRateOfChange(s, dt);
  s.forces.twr = s.forces.thrustAcceleration / C.gravity;

  // Reads last step's orbitGravityAccCompensation; this step's is written at
  // the end of spatial motion below, matching updateBackEnd()'s order exactly.
  updatePerceivedG(s);

  s.forces.aerodynamicDrag = aero.getDrag(
    s.atmosphere.airDensity,
    s.kinematics.trueSpeed,
    s.forces.crossSectionalArea,
    aero.getBodyDragCoefficient(s.kinematics.machSpeed),
  );
  s.forces.aerodynamicLift = aero.getLift(
    s.atmosphere.airDensity,
    s.kinematics.trueSpeed,
    s.kinematics.angleInToTheWind,
    s.vehicle.vehicleInFlightMaxArea,
  );
  s.forces.thrust = eng.getThrust(s.engines.running, s.vehicle.throttleCurrent);

  // 3b. updateSpactialMotion. Integrates with LAST step's accelerations, then
  // recomputes them — semi-implicit in an unusual order. Preserved.
  s.kinematics.altitude += s.kinematics.speedY * dt;

  s.kinematics.downRangeDistanceNextFrame = s.kinematics.downRangeDistance + s.kinematics.speedX * dt;
  if (s.kinematics.downRangeDistanceNextFrame > C.planetCircumference) {
    s.kinematics.downRangeDistance =
      s.kinematics.downRangeDistanceNextFrame - C.planetCircumference;
  } else if (s.kinematics.downRangeDistanceNextFrame < 0) {
    s.kinematics.downRangeDistance =
      s.kinematics.downRangeDistanceNextFrame + C.planetCircumference;
  } else {
    s.kinematics.downRangeDistance = s.kinematics.downRangeDistanceNextFrame;
  }

  s.kinematics.speedX += s.kinematics.accelerationX * dt;
  s.kinematics.speedY += (s.kinematics.accelerationY + s.kinematics.orbitGravityAccCompensation) * dt;

  s.kinematics.trueSpeed = Math.sqrt(s.kinematics.speedX ** 2 + s.kinematics.speedY ** 2);
  // M2.7, Fidelity. 2021 used a constant 343 m/s everywhere — the sea-level
  // value — so Mach ran ~16% low through the upper atmosphere. That understated
  // the body drag coefficient too, since it is a function of Mach.
  s.kinematics.machSpeed =
    s.kinematics.trueSpeed /
    (s.flags.realSpeedOfSound ? speedOfSoundAt(s.atmosphere.airTemperature) : C.speedOfSound);

  // updateSpactialAccelerations
  s.forces.aerodynamicDragAcceleration = aero.getAcceleration(
    s.forces.aerodynamicDrag,
    s.vehicle.vehicleMass,
  );
  s.forces.aerodynamicLiftAcceleration = aero.getAcceleration(
    s.forces.aerodynamicLift,
    s.vehicle.vehicleMass,
  );
  s.forces.thrustAcceleration = aero.getAcceleration(s.forces.thrust, s.vehicle.vehicleMass);

  const accelInputs: comp.AccelerationInputs = {
    angleOfMotion: s.kinematics.angleOfMotion,
    angleOfAttack: s.kinematics.angleOfAttack,
    gimbalPointingDirection: s.vehicle.gimbalPointingDirection,
    aerodynamicDragAcceleration: s.forces.aerodynamicDragAcceleration,
    aerodynamicLiftAcceleration: s.forces.aerodynamicLiftAcceleration,
    thrustAcceleration: s.forces.thrustAcceleration,
  };
  s.kinematics.accelerationX = comp.getHorizontalAcceleration(accelInputs);
  s.kinematics.accelerationY = comp.getVerticalAcceleration(accelInputs, C.gravity);

  if (s.flags.planetCenteredGravity) {
    // M2.6, Fidelity. getVerticalAcceleration applied a constant -9.807; undo
    // that and apply real gravity plus the centrifugal term instead. Adding the
    // difference rather than restructuring the ladder keeps the flag-off path
    // bit-identical, which is what lets the default fixtures stay untouched.
    s.kinematics.accelerationY +=
      C.gravity +
      gravity.verticalGravityAcceleration(
        s.kinematics.distanceToPlanetCenter,
        s.kinematics.speedX,
      );

    // Angular momentum r*v_t is conserved under a central force: climbing while
    // moving tangentially must cost tangential speed. Without this a vehicle
    // could climb without slowing and gain orbital energy from nothing.
    s.kinematics.accelerationX += gravity.tangentialAcceleration(
      s.kinematics.distanceToPlanetCenter,
      s.kinematics.speedX,
      s.kinematics.speedY,
    );
  }

  s.kinematics.totalAcceleration = Math.sqrt(
    s.kinematics.accelerationX ** 2 + s.kinematics.accelerationY ** 2,
  );
  // Last line of updateSpactialMotion, and it must stay last.
  updateOrbitGravityAccCompensation(s);

  // 3c. updateRotationalMotion
  s.vehicle.vehicleMomentOfInertia = eng.getMomentOfInertia(s.vehicle.vehicleMass);

  // Wrap BEFORE integrating, exactly as 2021 does, so a step can leave pitch
  // slightly outside (-pi, pi] until the next one folds it back.
  if (s.kinematics.pitch > Math.PI) {
    s.kinematics.pitch = rad(s.kinematics.pitch - 2 * Math.PI);
  } else if (s.kinematics.pitch < -Math.PI) {
    s.kinematics.pitch = rad(s.kinematics.pitch + 2 * Math.PI);
  }

  s.kinematics.pitch = rad(s.kinematics.pitch + s.kinematics.angularVelocity * dt);
  s.kinematics.angularVelocity += s.kinematics.angularAcceleration * dt;

  s.forces.thrustVectorForce = eng.getThrustVectorForce(s.forces.thrust, s.vehicle.gimbalPosition);
  s.forces.frontFinDrag = aero.getFrontFinDrag(
    s.atmosphere.airDensity,
    s.kinematics.trueSpeed,
    s.kinematics.angleOfAttack,
    s.kinematics.angleInToTheWind,
    s.forces.frontFinEffectiveAreaFraction,
  );
  s.forces.aftFinDrag = aero.getAftFinDrag(
    s.atmosphere.airDensity,
    s.kinematics.trueSpeed,
    s.kinematics.angleOfAttack,
    s.kinematics.angleInToTheWind,
    s.forces.aftFinEffectiveAreaFraction,
  );

  const I = s.vehicle.vehicleMomentOfInertia;
  s.forces.thrustVectorAcceleration = aero.getAngularAcceleration(
    s.forces.thrustVectorForce,
    C.engineDistanceFromCenterOfMass,
    I,
  );
  s.forces.angularDragAcceleration = aero.getAngularDragAcceleration(
    s.atmosphere.airDensity,
    s.kinematics.angularVelocity,
    I,
  );
  s.forces.frontFinDragAngularAcceleration = aero.getAngularAcceleration(
    s.forces.frontFinDrag,
    C.frontFinDistanceFromCenterOfMass,
    I,
  );
  s.forces.aftFinDragAngularAcceleration = aero.getAngularAcceleration(
    s.forces.aftFinDrag,
    C.aftFinDistanceFromCenterOfMass,
    I,
  );
  s.forces.rcsThrustAngularAcceleration = aero.getAngularAcceleration(
    s.forces.rcsThrust,
    C.rcsThrustDistanceFromCenterOfMass,
    I,
  );
  s.forces.offAxisThrustDifferenceAcceleration = aero.getAngularAcceleration(
    eng.getOffAxisThrustDifference(s.engines.running, s.vehicle.throttleCurrent),
    C.engineDistanceFromCenterOfMass,
    I,
  );

  s.kinematics.angularAcceleration =
    s.forces.thrustVectorAcceleration +
    s.forces.angularDragAcceleration +
    s.forces.frontFinDragAngularAcceleration +
    s.forces.aftFinDragAngularAcceleration +
    s.forces.rcsThrustAngularAcceleration +
    s.forces.offAxisThrustDifferenceAcceleration;

  // --- 4. controlsUpdate ---------------------------------------------------
  // highLevelInput(): autopilot first, then manual input, which overrides it.
  // That is 2021's order — readInputFromManualFlightControl() ran after
  // autoPilotControlInput() and simply clobbered whatever the autopilot wrote,
  // which is why any manual touch instantly takes over.
  runAutopilot(s, dt);

  if (input.throttle !== undefined) s.vehicle.throttle = input.throttle;
  if (input.pitchControl !== undefined) s.autopilot.pitchControl = input.pitchControl;

  act.controlTranslation(s, s.autopilot.pitchControl, dt);
  act.throttleUpdate(s, dt);

  // --- bookkeeping ---------------------------------------------------------
  s.world.environmentTime += dt;
  if (
    !s.failures.crashed &&
    !s.failures.inFlightBreakUp &&
    !s.status.onTheGround &&
    !s.status.landed
  ) {
    s.world.timeSpent += dt;
  }

  return s;
}
