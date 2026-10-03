import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {forecastBoosterReturn,createBoosterForecast} from '../../../src/core/control/booster-forecast';
import {advanceMechanics} from '../../../src/core/step';
import {runBoosterPolicy} from '../../../src/core/autopilot/booster';
import {SUPER_HEAVY} from '../../../src/core/vehicles/super-heavy';
import {rad} from '../../../src/core/units';
import type {SimState} from '../../../src/core/state';
const source=JSON.parse(readFileSync('docs/research/2026-10-02-phase7-booster-guidance/cycle2-attempt1-partial-state.json','utf8')) as {time:number;state:SimState};
const rows=[];
for(const pitch of [0,.05,-.05]){
 const out=createBoosterForecast();const start=performance.now();
 forecastBoosterReturn(source.state,rad(pitch),advanceMechanics,runBoosterPolicy,SUPER_HEAVY,out);
 rows.push({pitch,milliseconds:performance.now()-start,...out});
}
writeFileSync('.superpowers/sdd/modernization-phase-7/cycle2-forecast-bench-result.json',JSON.stringify({capturedLiveTime:source.time,rows},null,2)+'\n');
console.log(JSON.stringify(rows));
