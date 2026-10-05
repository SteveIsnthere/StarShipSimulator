/** Frozen original source oracle; SHA256 5698a8f7ad0da8927613a8cdd6efc2cfde88efd79563cc9d8f7bfd5c28f7ab77. Imports only redirected. */
/**
 * The physics guidance reasons with: the simulation's own gravity, thrust,
 * atmosphere and drag, asked the way the autopilot needs to ask them.
 *
 * Phase 5 (merged b84b746; the decisions are in docs/reference/physics-model.md, "What guidance assumes"). Until then the
 * guidance sized its burns with a flat g of 9.807 m/s², sea-level thrust and no
 * drag, and landed only because those errors happened to leave room. Everything
 * here is a function of the same models `step()` integrates, so an estimate is
 * wrong only by what it leaves out on purpose (named where it does).
 *
 * Allocation-free: the predictor runs every step of the aero descent, so it
 * writes into a scratch object the caller owns (`createBurnScratch`).
 */
import * as C from '$core/constants';
import { engineThrust, engineMassFlow } from './propulsion';
import { SHIP, type VehicleDefinition } from '$core/vehicle';
import type { Atmosphere } from '$core/physics/atmosphere';
import { speedOfSoundAt } from '$core/physics/atmosphere';
import {
  foldedIntoWind,
  getBodyDragCoefficient,
  getCrossSectionalArea,
  getDrag,
  getLift,
  wrappedAttackAngle,
} from './aero';
import { writeAccelerationComponents, type AccelerationInputs } from '$core/physics/components';
import { tangentialAcceleration, verticalGravityAcceleration, verticalWeight } from '$core/physics/gravity';
import { isaAtmosphereInto } from '$core/physics/isa';
import { meanWindAt } from '$core/physics/wind';
import type { SimState } from '$core/state';
import { rad, type Rad } from '$core/units';
import { createMassProperties, writeMassProperties } from '$core/physics/mass';
import { createGridFinForces } from '$core/physics/grid-fins';
import { writeFlightGridForces } from '$core/physics/damage-flight';
import { writeFlightMassQuery } from '$core/physics/flight-mass-query';
import { createDamageMassProperties } from '$core/physics/damage-mass';
import { createDamageControlForces, validateDamageControlForcing, writeDamageControls, type DamageControlModel } from '$core/physics/damage-controls';
import { damageModelFor } from '$core/physics/damage-model';
import { MAX_DAMAGE_COMPONENTS } from '$core/damage-state';

/**
 * m/s² — the floor `localGravity` never goes below.
 *
 * Near orbital speed the centrifugal term cancels gravity, and a TWR law that
 * divides by the result would command infinite or negative thrust. A tenth of
 * a m/s² is far below any gravity the landing laws meet (9.73 at the pad), so
 * it changes nothing they do and only removes the singularity.
 */
export const MIN_LOCAL_GRAVITY = 0.1;

/**
 * m/s², positive downward — what a vertical thrust has to cancel right now:
 * gravity at this altitude less the centrifugal term of the downrange speed,
 * exactly as `step()` applies it (`verticalGravityAcceleration`).
 *
 * For INSTANTANEOUS laws (a throttle for a target TWR). A prediction of a
 * future burn must not use it: the downrange speed then is not today's.
 */
export function localGravity(state: SimState): number {
  const r = C.planetRadius + state.kinematics.altitude;
  return Math.max(MIN_LOCAL_GRAVITY, -verticalGravityAcceleration(r, state.kinematics.speedX));
}

/** N — full-throttle thrust of `engines` Raptors at an ambient pressure in kPa. */
export function thrustFor(engines: number, airPressureKPa: number, model: VehicleDefinition = SHIP): number {
  return engines * engineThrust(model.propulsion, 'sea-level', airPressureKPa);
}

/**
 * Drag area in the landing-burn attitude: tail first, the airflow along the
 * axis (`getCrossSectionalArea` at 0°, which is the nose-on area / 2.1). Not
 * the current area: during the aero descent the vehicle is broadside, several
 * times this, and the burn is flown after the flip.
 */
// The same tail-first area is evaluated for the selected vehicle below.

/**
 * Everything the predictors write while they work; one per caller, reused on
 * every call. Owned by the caller rather than the module, so two callers (or a
 * call inside another) can never share it.
 */
export interface BurnScratch {
  /** Reused synchronous fall kernel state: allocated once with this scratch. */
  readonly fallWork: UnpoweredFallWork;
  readonly atmosphere: Atmosphere;
  /** s — the last backward pass's burn duration. */
  duration: number;
  /**
   * The last backward pass ran out of steps before matching the speed: the
   * burn is longer than the predictor sizes, which is not the same as the
   * vehicle being too heavy to decelerate (that pass returns NaN with this
   * false).
   */
  capped: boolean;
  /** The fall's force composition, fed like `step()`'s. */
  readonly inputs: AccelerationInputs;
  /** m/s² — the fall's acceleration at the point last evaluated. */
  readonly acc: { x: number; y: number };
}

export function createBurnScratch(): BurnScratch {
  return {
    fallWork: createEmptyFallWork(),
    atmosphere: { airTemperature: 0, airPressure: 0, airDensity: 0 },
    duration: 0,
    capped: false,
    // Thrust and gimbal stay zero: the fall is unpowered.
    inputs: {
      angleOfMotion: rad(0),
      angleOfAttack: rad(0),
      gimbalPointingDirection: rad(0),
      aerodynamicDragAcceleration: 0,
      aerodynamicLiftAcceleration: 0,
      // An unpowered fall: no thrust of either kind.
      thrustAcceleration: 0,
      fixedThrustAcceleration: 0,
      pitch: rad(0),
    },
    acc: { x: 0, y: 0 },
  };
}

/**
 * m/s² — drag deceleration in the burn attitude, at an altitude and a speed.
 * Leaves the atmosphere at `altitude` in `scratch.atmosphere`.
 */
export function tailFirstDragDeceleration(
  altitude: number,
  speed: number,
  mass: number,
  scratch: BurnScratch,
  model: VehicleDefinition = SHIP,
): number {
  const air = scratch.atmosphere;
  isaAtmosphereInto(altitude, air);
  const mach = speed / speedOfSoundAt(air.airTemperature);
  return getDrag(air.airDensity, speed, getCrossSectionalArea(rad(0), model.maxArea, model), getBodyDragCoefficient(mach)) / mass;
}

/** s — the predictor's integration step. */
export const BURN_STEP = 0.05;
/**
 * The predictor's step cap: 60 s of burn, three times the longest landing burn
 * the presets fly, and enough for a 600 m/s stop from 40 km.
 */
export const BURN_STEP_CAP = 1200;

/**
 * One backward pass from touchdown: the altitude at which the descent speed
 * reaches `descentSpeed`, starting at `touchdownMass` and growing the mass back
 * at the full-throttle flow. Returns NaN when the burn cannot reach that speed
 * within the cap; writes the burn's duration into `scratch.duration`.
 */
function backwardPass(
  engines: number,
  touchdownMass: number,
  descentSpeed: number,
  touchdownHeight: number,
  scratch: BurnScratch,
  model: VehicleDefinition,
): number {
  const flow = engines * engineMassFlow(model.propulsion, 'sea-level');
  const half = BURN_STEP * 0.5;
  let h = touchdownHeight;
  let u = 0;
  let m = touchdownMass;
  scratch.capped = false;
  for (let i = 0; i < BURN_STEP_CAP; i++) {
    // Midpoint (second-order) step. Backward in time the mass grows and the
    // deceleration falls, so a first-order step evaluated at the later, lighter
    // end overstates it: 1.5% of an eleven-second burn, measured.
    const a1 = burnDeceleration(engines, h, u, m, scratch, model);
    const uMid = u + a1 * half;
    const a2 = burnDeceleration(engines, h + (u + uMid) * 0.5 * half, uMid, m + flow * half, scratch, model);
    // One guard, on the deceleration the step actually uses. The midpoint is
    // heavier than the start, so if the start could not decelerate, neither can it.
    if (a2 <= 0) return Number.NaN;
    const next = u + a2 * BURN_STEP;
    if (next >= descentSpeed) {
      // Interpolate inside the step to where the speed is matched.
      const f = (descentSpeed - u) / (next - u);
      scratch.duration = (i + f) * BURN_STEP;
      return h + (u + 0.5 * (descentSpeed - u)) * f * BURN_STEP;
    }
    h += (u + next) * 0.5 * BURN_STEP;
    u = next;
    m += flow * BURN_STEP;
  }
  scratch.capped = true;
  return Number.NaN;
}

/**
 * m/s² — how hard a full-throttle burn decelerates a descent at an altitude,
 * speed and mass: thrust and drag (drag points up while descending, so it
 * HELPS the burn) against gravity at that altitude.
 */
function burnDeceleration(engines: number, h: number, u: number, m: number, scratch: BurnScratch, model: VehicleDefinition): number {
  const drag = tailFirstDragDeceleration(h, u, m, scratch, model);
  return thrustFor(engines, scratch.atmosphere.airPressure, model) / m + drag - verticalWeight(C.planetRadius + h);
}

/** Most passes of the touchdown-mass iteration, and the residual it stops at (kg). */
const MASS_PASSES = 24;
const MASS_TOLERANCE = 1;

/** Conservative upper bound for the existing SL-Raptor burn predictor's
 * trigger, not an alternative burn solution. Through a forward stopping burn,
 * thrust >= sea-level, mass <= initial mass, drag assists and gravity <= its
 * catch-plane value. Thus deceleration >= thrustSL/mass - gravityMax, and
 * distance <= u²/(2aMin). One full midpoint step's mass plus the existing root
 * residual bounds the backward predictor's endpoint interpolation. Infinity
 * means no positive lower acceleration bound; run the exact predictor then.
 * This only saves work safely ABOVE the bound. It never commands an engine. */
export function conservativeBurnStartAltitude(engines:number,mass:number,descentSpeed:number,touchdownHeight:number,model:VehicleDefinition=SHIP):number {
  if(engines<=0 || mass<=0)return Infinity;
  const upperMass=mass+engines*engineMassFlow(model.propulsion, 'sea-level')*BURN_STEP+MASS_TOLERANCE;
  const minAcceleration=thrustFor(engines,C.SEA_LEVEL_PRESSURE_PA/1000,model)/upperMass
    -verticalWeight(C.planetRadius+touchdownHeight);
  if(minAcceleration<=0)return Infinity;
  return touchdownHeight+Math.max(0,descentSpeed)**2/(2*minAcceleration);
}


/**
 * m — the altitude at which a full-throttle burn on `engines` Raptors, flown
 * tail first, has to start so that a vehicle descending at `descentSpeed` stops
 * at `touchdownHeight`. Null when it cannot (too few engines, too heavy, too
 * fast for the step cap); a caller reads that as "start now".
 *
 * Integrated BACKWARD from touchdown, because the start altitude is the
 * unknown: from rest at the touchdown height, run time in reverse until the
 * descent speed matches. Gravity at each altitude as a vertical vehicle feels
 * it (`verticalWeight`: no downrange speed, so no centrifugal term of its own,
 * but the turning ground's), thrust at that altitude's
 * pressure, drag in the burn attitude, and mass that grows back at the flow.
 *
 * The mass at touchdown is unknown until the burn is sized (it is the current
 * mass less what the burn uses), so it is found by a secant iteration (below).
 * A burn that needs more propellant than the vehicle carries returns null.
 *
 * Leaves out, on purpose: ignition delay and the flip (the caller adds them,
 * as the trigger always has), and throttle slew (the burn is commanded at full).
 */
export function landingBurnStartAltitude(
  engines: number,
  mass: number,
  descentSpeed: number,
  touchdownHeight: number,
  scratch: BurnScratch,
  model: VehicleDefinition = SHIP,
  retainedDryMass = model.dryMass,
): number | null {
  // The floor is retained installed hardware, not hardware already in debris.
  // No floor change may create fuel or permit a nonphysical total mass.
  if (engines <= 0 || mass <= 0 || !(retainedDryMass > 0 && retainedDryMass <= mass)) return null;
  if (descentSpeed <= 0) return touchdownHeight;
  const flow = engines * engineMassFlow(model.propulsion, 'sea-level');
  /*
    The touchdown mass m_td is the current mass less what the burn uses, and
    what the burn uses depends on m_td: a root of
        residual(m_td) = mass − flow × duration(m_td) − m_td.
    Heavier means a longer burn, so the residual falls as m_td rises: one root.

    BRACKETED, because an open iteration fails here. The light end is the burn
    time at sea-level thrust and the current mass, a lower bound on the
    deceleration (thrust only grows with altitude, drag only helps), so it
    burns at least as much as the real burn: residual > 0. The heavy end is the
    current mass less what that light burn takes: residual <= 0. A secant from
    those two overshot past the current mass near the hover limit, where the
    backward pass cannot decelerate at all, and answered "start now" for burns
    that were feasible (found by Phase 5's independent review: one engine from
    190 t at 150 m/s). Regula falsi with the Illinois correction stays inside
    the bracket; a pass that cannot decelerate means "too heavy" and bisects,
    and a pass that runs out of steps means the burn is longer than this sizes:
    null, never a guess.
  */
  const lowerBound = thrustFor(engines, C.SEA_LEVEL_PRESSURE_PA / 1000, model) / mass - verticalWeight(C.planetRadius);
  if (lowerBound <= 0) return null;
  let light = Math.max(mass - flow * (descentSpeed / lowerBound), retainedDryMass);
  let start = backwardPass(engines, light, descentSpeed, touchdownHeight, scratch, model);
  if (Number.isNaN(start)) return null;
  let rLight = mass - flow * scratch.duration - light;
  // Not enough propellant for even the lightest burn: it cannot stop the vehicle.
  if (rLight < 0) return null;
  if (rLight < MASS_TOLERANCE) return start;
  let heavy = mass - flow * scratch.duration;
  let rHeavy = Number.NaN; // unknown until evaluated; NaN reads "too heavy"
  let side = 0;
  for (let pass = 0; pass < MASS_PASSES; pass++) {
    const m = Number.isNaN(rHeavy)
      ? pass === 0
        ? heavy
        : (light + heavy) / 2
      : heavy - (rHeavy * (heavy - light)) / (rHeavy - rLight);
    const s = backwardPass(engines, m, descentSpeed, touchdownHeight, scratch, model);
    // Longer than the predictor sizes: no answer, never a guess from the light
    // end (that answer was optimistic: 14.6 km for a burn the simulation needed
    // 20 km for, measured while fixing this).
    if (scratch.capped) return null;
    const r = Number.isNaN(s) ? Number.NaN : mass - flow * scratch.duration - m;
    if (!Number.isNaN(r) && Math.abs(r) < MASS_TOLERANCE) return s;
    if (!Number.isNaN(r) && r > 0) {
      light = m;
      rLight = r;
      start = s;
      if (side === 1 && !Number.isNaN(rHeavy)) rHeavy *= 0.5; // Illinois
      side = 1;
    } else {
      heavy = m;
      rHeavy = r;
      if (side === -1) rLight *= 0.5; // Illinois
      side = -1;
    }
    if (heavy - light < MASS_TOLERANCE) break;
  }
  // The light end is always a burn the vehicle can fly; at the tolerance it is
  // within a kilogram of the touchdown mass.
  return start;
}

// ---------------------------------------------------------------------------
// The unpowered fall, for the HUD's impact predictor
// ---------------------------------------------------------------------------

/** Where an unpowered fall ends; written by `unpoweredFallInto`. */
export interface FallResult {
  /** True when the fall reached `groundAltitude` within the step cap. */
  reached: boolean;
  /** s — time to reach it. */
  time: number;
  /** m — downrange displacement from where it started. */
  downRange: number;
}

export function createFallResult(): FallResult {
  return { reached: false, time: Number.NaN, downRange: 0 };
}

/** s — the fall's integration step. */
export const FALL_STEP = 0.25;
/** Steps — the fall's cap: 4 000 of `FALL_STEP`, about seventeen minutes of fall. */
export const FALL_STEP_CAP = 4_000;
const MAX_FIN_LOAD_COEFFICIENT = Math.max(1, C.finDragCoefficient);

/**
 * The unpowered accelerations at a point, exactly as `step()` composes them:
 * drag along and lift across the relative wind (attack angles folded as
 * `getAttackAngles` does, inline so nothing is allocated), plus gravity with
 * its centrifugal and tangential terms.
 */
function fallAcceleration(
  altitude: number,
  vx: number,
  vy: number,
  pitch: number,
  mass: number,
  maxArea: number,
  referenceWind: number,
  scratch: BurnScratch,
  model: VehicleDefinition,
  gustX=0,
  gustY=0,
  state?: SimState,
  held?: UnpoweredFallWork,
): void {
  const { inputs, acc } = scratch;
  const r = C.planetRadius + altitude;
  const air = scratch.atmosphere;
  isaAtmosphereInto(Math.max(altitude, 0), air);
  const meanRelativeX = vx - meanWindAt(referenceWind, altitude);
  const rx = gustX===0?meanRelativeX:meanRelativeX-gustX;
  const ry = gustY===0?vy:vy-gustY;
  const speed = Math.sqrt(rx * rx + ry * ry);
  const motion = Math.atan2(rx, ry);
  const attack = wrappedAttackAngle(pitch, motion);
  const intoWind = foldedIntoWind(attack);
  if (state?.damage) {
    const controlModel = held?.controlModel ?? damageModelFor(model).controls;
    const q = .5 * air.airDensity * speed ** 2;
    if (held && held.zeroControlArea !== null
      && Number.isFinite(q * held.zeroControlColumnArea * MAX_FIN_LOAD_COEFFICIENT)) {
      // Incidence only validates this prepared branch. Finite angles have
      // valid sine incidence; preserve rejection of every nonfinite angle.
      validateDamageControlForcing(state.damage, controlModel, q, Number.isFinite(intoWind) ? 0 : NaN, forceControls);
      maxArea = held.zeroControlArea;
    } else {
      const frontCommand = model.gridFins
        ? (state.vehicle.frontFinExtension - 50) / 50 * model.gridFins.maxAngle
        : state.vehicle.frontFinExtension * .01 * C.finActuationMaxAngle;
      const aftCommand = state.vehicle.aftFinExtension * .01 * C.finActuationMaxAngle;
      writeDamageControls(state.damage, controlModel, q, Math.abs(Math.sin(intoWind)), frontCommand, aftCommand, forceControls);
      maxArea = model.maxArea + 1.8 * (forceControls.frontArea + forceControls.aftArea);
      if (held && frontCommand === 0 && aftCommand === 0) {
        held.zeroControlArea = maxArea;
        // A finite bound preserves the original force-scale validation even at
        // adversarial finite q whose multiplication by area could overflow.
        held.zeroControlColumnArea = 0;
        for (const column of controlModel.columns)
          held.zeroControlColumnArea = Math.max(held.zeroControlColumnArea, column.area);
      }
    }
  }
  const area = getCrossSectionalArea(rad(intoWind), maxArea, model);
  const mach = speed / speedOfSoundAt(air.airTemperature);
  inputs.angleOfMotion = rad(motion);
  inputs.angleOfAttack = rad(attack);
  inputs.aerodynamicDragAcceleration = getDrag(air.airDensity, speed, area, getBodyDragCoefficient(mach)) / mass;
  inputs.aerodynamicLiftAcceleration = getLift(air.airDensity, speed, rad(intoWind), maxArea) / mass;
  writeAccelerationComponents(inputs, C.gravity, acc);
  acc.x = acc.x + tangentialAcceleration(r, vx, vy);
  acc.y = acc.y + C.gravity + verticalGravityAcceleration(r, vx);
}

const forceMass=createMassProperties(),forceGrid=createGridFinForces();
const queriedMass = createDamageMassProperties();
const forceControls = createDamageControlForces(MAX_DAMAGE_COMPONENTS);
/** The existing force law at a proposed hull attitude. No integration or
 * actuator impulse: callers must still prove actual slew/contact mechanically.
 * Includes current gusts and the delivered grid-fin deflection. */
export function writeUnpoweredAcceleration(state:SimState,pitch:Rad,model:VehicleDefinition,scratch:BurnScratch):void {
  const k=state.kinematics;
  if (state.damage) writeFlightMassQuery(state, model, queriedMass, forceMass);
  const mass = state.damage ? queriedMass.totalMass : state.vehicle.vehicleMass;
  if (!(mass > 0)) { scratch.acc.x = scratch.acc.y = 0; return; }
  fallAcceleration(k.altitude,k.speedX,k.speedY,pitch,mass,
    state.vehicle.vehicleInFlightMaxArea,state.world.wind,scratch,model,state.world.gust,state.world.gustVertical,state);
  if(model.gridFins){
    if (!state.damage) writeMassProperties(state.vehicle.propellantMass,forceMass,model);
    writeFlightGridForces(state,scratch.atmosphere.airDensity,
      k.speedX-meanWindAt(state.world.wind,k.altitude)-state.world.gust,k.speedY-state.world.gustVertical,
      pitch,forceMass,model,forceGrid);
    scratch.acc.x+=forceGrid.forceX/mass;
    scratch.acc.y+=forceGrid.forceY/mass;
  }
}

/**
 * Where the vehicle comes down if nothing more is done: no thrust, its attitude
 * held, integrated to `groundAltitude` with the forces `step()` applies to an
 * unpowered body — gravity at altitude with the centrifugal and tangential
 * terms, and drag through the relative wind at the cross-section its attitude
 * presents, with the Mach-dependent coefficient.
 *
 * Drag and lift through the relative wind, composed exactly as `step()`
 * composes them, at the cross-section the held attitude presents. Leaves out
 * the fins' own forces and any change of attitude: the prediction answers
 * "where does it come down if held as it is". Measured against the simulation
 * in tests/core/guidance-physics.test.ts.
 *
 * Midpoint steps of `FALL_STEP`; `reached` is false when the cap runs out first
 * (a vehicle climbing away, or one so high it is still falling).
 */
export interface UnpoweredFallWork {
  /** Caller-owned immutable source; temperature/topology assumptions stay held. */
  state:SimState|null;model:VehicleDefinition;groundAltitude:number;pitch:Rad;
  mass:number;maxArea:number;referenceWind:number;
  /** Query once for held zero commands; never shared between predictions. */
  zeroControlArea:number|null;zeroControlColumnArea:number;
  /** Immutable model metadata resolved once for this owned prediction. */
  controlModel:DamageControlModel|null;
  h:number;x:number;vx:number;vy:number;steps:number;done:boolean;result:FallResult;
}
function createEmptyFallWork():UnpoweredFallWork {
  return {state:null,model:SHIP,groundAltitude:0,pitch:rad(0),mass:0,maxArea:0,referenceWind:0,
    zeroControlArea:null,zeroControlColumnArea:0,controlModel:null,
    h:0,x:0,vx:0,vy:0,steps:0,done:true,result:createFallResult()};
}
function initializeFallWork(work:UnpoweredFallWork,state:SimState,groundAltitude:number,model:VehicleDefinition,pitch:Rad):void {
  if(state.damage)writeFlightMassQuery(state,model,queriedMass);
  work.state=state;work.model=model;work.groundAltitude=groundAltitude;work.pitch=pitch;
  work.mass=state.damage?queriedMass.totalMass:state.vehicle.vehicleMass;
  work.maxArea=state.vehicle.vehicleInFlightMaxArea;work.referenceWind=state.world.wind;
  work.zeroControlArea=null;work.zeroControlColumnArea=0;
  work.controlModel=state.damage?damageModelFor(model).controls:null;
  work.h=state.kinematics.altitude;work.x=0;work.vx=state.kinematics.speedX;work.vy=state.kinematics.speedY;
  work.steps=0;work.done=!(work.mass>0);
  work.result.reached=false;work.result.time=NaN;work.result.downRange=work.done?NaN:0;
}
/** Own the numeric continuation; the source reference must remain immutable. */
export function createUnpoweredFallWork(state:SimState,groundAltitude:number,model:VehicleDefinition=SHIP,pitchOverride=state.kinematics.pitch):UnpoweredFallWork {
  const work=createEmptyFallWork();initializeFallWork(work,state,groundAltitude,model,pitchOverride);return work;
}
/** Same midpoint operation/order as the synchronous predictor. Budget counts
 * iterations (two force queries each), never hidden mechanical advances. */
export function advanceUnpoweredFall(work:UnpoweredFallWork,budget:number,scratch:BurnScratch):number {
  if(work.done)return 0;
  const state=work.state!,model=work.model,pitch=work.pitch,mass=work.mass,maxArea=work.maxArea,referenceWind=work.referenceWind;
  const acc=scratch.acc,half=FALL_STEP*.5;
  let h=work.h,x=work.x,vx=work.vx,vy=work.vy,steps=work.steps,used=0;
  const sliceLimit=Math.min(Math.floor(budget),FALL_STEP_CAP-steps);
  for(let slice=0;slice<sliceLimit;slice++) {
    fallAcceleration(h,vx,vy,pitch,mass,maxArea,referenceWind,scratch,model,0,0,state,work);
    const mvx=vx+acc.x*half;
    const mvy=vy+acc.y*half;
    fallAcceleration(h+vy*half,mvx,mvy,pitch,mass,maxArea,referenceWind,scratch,model,0,0,state,work);
    const nvx=vx+acc.x*FALL_STEP;
    const nvy=vy+acc.y*FALL_STEP;
    const nh=h+mvy*FALL_STEP;
    const nx=x+mvx*FALL_STEP;
    const index=steps;steps++;used++;
    if(nh<=work.groundAltitude) {
      const f=(h-work.groundAltitude)/(h-nh);
      work.result.reached=true;work.result.time=(index+f)*FALL_STEP;work.result.downRange=x+(nx-x)*f;
      h=nh;x=nx;vx=nvx;vy=nvy;work.done=true;break;
    }
    h=nh;x=nx;vx=nvx;vy=nvy;
  }
  work.h=h;work.x=x;work.vx=vx;work.vy=vy;work.steps=steps;
  if(!work.result.reached)work.result.downRange=x;
  if(steps>=FALL_STEP_CAP)work.done=true;
  return used;
}
export function unpoweredFallInto(
  state:SimState,groundAltitude:number,scratch:BurnScratch,out:FallResult,
  model:VehicleDefinition=SHIP,pitchOverride=state.kinematics.pitch,
):void {
  // Existing HUD/guidance callers keep their allocation-free synchronous API.
  const work=scratch.fallWork;initializeFallWork(work,state,groundAltitude,model,pitchOverride);
  advanceUnpoweredFall(work,FALL_STEP_CAP,scratch);
  out.reached=work.result.reached;out.time=work.result.time;out.downRange=work.result.downRange;
  work.state=null; // Do not retain a live frame through long-lived HUD scratch.
}
