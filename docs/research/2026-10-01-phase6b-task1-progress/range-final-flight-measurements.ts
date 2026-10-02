/** Current-source characterization only; no runtime/fixture writes. */
import * as C from '../../../src/core/constants';
import { createScenarioState, getScenario } from '../../../src/core/scenarios';
import { toggleAutoDeorbit, toggleAutoLand } from '../../../src/core/control/commands';
import { verticalDragCoefficient, verticalLiftCoefficient, liftSignIsInverted } from '../../../src/core/physics/components';
import { verticalGravityAcceleration } from '../../../src/core/physics/gravity';
import { relativeWindAngle } from '../../../src/core/physics/aero';
import { airVelocityX } from '../../../src/core/physics/wind';
import { step } from '../../../src/core/step';
for (const id of ['before-flip', 'deorbit', 'reentry'] as const) {
 let s = createScenarioState(getScenario(id)!);
 if (id === 'deorbit') toggleAutoDeorbit(s); else toggleAutoLand(s);
 let peakSkin = 0, peakFlux = 0, flipAttack = 0;
 let speedAt1km: number | null = null, crossing50Seconds: number | null = null;
 for (let n = 1; n <= 120 * (id === 'deorbit' ? 8000 : 900); n++) {
  const before = s; s = step(s, 1 / 120);
  peakSkin = Math.max(peakSkin, s.forces.surfaceTemperature);
  peakFlux = Math.max(peakFlux, s.forces.thermalPower);
  if (speedAt1km === null && before.kinematics.altitude >= 1000 && s.kinematics.altitude < 1000) speedAt1km = s.kinematics.trueSpeed;
  if (s.autopilot.flipStageInitialised && !s.autopilot.flipCompleted) flipAttack = Math.max(flipAttack, Math.abs(s.kinematics.angleOfAttack) * 180 / Math.PI);
  const crossing50 = crossing50Seconds === null && before.kinematics.altitude >= 50000 && s.kinematics.altitude < 50000 && s.kinematics.speedY < 0;
  if (crossing50) crossing50Seconds = n / 120;
  if (id === 'reentry' && (n % (60 * 120) === 0 || crossing50)) {
   // Step's force phase uses incoming velocities/pose; forces carry that phase.
   const motion = relativeWindAngle(before.kinematics.speedX, before.kinematics.speedY,
    airVelocityX(before.world, before.kinematics.altitude), before.world.gustVertical);
   const liftY = verticalLiftCoefficient(motion) * s.forces.aerodynamicLiftAcceleration * (liftSignIsInverted(s.kinematics.angleOfAttack) ? -1 : 1);
   const dragY = verticalDragCoefficient(motion) * s.forces.aerodynamicDragAcceleration;
   const gravityY = verticalGravityAcceleration(before.kinematics.distanceToPlanetCenter, before.kinematics.speedX);
   console.log(JSON.stringify({ id, event: crossing50 ? 'firstDescending50km' : 'sample', seconds: n / 120,
    altitude: s.kinematics.altitude, vx: s.kinematics.speedX, vy: s.kinematics.speedY,
    liftY, dragY, gravityY, bodyThrust: s.forces.thrustAcceleration,
    accelerationY: s.kinematics.accelerationY, trimDegrees: s.autopilot.entryRangeTrim * 180 / Math.PI,
    skin: s.forces.surfaceTemperature, broken: s.failures.inFlightBreakUp }));
  }
  if (s.status.landed || s.failures.crashed || s.failures.inFlightBreakUp) {
   console.log(JSON.stringify({ id, event: 'outcome', aim: C.DEORBIT_ENTRY_RANGE,
    outcome: s.status.landed ? 'landed' : s.failures.crashed ? 'crashed' : 'brokeUp', seconds: n / 120,
    miss: s.kinematics.downRangeDistance - C.starBaseXPos, peakSkin, peakFlux,
    speedAt1km, flipAttack, crossing50Seconds, propellant: s.vehicle.propellantMass })); break;
  }
 }
}
