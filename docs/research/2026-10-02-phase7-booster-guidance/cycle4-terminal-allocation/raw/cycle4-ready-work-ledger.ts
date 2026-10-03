/** Frozen first-source calculators only; no full preset-to-catch flight. */
import { createScenarioVehicle,PRESETS } from '../../../src/core/scenarios';
import { step,advanceMechanics } from '../../../src/core/step';
import { runBoosterPolicy } from '../../../src/core/autopilot/booster';
import { createBoosterReadyWork,advanceBoosterForecast } from '../../../src/core/control/booster-forecast';
import { advanceBoosterPrediction } from '../../../src/core/control/booster-prediction';
import { SUPER_HEAVY } from '../../../src/core/vehicles/super-heavy';
import { cloneState } from '../../../src/core/state';
import { rad } from '../../../src/core/units';
import * as C from '../../../src/core/constants';
for(const [id,duration] of [['booster-sep',26.466666666666665],['rtls',5.741666666666666]] as const){
 const initial=createScenarioVehicle(PRESETS.find(p=>p.id===id)!);initial.state.autopilot.autoLandOn=true;
 const origin=step(initial.state,1/120,{},SUPER_HEAVY).autopilot.boosterPrediction!.origin;
 const work=createBoosterReadyWork(origin,rad(0),duration);const counts:Record<string,{n:number,time:number}>= {};
 const advance:typeof advanceMechanics=(s,dt,policy,model)=>{
  const phase=s.autopilot.boosterPhase!,starting=!s.engines.running.slice(0,phase==='terminal'?3:13).every(Boolean);
  const key=phase+':'+starting+':'+dt;(counts[key]??={n:0,time:0}).n++;counts[key]!.time+=dt;
  const next=advanceMechanics(s,dt,policy,model);
  if(next.autopilot.boosterPhase!==phase || next.rng.counters.ignitionFailure!==s.rng.counters.ignitionFailure)
   console.log(JSON.stringify({id,event:true,dt,t:s.world.environmentTime,phase,next:next.autopilot.boosterPhase,
    draws:next.rng.counters.ignitionFailure-s.rng.counters.ignitionFailure,h:next.kinematics.altitude,
    vx:next.kinematics.speedX,vy:next.kinematics.speedY,throttle:next.vehicle.throttle,
    running:next.engines.running.filter(Boolean).length,remaining:next.engines.ignitionCountdown.slice(0,13)}));
  return next;
 };
 advanceBoosterForecast(work,4000,advance,runBoosterPolicy,SUPER_HEAVY);
 console.log(JSON.stringify({id,counts,result:work.result,phase:work.state.autopilot.boosterPhase,
  deadline:work.state.autopilot.boosterArrivalTime,missed:work.state.autopilot.boosterTerminalMissed}));
}
const sample=createScenarioVehicle(PRESETS.find(p=>p.id==='rtls')!,123).state;
sample.kinematics.altitude=500;sample.kinematics.downRangeDistance=C.starBaseXPos;
sample.kinematics.pitch=rad(0);sample.kinematics.angularVelocity=0;sample.kinematics.speedX=0;sample.kinematics.speedY=-50;
sample.autopilot.autoLandOn=true;sample.autopilot.boosterPhase='coast';sample.autopilot.boosterFallTime=12;
advanceBoosterPrediction(sample,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
let last='';for(let i=0;i<600;i++){
 const j=sample.autopilot.boosterPrediction!,key=j.stage+':'+j.iterations+':'+j.done;
 if(key!==last || i===300){console.log(JSON.stringify({id:'sample',i,key,time:j.rollout.result.time,steps:j.rollout.result.steps,
  phase:j.rollout.state.autopilot.boosterPhase,deadline:j.rollout.state.autopilot.boosterArrivalTime,
  selected:j.selected?.forecast.handoff,ready:j.terminalOrigin?.kinematics,mass:j.terminalOrigin?.vehicle.vehicleMass,result:j.rollout.result,caught:j.rollout.state.status.landed,published:!!j.published}));last=key;}
 if(j.done)break;advanceBoosterPrediction(sample,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
}
void cloneState;
