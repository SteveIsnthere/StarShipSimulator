/**
 * The simulation step. Ported from backend/updateBackEnd.js.
 *
 * `step(state, dt, input)` is pure: same state, same dt, same input, identical
 * output, always. It returns a NEW SimState and never touches the one it is
 * given. That is the property golden fixtures are built on, and the reason this
 * file may not read the clock, the DOM, or a global.
 *
 * ORDER IS THE CONTRACT. The phases run in a specific sequence and several read
 * values the previous phase just wrote. Reordering anything here is a physics
 * change, not a tidy-up. The 2021 phase order is kept:
 *   1. environmentUpDate      atmosphere from altitude
 *   2. vehicleStatusUpDate    failures, propellant, engine status
 *   3. FlightParamsUpDate     basic params, spatial motion, rotational motion
 *   4. controlsUpdate         autopilot, translation, throttle
 *
 * THE INTEGRATOR IS VELOCITY VERLET — M11.3, Fidelity. Up to M11.3 phase 3
 * integrated as 2021 did: position by the incoming velocity, velocity by the
 * acceleration stored at the end of the PREVIOUS step, then a fresh
 * acceleration for next time — a first-order scheme. Measured against
 * Kepler's closed form on an eccentric vacuum orbit (tests/core/verlet.test.ts)
 * its position error halved with dt and its energy error was 2e-6 at 1/120;
 * the M11 survey's "part in 10^10" was a circular orbit, which is a fixed
 * point of this polar scheme and hides the error. Velocity Verlet is second
 * order in both: the error quarters with dt and energy holds to 7e-13.
 * Within one step, for the translational motion:
 *
 *   forces   drag, lift, thrust from the INCOMING state (3a, as before)
 *   a_n      those, plus gravity and the polar terms at the incoming r and v
 *   x_{n+1}  = x_n + v_n dt + a_n dt^2 / 2
 *   a_{n+1}  the same aero and thrust accelerations, plus gravity at the NEW
 *            r and the polar terms at the new r with the Euler-predicted
 *            velocity v_n + a_n dt (a velocity-dependent force needs a
 *            velocity at the new time, and the predictor is second order)
 *   v_{n+1}  = v_n + (a_n + a_{n+1}) dt / 2
 *
 * The stored `accelerationX/Y` is a_{n+1}: the acceleration at the state the
 * step returns, which is what the HUD and the autopilot read. The aerodynamic
 * forces are NOT re-evaluated at the new velocity — they are held at v_n for
 * the whole step, so the scheme is second order in gravity and first in drag,
 * which is the order the goldens exercise it in: drag is dissipative and the
 * conservation argument is about vacuum. Rotational motion takes the same
 * form with the angular acceleration STORED from the previous step as
 * alpha_n (the torques are only known after the translational update, since
 * the fin forces read the new airspeed), the angular drag at the predicted
 * omega_n + alpha_n dt, and the stored `angularAcceleration` is alpha_{n+1}.
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
function updateOrbitalGeometry(s: SimState): void {
  const { kinematics } = s;
  kinematics.distanceToPlanetCenter = C.planetRadius + kinematics.altitude;
  kinematics.orbitalVelocityAtCurrentAltitude = gravity.circularOrbitalSpeed(
    kinematics.distanceToPlanetCenter,
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
    } else if (forces.thrustAcceleration <= gravity.gravityAt(kinematics.distanceToPlanetCenter)) {
      // configOnTheGround(). M11.3: against the LOCAL gravity, which is what
      // the integrator applies — 9.731 m/s^2 at the pad, not the 9.807 constant
      // 2021 compared with. The two disagreed by 0.8%, and in that band phase
      // 2 zeroed the speeds while 3b's a*dt^2/2 term crept the vehicle upward.
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

/**
 * physics.js:246 — felt acceleration.
 *
 * 2021 added `orbitGravityAccCompensation` here; that term is gone (M2.10) and
 * was identically zero in the fidelity path before it went, so this expression
 * is unchanged numerically.
 */
function updatePerceivedG(s: SimState): void {
  const { kinematics, forces } = s;
  forces.perceivedG_Y = (kinematics.accelerationY + C.gravity) / C.gravity;
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
    s.world.wind,
    s.world.gust,
  );

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
  // M11.1: the aerodynamic angles are measured from the relative wind, which is
  // the ground track only in still air. `angleOfMotion` stays the ground track
  // for guidance and the HUD. Equal bits at zero wind — see aero.ts.
  const angleOfRelativeWind = aero.relativeWindAngle(
    s.kinematics.speedX,
    s.kinematics.speedY,
    s.world.wind,
    s.world.gust,
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
    C.NOSE_RADIUS,
  );
  s.forces.dynamicPressure = aero.getDynamicPressure(
    s.atmosphere.airDensity,
    incomingAirspeed,
  );

  updatePitchRateOfChange(s, dt);
  s.forces.twr = s.forces.thrustAcceleration / C.gravity;

  updatePerceivedG(s);

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
  s.forces.thrust = eng.getThrust(
    s.engines.running,
    s.vehicle.throttleCurrent,
    s.atmosphere.airPressure,
  );

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

  const accelInputs: comp.AccelerationInputs = {
    // M11.1: drag opposes the relative wind and lift is normal to it, so the
    // decomposition takes the relative-wind angle. The field keeps its 2021
    // name; at zero wind the two angles are the same bits.
    angleOfMotion: angleOfRelativeWind,
    angleOfAttack: s.kinematics.angleOfAttack,
    gimbalPointingDirection: s.vehicle.gimbalPointingDirection,
    aerodynamicDragAcceleration: s.forces.aerodynamicDragAcceleration,
    aerodynamicLiftAcceleration: s.forces.aerodynamicLiftAcceleration,
    thrustAcceleration: s.forces.thrustAcceleration,
  };
  const bodyAccelerationX = comp.getHorizontalAcceleration(accelInputs);
  // M2.6, Fidelity. getVerticalAcceleration applies a constant -gravity;
  // adding C.gravity back and applying real gravity plus the centrifugal term
  // per end of the step is deliberate: it is what made M2.10's unification
  // provably bit-identical, and float addition is not associative.
  const bodyAccelerationY = comp.getVerticalAcceleration(accelInputs, C.gravity) + C.gravity;

  // a_n: at the incoming position and velocity.
  const r0 = s.kinematics.distanceToPlanetCenter;
  const vx0 = s.kinematics.speedX;
  const vy0 = s.kinematics.speedY;
  let ax0 = bodyAccelerationX + gravity.tangentialAcceleration(r0, vx0, vy0);
  let ay0 = bodyAccelerationY + gravity.verticalGravityAcceleration(r0, vx0);

  // GROUND CONTACT — M11.3. A vehicle resting on the pad (phase 2 has just
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
  // M11.1: the same magnitude against the relative wind, from the speeds just
  // integrated. Mach and the fin forces read this; the HUD reads trueSpeed.
  const airspeed = aero.relativeAirspeed(
    s.kinematics.speedX,
    s.kinematics.speedY,
    s.world.wind,
    s.world.gust,
  );
  // M2.7, Fidelity. 2021 used a constant 343 m/s everywhere — the sea-level
  // value — so Mach ran ~16% low through the upper atmosphere. That understated
  // the body drag coefficient too, since it is a function of Mach.
  // M11.1: Mach is a ratio to the speed of sound in the air the vehicle moves
  // through, so it is the airspeed over the local speed of sound.
  s.kinematics.machSpeed = airspeed / speedOfSoundAt(s.atmosphere.airTemperature);

  // 3c. updateRotationalMotion — the same Verlet form, with alpha_n the
  // angular acceleration STORED by the previous step (the torques below need
  // the airspeed just integrated, so they cannot be evaluated first).
  s.vehicle.vehicleMomentOfInertia = eng.getMomentOfInertia(s.vehicle.vehicleMass);

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

  s.forces.thrustVectorForce = eng.getThrustVectorForce(s.forces.thrust, s.vehicle.gimbalPosition);
  s.forces.frontFinDrag = aero.getFrontFinDrag(
    s.atmosphere.airDensity,
    airspeed,
    s.kinematics.angleOfAttack,
    s.kinematics.angleInToTheWind,
    s.forces.frontFinEffectiveAreaFraction,
  );
  s.forces.aftFinDrag = aero.getAftFinDrag(
    s.atmosphere.airDensity,
    airspeed,
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
    eng.getOffAxisThrustDifference(
      s.engines.running,
      s.vehicle.throttleCurrent,
      s.atmosphere.airPressure,
    ),
    C.engineDistanceFromCenterOfMass,
    I,
  );

  const alpha1 =
    s.forces.thrustVectorAcceleration +
    s.forces.angularDragAcceleration +
    s.forces.frontFinDragAngularAcceleration +
    s.forces.aftFinDragAngularAcceleration +
    s.forces.rcsThrustAngularAcceleration +
    s.forces.offAxisThrustDifferenceAcceleration;
  // omega_{n+1} = omega_n + (alpha_n + alpha_{n+1}) dt / 2 — unless held, in
  // which case the pad takes the torque and the stored acceleration is zero,
  // as the translational one is.
  s.kinematics.angularVelocity = held ? 0 : omega0 + 0.5 * (alpha0 + alpha1) * dt;
  s.kinematics.angularAcceleration = held ? 0 : alpha1;

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
