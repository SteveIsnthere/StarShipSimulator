import {writeFileSync} from 'node:fs';
import {createScenarioVehicle,PRESETS} from '../../../src/core/scenarios';
import {step,advanceMechanics} from '../../../src/core/step';
import {advanceBoosterForecast,createBoosterReadyWork} from '../../../src/core/control/booster-forecast';
import {runBoosterPolicy} from '../../../src/core/autopilot/booster';
import {SUPER_HEAVY} from '../../../src/core/vehicles/super-heavy';
import {rad} from '../../../src/core/units';
for(const [id,duration] of [['booster-sep', 26.515467388829727], ['rtls', 5.767822897320815]] as const){
 const v=createScenarioVehicle(PRESETS.find(p=>p.id===id)!);v.state.autopilot.autoLandOn=true;
 const first=step(v.state,1/120,{},SUPER_HEAVY);
 const origin=first.autopilot.boosterPrediction!.origin;
 const w=createBoosterReadyWork(origin,rad(0),duration);
 advanceBoosterForecast(w,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
 const s=w.state;delete s.autopilot.boosterForecastHandoff;
 writeFileSync(`.superpowers/sdd/modernization-phase-7/cycle3-lug-ready-${id}.json`,JSON.stringify(s,null,2));
}
