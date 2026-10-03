/** Free-flight operator modes on the real booster hardware. Return guidance
 * has priority in the dispatcher; none of these laws enters its forecast. */
import * as C from '../constants';
import type { SimState } from '../state';
import type { VehicleDefinition } from '../vehicle';
import { rad } from '../units';
import { toggleAllRaptors } from '../control/commands';
import { alignBooster } from './booster';

export function runBoosterUtilities(state: SimState, model: VehicleDefinition): void {
  const { autopilot: a, kinematics: k } = state;
  if (a.manualControlOn || state.failures.crashed || state.failures.inFlightBreakUp || state.status.landed) return;
  if (a.pitchHoldOn) {
    if (Math.abs(k.pitchRateOfChange) < C.PITCH_HOLD_RATE_THRESHOLD) a.holdingPitch = k.pitch;
    state.status.translationModeOn = true;
    alignBooster(state, a.holdingPitch, .5, model);
  }
  if (!a.autoTakeOffOn) return;
  if (!a.autoTakeOffInitialised) {
    a.autoMaxThrustOn = true;
    if (!state.engines.running.some(Boolean)) toggleAllRaptors(state, model);
    a.autoTakeOffInitialised = true;
  }
  state.status.translationModeOn = true;
  const goal = k.altitude < 25000
    ? rad(C.aomAt_25km * k.altitude / 25000)
    : k.altitude < 80000
      ? rad(C.aomAt_25km + (C.aomAt_80km - C.aomAt_25km) * (k.altitude - 25000) / 55000)
      : C.aomAt_80km;
  alignBooster(state, goal, 3, model);
  if (state.vehicle.propellantMass < C.dumpLimit && state.engines.running.some(Boolean)) {
    toggleAllRaptors(state, model);
    a.autoTakeOffOn = false;
  }
}
