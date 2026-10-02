import * as C from '../../../src/core/constants';
import { createScenarioState, getScenario } from '../../../src/core/scenarios';
import { cloneState } from '../../../src/core/state';
import { toggleAutoDeorbit } from '../../../src/core/control/commands';
import { step } from '../../../src/core/step';
import { createBurnScratch, createFallResult } from '../../../src/core/control/guidance-physics';
import { predictEntryRangeInto } from '../../../src/core/control/entry-range';
import { updateVehicleInFlightMaxArea } from '../../../src/core/physics/aero';
import { circularOrbitalSpeed, groundTangentialSpeed } from '../../../src/core/physics/gravity';
import { rad } from '../../../src/core/units';
for (const height of [150000, 300000]) {
 let s = createScenarioState(getScenario('deorbit')!);
 s.kinematics.altitude = height;
 s.kinematics.distanceToPlanetCenter = C.planetRadius + height;
 s.kinematics.speedX = groundTangentialSpeed(C.planetRadius+height,circularOrbitalSpeed(C.planetRadius+height));
 s.kinematics.trueSpeed = s.kinematics.speedX;
 toggleAutoDeorbit(s);
 let lastBand = 100;
 const scratch = createBurnScratch(), result = createFallResult();
 for(let n=0;n<120*8000;n++) {
  s=step(s,1/120);
  const band=Math.floor(s.kinematics.machSpeed);
  if (s.kinematics.altitude<80000 && band<lastBand) {
   lastBand=band;
   const selected=rad(C.ENTRY_LIFT_ANGLE+s.autopilot.entryRangeTrim);
   predictEntryRangeInto(s,selected,scratch,result);
   const neutral=cloneState(s);
   neutral.vehicle.vehicleInFlightMaxArea=updateVehicleInFlightMaxArea(50,50).vehicleInFlightMaxArea;
   const current=result.downRange;
   predictEntryRangeInto(neutral,selected,scratch,result);
   console.log(JSON.stringify({height,t:n/120,h:s.kinematics.altitude,mach:s.kinematics.machSpeed,x:s.kinematics.downRangeDistance, vx:s.kinematics.speedX,vy:s.kinematics.speedY,skin:s.forces.surfaceTemperature,alpha:s.kinematics.angleOfAttack*180/Math.PI,trim:s.autopilot.entryRangeTrim*180/Math.PI,fins:[s.vehicle.frontFinExtension,s.vehicle.aftFinExtension],area:s.vehicle.vehicleInFlightMaxArea, prediction:current,neutralPrediction:result.downRange,gap:C.starBaseXPos-s.kinematics.downRangeDistance}));
  }
  if (s.failures.inFlightBreakUp||s.failures.crashed||s.status.landed) {
   console.log(JSON.stringify({height,outcome:s.status.landed?'landed':s.failures.inFlightBreakUp?'brokeUp':'crashed',t:n/120,h:s.kinematics.altitude,skin:s.forces.surfaceTemperature,q:s.forces.dynamicPressure,x:s.kinematics.downRangeDistance,alpha:s.kinematics.angleOfAttack*180/Math.PI,trim:s.autopilot.entryRangeTrim*180/Math.PI}));break;
  }
 }
}
