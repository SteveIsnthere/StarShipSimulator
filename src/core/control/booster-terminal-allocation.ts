/** Terminal command proposal, not delivered torque or a catch proof. */
import { gimbalAngleLimit, gimbalSpeed } from '../constants';

export interface TerminalGimbalAllocation {
  commandPercent: number;
  /** Both admitted thrust endpoints can support the fixed attitude demand. */
  feasible: boolean;
  /** N m — worst attitude residual before the available RCS contribution. */
  worstResidual: number;
}
export function createTerminalGimbalAllocation(): TerminalGimbalAllocation {
  return { commandPercent: 0, feasible: false, worstResidual: 0 };
}
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

/** Positive gimbal gives positive engine torque. For each admitted coefficient
 * B, require |attitude-grid-B*sin(delta)|<=RCS. Residual is affine in B, so
 * checking both endpoints bounds the entire interval. Fin targets contribute
 * no delivered torque. Actual mechanics retains every actuator/payment limit.
 */
export function writeTerminalGimbalAllocation(attitudeTorque: number, deliveredGridTorque: number,
  rcsTorque: number, coefficientLow: number, coefficientHigh: number,
  currentPercent: number, requestedPercent: number, dt: number, out: TerminalGimbalAllocation): void {
  if (!Number.isFinite(attitudeTorque) || !Number.isFinite(deliveredGridTorque)
    || !Number.isFinite(rcsTorque) || !Number.isFinite(coefficientLow) || !Number.isFinite(coefficientHigh)
    || !Number.isFinite(currentPercent) || !Number.isFinite(requestedPercent) || !Number.isFinite(dt)
    || rcsTorque < 0 || coefficientLow < 0 || coefficientHigh < coefficientLow
    || Math.abs(currentPercent) > 100 || dt < 0) throw new RangeError('Invalid terminal allocation domain');
  const lowPercent = Math.max(-100, currentPercent - gimbalSpeed * dt);
  const highPercent = Math.min(100, currentPercent + gimbalSpeed * dt);
  const reachableLow = Math.sin(lowPercent * .01 * gimbalAngleLimit);
  const reachableHigh = Math.sin(highPercent * .01 * gimbalAngleLimit);
  const demand = attitudeTorque - deliveredGridTorque;
  if (!Number.isFinite(demand)) throw new RangeError('Invalid terminal allocation domain');
  let low = reachableLow, high = reachableHigh;
  let supported = true;
  if (coefficientLow === 0) {
    supported = Math.abs(demand) <= rcsTorque;
  } else {
    low = Math.max(low, (demand - rcsTorque) / coefficientLow);
    high = Math.min(high, (demand + rcsTorque) / coefficientLow);
  }
  if (coefficientHigh > 0) {
    low = Math.max(low, (demand - rcsTorque) / coefficientHigh);
    high = Math.min(high, (demand + rcsTorque) / coefficientHigh);
  }
  out.feasible = supported && low <= high;
  const requested = Math.sin(clamp(requestedPercent, -100, 100) * .01 * gimbalAngleLimit);
  // If infeasible, the unconstrained minimax sine balances opposite endpoint
  // residuals. Projection into the reachable interval minimizes the worst one.
  // Normalize before summing/doubling: finite endpoint coefficients and demand
  // can overflow those intermediate operations. An infinite ratio saturates at
  // the reachable bound; zero demand remains zero even for subnormal thrust.
  const minimax = coefficientHigh > 0
    ? demand / coefficientHigh * (2 / (1 + coefficientLow / coefficientHigh)) : requested;
  const chosen = out.feasible ? clamp(requested, low, high) : clamp(minimax, reachableLow, reachableHigh);
  out.commandPercent = clamp(Math.asin(chosen) / gimbalAngleLimit * 100, lowPercent, highPercent);
  const deliveredSine = Math.sin(out.commandPercent * .01 * gimbalAngleLimit);
  out.worstResidual = Math.max(Math.abs(demand - coefficientLow * deliveredSine),
    Math.abs(demand - coefficientHigh * deliveredSine));
  if (!Number.isFinite(out.worstResidual)) throw new RangeError('Invalid terminal allocation domain');
}
