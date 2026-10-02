/** A continuous entry offset from the existing broadside attitude. */
import * as C from '../constants';
import { rad, type Rad } from '../units';

/**
 * Prograde uses the nose-first outward-lift branch; retrograde uses the
 * tail-first branch that joins the same legacy broadside attitude without a
 * 180-degree flip. The attack-angle magnitude into the wind is identical.
 * Existing range trims stay in the caller's broadside target.
 */
export function entryPitchOffset(mach: number, speedX: number, entryAngle: Rad): Rad {
  if (mach <= C.ENTRY_BROADSIDE_MACH) return rad(0);
  const weight = Math.min(1, (mach - C.ENTRY_BROADSIDE_MACH) /
    (C.ENTRY_LIFT_MACH - C.ENTRY_BROADSIDE_MACH));
  return rad(Math.sign(speedX) * (Math.PI / 2 - entryAngle) * weight);
}
