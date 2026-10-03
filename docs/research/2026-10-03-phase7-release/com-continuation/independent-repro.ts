import {isDeepStrictEqual} from 'node:util';
import {createHotStageMission,stepMission,bodyMassPose} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/mission.ts';
import {advanceMissionMechanics,stepMissionBody} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/mission-free-flight.ts';
import {cloneState} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/state.ts';
import {SUPER_HEAVY,CATCH} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/vehicles/super-heavy.ts';
import {SHIP} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/vehicle.ts';
import {runBoosterPolicy} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/autopilot/booster.ts';
import {rad} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/units.ts';
import * as C from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/constants.ts';
import {tangentialAcceleration,verticalGravityAcceleration} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/physics/gravity.ts';
const dt=1/120;
let m=createHotStageMission(123);m.aggregate.kinematics.angularVelocity=.1;
for(const k of [m.aggregate.kinematics,m.booster.kinematics,m.ship.kinematics]){k.altitude+=1e9;k.distanceToPlanetCenter=C.planetRadius+k.altitude;}
for(let i=0;i<240 && m.phase==='attached';i++)m=stepMission(m,dt,{stage:true});
for(const s of [m.ship,m.booster]){s.engines.running.fill(false);s.engines.ignitionCountdown.fill(null);s.forces.rcsThrust=0;}
let maxPos=0,maxVel=0;
for(let i=0;i<120;i++){
 const n=stepMission(m,dt);
 for(const [id,model] of [['ship',SHIP],['booster',SUPER_HEAVY]] as const){
  const b=bodyMassPose(m[id],model),a=bodyMassPose(n[id],model);
  const ax=tangentialAcceleration(C.planetRadius+b.altitude,b.speedX,b.speedY),ay=verticalGravityAcceleration(C.planetRadius+b.altitude,b.speedX);
  const x=b.x+b.speedX*dt+.5*ax*dt*dt,y=b.altitude+b.speedY*dt+.5*ay*dt*dt;
  const ax1=tangentialAcceleration(C.planetRadius+y,b.speedX+ax*dt,b.speedY+ay*dt),ay1=verticalGravityAcceleration(C.planetRadius+y,b.speedX+ax*dt);
  maxPos=Math.max(maxPos,Math.abs(a.x-x),Math.abs(a.altitude-y));maxVel=Math.max(maxVel,Math.abs(a.speedX-(b.speedX+.5*(ax+ax1)*dt)),Math.abs(a.speedY-(b.speedY+.5*(ay+ay1)*dt)));
 }
 m=n;
}
console.log({rotating120ticksMaxPositionError:maxPos,maxVelocityError:maxVel});
const s=cloneState(m.booster);s.autopilot.autoLandOn=true;
const live=stepMissionBody(s,dt,{},SUPER_HEAVY),future=advanceMissionMechanics(s,dt,runBoosterPolicy,SUPER_HEAVY);
const fields=['world','kinematics','engines','vehicle','rng','forces','failures','status'];
console.log('live/replay physical fields exact',fields.every(f=>isDeepStrictEqual(live[f],future[f])));
stepMissionBody(m.ship,dt,{},SHIP);
console.log('interleaved replay deterministic',isDeepStrictEqual(future,advanceMissionMechanics(s,dt,runBoosterPolicy,SUPER_HEAVY)));
for(const pitch of [Math.PI/180,-Math.PI/180]){
const c=cloneState(m.booster),k=c.kinematics;k.pitch=rad(pitch);k.angularVelocity=.01;k.angularAcceleration=0;
k.altitude=CATCH.planeAltitude-29.5*Math.cos(pitch)+.001;k.distanceToPlanetCenter=C.planetRadius+k.altitude;
k.downRangeDistance=C.starBaseXPos-29.5*Math.sin(pitch);k.speedX=-29.5*k.angularVelocity*Math.cos(pitch);k.speedY=-2+29.5*k.angularVelocity*Math.sin(pitch);
c.autopilot.autoLandOn=false;c.status.onTheGround=false;
const n=stepMissionBody(c,dt,{},SUPER_HEAVY);
console.log('rotating tilted catch',pitch,n.status.landed,n.status.onTheGround,n.kinematics.altitude+29.5*Math.cos(n.kinematics.pitch));
}
for(const [model,body] of [[SHIP,m.ship],[SUPER_HEAVY,m.booster]] as const){
 const s=cloneState(body),k=s.kinematics;k.altitude=model.height/2;k.distanceToPlanetCenter=C.planetRadius+k.altitude;k.pitch=rad(0);k.angularVelocity=k.angularAcceleration=0;k.speedX=k.speedY=0;s.status.onTheGround=true;s.status.landed=false;s.autopilot.autoLandOn=false;
 const next=stepMissionBody(s,dt,{},model);console.log('resting ground',model.id,next.kinematics.altitude,next.kinematics.speedY,next.status.onTheGround);
}
