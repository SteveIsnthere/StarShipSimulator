/** Source-matched terminal diagnostics, not complete prescribed flights. */
import { writeFileSync } from 'node:fs';
import { createScenarioVehicle,PRESETS } from '../../../src/core/scenarios';
import { step,advanceMechanics } from '../../../src/core/step';
import { runBoosterPolicy } from '../../../src/core/autopilot/booster';
import { advanceBoosterPrediction } from '../../../src/core/control/booster-prediction';
import { cloneState } from '../../../src/core/state';
import { createBoosterArrival,writeBoosterArrival,createBoosterThrustRequest,writeBoosterForceRequest } from '../../../src/core/control/booster-arrival';
import { createCatchPose,writeCatchPose } from '../../../src/core/physics/tower-catch';
import { SUPER_HEAVY,CATCH } from '../../../src/core/vehicles/super-heavy';
import * as C from '../../../src/core/constants';
for(const id of ['booster-sep','rtls']){
 const initial=createScenarioVehicle(PRESETS.find(p=>p.id===id)!);initial.state.autopilot.autoLandOn=true;
 const source=step(initial.state,1/120,{},SUPER_HEAVY);let prior='';
 for(let frame=0;frame<10000 && !source.autopilot.boosterPrediction!.done;frame++){
  const j=source.autopilot.boosterPrediction!,key=j.stage+':'+j.iterations;
  if(j.stage==='validate' && key!==prior){
   let state=cloneState(j.terminalOrigin!);delete state.autopilot.boosterPrediction;delete state.autopilot.boosterForecastHandoff;
   writeFileSync(`.superpowers/sdd/modernization-phase-7/cycle4-${id}-root${j.iterations}-ready.json`,JSON.stringify(state,null,2));
   const a=createBoosterArrival(),r=createBoosterThrustRequest(),p=createCatchPose();
   for(let i=0;i<4000 && !state.status.landed && !state.failures.crashed;i++){
    if(i%60===0 || (state.autopilot.boosterArrivalTime ?? 60)<.2){
     const inspect=cloneState(state);writeBoosterArrival(inspect,1/120,SUPER_HEAVY,a);
     const limit=CATCH.maxPitch*(inspect.autopilot.boosterArrivalTime ?? 0);
     writeBoosterForceRequest(inspect,a.centreAX,a.centreAY,SUPER_HEAVY,r,limit);
     writeCatchPose(state,SUPER_HEAVY,p);
     console.log(JSON.stringify({id,key,t:i/120,T:state.autopilot.boosterArrivalTime,bodyX:state.kinematics.downRangeDistance-C.starBaseXPos,
      bodyVX:state.kinematics.speedX,lugX:p.x-C.starBaseXPos,lugVX:p.speedX,h:p.altitude-CATCH.planeAltitude,
      pitch:state.kinematics.pitch,omega:state.kinematics.angularVelocity,goal:r.pitch,AX:a.centreAX,AY:a.centreAY,
      deliveredAX:state.kinematics.accelerationX,throttle:state.vehicle.throttleCurrent,gimbal:state.vehicle.gimbalPosition}));
    }
    const before=state;state=advanceMechanics(state,1/120,runBoosterPolicy,SUPER_HEAVY);
    writeCatchPose(state,SUPER_HEAVY,p);
    if(p.altitude<=CATCH.planeAltitude){console.log(JSON.stringify({id,key,crossed:true,t:i/120,caught:state.status.landed,
     x:p.x-C.starBaseXPos,vx:p.speedX,vy:p.speedY,pitch:state.kinematics.pitch,
     bodyX:state.kinematics.downRangeDistance-C.starBaseXPos,bodyVX:state.kinematics.speedX,omega:state.kinematics.angularVelocity,
     fuel:state.vehicle.propellantMass,priorDeadline:before.autopilot.boosterArrivalTime}));break;}
   }
  }
  prior=key;source.world.environmentTime+=1/120;
  advanceBoosterPrediction(source,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
 }
}
