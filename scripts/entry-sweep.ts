/** Phase 6b Task 1: the approved eight-angle sweep, no test-bound tuning. */
import { DT } from '../src/app/loop';
import * as C from '../src/core/constants';
import { toggleAutoDeorbit, toggleAutoLand } from '../src/core/control/commands';
import { createScenarioState, getScenario } from '../src/core/scenarios';
import { step } from '../src/core/step';
import { rad } from '../src/core/units';

const prescribedAngles = [45, 50, 55, 60, 65, 70, 75, 90] as const;
// Optional named calibration measurement; the default always emits all16 rows.
const requestedAngle = process.argv[2] === undefined ? undefined : Number(process.argv[2]);
if (requestedAngle !== undefined && !prescribedAngles.some((angle) => angle === requestedAngle)) {
  throw new Error('The angle must be one of the prescribed sweep angles.');
}
const angles = prescribedAngles.filter((angle) => requestedAngle === undefined || angle === requestedAngle);
console.log('angle,preset,peakKelvin,peakAltitudeMetres,missMetres,outcome,seconds,speedAt1km,peakFlipAttackDegrees,burnStartSeconds,burnStartGap,burnCutoffSeconds,burnCutoffGap,entrySeconds,entryGap,entrySpeedX,entrySpeedY');
for (const angle of angles) for (const id of ['deorbit', 'reentry'] as const) {
  let s = createScenarioState(getScenario(id)!);
  if (id === 'deorbit') toggleAutoDeorbit(s); else toggleAutoLand(s);
  const input = { entryAngleOfAttack: rad(angle * Math.PI / 180) };
  let peak = 0, peakAltitude = 0, seconds = 0, flipAttack = 0;
  let speedAt1km: number | null = null;
  let outcome = 'flying';
  let burnStartSeconds: number | undefined, burnStartGap: number | undefined;
  let burnCutoffSeconds: number | undefined, burnCutoffGap: number | undefined;
  let entrySeconds: number | undefined, entryGap: number | undefined;
  let entrySpeedX: number | undefined, entrySpeedY: number | undefined;
  for (let n = 1; n <= Math.round(8000 / DT); n++) {
    const before = s;
    const beforeAltitude = before.kinematics.altitude;
    s = step(s, DT, input);
    if (!before.autopilot.deorbitBurnStarted && s.autopilot.deorbitBurnStarted) {
      burnStartSeconds = n * DT;
      burnStartGap = s.autopilot.landingSiteXPos - s.kinematics.downRangeDistance;
    }
    if (!before.autopilot.deorbitBurnCompleted && s.autopilot.deorbitBurnCompleted) {
      burnCutoffSeconds = n * DT;
      burnCutoffGap = s.autopilot.landingSiteXPos - s.kinematics.downRangeDistance;
    }
    if (entrySeconds === undefined && beforeAltitude > C.ENTRY_INTERFACE_ALTITUDE &&
        s.kinematics.altitude <= C.ENTRY_INTERFACE_ALTITUDE && s.kinematics.speedY < 0) {
      entrySeconds = n * DT;
      entryGap = s.autopilot.landingSiteXPos - s.kinematics.downRangeDistance;
      entrySpeedX = s.kinematics.speedX;
      entrySpeedY = s.kinematics.speedY;
    }
    if (s.forces.surfaceTemperature > peak) {
      peak = s.forces.surfaceTemperature;
      peakAltitude = s.kinematics.altitude;
    }
    if (speedAt1km === null && beforeAltitude >= 1000 && s.kinematics.altitude < 1000 && s.kinematics.speedY < 0) {
      speedAt1km = s.kinematics.trueSpeed;
    }
    if (s.autopilot.flipStageInitialised && !s.autopilot.flipCompleted) {
      flipAttack = Math.max(flipAttack, Math.abs(s.kinematics.angleOfAttack) * 180 / Math.PI);
    }
    seconds = n * DT;
    if (s.failures.inFlightBreakUp) outcome = 'brokeUp';
    else if (s.failures.crashed) outcome = 'crashed';
    else if (s.status.landed) outcome = 'landed';
    if (outcome !== 'flying') break;
  }
  const miss = s.kinematics.downRangeDistance - C.starBaseXPos;
  console.log([angle,id,peak.toFixed(3),peakAltitude.toFixed(1),miss.toFixed(1),outcome,seconds.toFixed(3),speedAt1km?.toFixed(3) ?? '',flipAttack.toFixed(3),
    burnStartSeconds, burnStartGap, burnCutoffSeconds, burnCutoffGap,
    entrySeconds, entryGap, entrySpeedX, entrySpeedY].join(','));
}
