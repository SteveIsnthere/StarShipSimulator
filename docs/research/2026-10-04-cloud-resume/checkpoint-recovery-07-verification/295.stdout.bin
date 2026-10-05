/** Fixed material-point transformations for clockwise 2D rigid bodies.
 * Both inputs/outputs retain the same orientation, omega and alpha. Body-right
 * and body-up offsets are independent; asymmetric loss is not an axial shift.
 */
import type { SimState } from '../state';
import { planetRadius } from '../constants';
import { circularOrbitalSpeed } from './gravity';
type Kinematics = SimState['kinematics'];

/** Shift the represented point by body-coordinate(dx,dz), permitting aliasing.
 * Caller owns atmospheric-relative Mach because wind is not rigid-body state.
 */
export function writeReferenceShift(source: Kinematics, dx: number, dz: number, out: Kinematics): void {
  const sin = Math.sin(source.pitch), cos = Math.cos(source.pitch);
  const rx = cos * dx + sin * dz, ry = -sin * dx + cos * dz;
  const omega = source.angularVelocity, alpha = source.angularAcceleration;
  out.downRangeDistance = source.downRangeDistance + rx;
  out.downRangeDistanceNextFrame = out.downRangeDistance;
  out.altitude = source.altitude + ry;
  out.speedX = source.speedX + omega * ry;
  out.speedY = source.speedY - omega * rx;
  out.accelerationX = source.accelerationX + alpha * ry - omega ** 2 * rx;
  out.accelerationY = source.accelerationY - alpha * rx - omega ** 2 * ry;
  out.pitch = source.pitch;
  out.angularVelocity = omega;
  out.angularAcceleration = alpha;
  out.distanceToPlanetCenter = planetRadius + out.altitude;
  out.orbitalVelocityAtCurrentAltitude = circularOrbitalSpeed(out.distanceToPlanetCenter);
  out.trueSpeed = Math.hypot(out.speedX, out.speedY);
  out.totalAcceleration = Math.hypot(out.accelerationX, out.accelerationY);
}
