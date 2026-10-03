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
 * change, not a tidy-up. Phase 6b Task 5, Bug fix: ground support and
 * breakup now read current forces; collision still precedes fuel use:
 *   1. environmentUpDate      atmosphere from altitude
 *   2. vehicleStatusUpDate    collision, propellant, engine status
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
import { SHIP, type VehicleDefinition } from './vehicle';
import { createGridFinForces, writeGridFinForces } from './physics/grid-fins';
import { secureTowerCatch } from './physics/tower-catch';
import { speedOfSoundAt, updateAtmosphere } from './physics/atmosphere';
import { getReentryHeatPower, radiativeSinkKelvin, surfaceTemperature } from './physics/thermal';
import * as aero from './physics/aero';
import * as comp from './physics/components';
import * as gravity from './physics/gravity';
import * as eng from './physics/engines';
import * as wind from './physics/wind';
import { createMassProperties, writeMassProperties } from './physics/mass';
import * as act from './control/actuation';
import { runAutopilot } from './autopilot';
import { runBoosterPostStep } from './autopilot/booster';
import type { MechanicalControl } from './control/mechanical';
import { invalidateBoosterReturn } from './control/booster-return-plan';
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

/**
 * The mass properties for the step in hand (M11.8). A module scratch, written
 * from the state at the top of phase 3c and read only within that step, so
 * `step` stays pure: nothing survives between calls.
 */
const massProperties = createMassProperties();

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
function updateGroundContact(s: SimState, verticalSpecificForce: number, model: VehicleDefinition): void {
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
function checkIfBreakUp(s: SimState, model: VehicleDefinition): void {
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
    writeMassProperties(0, massProperties, model);
    vehicle.vehicleMomentOfInertia = massProperties.momentOfInertia;
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
function updatePerceivedG(s: SimState, specificX: number, specificY: number): void {
  // The current force decomposition already excludes gravity/polar terms.
  // Ground support supplies their opposite when held. Reading it directly
  // avoids both the previous acceleration and a mismatched Verlet velocity.
  const { forces } = s;
  forces.perceivedG_Y = specificY / C.standardGravity;
  forces.perceivedG_X = specificX / C.standardGravity;
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
const gridFinForces = createGridFinForces();

export function step(previous: SimState, dt: number, input: StepInput = NO_INPUT, model: VehicleDefinition = SHIP): SimState {
  const next=advance(previous,dt,input,model,flightControls);
  if(model.id==='super-heavy')runBoosterPostStep(next,dt,model,advanceMechanics);
  return next;
}

function flightControls(state:SimState,dt:number,model:VehicleDefinition):void {
  runAutopilot(state,dt,model,advanceMechanics);
}

/** The very same physics/engine/actuator advance, with a supplied planned
 * control law. Input and all RNG are cloned just as in normal step(). */
export function advanceMechanics(previous:SimState,dt:number,control:MechanicalControl,model:VehicleDefinition):SimState {
  return advance(previous,dt,NO_INPUT,model,control);
}

function advance(previous:SimState,dt:number,input:StepInput,model:VehicleDefinition,control:MechanicalControl):SimState {
  const s = cloneState(previous);
  // Chopstick contact carries weight and torque until a scenario restart.
  // A secured booster has no ground contact and cannot restart propulsion.
  if (model.id === 'super-heavy' && previous.status.landed) {
    s.engines.running.fill(false);
    s.engines.ignitionCountdown.fill(null);
    s.world.environmentTime += dt;
    s.world.updatedFrameCount += 1;
    return s;
  }

  // Invalidate before policy can execute a cutoff from the old commanded
  // future. Post-step planning may observe the complete overridden source.
  if(model.id==='super-heavy' && (input.pitchControl!==undefined || input.throttle!==undefined))
    invalidateBoosterReturn(s.autopilot);

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

  // 3c. updateRotationalMotion — the same Verlet form, with alpha_n the
  // angular acceleration STORED by the previous step (the torques below need
  // the airspeed just integrated, so they cannot be evaluated first).
  //
  // M11.8: the moment arms and the inertia follow the propellant. The centre
  // of mass moves as the tanks drain (physics/mass.ts), so the gimbal's arm,
  // the fins' arms and the RCS arm are all functions of the load this step.
  writeMassProperties(s.vehicle.propellantMass, massProperties, model);
  s.vehicle.vehicleMomentOfInertia = massProperties.momentOfInertia;

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
  control(s, dt, model);

  if (input.throttle !== undefined) s.vehicle.throttle = input.throttle;
  if (input.pitchControl !== undefined) {
    s.autopilot.pitchControl = input.pitchControl;
    if (model.gridFins) s.autopilot.boosterFinControl = input.pitchControl;
  }

  act.controlTranslation(s, s.autopilot.pitchControl, dt, model, input.pitchControl !== undefined);
  act.throttleUpdate(s, dt);

  // Judge current pressure, tile temperature and specific force. Shutdown is
  // last, cancelling even an ignition just requested by controls. Motion
  // retains this step's paid impulse; no engine can fire on the next step.
  checkIfBreakUp(s, model);
  if (model.id === 'super-heavy') secureTowerCatch(previous, s, model);

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
