import { buildEngineOut, ENGINE_OUT } from '../../../tests/golden/landing-margins';
import { step } from '../../../src/core/step';
const variant = ENGINE_OUT.find(v => v.id === 'before-flip-autoland/two-out')!;
let s = buildEngineOut(variant);
let priorStage = '', lastLogged = -1;
for (let n=0;n<900*120;n++) {
 const stage = !s.autopilot.flipStageInitialised ? 'aero' : !s.autopilot.flipCompleted ? 'flip' : !s.autopilot.horizontalAdjustmentStageCompleted ? 'horizontal' : 'final';
 if(stage!==priorStage || (s.kinematics.altitude<1000 && Math.floor(n/120)!==lastLogged)) {
  console.log(JSON.stringify({t:n/120,stage,h:s.kinematics.altitude,vy:s.kinematics.speedY,vx:s.kinematics.speedX,pitch:s.kinematics.pitch,prop:s.vehicle.propellantMass,throttle:s.vehicle.throttle,actual:s.vehicle.throttleCurrent,eng:s.engines.running,accY:s.kinematics.accelerationY,thrust:s.forces.thrustAcceleration,drag:s.forces.aerodynamicDragAcceleration,lift:s.forces.aerodynamicLiftAcceleration,trigger:s.autopilot.finalStagePessimisticAltitude}));
  priorStage=stage;lastLogged=Math.floor(n/120);
 }
 const before=s;s=step(s,1/120);
 if(s.status.landed || s.failures.crashed || s.failures.inFlightBreakUp) {
  console.log('outcome',JSON.stringify({t:(n+1)/120,landed:s.status.landed,crashed:s.failures.crashed,broken:s.failures.inFlightBreakUp,contact:{h:before.kinematics.altitude,vy:before.kinematics.speedY,vx:before.kinematics.speedX,pitch:before.kinematics.pitch,prop:before.vehicle.propellantMass}})); break;
 }
}
