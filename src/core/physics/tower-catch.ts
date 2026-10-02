/** Actual airborne contact at the frozen two-dimensional catch plane. */
import * as C from '../constants';
import type { SimState } from '../state';
import { rad } from '../units';
import type { VehicleDefinition } from '../vehicle';
import { CATCH } from '../vehicles/super-heavy';

export interface CatchPose {
  x: number;
  altitude: number;
  speedX: number;
  speedY: number;
}
export function createCatchPose(): CatchPose {
  return { x: 0, altitude: 0, speedX: 0, speedY: 0 };
}

/** Lug station and velocity rotate with the hull; altitude denotes hull centre. */
export function writeCatchPose(state: SimState, model: VehicleDefinition, out: CatchPose): void {
  const k = state.kinematics;
  const arm = CATCH.lugStation - model.height / 2;
  out.x = k.downRangeDistance + arm * Math.sin(k.pitch);
  out.altitude = k.altitude + arm * Math.cos(k.pitch);
  out.speedX = k.speedX + arm * Math.cos(k.pitch) * k.angularVelocity;
  out.speedY = k.speedY - arm * Math.sin(k.pitch) * k.angularVelocity;
}

const before = createCatchPose();
const after = createCatchPose();
interface Crossing { fraction: number; pitch: number; x: number; speedX: number; speedY: number }
const crossing: Crossing = { fraction: 0, pitch: 0, x: 0, speedX: 0, speedY: 0 };

/** The same eligibility evaluation supplies the securing pose; scratch is fully
 * overwritten per call. No result or vehicle identity survives between calls. */
function findCrossing(previous: SimState, current: SimState, model: VehicleDefinition): boolean {
  if (model.id !== 'super-heavy' || current.status.landed) return false;
  const failed = current.failures;
  if (failed.crashed || failed.inFlightBreakUp || failed.fuelRunOut) return false;
  const k = current.kinematics;
  const groundHeight = model.height * Math.abs(Math.cos(k.pitch)) / 2 + model.diameter * Math.abs(Math.sin(k.pitch)) / 2;
  if (k.altitude <= groundHeight) return false;
  writeCatchPose(previous, model, before);
  writeCatchPose(current, model, after);
  if (!(before.altitude > CATCH.planeAltitude && after.altitude <= CATCH.planeAltitude)) return false;
  const t = (before.altitude - CATCH.planeAltitude) / (before.altitude - after.altitude);
  const p = previous.kinematics;
  const pitchDifference = Math.atan2(Math.sin(k.pitch - p.pitch), Math.cos(k.pitch - p.pitch));
  crossing.fraction = t;
  crossing.pitch = p.pitch + pitchDifference * t;
  // Interpolate the body's pose, then rotate the lug at that actual attitude.
  crossing.x = p.downRangeDistance + (k.downRangeDistance - p.downRangeDistance) * t
    + (CATCH.lugStation - model.height / 2) * Math.sin(crossing.pitch);
  crossing.speedX = before.speedX + (after.speedX - before.speedX) * t;
  crossing.speedY = before.speedY + (after.speedY - before.speedY) * t;
  return Number.isFinite(crossing.x) && Number.isFinite(crossing.pitch)
    && Number.isFinite(crossing.speedX) && Number.isFinite(crossing.speedY)
    && Math.abs(crossing.x - C.starBaseXPos) <= CATCH.halfWidth
    && Math.abs(crossing.speedX) <= CATCH.maxLateralSpeed
    && crossing.speedY < 0 && crossing.speedY >= -CATCH.maxDownSpeed
    && Math.abs(crossing.pitch) <= CATCH.maxPitch;
}

export function catchEligible(previous: SimState, current: SimState, model: VehicleDefinition): boolean {
  return findCrossing(previous, current, model);
}

/** Cancel propulsion and hold the interpolated airborne crossing pose. A missed
 * contact returns without touching current: never pull a missed lug into a box. */
export function secureTowerCatch(previous: SimState, current: SimState, model: VehicleDefinition): boolean {
  if (!findCrossing(previous, current, model)) return false;
  const k = current.kinematics, p = previous.kinematics;
  k.downRangeDistance = p.downRangeDistance + (k.downRangeDistance - p.downRangeDistance) * crossing.fraction;
  k.downRangeDistanceNextFrame = k.downRangeDistance;
  k.pitch = rad(crossing.pitch);
  k.altitude = CATCH.planeAltitude - (CATCH.lugStation - model.height / 2) * Math.cos(k.pitch);
  k.distanceToPlanetCenter = C.planetRadius + k.altitude;
  k.speedX = k.speedY = k.trueSpeed = k.angularVelocity = 0;
  k.accelerationX = k.accelerationY = k.totalAcceleration = k.angularAcceleration = 0;
  current.status.landed = true;
  current.status.onTheGround = false;
  current.engines.running.fill(false);
  current.engines.ignitionCountdown.fill(null);
  current.forces.thrust = current.forces.thrustAcceleration = current.forces.twr = current.forces.rcsThrust = 0;
  current.autopilot.pitchControl = current.autopilot.rcsThrustCommand = 0;
  return true;
}
