/** Read-only real-core diagnostic. Does not change production or test limits. */
import { createScenarioState, getScenario } from '../../../src/core/scenarios';
import { advance, createLoopState } from '../../../src/app/loop';
import { rad } from '../../../src/core/units';
import { planetRadius } from '../../../src/core/constants';
import type { SimState } from '../../../src/core/state';
const compact = (s: SimState) => ({ crashed: s.failures.crashed, breakup: s.failures.inFlightBreakUp,
  altitude_m: s.kinematics.altitude, speedX_m_s: s.kinematics.speedX, speedY_m_s: s.kinematics.speedY,
  pitch_rad: s.kinematics.pitch, omega_rad_s: s.kinematics.angularVelocity, fuel_kg: s.vehicle.propellantMass });
for (const kind of ['impact', 'overpressure'] as const) {
  const s = createScenarioState(getScenario(kind === 'impact' ? 'launch-pad' : 'reentry')!);
  s.autopilot.autoLandOn = s.autopilot.demoAutoLandOn = false;
  s.kinematics.angularVelocity = 0.4;
  s.kinematics.pitch = rad(kind === 'impact' ? 0.2 : 1.4);
  s.kinematics.altitude = kind === 'impact' ? 20 : 10_000;
  s.kinematics.distanceToPlanetCenter = planetRadius + s.kinematics.altitude;
  s.kinematics.speedX = kind === 'impact' ? 40 : 2000;
  s.kinematics.speedY = kind === 'impact' ? -100 : 0;
  s.forces.dynamicPressure = s.forces.perceivedG = s.forces.surfaceTemperature = 0;
  const loop = createLoopState(s);
  const events: unknown[] = [];
  const result = advance(loop, 2 / 120, { onStep(next) {
    const previous = loop.previous;
    if (!(previous.failures.crashed || previous.failures.inFlightBreakUp)
      && (next.failures.crashed || next.failures.inFlightBreakUp)) events.push({ before: compact(previous), after: compact(next) });
  } });
  console.log(JSON.stringify({ kind, fixedSteps: result.steps, simulatedDt_s: result.simulatedDt,
    firstFailureEvents: events, renderPrevious: compact(loop.previous), renderCurrent: compact(loop.state) }));
}
