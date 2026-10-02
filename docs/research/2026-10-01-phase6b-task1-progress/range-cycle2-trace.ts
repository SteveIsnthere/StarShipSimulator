/** Read-only trace: one default deorbit, no 300 km flight or aim sweep. */
import * as C from '../../../src/core/constants';
import {createScenarioState,getScenario} from '../../../src/core/scenarios';
import {toggleAutoDeorbit} from '../../../src/core/control/commands';
import {getPitchDifference} from '../../../src/core/control/primitives';
import {entryPitchOffset} from '../../../src/core/autopilot/entry';
import {createBurnScratch} from '../../../src/core/control/guidance-physics';
import {createEntryPrediction,predictEntryRangeInto,entryRangeTrim} from '../../../src/core/control/entry-range';
import {step} from '../../../src/core/step';
import {rad} from '../../../src/core/units';
const scratch=createBurnScratch();
let s=createScenarioState(getScenario('deorbit')!);
toggleAutoDeorbit(s);
const heights=[80000,70000,60000,50000,40000,30000,20000,10000,5000,2000,1000];
let stage='',crossing1km=NaN;
const records: Record<string,number|string|boolean|number[]>[]=[];
for(let n=1;n<=120*8000;n++) {
 const before=s;s=step(s,1/120);
 const a=s.autopilot,k=s.kinematics;
 const currentStage=!a.autoLandOn?'deorbit':!a.aeroDescentCompleted?'entry':!a.flipCompleted?'flip':!a.horizontalAdjustmentStageCompleted?'horizontal':'final';
 const crossed=heights.filter(h=>before.kinematics.altitude>h&&k.altitude<=h&&k.speedY<0);
 const mach2=before.kinematics.machSpeed>2&&k.machSpeed<=2&&a.autoLandOn;
 const vx20=Math.abs(before.kinematics.speedX)>20&&Math.abs(k.speedX)<=20&&a.autoLandOn;
 const outcome=s.status.landed?'landed':s.failures.crashed?'crashed':s.failures.inFlightBreakUp?'brokeUp':'';
 if(crossed.includes(1000)) crossing1km=k.downRangeDistance;
 const rangeUpdate=a.entryRangeCountdown===1&&before.autopilot.entryRangeCountdown<=1/120&&a.autoLandOn;
 if(crossed.length||mach2||vx20||rangeUpdate||currentStage!==stage||outcome) {
  const angle=rad(C.ENTRY_LIFT_ANGLE+a.entryRangeTrim);
  const biasAngle=rangeUpdate?rad(C.ENTRY_LIFT_ANGLE+before.autopilot.entryRangeTrim):angle;
  const goal=rad(k.angleOfMotion-Math.PI/2+entryPitchOffset(k.machSpeed,k.speedX,biasAngle));
  const observed=getPitchDifference(k.pitch,goal);
  const bias=rad(Math.abs(observed)<=C.aeroDescentMaxCorrectionAngle?observed:0);
  const result=createEntryPrediction(), low=createEntryPrediction(),high=createEntryPrediction();
  if(k.altitude>1000&&a.autoLandOn) {
   predictEntryRangeInto(s,angle,scratch,result,0.5,bias);
   predictEntryRangeInto(s,rad(C.ENTRY_LIFT_ANGLE-C.aeroDescentMaxCorrectionAngle),scratch,low,0.5,bias);
   predictEntryRangeInto(s,rad(C.ENTRY_LIFT_ANGLE+C.aeroDescentMaxCorrectionAngle),scratch,high,0.5,bias);
  }
  records.push({t:n/120,event:outcome||crossed.join(',')||(mach2?'mach2':vx20?'vx20':rangeUpdate?'rangeUpdate':currentStage),stage:currentStage,h:k.altitude,mach:k.machSpeed,x:k.downRangeDistance,miss:k.downRangeDistance-C.starBaseXPos,vx:k.speedX,vy:k.speedY,pitch:k.pitch*180/Math.PI,goal:goal*180/Math.PI,bias:observed*180/Math.PI,usedBias:bias*180/Math.PI,trim:a.entryRangeTrim*180/Math.PI,previousTrim:before.autopilot.entryRangeTrim*180/Math.PI,requestedTrim:entryRangeTrim(a.landingSiteXPos-k.downRangeDistance,low.downRange,high.downRange)*180/Math.PI,dumping:s.status.dumpingFuel,forecastReached:result.reached,forecastX:k.downRangeDistance+result.downRange,lowX:k.downRangeDistance+low.downRange,highX:k.downRangeDistance+high.downRange,forecastPeak:result.peakKelvin,skin:s.forces.surfaceTemperature,area:s.vehicle.vehicleInFlightMaxArea,fins:[s.vehicle.frontFinExtension,s.vehicle.aftFinExtension],flipTrigger:a.bellyFlopTriggerAltitude,propellant:s.vehicle.propellantMass});
 }
 stage=currentStage;
 if(outcome) {
  for(const r of records) console.log(JSON.stringify({...r,actual1kmX:crossing1km,forecastError:r.forecastReached?Number(r.forecastX)-crossing1km:NaN}));
  console.log(JSON.stringify({outcome,aim:C.DEORBIT_ENTRY_RANGE,rotation:C.frameRotationRate,miss:k.downRangeDistance-C.starBaseXPos,x1km:crossing1km,post1kmDrift:k.downRangeDistance-crossing1km,seconds:n/120}));break;
 }
}
