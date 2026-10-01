/**
 * The physics guidance reasons with: the simulation's own gravity, thrust,
 * atmosphere and drag, asked the way the autopilot needs to ask them.
 *
 * Phase 5 (docs/plans/modernization/modernization-phase-5.md). Until then the
 * guidance sized its burns with a flat g of 9.807 m/s², sea-level thrust and no
 * drag, and landed only because those errors happened to leave room. Everything
 * here is a function of the same models `step()` integrates, so an estimate is
 * wrong only by what it leaves out on purpose (named where it does).
 *
 * Allocation-free: the predictor runs every step of the aero descent, so it
 * writes into a scratch object the caller owns (`createBurnScratch`).
 */
import * as C from '../constants';
import type { Atmosphere } from '../physics/atmosphere';
import { speedOfSoundAt } from '../physics/atmosphere';
import { getBodyDragCoefficient, getCrossSectionalArea, getDrag, getLift } from '../physics/aero';
import { getHorizontalAcceleration, getVerticalAcceleration, type AccelerationInputs } from '../physics/components';
import { gravityAt, tangentialAcceleration, verticalGravityAcceleration } from '../physics/gravity';
import { isaAtmosphereInto } from '../physics/isa';
import type { SimState } from '../state';
import { rad } from '../units';

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
export function thrustFor(engines: number, airPressureKPa: number): number {
  return engines * C.thrustPerRaptorAt(airPressureKPa);
}

/**
 * Drag area in the landing-burn attitude: tail first, the airflow along the
 * axis (`getCrossSectionalArea` at 0°, which is the nose-on area / 2.1). Not
 * the current area: during the aero descent the vehicle is broadside, several
 * times this, and the burn is flown after the flip.
 */
const TAIL_FIRST_AREA = getCrossSectionalArea(rad(0), C.vehicleInFlightMaxArea);

/** What the predictor reads and writes; one per caller, reused every call. */
export interface BurnScratch {
  readonly atmosphere: Atmosphere;
}

export function createBurnScratch(): BurnScratch {
  return { atmosphere: { airTemperature: 0, airPressure: 0, airDensity: 0 } };
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
): number {
  const air = scratch.atmosphere;
  isaAtmosphereInto(altitude, air);
  const mach = speed / speedOfSoundAt(air.airTemperature);
  return getDrag(air.airDensity, speed, TAIL_FIRST_AREA, getBodyDragCoefficient(mach)) / mass;
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
 * within the cap; writes the burn's duration into `duration[0]`.
 */
function backwardPass(
  engines: number,
  touchdownMass: number,
  descentSpeed: number,
  touchdownHeight: number,
  scratch: BurnScratch,
  duration: number[],
): number {
  const flow = engines * C.maxFuelFlowPerRaptor;
  const half = BURN_STEP * 0.5;
  let h = touchdownHeight;
  let u = 0;
  let m = touchdownMass;
  for (let i = 0; i < BURN_STEP_CAP; i++) {
    // Midpoint (second-order) step. Backward in time the mass grows and the
    // deceleration falls, so a first-order step evaluated at the later, lighter
    // end overstates it: 1.5% of an eleven-second burn, measured.
    const a1 = burnDeceleration(engines, h, u, m, scratch);
    if (a1 <= 0) return Number.NaN;
    const uMid = u + a1 * half;
    const a2 = burnDeceleration(engines, h + (u + uMid) * 0.5 * half, uMid, m + flow * half, scratch);
    if (a2 <= 0) return Number.NaN;
    const next = u + a2 * BURN_STEP;
    if (next >= descentSpeed) {
      // Interpolate inside the step to where the speed is matched.
      const f = (descentSpeed - u) / (next - u);
      duration[0] = (i + f) * BURN_STEP;
      return h + (u + 0.5 * (descentSpeed - u)) * f * BURN_STEP;
    }
    h += (u + next) * 0.5 * BURN_STEP;
    u = next;
    m += flow * BURN_STEP;
  }
  return Number.NaN;
}

/**
 * m/s² — how hard a full-throttle burn decelerates a descent at an altitude,
 * speed and mass: thrust and drag (drag points up while descending, so it
 * HELPS the burn) against gravity at that altitude.
 */
function burnDeceleration(engines: number, h: number, u: number, m: number, scratch: BurnScratch): number {
  const drag = tailFirstDragDeceleration(h, u, m, scratch);
  return thrustFor(engines, scratch.atmosphere.airPressure) / m + drag - gravityAt(C.planetRadius + h);
}

/** Most passes of the touchdown-mass iteration, and the residual it stops at (kg). */
const MASS_PASSES = 6;
const MASS_TOLERANCE = 1;

/** Scratch for the burn's duration, so the passes return two numbers without allocating. */
const DURATION: number[] = [0];

/**
 * m — the altitude at which a full-throttle burn on `engines` Raptors, flown
 * tail first, has to start so that a vehicle descending at `descentSpeed` stops
 * at `touchdownHeight`. Null when it cannot (too few engines, too heavy, too
 * fast for the step cap); a caller reads that as "start now".
 *
 * Integrated BACKWARD from touchdown, because the start altitude is the
 * unknown: from rest at the touchdown height, run time in reverse until the
 * descent speed matches. Gravity at each altitude (`gravityAt`, no centrifugal
 * term: a landing burn is nearly vertical), thrust at that altitude's
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
): number | null {
  if (engines <= 0 || mass <= 0) return null;
  if (descentSpeed <= 0) return touchdownHeight;
  const flow = engines * C.maxFuelFlowPerRaptor;
  /*
    The touchdown mass m_td is the current mass less what the burn uses, and
    what the burn uses depends on m_td: a fixed point of
        residual(m_td) = mass − flow × duration(m_td) − m_td = 0.
    Plain substitution oscillates around it (measured: still 4% out at 40 km
    after four passes), so this is a secant iteration on the residual, which
    settles in a few passes. The first point is the burn time at sea-level
    thrust and the current mass: a lower bound on the deceleration (thrust only
    grows with altitude, and drag only helps), so it burns at least as much as
    the real burn and its backward pass, the lightest, is the most feasible.
  */
  const lowerBound = thrustFor(engines, C.SEA_LEVEL_PRESSURE_PA / 1000) / mass - gravityAt(C.planetRadius);
  if (lowerBound <= 0) return null;
  let m0 = Math.max(mass - flow * (descentSpeed / lowerBound), C.vehicleDryMass);
  const start0 = backwardPass(engines, m0, descentSpeed, touchdownHeight, scratch, DURATION);
  if (Number.isNaN(start0)) return null;
  let r0 = mass - flow * DURATION[0]! - m0;
  let m1 = mass - flow * DURATION[0]!;
  let start = start0;
  for (let pass = 0; pass < MASS_PASSES; pass++) {
    // Not enough propellant for the burn at all: it cannot stop the vehicle.
    if (m1 < C.vehicleDryMass) return null;
    start = backwardPass(engines, m1, descentSpeed, touchdownHeight, scratch, DURATION);
    if (Number.isNaN(start)) return null;
    const r1 = mass - flow * DURATION[0]! - m1;
    if (Math.abs(r1) < MASS_TOLERANCE || r1 === r0) break;
    const next = m1 - (r1 * (m1 - m0)) / (r1 - r0);
    m0 = m1;
    r0 = r1;
    m1 = next;
  }
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

/** s — the fall's integration step; m — its cap, about seventeen minutes of fall. */
export const FALL_STEP = 0.25;
export const FALL_STEP_CAP = 4_000;

/**
 * The composition `step()` uses (`getHorizontalAcceleration` and
 * `getVerticalAcceleration`), fed from one preallocated inputs object so the
 * loop allocates nothing. Thrust and gimbal stay zero: the fall is unpowered.
 */
const FALL_INPUTS: AccelerationInputs = {
  angleOfMotion: rad(0),
  angleOfAttack: rad(0),
  gimbalPointingDirection: rad(0),
  aerodynamicDragAcceleration: 0,
  aerodynamicLiftAcceleration: 0,
  thrustAcceleration: 0,
};

/** Acceleration scratch for the fall, so its midpoint step allocates nothing. */
const FALL_ACC = { x: 0, y: 0 };

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
  wind: number,
  scratch: BurnScratch,
): void {
  const r = C.planetRadius + altitude;
  const air = scratch.atmosphere;
  isaAtmosphereInto(Math.max(altitude, 0), air);
  const rx = vx - wind;
  const speed = Math.sqrt(rx * rx + vy * vy);
  const motion = Math.atan2(rx, vy);
  let attack = pitch - motion;
  if (attack < -Math.PI) attack = Math.PI * 2 + attack;
  else if (attack > Math.PI) attack = -(Math.PI * 2 - attack);
  const intoWind = attack > Math.PI / 2 ? Math.PI - attack : attack < -Math.PI / 2 ? -Math.PI - attack : attack;
  const area = getCrossSectionalArea(rad(intoWind), maxArea);
  const mach = speed / speedOfSoundAt(air.airTemperature);
  FALL_INPUTS.angleOfMotion = rad(motion);
  FALL_INPUTS.angleOfAttack = rad(attack);
  FALL_INPUTS.aerodynamicDragAcceleration = getDrag(air.airDensity, speed, area, getBodyDragCoefficient(mach)) / mass;
  FALL_INPUTS.aerodynamicLiftAcceleration = getLift(air.airDensity, speed, rad(intoWind), maxArea) / mass;
  FALL_ACC.x = getHorizontalAcceleration(FALL_INPUTS) + tangentialAcceleration(r, vx, vy);
  FALL_ACC.y = getVerticalAcceleration(FALL_INPUTS, C.gravity) + C.gravity + verticalGravityAcceleration(r, vx);
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
export function unpoweredFallInto(
  state: SimState,
  groundAltitude: number,
  scratch: BurnScratch,
  out: FallResult,
): void {
  const { kinematics, vehicle, world } = state;
  const pitch = kinematics.pitch;
  const mass = vehicle.vehicleMass;
  const maxArea = vehicle.vehicleInFlightMaxArea;
  const wind = world.wind;
  let h = kinematics.altitude;
  let x = 0;
  let vx = kinematics.speedX;
  let vy = kinematics.speedY;
  const half = FALL_STEP * 0.5;
  for (let i = 0; i < FALL_STEP_CAP; i++) {
    fallAcceleration(h, vx, vy, pitch, mass, maxArea, wind, scratch);
    const mvx = vx + FALL_ACC.x * half;
    const mvy = vy + FALL_ACC.y * half;
    fallAcceleration(h + vy * half, mvx, mvy, pitch, mass, maxArea, wind, scratch);
    const nvx = vx + FALL_ACC.x * FALL_STEP;
    const nvy = vy + FALL_ACC.y * FALL_STEP;
    const nh = h + mvy * FALL_STEP;
    const nx = x + mvx * FALL_STEP;
    if (nh <= groundAltitude) {
      // Interpolate inside the step to the ground.
      const f = (h - groundAltitude) / (h - nh);
      out.reached = true;
      out.time = (i + f) * FALL_STEP;
      out.downRange = x + (nx - x) * f;
      return;
    }
    h = nh;
    x = nx;
    vx = nvx;
    vy = nvy;
  }
  out.reached = false;
  out.time = Number.NaN;
  out.downRange = x;
}
