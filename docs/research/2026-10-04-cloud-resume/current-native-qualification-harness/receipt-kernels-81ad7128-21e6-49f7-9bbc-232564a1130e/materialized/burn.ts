/** Separate burn semantic preflight; native plain/counter versus trusted SSR. */
import {deepStrictEqual,strictEqual,ok} from 'node:assert';
import {Script,constants} from 'node:vm';
import {pathToFileURL} from 'node:url';
import {writeFileSync,appendFileSync,readFileSync} from 'node:fs';
import * as ssr from './entry.ts';
import {SHIP} from '$core/vehicle';
import {SUPER_HEAVY} from '$core/vehicles/super-heavy';
import {createScenarioState,getScenario} from '$core/scenarios';
import {cloneState} from '$core/state';
import type {VehicleDefinition} from '$core/vehicle';
const nativeImport=new Script('url => import(url)',{importModuleDynamically:constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInThisContext();
const plain:typeof ssr=await nativeImport(pathToFileURL('/workspace/StarShipSimulator/docs/research/2026-10-04-cloud-resume/current-native-qualification-harness/receipt-kernels-81ad7128-21e6-49f7-9bbc-232564a1130e/plain/entry.mjs').href);
const counted:typeof ssr&{resetCounts():void;readCounts():{isa:number;controls:number}}=await nativeImport(pathToFileURL('/workspace/StarShipSimulator/docs/research/2026-10-04-cloud-resume/current-native-qualification-harness/receipt-kernels-81ad7128-21e6-49f7-9bbc-232564a1130e/counted/entry.mjs').href);
const backends=[ssr,plain,counted];
const sources=backends.map(api=>api.createScenarioState(api.getScenario('reentry')!));
const befores=sources.map((source,i)=>backends[i]!.cloneState(source));
type Args=[number,number,number,number,VehicleDefinition?,number?];
const outcome=(run:()=>unknown)=>{try{return {value:run(),error:null};}catch(e){return {value:null,error:{name:(e as Error).name,message:(e as Error).message}};}};
const inventory=JSON.parse(readFileSync('/workspace/StarShipSimulator/docs/research/2026-10-04-cloud-resume/current-native-qualification-harness/burn-2300-inventory.json','utf8'));strictEqual(inventory.length,2300);
let calls=0,errors=0,capped=0;
function seed(api:typeof ssr){const s=api.createBurnScratch();
 const i=backends.indexOf(api);s.fallWork.state=sources[i]!;s.fallWork.model=(api as typeof ssr).SHIP;s.fallWork.pitch=-0 as never;s.fallWork.result.time=-0;
 Object.assign(s.inputs,{pitch:-0,thrustAcceleration:NaN,fixedThrustAcceleration:Infinity});
 s.acc.x=-0;s.acc.y=NaN;s.atmosphere.airDensity=-0;s.duration=123.5;s.capped=true;return s;}
function compare(args:Args,scratch=backends.map(seed)){
 const literal=(value:number)=>Object.is(value,-0)?'-0':String(value);
 const exactArgumentLiterals=[...args.slice(0,4),...(args.length>5?[args[5]]:[])].map(value=>literal(value as number));
 const exactModelRole=args[4]===SUPER_HEAVY?'SUPER_HEAVY':!args[4]||args[4]===SHIP?'SHIP':args[4].propulsion===null?'custom:null-propulsion':'custom:null-sea-level';
 deepStrictEqual(exactArgumentLiterals,inventory[calls].exactArgumentLiterals);strictEqual(exactModelRole,inventory[calls].exactModelRole);
 appendFileSync('/workspace/StarShipSimulator/docs/research/2026-10-04-cloud-resume/current-native-qualification-harness/receipt-kernels-81ad7128-21e6-49f7-9bbc-232564a1130e/burn-paid-cases.ndjson',JSON.stringify({id:inventory[calls].id,exactArgumentLiterals,exactModelRole})+'\n');
 const results=backends.map((api,i)=>{let model=args[4];
  if(model===SHIP)model=(api as typeof ssr).SHIP;else if(model===SUPER_HEAVY)model=(api as typeof ssr).SUPER_HEAVY;
  else if(model){const base=(api as typeof ssr).SHIP;model={...base,propulsion: model.propulsion===null?null:{...base.propulsion,seaLevel:model.propulsion.seaLevel}} as VehicleDefinition;}
  return outcome(()=>api.landingBurnStartAltitude(args[0],args[1],args[2],args[3],scratch[i]!,model,args[5]));});
 deepStrictEqual(results[1],results[0]);deepStrictEqual(results[2],results[0]);
 deepStrictEqual(scratch[1],scratch[0]);deepStrictEqual(scratch[2],scratch[0]);
 for(let i=0;i<backends.length;i++){deepStrictEqual(sources[i],befores[i]);strictEqual(scratch[i]!.fallWork.state,scratch[0]!.fallWork.state===null?null:sources[i]);strictEqual(scratch[i]!.fallWork.model,(backends[i] as typeof ssr).SHIP);}
 calls++;if(results[0]!.error)errors++;if(scratch[0]!.capped)capped++;
 return {result:results[0]!,scratch:scratch[0]!};
}
// Exact original benchmark warm/run inputs and reuse pattern, WITHOUT timers.
const reused=backends.map(api=>api.createBurnScratch());
for(let i=0;i<200;i++)compare([3,140000,61,25],reused);
for(let i=0;i<2000;i++)compare([3,140000,61+(i%10)*.1,25],reused);
const benchmarkCalls=calls;
// Curated independent branch/domain sweeps; no randomized or regenerated oracle.
for(const model of [SHIP,SUPER_HEAVY]){
 const base:Args=[3,Math.max(140000,model.dryMass+50000),61,model.height/2,model];
 const domains=[[-Infinity,-1,-0,0,1,3,Infinity,NaN],[-Infinity,-1,-0,0,model.dryMass-1,model.dryMass,model.dryMass+1,base[1],Infinity,NaN],[-Infinity,-1,-0,0,Number.MIN_VALUE,61,61.9,3000,4000,Infinity,NaN],[-Infinity,-0,0,25,5509,60000,Infinity,NaN]];
 for(let key=0;key<4;key++)for(const value of domains[key]!){const args=[...base] as Args;args[key]=value;compare(args);}
 for(const floor of [-Infinity,-1,-0,0,model.dryMass,base[1],base[1]+1,Infinity,NaN])compare([...base,floor] as Args);
}
const causeReceipt='/workspace/StarShipSimulator/docs/research/2026-10-04-cloud-resume/current-native-qualification-harness/receipt-kernels-81ad7128-21e6-49f7-9bbc-232564a1130e/burn-causes.ndjson';
function record(id:string,witness:ReturnType<typeof compare>,isa:number|null){
 const row={id,nullCause:witness.result.value===null?(witness.scratch.capped?'cap-flag-true':'non-cap-null; exact return branch unobserved'):'not-null',outcome:witness.result,capped:witness.scratch.capped,duration:String(witness.scratch.duration),isa};
 appendFileSync(causeReceipt,JSON.stringify(row)+'\n');console.log(JSON.stringify(row));
}
for(const [id,args] of [
 ['one-engine-225t-high-touchdown',[1,225000,300,5509,SHIP]],
 ['one-engine-thin-air-3kms',[1,130000,3000,60000,SHIP]],
 ['three-engine-200t-4kms',[3,200000,4000,25,SHIP]],
] as [string,Args][]){const witness=compare(args);record(id,witness,null);strictEqual(witness.result.value,null);}
// Independently source-backed branch controls use pristine scratch, never a retained cap flag.
for(const [id,args,branch] of [
 ['no-engine-zero-query',[0,140000,61,25,SHIP],'zero'],
 ['dry-mass-fuel-insufficient',[3,120000,61,25,SHIP],'fuel'],
 ['thin-air-real-1200-step-cap',[1,130000,3000,60000,SHIP],'cap'],
] as [string,Args,string][]){
 counted.resetCounts();const witness=compare(args,backends.map(api=>api.createBurnScratch()));
 const queries=counted.readCounts().isa;record(id,witness,queries);strictEqual(witness.result.value,null);
 if(branch==='zero'){strictEqual(queries,0);strictEqual(witness.scratch.capped,false);}
 if(branch==='fuel'){ok(queries>0);strictEqual(queries,48);strictEqual(witness.scratch.capped,false);}
 if(branch==='cap'){strictEqual(queries,2400);strictEqual(witness.scratch.capped,true);}
}
for(const bad of [{...SHIP,propulsion:null},{...SHIP,propulsion:{...SHIP.propulsion,seaLevel:null}}]){
 const witness=compare([3,140000,61,25,bad as unknown as VehicleDefinition]);ok(witness.result.error);
}
strictEqual(ssr.BURN_STEP_CAP,1200);strictEqual(plain.BURN_STEP_CAP,1200);strictEqual(counted.BURN_STEP_CAP,1200);
strictEqual(calls,2300);strictEqual(benchmarkCalls,2200);ok(errors>=2);
// Three additional nonvacuous current-domain witnesses, outside preserved2300 inventory.
for(const kind of ['prepared-super','ship-fallback','custom-fallback']){
 counted.resetCounts();const nativeModel=kind==='prepared-super'?(counted as typeof ssr).SUPER_HEAVY:kind==='ship-fallback'?(counted as typeof ssr).SHIP:{...(counted as typeof ssr).SUPER_HEAVY};
 const nativeScratch=counted.createBurnScratch();
 const value=counted.landingBurnStartAltitude(3,nativeModel.dryMass+50000,61,25,nativeScratch,nativeModel);
 const plainModel=kind==='prepared-super'?(plain as typeof ssr).SUPER_HEAVY:kind==='ship-fallback'?(plain as typeof ssr).SHIP:{...(plain as typeof ssr).SUPER_HEAVY};
 const plainScratch=plain.createBurnScratch();deepStrictEqual(value,plain.landingBurnStartAltitude(3,plainModel.dryMass+50000,61,25,plainScratch,plainModel));deepStrictEqual(nativeScratch,plainScratch);
 const count=counted.readCounts() as {prepared:number;fallback:number};
 if(kind==='prepared-super'){ok(count.prepared>0);strictEqual(count.fallback,0);}else{strictEqual(count.prepared,0);ok(count.fallback>0);}
 appendFileSync('/workspace/StarShipSimulator/docs/research/2026-10-04-cloud-resume/current-native-qualification-harness/receipt-kernels-81ad7128-21e6-49f7-9bbc-232564a1130e/admission.ndjson',JSON.stringify({kind,value,counts:count})+'\n');
}

writeFileSync('/workspace/StarShipSimulator/docs/research/2026-10-04-cloud-resume/current-native-qualification-harness/receipt-kernels-81ad7128-21e6-49f7-9bbc-232564a1130e/burn-proof-result.json',JSON.stringify({status:'pass',backendCallsEach:calls,benchmarkInputCallsEach:benchmarkCalls,
 domainCallsEach:calls-benchmarkCalls,exceptionsEach:errors,cappedOrRetainedCapEach:capped,
 comparison:'Exact outcomes/errors and full BurnScratch via deepStrictEqual; trusted SSR/plain/passive-counter native ESM; source unchanged',timing:'No timers or performance acceptance'},null,2)+'\n');
console.log(JSON.stringify({status:'pass',callsEach:calls,benchmarkCallsEach:benchmarkCalls,errorsEach:errors}));

