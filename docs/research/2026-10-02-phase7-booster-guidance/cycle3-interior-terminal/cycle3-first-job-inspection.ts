/** Inspect the immutable first planning job only; never advance a full flight. */
import {createScenarioVehicle,PRESETS} from '../../../src/core/scenarios';
import {step,advanceMechanics} from '../../../src/core/step';
import {advanceBoosterPrediction} from '../../../src/core/control/booster-prediction';
import {runBoosterPolicy} from '../../../src/core/autopilot/booster';
import {SUPER_HEAVY} from '../../../src/core/vehicles/super-heavy';
for(const id of ['booster-sep','rtls']) {
 const initial=createScenarioVehicle(PRESETS.find(p=>p.id===id)!);
 initial.state.autopilot.autoLandOn=true;
 const s=step(initial.state,1/120,{},SUPER_HEAVY);
 let last='';
 for(let i=0;i<10000;i++) {
  const j=s.autopilot.boosterPrediction!;
  const key=`${j.stage}:${j.iterations}:${j.done}`;
  if(key!==last) {
   console.log(JSON.stringify({id,receiptTime:s.world.environmentTime,stage:j.stage,iterations:j.iterations,
    duration:j.duration,upper:j.upperDuration,done:j.done,low:j.low,high:j.high,selected:j.selected,
    result:j.rollout.result,state:{phase:j.rollout.state.autopilot.boosterPhase,
     deadline:j.rollout.state.autopilot.boosterArrivalTime,missed:j.rollout.state.autopilot.boosterTerminalMissed,
     h:j.rollout.state.kinematics.altitude,vx:j.rollout.state.kinematics.speedX,vy:j.rollout.state.kinematics.speedY,
     pitch:j.rollout.state.kinematics.pitch,fuel:j.rollout.state.vehicle.propellantMass,
     landed:j.rollout.state.status.landed,failures:j.rollout.state.failures},published:j.published}));last=key;
  }
  if(j.done)break;
  // Receipt time follows the production work budget; actual kinematics/fuel
  // are frozen at the first live frame. This is not a scenario outcome.
  s.world.environmentTime+=1/120;
  advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
 }
}
