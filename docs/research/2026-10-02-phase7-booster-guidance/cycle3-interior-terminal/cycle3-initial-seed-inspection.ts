import {createScenarioVehicle,PRESETS} from '../../../src/core/scenarios';
import {step} from '../../../src/core/step';
import {SUPER_HEAVY,RETURN_ENGINES} from '../../../src/core/vehicles/super-heavy';
import {getTotalMaxThrust} from '../../../src/core/physics/engines';
for(const id of ['booster-sep','rtls']){
 const v=createScenarioVehicle(PRESETS.find(p=>p.id===id)!);v.state.autopilot.autoLandOn=true;
 const first=step(v.state,1/120,{},SUPER_HEAVY),o=first.autopilot.boosterPrediction!.origin;
 const thrust=getTotalMaxThrust(SUPER_HEAVY.engines.map((_,i)=>RETURN_ENGINES.includes(i)),o.atmosphere.airPressure,SUPER_HEAVY);
 console.log(JSON.stringify({id,error:o.autopilot.boosterRangeError,fall:o.autopilot.boosterFallTime,
  vx:o.kinematics.speedX,vy:o.kinematics.speedY,h:o.kinematics.altitude,mass:o.vehicle.vehicleMass,
  acceleration:thrust/o.vehicle.vehicleMass,seed:Math.abs(o.autopilot.boosterRangeError!)/(thrust/o.vehicle.vehicleMass*o.autopilot.boosterFallTime!)}));
}
