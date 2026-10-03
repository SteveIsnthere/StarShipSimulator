import { createScenarioVehicle,PRESETS } from '../../../src/core/scenarios';
import { step,advanceMechanics } from '../../../src/core/step';
import { runBoosterPolicy } from '../../../src/core/autopilot/booster';
import { advanceBoosterPrediction } from '../../../src/core/control/booster-prediction';
import { SUPER_HEAVY } from '../../../src/core/vehicles/super-heavy';
for(const id of ['booster-sep','rtls']) {
 const initial=createScenarioVehicle(PRESETS.find(p=>p.id===id)!);initial.state.autopilot.autoLandOn=true;
 const s=step(initial.state,1/120,{},SUPER_HEAVY);let last='';
 for(let i=0;i<10000 && !s.autopilot.boosterPrediction!.done;i++) {
  s.world.environmentTime+=1/120;advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
  const j=s.autopilot.boosterPrediction!,key=j.stage+':'+j.iterations+':'+j.done;
  if(key!==last) {console.log(JSON.stringify({id,receipt:s.world.environmentTime,key,duration:j.duration,alignment:j.alignment?.steps,selectedError:j.selected?.forecast.rangeError,lastError:j.lastCandidate?.forecast.rangeError,done:j.done,caught:j.rollout.state.status.landed,result:j.rollout.result}));last=key;}
 }
}
