import {step as beforeStep} from '/tmp/starship-phase7-preference-baseline/core/step.ts';
import {step as afterStep} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/step.ts';
import {GOLDEN_SPECS} from '/Users/stevewang/dev/StarShipSimulator-realism/tests/golden/scenarios.ts';
import {boosterSpecs,boosterSample} from '/Users/stevewang/dev/StarShipSimulator-realism/tests/golden/booster-record.ts';
import {flattenState} from '/Users/stevewang/dev/StarShipSimulator-realism/tests/golden/record.ts';
import {SHIP} from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/vehicle.ts';
const results=[];
for(const spec of [...GOLDEN_SPECS.map(s=>({...s,build:()=>({state:s.build(),vehicle:SHIP}),sample:flattenState})),...boosterSpecs.map(s=>({...s,sample:boosterSample}))]) {
 const x=spec.build();let a=x.state,b=structuredClone(a);let leaves=0;
 if(a.failures.randomFailure)throw new Error('Unexpected preference '+spec.id);
 for(let tick=0;tick<=spec.steps;tick++) {
  if(tick%60===0){const aa=spec.sample(a),bb=spec.sample(b);for(const key of new Set([...Object.keys(aa),...Object.keys(bb)])){leaves++;if(!Object.is(aa[key],bb[key]))throw new Error(`${spec.id} tick${tick} ${key}: ${aa[key]} vs${bb[key]}`);}}
  if(tick<spec.steps){a=beforeStep(a,1/120,{},x.vehicle);b=afterStep(b,1/120,{},x.vehicle);}
 }
 results.push({scenario:spec.id,comparedLeaves:leaves,changedLeaves:0,maxAbsoluteDifference:0});
}
console.log(JSON.stringify({base:'3047632',results},null,2));
