import admission from '../../../tests/fixtures/booster-terminal-admission.json';
import {cloneState,type SimState} from '../../../src/core/state';
import {advanceMechanics} from '../../../src/core/step';
import {SUPER_HEAVY} from '../../../src/core/vehicles/super-heavy';
import {rad} from '../../../src/core/units';
for(const pitch of [-.15,0,.15]){
 const s=cloneState(admission.state as unknown as SimState);s.kinematics.pitch=rad(pitch);
 s.kinematics.angularVelocity=0;s.vehicle.gimbalPosition=0;s.vehicle.throttle=s.vehicle.throttleCurrent=80;
 const n=advanceMechanics(s,1/120,()=>{},SUPER_HEAVY);
 console.log(JSON.stringify({pitch,ax:n.kinematics.accelerationX,ay:n.kinematics.accelerationY,lift:n.forces.aerodynamicLift,thrust:n.forces.thrust}));
}
