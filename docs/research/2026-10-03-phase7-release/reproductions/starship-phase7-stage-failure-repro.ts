import {createHotStageMission,stepMission} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/mission.ts';
let m=createHotStageMission(123);m.booster.engines.failed[0]=true;
for(let i=0;i<360;i++)m=stepMission(m,1/120,{stage:true});
console.log({phase:m.phase,stagingFailed:m.stagingFailed,shipThrust:m.ship.forces.thrust,centralFailure:m.booster.engines.failed.slice(0,3),centralRunning:m.booster.engines.running.slice(0,3)});
