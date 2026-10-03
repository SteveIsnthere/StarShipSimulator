import {createScenarioVehicle,PRESETS} from '../../../src/core/scenarios';
import {step,advanceMechanics} from '../../../src/core/step';
import {advanceBoosterForecast,createBoosterReadyWork} from '../../../src/core/control/booster-forecast';
import {runBoosterPolicy} from '../../../src/core/autopilot/booster';
import {SUPER_HEAVY} from '../../../src/core/vehicles/super-heavy';
import {createBoosterArrival,writeBoosterArrival,createBoosterThrustRequest,writeBoosterThrustRequest} from '../../../src/core/control/booster-arrival';
import {rad} from '../../../src/core/units';
for(const [id,duration] of [['booster-sep', 26.51648075268278], ['rtls', 5.7680930265817025]] as const){
 const v=createScenarioVehicle(PRESETS.find(p=>p.id===id)!);v.state.autopilot.autoLandOn=true;
 const first=step(v.state,1/120,{},SUPER_HEAVY);
 const origin=first.autopilot.boosterPrediction!.origin;
 const w=createBoosterReadyWork(origin,rad(0),duration);
 advanceBoosterForecast(w,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
 let s=w.state;delete s.autopilot.boosterForecastHandoff;
 for(let i=0;i<35*120 && !s.status.landed && !s.failures.crashed && !s.failures.inFlightBreakUp;i++){
  if(i%120===0 || s.kinematics.altitude<120){
   const a=createBoosterArrival();const deadline=s.autopilot.boosterArrivalTime;
   writeBoosterArrival(s,0,SUPER_HEAVY,a);if(deadline===undefined)delete s.autopilot.boosterArrivalTime;
   const t=createBoosterThrustRequest();writeBoosterThrustRequest(s,a.ax,a.ay,SUPER_HEAVY,t);
   console.log(JSON.stringify({id,t:i/120,arrival:a,thrust:t,pitch:s.kinematics.pitch,omega:s.kinematics.angularVelocity,
    gimbal:s.vehicle.gimbalPosition,throttle:s.vehicle.throttleCurrent,ax:s.kinematics.accelerationX,
    ay:s.kinematics.accelerationY,deadline,missed:s.autopilot.boosterTerminalMissed,fuel:s.vehicle.propellantMass}));
  }
  s=advanceMechanics(s,1/120,runBoosterPolicy,SUPER_HEAVY);
 }
 console.log(JSON.stringify({id,final:s.status,failures:s.failures,kin:s.kinematics,fuel:s.vehicle.propellantMass}));
}
