/**
 * How much altitude the landing burn needs: the sizing behind the flip trigger
 * and the end of the horizontal adjustment.
 *
 * Phase 5, Task 4 (merged b84b746; the decisions are in docs/reference/physics-model.md, "What guidance assumes"). Until
 * then both were a constant-deceleration estimate at sea-level thrust, a flat
 * g of 9.807 m/s² and no drag. Now they ask the predictor
 * (`landingBurnStartAltitude`), which integrates the simulation's own gravity,
 * thrust at altitude, tail-first drag and mass flow.
 *
 * WHAT DID NOT CHANGE IS THE PLAN'S PESSIMISM. The trigger sizes the burn on
 * ONE engine, two or three only when one cannot hold 1/0.8 of the vehicle's
 * weight: a vehicle that loses engines in the flip still has the altitude to
 * stop. That ladder is a design choice, not an approximation, so it stays; only
 * the physics under it is replaced.
 */
import * as C from '../constants';
import { createBurnScratch, landingBurnStartAltitude } from '../control/guidance-physics';
import { getHealthySeaLevelCount, getWorkingSeaLevelCount } from '../physics/engines';
import { gravityAt } from '../physics/gravity';
import type { SimState } from '../state';

/*
 * NO ADDED TRIGGER MARGIN, and that is a measured decision (Phase 5, Task 4).
 * (Phase 6, Task 4c, since moved the trigger's ignition delay from 2021's 0.6 s
 * to the draw's 1.2 s maximum: the start transient, not a margin, and the
 * 18 t landing reserve pays for it.)
 * The trigger's pessimism is the one-engine ladder above, as it always was:
 * with every engine working it plans on a third of the thrust it will have.
 * Two margins were tried on top of the predictor and both broke the
 * one-engine-out deorbit (orbit-demo.test.ts), a flight that lands with no
 * propellant to spare: a flat 100 m (from Task 1's burn slack, which was
 * measured against an all-engines burn and so did not describe this) and 0.9 s
 * at the descent speed (the ignition delay's spread plus the throttle's slew).
 * Each flipped the vehicle earlier, and the longer hover that bought ran its
 * tanks dry. The predictor itself is within a metre of the simulation
 * (tests/core/guidance-physics.test.ts); a margin would only spend propellant.
 */

/**
 * s — the horizontal adjustment's margin: its burn estimate is stretched by one
 * second, as it always has been (`+ 1` on the duration), which at the average
 * speed of the burn is half a second of the current descent speed.
 */
export const HORIZONTAL_ADJUSTMENT_MARGIN_S = 1;

/** m/s² — gravity at the pad, where the burn ends. */
const PAD_GRAVITY = gravityAt(C.planetRadius);

/** One scratch for both sizings; fully rewritten on every call. */
const scratch = createBurnScratch();

/**
 * The engine count the trigger plans the burn on: one, or two or three when
 * one cannot hold 1/0.8 of the weight (2021's ladder, in thrust-to-weight on
 * the gravity the vehicle feels at the pad), and never more than are working.
 * On pad gravity (9.820 since Phase 6) rather than the flat 9.807 the
 * one-to-two boundary moves from 184.0 t to 183.7 t: the ladder's meaning, on
 * the true weight.
 */
export function plannedEngineCount(state: SimState): number {
  const weight = state.vehicle.vehicleMass * PAD_GRAVITY;
  let engines = 1;
  if (C.maxThrustPerRaptor * 0.8 < weight) engines = 2;
  if (C.maxThrustPerRaptor * 2 * 0.8 < weight) engines = 3;
  return Math.min(engines, getHealthySeaLevelCount(state.engines.failed));
}

/**
 * m — the burn altitude the flip trigger needs above touchdown, on the planned
 * engine count. When no burn on those engines can stop the vehicle, it is the
 * current altitude: start now.
 */
export function triggerBurnAltitude(state: SimState): number {
  const predicted = landingBurnStartAltitude(
    plannedEngineCount(state),
    state.vehicle.vehicleMass,
    -state.kinematics.speedY,
    0,
    scratch,
  );
  return predicted ?? state.kinematics.altitude;
}

/**
 * m — where the horizontal adjustment must hand over to the final descent: the
 * burn on the engines running now, stopping at touchdown height, plus its
 * margin. When no burn on them can stop the vehicle, the current altitude.
 */
export function finalDescentStartAltitude(state: SimState): number {
  const descent = -state.kinematics.speedY;
  const predicted = landingBurnStartAltitude(
    getWorkingSeaLevelCount(state.engines.running),
    state.vehicle.vehicleMass,
    descent,
    C.vehicleHeight * 0.5,
    scratch,
  );
  if (predicted === null) return state.kinematics.altitude;
  return predicted + descent * HORIZONTAL_ADJUSTMENT_MARGIN_S * 0.5;
}
