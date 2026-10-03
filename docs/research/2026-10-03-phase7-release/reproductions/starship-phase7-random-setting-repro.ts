import {readFileSync} from 'node:fs';
import {createBoosterForecastWork, advanceBoosterForecast,createBoosterForecast} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/control/booster-forecast.ts';
import {advanceBoosterPrediction} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/control/booster-prediction.ts';
import {advanceMechanics} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/step.ts';
import {runBoosterPolicy} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/autopilot/booster.ts';
import {SUPER_HEAVY} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/vehicles/super-heavy.ts';
import {cloneState} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/state.ts';
import {rad} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/units.ts';
const fixtures=JSON.parse(readFileSync('/Users/stevewang/dev/StarShipSimulator-realism/tests/fixtures/booster-terminal-ready.json','utf8'));
for(const enabled of [false,true]){
 const s=cloneState(fixtures['rtls']); s.failures.randomFailure=enabled;
 const work=createBoosterForecastWork(s,rad(0));work.step=1/120;
 advanceBoosterForecast(work,4000,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
 console.log('preference',enabled,'actual fine catch',work.state.status.landed,'actual failures',work.state.failures);
 advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
 const j=s.autopilot.boosterPrediction!;
 const f=createBoosterForecast();f.reached=true;f.fuel=work.state.vehicle.propellantMass;f.rangeError=0;
 f.handoff={x:0,height:100,vx:0,vy:-20,time:10,lateralFeasible:true};
 j.stage='validate';j.selected={originTime:s.world.environmentTime,burnDuration:10,shutdownAt:s.world.environmentTime+10,coastPitch:rad(0),forecast:f};j.rollout=work;
 advanceBoosterPrediction(s,1/120,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
 console.log('accepted plan',!!s.autopilot.boosterReturnPlan);
}
