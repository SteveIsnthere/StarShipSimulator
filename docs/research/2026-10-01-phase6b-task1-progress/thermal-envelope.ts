import * as C from '../../../src/core/constants';
import { createScenarioState, getScenario } from '../../../src/core/scenarios';
import { toggleAutoDeorbit } from '../../../src/core/control/commands';
import { createBurnScratch } from '../../../src/core/control/guidance-physics';
import { createEntryPrediction, predictEntryRangeInto } from '../../../src/core/control/entry-range';
import { circularOrbitalSpeed, groundTangentialSpeed, coastDownrangeDistance } from '../../../src/core/physics/gravity';
import { step } from '../../../src/core/step';
import { entryPitchOffset } from '../../../src/core/autopilot/entry';
import { rad } from '../../../src/core/units';
for (const height of [150000,300000]) {
 let s=createScenarioState(getScenario('deorbit')!);
 s.kinematics.altitude=height;s.kinematics.distanceToPlanetCenter=C.planetRadius+height;
 s.kinematics.speedX=groundTangentialSpeed(C.planetRadius+height,circularOrbitalSpeed(C.planetRadius+height));
 s.kinematics.trueSpeed=s.kinematics.speedX;
 toggleAutoDeorbit(s);
 let burnRecorded=false;
 for(let n=1;n<120*8000;n++) {
  s=step(s,1/120);
  if(s.autopilot.deorbitBurnStarted&&!burnRecorded) {
   burnRecorded=true;
   const burnSeconds=C.DEORBIT_DELTA_V*s.vehicle.vehicleMass/(3*C.thrustPerRaptorAt(s.atmosphere.airPressure));
   const burnRange=(s.kinematics.speedX-C.DEORBIT_DELTA_V/2)*burnSeconds;
   const coast=coastDownrangeDistance(s.kinematics.distanceToPlanetCenter,s.kinematics.speedX-C.DEORBIT_DELTA_V,s.kinematics.speedY,C.planetRadius+C.ENTRY_INTERFACE_ALTITUDE);
   console.log('coast-diagnosis1',JSON.stringify({height,at:n/120,aim:C.DEORBIT_ENTRY_RANGE,gap:C.starBaseXPos-s.kinematics.downRangeDistance,burnRange,coast,predictedTotal:burnRange+coast+C.DEORBIT_ENTRY_RANGE,halfLapSeconds:Math.PI*C.planetRadius/s.kinematics.speedX,aimReductionToWait1500:(1500-n/120)*s.kinematics.speedX}));
  }
  if(s.kinematics.altitude<=80000&&s.kinematics.speedY<0) {
   const scratch=createBurnScratch(),out=createEntryPrediction();
   const goal=s.kinematics.angleOfMotion-Math.PI/2+entryPitchOffset(s.kinematics.machSpeed,s.kinematics.speedX,rad(C.ENTRY_LIFT_ANGLE+s.autopilot.entryRangeTrim));
   const observedBias=rad(s.kinematics.pitch-goal);
   console.log('entry',JSON.stringify({height,bias:observedBias*180/Math.PI,at:n/120,h:s.kinematics.altitude,vx:s.kinematics.speedX,vy:s.kinematics.speedY,mass:s.vehicle.vehicleMass,gap:C.starBaseXPos-s.kinematics.downRangeDistance}));
   for(const angle of [57,60,63]) for(const bias of [observedBias,rad(-C.aeroDescentMaxCorrectionAngle)]) {
    predictEntryRangeInto(s,rad(angle*Math.PI/180),scratch,out,.5,bias);
    console.log('forecast',JSON.stringify({height,angle,bias:bias*180/Math.PI,...out}));
   }
   break;
  }
  if(s.failures.inFlightBreakUp||s.failures.crashed||s.status.landed)throw new Error('failed before entry');
 }
}
