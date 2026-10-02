import {createScenarioState,getScenario} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/scenarios';
import {step} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/step';
import {fieldsFromPreset,fieldsToPreset} from '/Users/stevewang/dev/StarShipSimulator-realism/src/app/menu';
import {MAX_Q_FIELDS,MAX_Q_PRESET} from '/Users/stevewang/dev/StarShipSimulator-realism/tests/e2e/shake-subject';
const p=getScenario(MAX_Q_PRESET)!;
let s=createScenarioState(fieldsToPreset({...fieldsFromPreset(p),...MAX_Q_FIELDS},p),1);
for(let i=0;i<=720;i++){
if(i%120===0) console.log(JSON.stringify({t:i/120,pitch:s.kinematics.pitch*180/Math.PI,omega:s.kinematics.angularVelocity*180/Math.PI,alpha:s.kinematics.angleOfAttack*180/Math.PI,q:s.forces.dynamicPressure,vy:s.kinematics.speedY,front:s.forces.frontFinDragAngularAcceleration,aft:s.forces.aftFinDragAngularAcceleration,rcs:s.forces.rcsThrustAcceleration,finfront:s.forces.frontFinEffectiveAreaFraction,finaft:s.forces.aftFinEffectiveAreaFraction}));
s=step(s,1/120);
}
