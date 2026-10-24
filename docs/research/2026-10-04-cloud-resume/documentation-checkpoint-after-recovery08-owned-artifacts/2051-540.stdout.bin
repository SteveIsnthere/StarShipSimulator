/** Return guidance for the actual booster. All authority, drag, gravity and
 * fuel come from the shared physical model; no preset-id or capture override. */
import * as C from '../constants';
import type { SimState } from '../state';
import type { VehicleDefinition } from '../vehicle';
import { rad, type Rad } from '../units';
import { CENTRE_ENGINES, RETURN_ENGINES, CATCH } from '../vehicles/super-heavy';
import { shutdownEngine, getTotalMaxThrust, gimballedShare, IGNITION_DELAY_MAX_S } from '../physics/engines';
import { createMassProperties } from '../physics/mass';
import { createGridFinForces } from '../physics/grid-fins';
import { createDamageMassProperties } from '../physics/damage-mass';
import { writeFlightMassQuery } from '../physics/flight-mass-query';
import { writeFlightGridForces } from '../physics/damage-flight';
import { airVelocityX } from '../physics/wind';
import { createBurnScratch, createFallResult, unpoweredFallInto, landingBurnStartAltitude, conservativeBurnStartAltitude, localGravity } from '../control/guidance-physics';
import { getMaxSpeedWithSafeDynamicPressure } from '../control/primitives';
import { createBoosterThrustRequest,writeBoosterThrustRequest,writeBoosterForceRequest,boosterDeliveredThrottle,createBoosterArrival,writeBoosterArrival } from '../control/booster-arrival';
import { toggleRaptor } from '../control/commands';
import { isaAtmosphereInto } from '../physics/isa';
import type { MechanicalAdvance } from '../control/mechanical';
import { ensureBoosterSource, advanceBoosterSource, verifyBoosterSource,prepareBoosterSourceCredit,boosterSourceCreditMatches } from '../control/booster-source';
import { advanceBoosterPrediction } from '../control/booster-prediction';
import { invalidateBoosterReturn, invalidateStaleBoosterReturn } from '../control/booster-return-plan';

const arms = createMassProperties();
const retained = createDamageMassProperties();
const grid = createGridFinForces();
const burn = createBurnScratch();
const fall = createFallResult();
const thrustRequest=createBoosterThrustRequest();
const TERMINAL_ATTITUDE_TIME=.5;
const arrival=createBoosterArrival();
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

function setEngines(state: SimState, group: readonly number[]): void {
  for (let i = 0; i < state.engines.running.length; i++) {
    if (group.includes(i)) {
      if (!state.engines.running[i] && state.engines.ignitionCountdown[i] === null
        && !state.engines.failed[i] && !state.failures.fuelRunOut) toggleRaptor(state, i);
    } else shutdownEngine(state, i);
  }
}

/** Existing bounded fin inversion. It proposes a target; only later physical
 * actuator slew may supply torque. Keep the unpowered query/order exact. */
function commandGridTorque(state:SimState,vx:number,vy:number,torque:number,model:VehicleDefinition):void {
  const k=state.kinematics,a=state.autopilot,fins=model.gridFins!;
  writeFlightGridForces(state,state.atmosphere.airDensity,vx,vy,k.pitch,arms,model,grid,rad(-fins.maxAngle));
  const lowTorque = grid.torque;
  writeFlightGridForces(state,state.atmosphere.airDensity,vx,vy,k.pitch,arms,model,grid,rad(fins.maxAngle));
  const highTorque = grid.torque;
  let low = -fins.maxAngle, high = fins.maxAngle;
  if (Math.abs(highTorque - lowTorque) > 1) {
    for (let i = 0; i < 14; i++) {
      const middle = (low + high) / 2;
      writeFlightGridForces(state,state.atmosphere.airDensity,vx,vy,k.pitch,arms,model,grid,rad(middle));
      if ((grid.torque < torque) === (highTorque > lowTorque)) low = middle;
      else high = middle;
    }
    const delta = (low + high) / 2;
    a.boosterFinControl = delta / fins.maxAngle * 100;
    writeFlightGridForces(state,state.atmosphere.airDensity,vx,vy,k.pitch,arms,model,grid,rad(delta));
  } else a.boosterFinControl = 0;
}

/** Grid and gimbal/RCS are independent hardware: allocate the requested torque
 * first to aerodynamic or engine authority, then to paid proportional RCS. */
function align(state: SimState, goal: Rad, time: number, model: VehicleDefinition, poweredGrid=false): void {
  const k = state.kinematics, a = state.autopilot;
  const error = Math.atan2(Math.sin(goal - k.pitch), Math.cos(goal - k.pitch));
  writeFlightMassQuery(state, model, retained, arms);
  const torque = (error / time ** 2 - 2 * k.angularVelocity / time
    - (retained.engineSupportAvailable?state.forces.offAxisThrustDifferenceAcceleration:0)
    - state.forces.angularDragAcceleration) * (state.damage?retained.momentOfInertia:state.vehicle.vehicleMomentOfInertia);
  const steerable = (retained.engineSupportAvailable?state.forces.thrust:0) * gimballedShare(state.engines.running, state.atmosphere.airPressure, model);
  const vx = k.speedX - airVelocityX(state.world,k.altitude), vy = k.speedY - state.world.gustVertical;
  writeFlightGridForces(state,state.atmosphere.airDensity,vx,vy,k.pitch,arms,model,grid);
  // Credit delivered positions, not the targets they are still slewing toward.
  const deliveredGridTorque=grid.torque;
  const deliveredGimbalTorque=steerable*arms.engineArm
    *Math.sin(state.vehicle.gimbalPosition*.01*C.gimbalAngleLimit);
  const supplied=deliveredGridTorque + deliveredGimbalTorque;
  if (steerable > 0) {
    const angle = Math.asin(clamp((torque-deliveredGridTorque) / (steerable * arms.engineArm), -Math.sin(C.gimbalAngleLimit), Math.sin(C.gimbalAngleLimit)));
    a.pitchControl = angle / C.gimbalAngleLimit * 100;
    if(poweredGrid) {
      state.status.finActive=true;
      commandGridTorque(state,vx,vy,torque-deliveredGimbalTorque,model);
    } else {
      a.boosterFinControl = 0;
      state.status.finActive = false;
    }
  } else {
    a.pitchControl = 0;
    state.status.finActive = true;
    commandGridTorque(state,vx,vy,torque,model);
  }
  state.status.rcsActive = state.vehicle.rcsRunTimeRemaining > 0;
  a.rcsThrustCommand = state.status.rcsActive
    ? clamp((torque - supplied) / arms.rcsArm, -C.rcsMaxThrust, C.rcsMaxThrust) : 0;
  // Booster automatic RCS remains proportional even at full gimbal; actuation
  // pays the delivered command. Manual full-yoke retains its legacy behaviour.
}

/** Utility modes share the return controller's actual hardware allocation. */
export { align as alignBooster };

function predictReturn(state: SimState, dt: number, model: VehicleDefinition, advance?:MechanicalAdvance,credited=false): number {
  invalidateStaleBoosterReturn(state);
  const a = state.autopilot;
  if(advance) {
    if(a.boosterReturnPlan || a.boosterPhase==='entry' || a.boosterPhase==='terminal') {
      a.boosterFallTime=Math.max(2,(a.boosterFallTime ?? 2)-dt);
      return 0;
    }
    if(a.boosterRangeError===undefined) {
      unpoweredFallInto(state,CATCH.bodyCentreAltitude,burn,fall,model,rad(0));
      if(fall.reached) {
        a.boosterRangeError=state.kinematics.downRangeDistance-C.starBaseXPos+fall.downRange;
        a.boosterFallTime=fall.time;
      }
    }
    return advanceBoosterPrediction(state,dt,advance,runBoosterPolicy,model,credited);
  }
  a.boosterPredictorCountdown = (a.boosterPredictorCountdown ?? 0) - dt;
  if (a.boosterPredictorCountdown > 0) return 0;
  // Planned coast is upright; the shared force predictor retains its true
  // pressure/gravity/drag model, and this explicit attitude is an assumption.
  unpoweredFallInto(state, CATCH.bodyCentreAltitude, burn, fall, model, rad(0));
  if (fall.reached) {
    a.boosterRangeError = state.kinematics.downRangeDistance - C.starBaseXPos + fall.downRange;
    a.boosterFallTime = fall.time;
  }
  if (a.boosterPhase === 'coast' && fall.reached) {
    // Derive which attitude reduces error from the actual shared aero model,
    // rather than assuming the sign of its retained broadside lift curve.
    unpoweredFallInto(state,CATCH.bodyCentreAltitude,burn,fall,model,rad(.05));const plus=fall.downRange;
    unpoweredFallInto(state,CATCH.bodyCentreAltitude,burn,fall,model,rad(-.05));const minus=fall.downRange;
    const slope = (plus - minus) / .1;
    a.boosterCoastPitch = rad(Math.abs(slope) > 1
      ? clamp(-(a.boosterRangeError ?? 0) / slope,-.2,.2) : 0);
  }
  const rangeStep = Math.abs(state.kinematics.accelerationX) * (a.boosterFallTime ?? 0) * .25;
  // Near burn cutoff, a250ms cache costs kilometres of range. Resolve the
  // final crossing at the actual fixed physics step, without changing dt.
  a.boosterPredictorCountdown = a.boosterPhase === 'boostback'
    && Math.abs(a.boosterRangeError ?? Infinity) <= 2 * rangeStep ? dt : .25;

  return 0;
}

/** Existing35kPa guidance ceiling, forecast across worst-case ignition delay. */
function pressureSpeedCeiling(state: SimState): number {
  const k = state.kinematics;
  const forecastAltitude = Math.max(CATCH.bodyCentreAltitude,
    k.altitude + Math.min(0,k.speedY) * IGNITION_DELAY_MAX_S
      - .5 * localGravity(state) * IGNITION_DELAY_MAX_S ** 2);
  isaAtmosphereInto(forecastAltitude, burn.atmosphere);
  return getMaxSpeedWithSafeDynamicPressure(burn.atmosphere.airDensity);
}

/** Same paid-ignition stopping trigger in coast and continuous entry. */
function terminalBurnDue(state:SimState,model:VehicleDefinition):boolean {
  writeFlightMassQuery(state, model, retained);
  // The accepted catch policy requires all three central engines; a missing
  // centre/support cannot be replaced by optimistic nominal stopping thrust.
  if (!retained.engineSupportAvailable || !retained.hasMass
    || CENTRE_ENGINES.some(i => state.engines.failed[i])) return false;
  const downSpeed=Math.max(0,-state.kinematics.speedY);
  if(downSpeed===0)return false;
  const gravity=localGravity(state);
  const ignitionDelay=CENTRE_ENGINES.every(i=>state.engines.running[i])?0:IGNITION_DELAY_MAX_S;
  // Running engines at entry throttle have not delivered full stopping thrust.
  // Slew progresses alongside ignition; neither delay grants free impulse.
  const throttleDelay=Math.max(0,(100-state.vehicle.throttleCurrent)/C.throttleSpeed);
  const delay=Math.max(ignitionDelay,throttleDelay);
  const delayDistance=downSpeed*delay+.5*gravity*delay**2;
  const postIgnitionSpeed=downSpeed+gravity*delay;
  const upper=conservativeBurnStartAltitude(3,retained.totalMass,postIgnitionSpeed,CATCH.bodyCentreAltitude,model);
  const start=state.kinematics.altitude<=upper+delayDistance
    ?landingBurnStartAltitude(3,retained.totalMass,postIgnitionSpeed,CATCH.bodyCentreAltitude,burn,model,retained.retainedDryMass):null;
  return start!==null && state.kinematics.altitude<=start+delayDistance;
}

export function runBoosterAutopilot(state: SimState, dt: number, model: VehicleDefinition, advance?:MechanicalAdvance): void {
  const a=state.autopilot;
  if(advance)verifyBoosterSource(state,dt);
  if(a.manualControlOn || (!a.autoLandOn && !a.autoBoostBackOn)) {
    a.boosterFinControl=undefined;invalidateBoosterReturn(a);return;
  }
  if(state.status.landed || state.failures.crashed || state.failures.inFlightBreakUp)return;
  if(!a.boosterPhase)a.boosterPhase='align-boost';
  if(!advance)predictReturn(state,dt,model);
  runBoosterPolicy(state,dt,model);
}

/** Planning observes the fully returned live frame, after controls, actuator
 * slew and clock bookkeeping. Future mechanics never calls this scheduler. */
export function runBoosterPostStep(state:SimState,dt:number,model:VehicleDefinition,advance:MechanicalAdvance):void {
  const a=state.autopilot;
  if(a.manualControlOn || (!a.autoLandOn && !a.autoBoostBackOn)
    || state.status.landed || state.failures.crashed || state.failures.inFlightBreakUp)return;
  ensureBoosterSource(state);
  const credit=prepareBoosterSourceCredit(state,dt,advance,runBoosterPolicy,model);
  const used=predictReturn(state,dt,model,advance,!!credit);
  // An unexpected event mismatch after four paid searches fails closed. It
  // cannot buy an additional observer transition on this tick.
  const keepCredit=credit && (boosterSourceCreditMatches(state,credit) || used>=Math.max(1,Math.floor(480*dt)));
  advanceBoosterSource(state,dt,advance,runBoosterPolicy,model,keepCredit?credit:undefined);
}

/** The planned control law is forecast-free, so a mechanical rollout cannot
 * recurse into another forecast or dispatch the Ship controller. */
export function runBoosterPolicy(state:SimState,dt:number,model:VehicleDefinition):void {
  invalidateStaleBoosterReturn(state);
  const a = state.autopilot, k = state.kinematics;
  if (a.manualControlOn || (!a.autoLandOn && !a.autoBoostBackOn)) {
    a.boosterFinControl = undefined;
    return;
  }
  if (state.status.landed || state.failures.crashed || state.failures.inFlightBreakUp) return;
  state.status.translationModeOn = true;
  state.status.finLocked = false;
  state.status.dumpingFuel = false;
  if (!a.boosterPhase) a.boosterPhase = 'align-boost';
  const error = a.boosterRangeError ?? k.downRangeDistance - C.starBaseXPos;
  const direction = error >= 0 ? -1 : 1;
  if (a.boosterPhase === 'align-boost') {
    setEngines(state, []);
    state.vehicle.throttle = 100;
    const goal = rad(direction * Math.PI / 2);
    align(state, goal, 1.5, model);
    if (Math.abs(Math.atan2(Math.sin(goal - k.pitch), Math.cos(goal - k.pitch))) < 5 * Math.PI / 180
      && Math.abs(k.angularVelocity) < .1) a.boosterPhase = 'boostback';
  } else if (a.boosterPhase === 'boostback') {
    setEngines(state, RETURN_ENGINES);
    state.vehicle.throttle = 100;
    // Store the original burn direction, not the new sign after range crossing.
    if (!a.boostBackInitCompleted) { a.boostBackDirection = direction; a.boostBackInitCompleted = true; }
    align(state, rad(a.boostBackDirection * Math.PI / 2), 1.5, model);
    // Controls run after this interval's paid physics but before its clock
    // bookkeeping. The accepted forecast names the interval-end shutdown.
    if (!a.boosterForecastBurn && a.boosterReturnPlan && state.world.environmentTime+dt>=a.boosterReturnPlan.shutdownAt) {
      setEngines(state, []);
      a.boosterPhase = 'coast';
    }
  } else if (a.boosterPhase === 'coast') {
    setEngines(state, []);
    state.vehicle.throttle = 100;
    // Use range error to request a shallow correcting attitude through the
    // physical grid torque/body forces, with RCS only for missing authority.
    align(state,a.boosterReturnPlan?.coastPitch ?? a.boosterCoastPitch ?? rad(0),1.5,model);
    if(terminalBurnDue(state,model))a.boosterPhase='terminal';
    else if(Math.hypot(k.speedX-airVelocityX(state.world,k.altitude),k.speedY-state.world.gustVertical)
      >pressureSpeedCeiling(state))a.boosterPhase='entry';
  } else if (a.boosterPhase === 'entry') {
    setEngines(state,a.boosterEntryCentreOnly?CENTRE_ENGINES:RETURN_ENGINES);
    const ceiling = pressureSpeedCeiling(state);
    const allowedDownSpeed = Math.sqrt(Math.max(0,ceiling ** 2 - k.speedX ** 2));
    const ay = Math.max(0, -k.speedY - allowedDownSpeed) / 2;
    const time=Math.max(2,2*Math.max(0,k.altitude-CATCH.bodyCentreAltitude)/(Math.max(0,-k.speedY)+2));
    const ax=-6*(k.downRangeDistance-C.starBaseXPos)/time**2-4*k.speedX/time;
    // When three paid centres can supply the requested force, hand off once.
    // Keeping them lit avoids re-ignition cycles against a falling q ceiling.
    writeBoosterThrustRequest(state,ax,ay,model,thrustRequest);
    writeFlightMassQuery(state, model, retained);
    const centreThrust=retained.engineSupportAvailable && retained.hasMass
      ?getTotalMaxThrust([true,true,true],state.atmosphere.airPressure,model)/retained.totalMass:0;
    if(CENTRE_ENGINES.every(i=>state.engines.running[i])
      && Math.hypot(thrustRequest.requiredX,thrustRequest.requiredY)<=centreThrust) {
      a.boosterEntryCentreOnly=true;setEngines(state,CENTRE_ENGINES);
    }
    writeBoosterForceRequest(state,ax,ay,model,thrustRequest);
    align(state,thrustRequest.pitch,.5,model);
    state.vehicle.throttle=boosterDeliveredThrottle(state,ay,model);
    if(terminalBurnDue(state,model))a.boosterPhase='terminal';
    else if(k.speedY>=0) {setEngines(state,[]);a.boosterPhase='coast';}
  } else {
    if(a.boosterTerminalMissed) {
      setEngines(state,[]);align(state,rad(0),.5,model);return;
    }
    if(a.boosterTerminalIgnitionTime===undefined)a.boosterTerminalIgnitionTime=state.world.environmentTime;
    setEngines(state,CENTRE_ENGINES);
    if(CENTRE_ENGINES.some(i=>state.engines.failed[i]))a.boosterTerminalMissed=true;
    if(!CENTRE_ENGINES.every(i=>state.engines.running[i])) {
      if(state.world.environmentTime-a.boosterTerminalIgnitionTime>IGNITION_DELAY_MAX_S+2*dt)
        a.boosterTerminalMissed=true;
      if(!a.boosterTerminalMissed) {
        state.vehicle.throttle=100;align(state,rad(0),.5,model);return;
      }
    }
    writeBoosterArrival(state,dt,model,arrival);
    // The nominal end demand holds today's atmosphere/attitude fixed across
    // the horizon. A transient cone rejection cannot prove a terminal miss.
    // Real bounded actuation and eligible contact decide the finite replay.
    if(a.boosterArrivalTime===0)a.boosterTerminalMissed=true;
    if(a.boosterTerminalMissed) {
      setEngines(state,[]);align(state,rad(0),.5,model);return;
    }
    // Engine direction supplies translation while the independent paid torque
    // residual holds the hull upright. Credit delivered gimbal torque only;
    // actual slew, rotational RCS capacity and reserve still decide the replay.
    writeBoosterThrustRequest(state,arrival.centreAX,arrival.centreAY,model,thrustRequest);
    // Active terminal translation spends gimbal torque. Coallocate grids while
    // RCS still pays only the actual delivered grid/gimbal residual.
    align(state,rad(0),TERMINAL_ATTITUDE_TIME,model,true);
    const directionError=Math.atan2(Math.sin(thrustRequest.pitch-k.pitch),Math.cos(thrustRequest.pitch-k.pitch));
    a.pitchControl=clamp(-directionError/C.gimbalAngleLimit*100,-100,100);
    state.vehicle.throttle=boosterDeliveredThrottle(state,arrival.centreAY,model);
    // Actual running flags, pressure and throttle still determine the force.
    if (getTotalMaxThrust(state.engines.running, state.atmosphere.airPressure, model) === 0) state.vehicle.throttle = 100;
  }
}
