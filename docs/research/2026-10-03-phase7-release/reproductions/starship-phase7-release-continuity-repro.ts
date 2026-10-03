import { createHotStageMission, stepMission, bodyMassPose } from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/mission.ts';
import { SUPER_HEAVY } from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/vehicles/super-heavy.ts';
import { SHIP } from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/vehicle.ts';
import { planetRadius } from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/constants.ts';
let m = createHotStageMission(123); m.aggregate.kinematics.angularVelocity=.1;
for(const k of [m.aggregate.kinematics,m.ship.kinematics,m.booster.kinematics]) { k.altitude+=1e12;k.distanceToPlanetCenter=planetRadius+k.altitude; }
for(let i=0;i<240 && m.phase==='attached';i++) m=stepMission(m,1/120,{stage:true});
console.log('release',m.phase,'omega',m.aggregate.kinematics.angularVelocity);
for(const s of [m.ship,m.booster]){s.engines.running.fill(false);s.engines.ignitionCountdown.fill(null);}
const n=stepMission(m,1/120);
for(const [body,model] of [['ship',SHIP],['booster',SUPER_HEAVY]] as const){
const b=bodyMassPose(m[body],model),a=bodyMassPose(n[body],model);
console.log(body,'declared mass-COM vx',b.speedX,'geometric reconstructed mass-COM vx',(a.x-b.x)*120,'error',(a.x-b.x)*120-b.speedX);
}
