import {createScenarioVehicle,PRESETS} from '../../../src/core/scenarios';
import {advanceMechanics} from '../../../src/core/step';
import {advanceBoosterPrediction} from '../../../src/core/control/booster-prediction';
import {runBoosterPolicy} from '../../../src/core/autopilot/booster';
import {SUPER_HEAVY} from '../../../src/core/vehicles/super-heavy';
import {rad} from '../../../src/core/units';
import * as C from '../../../src/core/constants';
const s=createScenarioVehicle(PRESETS.find(p=>p.id==='rtls')!,123).state;
s.kinematics.altitude=500;s.kinematics.downRangeDistance=C.starBaseXPos;
s.kinematics.pitch=rad(0);s.kinematics.angularVelocity=0;s.kinematics.speedX=0;s.kinematics.speedY=-50;
s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='coast';s.autopilot.boosterFallTime=12;
for(let i=0;i<303;i++){
 advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
 const j=s.autopilot.boosterPrediction!;
 if(j.done)console.log(JSON.stringify({i,selected:j.selected,output:j.rollout.result,state:j.rollout.state}));
}

const j=s.autopilot.boosterPrediction!;console.log(JSON.stringify({last:true,stage:j.stage,steps:j.rollout.result.steps,selected:j.selected,state:{phase:j.rollout.state.autopilot.boosterPhase,deadline:j.rollout.state.autopilot.boosterArrivalTime,miss:j.rollout.state.autopilot.boosterTerminalMissed,h:j.rollout.state.kinematics.altitude,x:j.rollout.state.kinematics.downRangeDistance-C.starBaseXPos,vx:j.rollout.state.kinematics.speedX,vy:j.rollout.state.kinematics.speedY,pitch:j.rollout.state.kinematics.pitch}}));
