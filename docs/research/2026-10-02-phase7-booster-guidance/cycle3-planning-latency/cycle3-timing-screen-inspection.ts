import {createScenarioVehicle,PRESETS} from '../../../src/core/scenarios';
import {step,advanceMechanics} from '../../../src/core/step';
import {advanceBoosterForecast,createBoosterReadyWork,createBoosterForecastWork} from '../../../src/core/control/booster-forecast';
import {runBoosterPolicy} from '../../../src/core/autopilot/booster';
import {SUPER_HEAVY} from '../../../src/core/vehicles/super-heavy';
import {rad} from '../../../src/core/units';
import {readFileSync} from 'node:fs';
const jobs=readFileSync('.superpowers/sdd/modernization-phase-7/cycle3-timing-calculation.log','utf8').split('\n').filter(l=>l.startsWith('{')).map(l=>JSON.parse(l));
for(const id of ['booster-sep','rtls']){
 const v=createScenarioVehicle(PRESETS.find(p=>p.id===id)!);v.state.autopilot.autoLandOn=true;
 const origin=step(v.state,1/120,{},SUPER_HEAVY).autopilot.boosterPrediction!.origin;
 for(const j of jobs.filter(j=>j.id===id && j.stage==='screen' && j.iterations<=6)){
  const w=createBoosterReadyWork(origin,rad(0),j.duration);
  advanceBoosterForecast(w,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
  for(const dt of [.05,1/120]){
   const terminal=createBoosterForecastWork(w.state,rad(0));terminal.step=dt;
   advanceBoosterForecast(terminal,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
   console.log(JSON.stringify({id,duration:j.duration,dt,ready:w.result.handoff,result:terminal.result,
    caught:terminal.state.status.landed,failure:terminal.state.failures,
    deadline:terminal.state.autopilot.boosterArrivalTime,missed:terminal.state.autopilot.boosterTerminalMissed}));
  }
 }
}
