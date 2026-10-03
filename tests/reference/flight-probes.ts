/** Actual protected presets and controls, not fixture playback. Scalar cached
 * reports share one measurement per process without exposing mutable state. */
import { createScenarioState, getScenario } from '$core/scenarios';
import { toggleAutoLand, toggleAutoTakeOff } from '$core/control/commands';
import { step } from '$core/step';
const DT = 1 / 120;
export interface FlightMeasurement {
  readonly peak: number;
  /** m — incoming hull altitude of the interval that produced the force. */
  readonly altitude: number;
  readonly seconds: number;
  readonly outcome: 'landed' | 'crashed' | 'broke-up' | 'window-complete';
}
let ascent: FlightMeasurement | undefined, entry: FlightMeasurement | undefined;
function measure(id: 'launch-pad' | 'reentry', seconds: number): FlightMeasurement {
  let s = createScenarioState(getScenario(id)!);
  if (id === 'launch-pad') toggleAutoTakeOff(s); else toggleAutoLand(s);
  let peak = 0, altitude = s.kinematics.altitude, elapsed = 0;
  let outcome: FlightMeasurement['outcome'] = 'window-complete';
  for (let i = 0; i < seconds * 120; i++) {
    const incomingAltitude = s.kinematics.altitude;
    s = step(s, DT); elapsed = (i + 1) * DT;
    const value = id === 'launch-pad' ? s.forces.dynamicPressure * 1000 : s.forces.thermalPower;
    if (!Number.isFinite(value)) throw new Error(`${id}: non-finite force at ${elapsed}s`);
    if (value > peak) { peak = value; altitude = incomingAltitude; }
    if (s.failures.inFlightBreakUp) { outcome = 'broke-up'; break; }
    if (s.failures.crashed) { outcome = 'crashed'; break; }
    if (s.status.landed) { outcome = 'landed'; break; }
  }
  return Object.freeze({ peak, altitude, seconds: elapsed, outcome });
}
export function ascentMaxQ(): FlightMeasurement {
  return ascent ??= measure('launch-pad', 90);
}
export function reentryPeakHeating(): FlightMeasurement {
  return entry ??= measure('reentry', 900);
}
