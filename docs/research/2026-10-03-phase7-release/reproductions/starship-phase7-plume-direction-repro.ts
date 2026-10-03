import {createEmissiveBell} from '/Users/stevewang/dev/StarShipSimulator-realism/src/view/emissive-bell.ts';
import {createInitialState} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/state.ts';
import {SUPER_HEAVY} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/vehicles/super-heavy.ts';
import {getGimbalPointingDirection} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/physics/engines.ts';
import {rad} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/units.ts';
const s=createInitialState(123,SUPER_HEAVY);s.kinematics.pitch=rad(Math.PI/4);s.vehicle.gimbalPosition=0;s.vehicle.gimbalPointingDirection=getGimbalPointingDirection(s.kinematics.pitch,0);
s.engines.running[0]=s.engines.running[13]=true;s.forces.thrust=1;
const bell=createEmissiveBell(SUPER_HEAVY);bell.update(s,1,0,0,1/120);
console.log('hull pitch degrees',s.kinematics.pitch*180/Math.PI,'neutral inner plume degrees',bell.container.children[0].rotation*180/Math.PI,'fixed outer plume degrees',bell.container.children[13].rotation*180/Math.PI);bell.destroy();
