import {createScenarioVehicle,PRESETS} from '../../../src/core/scenarios';
import {SUPER_HEAVY} from '../../../src/core/vehicles/super-heavy';
import {rad} from '../../../src/core/units';
import * as C from '../../../src/core/constants';
import {advanceBoosterPrediction} from '../../../src/core/control/booster-prediction';
import {advanceMechanics} from '../../../src/core/step';
import {runBoosterPolicy} from '../../../src/core/autopilot/booster';
const s=createScenarioVehicle(PRESETS.find(p=>p.id==='rtls')!,123).state;
s.kinematics.altitude=500;s.kinematics.downRangeDistance=C.starBaseXPos;
s.kinematics.pitch=rad(0);s.kinematics.angularVelocity=0;s.kinematics.speedX=0;s.kinematics.speedY=-50;
s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='coast';s.autopilot.boosterFallTime=12;
for(let i=0;i<303;i++)advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
const j=s.autopilot.boosterPrediction!;
console.log(JSON.stringify({stage:j.stage,done:j.done,selected:j.selected,result:j.rollout.result,
  state:{k:j.rollout.state.kinematics,a:j.rollout.state.autopilot,status:j.rollout.state.status,
    failures:j.rollout.state.failures,fuel:j.rollout.state.vehicle.propellantMass}},null,2));
