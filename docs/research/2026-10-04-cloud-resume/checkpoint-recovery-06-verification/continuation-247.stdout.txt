import {mkdirSync,mkdtempSync,writeFileSync,readFileSync,rmSync,existsSync,readdirSync} from 'node:fs';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {runOwnedCommand,verifyNoOwnedProcesses} from './bench/owned-command.mjs';
import assert from 'node:assert/strict';
import {sourceSnapshot,digestFile,loadNativeGuidance,verifyArtifact,installedToolSnapshot} from './bench/native-loader.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
const cache=resolve(root,'node_modules/.cache/starship-bench');mkdirSync(cache,{recursive:true});
const receipt=mkdtempSync(resolve(cache,'invocation-'));const invocation=randomUUID();
let before=null,nodeBinary=null,installedTools=null;
let stage='preflight',status=0,native=null;const temporary=[];
console.log(`Benchmark receipt: ${receipt}`);
function save(name,value){writeFileSync(resolve(receipt,name),JSON.stringify(value,null,2)+'\n');}
async function command(name,args,env=process.env){
 const code=await runOwnedCommand({name,args,env,root,receipt});save(`${name}.exit.json`,{code,ownedExecuting:0});
 process.stdout.write(readFileSync(resolve(receipt,`${name}.stdout.txt`)));process.stderr.write(readFileSync(resolve(receipt,`${name}.stderr.txt`)));return code;
}
function keysFromReport(report){return report.testResults.flatMap(file=>file.assertionResults.map(test=>({
 key:`${relative(root,file.name)}\0${[...test.ancestorTitles,test.title].join(' > ')}`,status:test.status,})));}
const originalNames=[
 ['tests/core/guidance-physics.timing.test.ts','landingBurnStartAltitude cost > stays under 0.2 ms a call at the flip trigger'],
 ['tests/core/guidance-physics.timing.test.ts','unpoweredFallInto cost > stays under 1 ms a call on a long descending arc under the entry interface'],
 ['tests/core/guidance-physics.timing.test.ts','unpoweredFallInto worst case > stays inside the 2 ms HUD budget when a climb runs it to its cap'],
 ['tests/app/recorder.timing.test.ts','the recorder stays out of the simulation, timed > a long recording does not slow the step down'],
 ['tests/view/perf.timing.test.ts','simulation step budget > a step costs well under 1 ms, the 240 Hz budget'],
 ['tests/view/perf.timing.test.ts','simulation step budget > 240 Hz of simulation fits in well under a second of wall clock'],
 ['tests/view/perf.timing.test.ts','simulation step budget > the autopilot does not dominate the step'],
 ['tests/view/perf.timing.test.ts','time warp stays affordable > warp 16 costs about sixteen steps, not more'],
 ['tests/view/perf.timing.test.ts','M9 emitters and textures, timed > costs a measurable and small fraction of the frame, banded or not'],
 ['tests/view/perf.timing.test.ts',"M9 emitters and textures, timed > generating every texture M9 added is a mount cost, not a frame cost"],
 ['tests/hud/binder.timing.test.ts','the 2 ms budget > an update costs a small fraction of 2 ms, even when every readout changes'],
 ['tests/hud/binder.timing.test.ts','the 2 ms budget > all FOUR binders together still fit it, on the finished overlay'],
].map(([file,name])=>`${file}\0${name}`);
try{
 before=sourceSnapshot(root);nodeBinary=digestFile(process.execPath);installedTools=installedToolSnapshot(root);
 save('source-before.json',before);save('installed-tools-before.json',installedTools);save('runtime.json',{version:process.version,versions:process.versions,platform:process.platform,arch:process.arch,nodeBinary,invocation});
 assert.equal(process.versions.node,'22.23.3');assert.equal(process.platform,'linux');assert.equal(process.arch,'x64');
 stage='owned-command-positive-controls';assert.equal(await command('owner-controls',['scripts/bench/owned-command-controls.mjs',root,receipt]),0);
 stage='app-build';const npmCli=process.env.npm_execpath;assert(npmCli&&existsSync(npmCli),'Use npm run bench with an installed npm CLI');const npmDigest=digestFile(npmCli);save('npm.json',{path:npmCli,digest:npmDigest});
 assert.equal(await command('app-build',[npmCli,'run','build']),0,'Current app build failed');
 assert.deepEqual(sourceSnapshot(root),before);assert.deepEqual(installedToolSnapshot(root),installedTools,'Installed tools changed during app build');
 stage='fresh-native-build';temporary.push(resolve(receipt,'native-entry.ts'));
 assert.equal(await command('native-build',['scripts/bench/build-native-guidance.mjs',root,receipt,invocation]),0,'Fresh native build failed');
 native=JSON.parse(readFileSync(resolve(receipt,'native-build-result.json'),'utf8'));verifyArtifact(native.manifestPath,native.digest,invocation);
 assert.equal(digestFile(npmCli),npmDigest,'npm binary changed');
 stage='digest-positive-controls';
 await assert.rejects(()=>loadNativeGuidance(native.manifestPath,'0'.repeat(64),invocation),/Missing\/wrong\/stale manifest digest/);
 const original=JSON.parse(readFileSync(native.manifestPath,'utf8'));
 const wrongSource=resolve(receipt,'wrong-source-manifest.json');save('wrong-source-manifest.json',{...original,source:{...original.source,'src/core/control/guidance-physics.ts':'0'.repeat(64)}});
 await assert.rejects(()=>loadNativeGuidance(wrongSource,digestFile(wrongSource),invocation),/Current source inventory\/digests changed/);
 const wrongArtifact=resolve(receipt,'wrong-artifact-manifest.json');save('wrong-artifact-manifest.json',{...original,files:{...original.files,'entry.mjs':'0'.repeat(64)}});
 await assert.rejects(()=>loadNativeGuidance(wrongArtifact,digestFile(wrongArtifact),invocation),/Artifact inventory\/digests changed/);
 const missing=resolve(receipt,'missing-artifact-manifest.json');save('missing-artifact-manifest.json',{...original,directory:resolve(receipt,'absent-artifact')});
 await assert.rejects(()=>loadNativeGuidance(missing,digestFile(missing),invocation),/ENOENT/);
 save('positive-controls.json',{wrongManifest:'rejected before import',wrongSource:'rejected before import',wrongArtifact:'rejected before import',missingArtifact:'rejected before import'});
 const env={...process.env,STARSHIP_NATIVE_BENCH_MANIFEST:native.manifestPath,STARSHIP_NATIVE_BENCH_DIGEST:native.digest,STARSHIP_NATIVE_BENCH_INVOCATION:invocation,STARSHIP_NATIVE_BENCH_RECEIPT:receipt};
 const baseURL=pathToFileURL(resolve(root,'vitest.config.ts')).href;
 const bridge=resolve(root,'tests/support/native-guidance-benchmark.ts');
 const specs=[{lane:'native-guidance',include:['tests/core/guidance-physics.timing.test.ts'],exclude:[],native:true},
 {lane:'original-ssr',include:['tests/**/*.timing.test.ts'],exclude:['tests/core/guidance-physics.timing.test.ts'],native:false}];
 const collected=[];
 for(const spec of specs){
  const config=resolve(receipt,`${spec.lane}.config.mts`);temporary.push(config);spec.config=config;
  writeFileSync(config,`import {defineConfig,configDefaults} from 'vitest/config';\nimport base from ${JSON.stringify(baseURL)};\nconst aliases=Object.entries(base.resolve?.alias??{}).map(([find,replacement])=>({find,replacement}));\nexport default defineConfig({resolve:{...base.resolve,alias:${spec.native?`[{find:/^\\$core\\/control\\/guidance-physics$/,replacement:${JSON.stringify(bridge)}},...aliases]`:'aliases'}},test:{environment:'node',include:${JSON.stringify(spec.include)},exclude:[...configDefaults.exclude,...${JSON.stringify(spec.exclude)}],testTimeout:30000,maxWorkers:1,fileParallelism:false}});\n`);
  stage=`collect-${spec.lane}`;const list=resolve(receipt,`${spec.lane}.collection.json`);
  assert.equal(await command(`${spec.lane}-collection`,['node_modules/vitest/vitest.mjs','list','--config',config,'--json',list],{...env,STARSHIP_NATIVE_BENCH_STAGE:`collection-${spec.lane}`}),0);
  spec.collected=JSON.parse(readFileSync(list,'utf8')).map(test=>`${relative(root,test.file)}\0${test.name}`);
  collected.push(...spec.collected);assert(spec.collected.length>0,'Empty timing lane');
 }
 assert.equal(new Set(collected).size,collected.length,'Duplicate timing collection');for(const key of originalNames)assert(collected.includes(key),`Missing original timing case ${key}`);
 save('collection-inventory.json',specs.map(spec=>({lane:spec.lane,tests:spec.collected})));
 const results=[];
 // Run both lanes once even when one has an ordinary assertion failure.
 for(const spec of specs){stage=`run-${spec.lane}`;const report=resolve(receipt,`${spec.lane}.report.json`);
  const code=await command(spec.lane,['node_modules/vitest/vitest.mjs','run','--config',spec.config,'--reporter=default','--reporter=json',`--outputFile.json=${report}`],{...env,STARSHIP_NATIVE_BENCH_STAGE:`run-${spec.lane}`});
  results.push({lane:spec.lane,code,report,collected:spec.collected});if(code!==0)status=1;
 }
 stage='inventory-and-integrity';const markers=readdirSync(receipt).filter(name=>name.startsWith('bridge-run-native-guidance-'));assert.equal(markers.length,1,'Native bridge was not imported exactly once for the timing file');
 const provenance=JSON.parse(readFileSync(resolve(receipt,markers[0]),'utf8'));assert.equal(provenance.invocation,invocation);assert.equal(provenance.digest,native.digest);assert(Object.values(provenance.referenceIdentity).every(value=>value===true));
 assert(!readdirSync(receipt).some(name=>name.startsWith('bridge-run-original-ssr-')),'Native bridge leaked into original SSR lane');const all=[];
 for(const result of results){assert(existsSync(result.report),'Lane terminated without report');const rows=keysFromReport(JSON.parse(readFileSync(result.report,'utf8')));
  assert.deepEqual(rows.map(row=>row.key).sort(),result.collected.slice().sort(),'Omitted/duplicate/added execution case');
  assert(rows.every(row=>row.status==='passed'||row.status==='failed'),'Unexpected skipped/pending case');all.push(...rows.map(row=>({...row,lane:result.lane})));
 }
 assert.equal(new Set(all.map(row=>row.key)).size,all.length);save('test-inventory.json',all);verifyArtifact(native.manifestPath,native.digest,invocation);
}catch(error){status=1;save('failure.json',{stage,message:error.message,stack:error.stack});console.error(error);}
finally{
 try{assert(before&&nodeBinary,'Verification unavailable: preflight source/binary snapshot incomplete');const after=sourceSnapshot(root);save('source-after.json',after);assert.deepEqual(after,before);assert.equal(digestFile(process.execPath),nodeBinary);
  if(native)verifyArtifact(native.manifestPath,native.digest,invocation);const afterTools=installedToolSnapshot(root);save('installed-tools-after.json',afterTools);assert.deepEqual(afterTools,installedTools);save('owned-process-final.json',verifyNoOwnedProcesses());save('integrity.json',{source:'exact',node:'exact',artifact:native?'exact':'not-qualified'});
 }catch(error){status=70;save('integrity.json',{status:'invalid',message:error.message});}
 for(const path of temporary){try{rmSync(path,{force:true});}catch(error){status=70;save('cleanup-failure.json',{path,message:error.message});}}
 save('final.json',{status,stage,classification:'Two explicit timing lanes; no backend fallback; original test bodies/counts/bounds retained'});process.exitCode=status;
}
