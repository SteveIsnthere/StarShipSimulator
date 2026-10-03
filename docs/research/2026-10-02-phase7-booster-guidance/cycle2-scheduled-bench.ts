import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {step} from '../../../src/core/step';
import {SUPER_HEAVY} from '../../../src/core/vehicles/super-heavy';
import type {SimState} from '../../../src/core/state';
const capture=JSON.parse(readFileSync('docs/research/2026-10-02-phase7-booster-guidance/cycle2-attempt1-partial-state.json','utf8')) as {time:number;state:SimState};
let state=capture.state;const times:number[]=[];
for(let i=0;i<1000;i++){
 const start=performance.now();state=step(state,1/120,{},SUPER_HEAVY);times.push(performance.now()-start);
}
const ordered=times.toSorted((a,b)=>a-b),total=times.reduce((a,b)=>a+b,0);
const result={captureTime:capture.time,steps:1000,meanMilliseconds:total/1000,medianMilliseconds:ordered[500],p99Milliseconds:ordered[990],maxMilliseconds:ordered[999],finalPhase:state.autopilot.boosterPhase,finalHeight:state.kinematics.altitude};
writeFileSync('.superpowers/sdd/modernization-phase-7/cycle2-scheduled-bench-result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
