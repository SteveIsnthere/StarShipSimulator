/** Research-only dispatcher: each stage needs its own exclusive parent grant. No retries. */
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,existsSync,readdirSync,rmSync} from 'node:fs';
import {resolve,relative,dirname,isAbsolute} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {sourceSnapshot,installedToolSnapshot,digestFile} from '/workspace/StarShipSimulator/scripts/bench/native-loader.mjs';
import {runOwnedCommand,verifyNoOwnedProcesses} from '/workspace/StarShipSimulator/docs/research/2026-10-04-cloud-resume/current-native-qualification-harness/owned-launch-YzmAG0dg/owned-command.mjs';
const root=process.cwd(),draft=resolve('docs/research/2026-10-04-cloud-resume/current-native-qualification-harness');
const [mode,prior]=process.argv.slice(2);assert(['kernels','paired','cost'].includes(mode));
const nonce=randomUUID(),receipt=resolve(draft,`receipt-${mode}-${nonce}`);mkdirSync(receipt);
const task=resolve(receipt,'materialized');
const artifacts=resolve(receipt,'artifact-pins.json');
const expected={
 'src/core/control/guidance-physics.ts':'40e6cf54f12442acd7c069ffc36bcdb94b6ed316b470e5e72edebf8c2fa423d1',
 'src/core/physics/propulsion.ts':'972087e8c71b8a92694bcbc6e97da1a370027c34baf2a177e82da86d22d7e90a',
 'src/core/physics/aero.ts':'535c23fa889c2014a58a89e196acf386b8ff4ea79ced32ee6555f195f3306713'};
let inputs=null,before=null,npmExec=null,stage='receipt-created';let inheritedEvidence={};
function snapshot(){
 for(const [p,h]of Object.entries(inputs))assert.equal(digestFile(resolve(root,p)),h,p);
 for(const [p,h]of Object.entries(expected))assert.equal(digestFile(resolve(root,p)),h,p);
 return {source:sourceSnapshot(root),installed:installedToolSnapshot(root),node:digestFile(process.execPath),inputs,
  inputManifest:digestFile(resolve(draft,'input-pins.json')),review:digestFile(resolve(draft,'independent-review.md')),reviewPins:digestFile(resolve(draft,'independent-review-pins.json'))};
}

const materialized=[];const expectedMaterialized={};let compiledPins={};
function register(path){assert(!Object.hasOwn(expectedMaterialized,path));materialized.push(path);expectedMaterialized[path]=digestFile(path);}
function verifyExecuted(){for(const [p,h]of Object.entries({...expectedMaterialized,...compiledPins}))assert.equal(digestFile(p),h,p);}
const storageCap=512*1024*1024;
function storageBytes(path){let total=0;for(const entry of readdirSync(path,{withFileTypes:true})){const p=resolve(path,entry.name);total+=entry.isDirectory()?storageBytes(p):readFileSync(p).length;if(total>storageCap)throw new Error('research artifact storage cap512MiB');}return total;}

function render(name,replacements={}){
 let text=readFileSync(resolve(draft,`${name}.txt`),'utf8');
 for(const [token,value]of Object.entries(replacements)){assert(text.includes(token),token);text=text.split(token).join(value);}
 assert(!/[A-Z_]+_PLACEHOLDER/.test(text),'unresolved materialization placeholder');
 const path=resolve(task,name);assert(!existsSync(path));writeFileSync(path,text);register(path);return path;
}
function files(path){return readdirSync(path,{withFileTypes:true}).flatMap(entry=>{assert(entry.isDirectory()||entry.isFile(),'unexpected receipt symlink/special file');return entry.isDirectory()?files(resolve(path,entry.name)):[resolve(path,entry.name)];}).sort();}
function pinMaterialized(){verifyExecuted();const pins={...expectedMaterialized};writeFileSync(resolve(receipt,'materialized-before.json'),JSON.stringify(pins,null,2)+'\n');return pins;}
async function command(name,args,deadlineMs=300000){
 stage=name;verifyExecuted();const commandStarted=performance.now();const code=await runOwnedCommand({name,args,root,receipt,env:{...process.env},deadlineMs});
 writeFileSync(resolve(receipt,`${name}.exit.json`),JSON.stringify({code,wholeOwnedCommandWallMs:performance.now()-commandStarted,scope:'entire child command plus bounded owned cleanup; includes import/setup/driver and output lifecycle'})+'\n');verifyExecuted();assert.equal(code,0,`${name} failed`);assert(storageBytes(receipt)<=storageCap);
}
function verifyCompleteKernel(origin,pins){
 const complete=['plain','counted'].flatMap(kind=>files(resolve(origin,kind))).sort();
 assert.deepEqual(Object.keys(pins).sort(),complete,'complete exact emitted plain/counted inventory');
 assert(Object.hasOwn(pins,resolve(origin,'plain/entry.mjs')),'actual loaded native entry is absent');
 assert(Object.hasOwn(pins,resolve(origin,'counted/entry.mjs')),'counter entry is absent');
 for(const [p,h]of Object.entries(pins))assert.equal(digestFile(p),h,p);
}
function verifyEvidence(receiptPath,digest){
 const evidencePath=resolve(receiptPath,'evidence-manifest.json');assert.equal(digestFile(evidencePath),digest,'review-bound evidence manifest');
 const evidence=JSON.parse(readFileSync(evidencePath,'utf8'));assert.equal(evidence.receipt,receiptPath);
 const actual=files(receiptPath).filter(p=>p!==evidencePath);
 const own=Object.keys(evidence.files).filter(p=>p.startsWith(receiptPath+'/')).sort();assert.deepEqual(own,actual,'complete receipt evidence inventory');
 for(const [p,h]of Object.entries(evidence.files))assert.equal(digestFile(p),h,p);
 return {...evidence.files,[evidencePath]:digest};
}
function acceptedPrior(previous,expectedMode){
 const acceptancePath=process.env.STARSHIP_CURRENT_NATIVE_PRIOR_ACCEPTANCE;
 assert(acceptancePath&&isAbsolute(acceptancePath),'parent reviewed prior acceptance path required');
 assert.equal(digestFile(acceptancePath),process.env.STARSHIP_CURRENT_NATIVE_PRIOR_ACCEPTANCE_SHA,'exact independent prior-result approval digest');
 const accepted=JSON.parse(readFileSync(acceptancePath,'utf8'));
 assert(accepted.accepted===true&&accepted.receipt===previous&&accepted.mode===expectedMode,'accepted exact prior result required');
 assert.equal(digestFile(resolve(previous,'finalized.json')),accepted.finalizedDigest);
 const evidence=verifyEvidence(previous,accepted.evidenceDigest);
 const validation=JSON.parse(readFileSync(resolve(previous,'finalized.json'),'utf8'));assert(validation.finalized&&validation.status==='pass'&&validation.mode===expectedMode);
 const origin=accepted.kernelReceipt;assert(isAbsolute(origin),'reviewed kernel receipt required');
 if(expectedMode==='kernels')assert.equal(origin,previous);else assert.equal(origin,JSON.parse(readFileSync(resolve(previous,'prior.json'),'utf8')).kernelReceipt,'exact reviewed kernel ancestor');
 assert.equal(digestFile(resolve(origin,'finalized.json')),accepted.kernelFinalizedDigest);
 const kernelEvidence=verifyEvidence(origin,accepted.kernelEvidenceDigest);
 const kernelStatus=JSON.parse(readFileSync(resolve(origin,'finalized.json'),'utf8'));assert(kernelStatus.finalized&&kernelStatus.status==='pass'&&kernelStatus.mode==='kernels');
 const pins=JSON.parse(readFileSync(resolve(origin,'artifact-pins.json'),'utf8'));verifyCompleteKernel(origin,pins);
 assert.deepEqual(JSON.parse(readFileSync(resolve(origin,'source-after.json'),'utf8')),before,'reviewed kernel exact source/compiler lineage');
 inheritedEvidence={...evidence,...kernelEvidence,[acceptancePath]:digestFile(acceptancePath)};
 compiledPins={...inheritedEvidence};
 return {origin,pins};
}
let finalStatus=1;let failure=null;let materializedPins=null;
try{
 stage='preflight';mkdirSync(task);register(resolve(process.argv[1]));register(resolve(dirname(process.argv[1]),'owned-command.mjs'));
 assert.equal(process.version,'v22.23.3');assert.equal(process.platform,'linux');
 assert.equal(process.env.STARSHIP_CPU_SLOT_GRANTED,`current-native-${mode}`);
 assert.equal(process.env.STARSHIP_CURRENT_NATIVE_REVIEW_SHA,digestFile(resolve(draft,'independent-review.md')),'exact reviewed harness required');
 npmExec=process.env.npm_execpath;assert(npmExec&&isAbsolute(npmExec)&&existsSync(npmExec),'activation-resolved npm executable required; no fallback');
 const reviewPinsPath=resolve(draft,'independent-review-pins.json');
 assert.equal(digestFile(reviewPinsPath),process.env.STARSHIP_CURRENT_NATIVE_REVIEW_PINS_SHA,'exact independently reviewed input manifest');
 const reviewPins=JSON.parse(readFileSync(reviewPinsPath,'utf8'));
 assert.equal(reviewPins.review,process.env.STARSHIP_CURRENT_NATIVE_REVIEW_SHA);
 assert.equal(reviewPins.inputManifest,digestFile(resolve(draft,'input-pins.json')));
 const expectedOuter=readFileSync(resolve(draft,'launcher.mjs.txt'),'utf8')
  .split(['NATIVE','LOADER','PLACEHOLDER'].join('_')).join(resolve(root,'scripts/bench/native-loader.mjs'))
  .split(['OWNED','COMMAND','PLACEHOLDER'].join('_')).join(resolve(dirname(process.argv[1]),'owned-command.mjs'));
 assert.equal(readFileSync(process.argv[1],'utf8'),expectedOuter,'exact executed launcher materialization');
 assert.equal(digestFile(resolve(dirname(process.argv[1]),'owned-command.mjs')),digestFile(resolve(draft,'owned-command.mjs.txt')));
 inputs=JSON.parse(readFileSync(resolve(draft,'input-pins.json'),'utf8'));
 before=snapshot();writeFileSync(resolve(receipt,'source-before.json'),JSON.stringify(before,null,2)+'\n');

 if(mode==='kernels'){
  await command('app-build',[npmExec,'run','build']);
  const oracle=resolve('tests/proofs/fixtures/unpowered-fall-original.ts');
  const plain=render('entry.ts',{ORIGINAL_ORACLE_PLACEHOLDER:oracle});
  const counted=resolve(task,'counted-entry.ts');writeFileSync(counted,readFileSync(plain,'utf8')+"export {resetCounts,readCounts} from 'fall-proof-counters';\n");register(counted);
  const builder=render('builder.mjs');pinMaterialized();await command('native-build',[builder,receipt,plain,counted]);
  compiledPins=Object.fromEntries(['plain','counted'].flatMap(kind=>files(resolve(receipt,kind))).map(path=>[path,digestFile(path)]));
  verifyCompleteKernel(receipt,compiledPins);writeFileSync(artifacts,JSON.stringify(compiledPins,null,2)+'\n');
  const plainPath=resolve(receipt,'plain/entry.mjs'),counterPath=resolve(receipt,'counted/entry.mjs');
  const adapter=render('fall-adapter.ts',{PLAIN_ENTRY_PLACEHOLDER:plainPath,COUNTED_ENTRY_PLACEHOLDER:counterPath});
  const research=resolve(draft,'..');const specs=[];
  for(const kind of ['preparation','continuation','boundary']){
   const source=resolve(research,`fall-bundle-${kind}-proof.test.ts.txt`);let text=readFileSync(source,'utf8');
   text=text.split('ADAPTER_PLACEHOLDER').join(relative(task,adapter));
   text=text.replace(/(['"])(\.\.\/\.\.\/\.\.\/tests\/[^'"]+)\1/g,(_m,q,p)=>q+resolve(research,p)+q);
   const path=resolve(task,`${kind}.test.ts`);writeFileSync(path,text);register(path);specs.push(path);
  }
  specs.push(resolve('tests/proofs/unpowered-fall-preparation.test.ts'),resolve('tests/core/fall-continuation.test.ts'),resolve('tests/proofs/acceleration-components.test.ts'));
  const config=resolve(task,'fall.config.mts');writeFileSync(config,`import {defineConfig} from 'vitest/config';\nimport base from ${JSON.stringify(resolve('vitest.config.ts'))};\nexport default defineConfig({resolve:base.resolve??{},test:{environment:'node',maxWorkers:1,testTimeout:30000,include:${JSON.stringify(specs)},reporters:['default','json'],outputFile:${JSON.stringify(resolve(receipt,'fall-report.json'))}}});\n`);register(config);
  const burn=render('burn.ts',{SSR_ENTRY_PLACEHOLDER:'entry.ts',PLAIN_ENTRY_PLACEHOLDER:plainPath,COUNTED_ENTRY_PLACEHOLDER:counterPath,RECEIPT_PLACEHOLDER:receipt,BURN_INVENTORY_PLACEHOLDER:resolve(draft,'burn-2300-inventory.json')});
  materializedPins=pinMaterialized();
  await command('fall-76',[resolve('node_modules/vitest/vitest.mjs'),'run','--config',config]);
  const fallReport=JSON.parse(readFileSync(resolve(receipt,'fall-report.json'),'utf8'));assert.equal(fallReport.numTotalTests,76);assert.equal(fallReport.numPassedTests,76);assert.equal(fallReport.numFailedTests,0);
  const inventory=JSON.parse(readFileSync(resolve(draft,'fall-76-inventory.json'),'utf8'));
  const actual=fallReport.testResults.flatMap(s=>s.assertionResults.map(a=>a.title)).sort();assert.deepEqual(actual,inventory.map(c=>c.name).sort(),'literal76 name inventory');
  await command('burn-2300',[resolve('node_modules/vite-node/dist/cli.mjs'),'--script',burn]);
  const result=JSON.parse(readFileSync(resolve(receipt,'burn-proof-result.json'),'utf8'));assert.equal(result.status,'pass');assert.equal(result.backendCallsEach,2300);
  verifyExecuted();
 }else{
  assert(prior,'prior kernel/paired receipt required');const previous=resolve(prior);
  const {origin,pins}=acceptedPrior(previous,mode==='paired'?'kernels':'paired');
  assert.deepEqual(JSON.parse(readFileSync(resolve(previous,'source-after.json'),'utf8')),before,'prior exact source/compiler lineage');
  const nativeEntry=resolve(origin,'plain/entry.mjs');
  const entry=render('entry.ts',{ORIGINAL_ORACLE_PLACEHOLDER:resolve('tests/proofs/fixtures/unpowered-fall-original.ts')});
  const helper=render('graph-oracle.ts');
  const flight=render('full-flight.ts',{GRAPH_ORACLE_PLACEHOLDER:relative(task,helper),SSR_ENTRY_PLACEHOLDER:relative(task,entry)});
  writeFileSync(resolve(receipt,'prior.json'),JSON.stringify({prior:previous,kernelReceipt:origin})+'\n');
  writeFileSync(artifacts,JSON.stringify(pins,null,2)+'\n');
  if(mode==='cost'){const copy=resolve(receipt,'paired-flight.json');writeFileSync(copy,readFileSync(resolve(previous,'paired-flight.json')));register(copy);}
  materializedPins=pinMaterialized();await command(`${mode}-flight`,[resolve('node_modules/vite-node/dist/cli.mjs'),'--script',flight,mode,nativeEntry,receipt],mode==='paired'?900000:120000);
 }
 verifyExecuted();assert(storageBytes(receipt)<=storageCap);
 assert.deepEqual(snapshot(),before,'source/tool before/after mismatch');
 if(materializedPins)for(const [p,h]of Object.entries(materializedPins))assert.equal(digestFile(p),h,p);
 finalStatus=0;
}catch(error){failure=String(error.stack??error).slice(0,32768);}
finally{
 let cleanup;try{cleanup=verifyNoOwnedProcesses();}catch(error){finalStatus=1;failure??=String(error.stack??error).slice(0,32768);}
 try{assert(inputs&&before,'preflight incomplete; source verification unavailable');const after=snapshot();writeFileSync(resolve(receipt,'source-after.json'),JSON.stringify(after,null,2)+'\n');assert.deepEqual(after,before);verifyExecuted();assert(storageBytes(receipt)<=storageCap);}catch(error){finalStatus=1;failure??=String(error.stack??error).slice(0,32768);writeFileSync(resolve(receipt,'source-verification.json'),JSON.stringify({status:'unavailable-or-failed',beforeAvailable:Boolean(before),message:String(error.message).slice(0,8192)})+'\n');}
 writeFileSync(resolve(receipt,'owned-cleanup.json'),JSON.stringify(cleanup??{unverified:true},null,2)+'\n');
 // Retain executed materialization with exact pins; no deletion masks actual driver lineage.
 writeFileSync(resolve(receipt,'finalized.json'),JSON.stringify({finalized:true,status:finalStatus===0?'pass':'failed',mode,nonce,receipt,stage,failure,acceptance:'research only'},null,2)+'\n');
 const evidenceFiles={...inheritedEvidence,...expectedMaterialized,...Object.fromEntries(files(receipt).map(p=>[p,digestFile(p)]))};
 writeFileSync(resolve(receipt,'evidence-manifest.json'),JSON.stringify({receipt,mode,files:evidenceFiles},null,2)+'\n');
 console.log(receipt);process.exitCode=finalStatus;
}
