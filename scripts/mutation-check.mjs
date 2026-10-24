/** Twenty-one real source faults, green original control, named assertion evidence. */
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,symlink,mkdir,readdir,lstat,copyFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {runOwnedCommand,verifyNoOwnedProcesses} from './bench/owned-command.mjs';
const ROOT=resolve(import.meta.dirname,'..'),SELECTION=['tests/core','tests/golden','tests/reference','tests/proofs'];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(process.version,'v22.23.3');assert.equal(process.platform,'linux');assert.equal(process.env.NODE_OPTIONS??'','');assert.equal(process.env.NODE_PATH??'','');
// COPY_BEGIN
async function materialize(source,target){
 assert.equal(source,ROOT);const started=performance.now();let files=0,bytes=0;
 const check=()=>assert(performance.now()-started<20000,'Materialization20s work bound');
 async function copy(path,out,depth){check();assert(depth<=32);const stat=await lstat(path);assert(!stat.isSymbolicLink());
  if(stat.isDirectory()){await mkdir(out,{recursive:true});for(const name of(await readdir(path)).sort())await copy(join(path,name),join(out,name),depth+1);}
  else{assert(stat.isFile());files++;bytes+=stat.size;assert(files<=12000&&stat.size<=67108864&&bytes<=268435456);check();await copyFile(path,out);check();assert.equal(digest(await readFile(path)),digest(await readFile(out)));}
 }
 for(const name of ['src','tests','scripts'])await copy(join(source,name),join(target,name),0);
 for(const name of(await readdir(source)).sort())if(name==='package.json'||name==='package-lock.json'||name==='.nvmrc'||/^tsconfig.*\.json$/.test(name)||/config\.[cm]?[jt]s$/.test(name))await copy(join(source,name),join(target,name),0);
 await symlink(join(source,'node_modules'),join(target,'node_modules'),'dir');check();
 await writeFile(join(target,'.mutation-materialization.json'),JSON.stringify({files,bytes,elapsedMs:performance.now()-started,roots:['src','tests','scripts'],nodeModules:'installed dependencies only; no native runtime selected'})+'\n',{flag:'wx'});
}
// COPY_END
// CLASSIFIER_BEGIN
function classifyOutcome(raw,report,life,dir,baseline){
 assert.equal(raw.failure,null);assert.equal(raw.exit.signal,null);assert.equal(raw.closed,true);assert.equal(raw.finished,true);assert.equal(raw.cleanup.executing.length,0);
 assert.deepEqual(life.unhandledErrors,[]);assert(Array.isArray(life.inventory)&&life.inventory.length>0);assert(Array.isArray(life.modules));
 const names=life.inventory.map(t=>({file:t.file.slice(dir.length+1),name:t.fullName,options:t.options})).sort((a,b)=>(a.file+a.name).localeCompare(b.file+b.name));
 assert.equal(new Set(life.inventory.map(t=>t.file+'\0'+t.fullName)).size,life.inventory.length);assert(life.inventory.every(t=>t.file.startsWith(dir+'/')));assert.equal(new Set(life.modules.map(t=>t.file)).size,life.modules.length);assert.deepEqual(report.testResults.map(t=>t.name).sort(),life.modules.map(t=>t.file).sort());
 const byName=new Map(life.inventory.map(t=>[t.file+'\0'+t.fullName,t])),jsonNames=[];
 for(const module of life.modules){assert.equal(module.project,'unit');assert(['passed','failed','skipped'].includes(module.state));assert.deepEqual(module.errors,[]);for(const suite of module.suites){assert(['passed','failed','skipped'].includes(suite.state));assert.deepEqual(suite.errors,[]);assert(!suite.options?.retry&&!suite.options?.repeats&&!suite.options?.fails&&!suite.options?.only&&suite.options?.mode!=='only');}}
 for(const test of life.inventory){assert.equal(test.project,'unit');assert(!test.options.retry&&!test.options.repeats&&!test.options.fails&&!test.options.only&&test.options.mode!=='only');assert(test.result);assert(['passed','failed','skipped'].includes(test.result.state));
  if(test.result.state!=='failed')assert.deepEqual(test.result.errors??[],[]);
  if(test.result.state!=='skipped'||test.diagnostic!==undefined){assert(test.diagnostic);assert.equal(test.diagnostic.retryCount,0);assert.equal(test.diagnostic.repeatCount,0);assert.equal(test.diagnostic.flaky,false);}
 }
 for(const file of report.testResults){const module=life.modules.find(t=>t.file===file.name);assert(module);assert.equal(file.status,module.state==='failed'?'failed':'passed');assert.equal(file.message??'','');
  for(const row of file.assertionResults){assert(Array.isArray(row.ancestorTitles)&&row.ancestorTitles.every(s=>typeof s==='string'));assert.equal(typeof row.title,'string');assert.equal(row.fullName,[...row.ancestorTitles,row.title].join(' '));
   const name=[...row.ancestorTitles,row.title].join(' > '),key=file.name+'\0'+name,test=byName.get(key);assert(test);assert(['passed','failed','skipped'].includes(row.status));assert.equal(row.status,test.result.state);if(row.status!=='failed')assert.deepEqual(row.failureMessages,[]);else assert(row.failureMessages.length>0);jsonNames.push(key);
  }
 }
 assert.equal(new Set(jsonNames).size,jsonNames.length);assert.deepEqual(jsonNames.sort(),[...byName.keys()].sort());
 const failed=life.inventory.filter(t=>t.result.state==='failed'),passed=life.inventory.filter(t=>t.result.state==='passed'),skipped=life.inventory.filter(t=>t.result.state==='skipped');
 assert.equal(report.numTotalTests,life.inventory.length);assert.equal(report.numPassedTests,passed.length);assert.equal(report.numFailedTests,failed.length);assert.equal(report.numPendingTests,skipped.length);assert.equal(report.numTodoTests,0);assert.equal(report.success,failed.length===0);
 if(!baseline){assert.equal(raw.exit.code,0);assert.equal(life.reason,'passed');assert.equal(failed.length,0);return{names,outcomes:life.inventory.map(t=>({key:t.file+'\0'+t.fullName,state:t.result.state})).sort((a,b)=>a.key.localeCompare(b.key)),failed:[]};}
 assert.deepEqual(names,baseline.names);for(const prior of baseline.outcomes){const now=byName.get(prior.key).result.state;assert(prior.state==='skipped'?now==='skipped':now!=='skipped','No new omitted detector');}
 assert.equal(raw.exit.code,1);assert.equal(life.reason,'failed');assert(failed.length>0);for(const test of failed){assert(Array.isArray(test.result.errors)&&test.result.errors.length>0);for(const error of test.result.errors)assert.equal(error.name,'AssertionError','Only named real assertion faults count; timeout/runtime/import faults are ERROR');}
 return{names,failed:failed.map(t=>({file:t.file.slice(dir.length+1),fullName:t.fullName,errors:t.result.errors}))};
}
// CLASSIFIER_END
// COMPLETION_BEGIN
function matrixCompleted(records,ids,bad,restored,ownershipError){return bad===0&&restored&&ownershipError===null&&records.length===22&&records[0].id==='control'&&records[0].status==='PASS'&&records.slice(1).every((row,index)=>row.id===ids[index]&&row.status==='CAUGHT');}
// COMPLETION_END
if(process.argv[2]==='--materialize'){
 assert.equal(process.argv.length,5);await materialize(process.argv[3],process.argv[4]);
}else{
 assert(process.argv.length===2||(process.argv.length===3&&process.argv[2]==='--control-only'));const controlOnly=process.argv[2]==='--control-only';
 const mutations=JSON.parse(await readFile(join(ROOT,'tests/mutations.json'),'utf8'));assert.equal(mutations.length,21);assert.equal(new Set(mutations.map(m=>m.id)).size,21);
 const dir=await mkdtemp(join(tmpdir(),'starship-mutation-')),receipt=join(dir,'.mutation-receipts');await mkdir(receipt,{mode:0o700});
 const records=[];let baseline=null,bad=0,sourceRestored=true;
 const env={...process.env};for(const key of Object.keys(env))if(key.startsWith('NATIVE_FLIGHT_')||['GOLDEN_PREVIEW','NODE_V8_COVERAGE'].includes(key))delete env[key];
 async function runSuite(id){
  const sub=join(receipt,id);await mkdir(sub,{mode:0o700});const json=join(sub,'vitest.json'),lifecyclePath=join(sub,'lifecycle.json');let code=null,commandError=null;
  try{code=await runOwnedCommand({name:'tests',root:dir,receipt:sub,args:[join(dir,'node_modules/vitest/vitest.mjs'),'run','--reporter=json','--reporter='+join(dir,'scripts/test/lifecycle-reporter.mjs'),'--outputFile.json='+json,...SELECTION],env:{...env,NATIVE_FLIGHT_LIFECYCLE:lifecyclePath},deadlineMs:300000});}catch(error){commandError=String(error.stack??error);}
  const raw=JSON.parse(await readFile(join(sub,'tests.process.json'),'utf8'));await writeFile(join(sub,'raw-outcome.json'),JSON.stringify({code,commandError,raw})+'\n',{flag:'wx'});assert.equal(commandError,null);assert.equal(code,raw.exit.code);
  const report=JSON.parse(await readFile(json,'utf8')),life=JSON.parse(await readFile(lifecyclePath,'utf8')),verdict=classifyOutcome(raw,report,life,dir,baseline);if(!baseline){assert(verdict.outcomes.some(row=>row.state==='passed'),'Actual unmodified control must execute detectors');baseline=verdict;}
  return{code,rawExit:raw.exit,publicReason:life.reason,total:life.inventory.length,failed:verdict.failed,lifecyclePath,json};
 }
 try{
  const preparationCode=await runOwnedCommand({name:'materialization',root:ROOT,receipt,args:[process.argv[1],'--materialize',ROOT,dir],env,deadlineMs:30000});const prepRaw=JSON.parse(await readFile(join(receipt,'materialization.process.json'),'utf8'));await writeFile(join(receipt,'materialization-outcome.json'),JSON.stringify({preparationCode,prepRaw})+'\n',{flag:'wx'});assert.equal(preparationCode,0);assert.equal(prepRaw.exit.code,0);assert.equal(prepRaw.exit.signal,null);assert.equal(prepRaw.failure,null);assert.equal(prepRaw.closed,true);assert.equal(prepRaw.finished,true);assert.equal(prepRaw.cleanup.executing.length,0);assert(verifyNoOwnedProcesses().every(row=>row.executing.length===0));
  records.push({id:'control',status:'PASS',result:await runSuite('control')});
  for(const m of(controlOnly?[]:mutations)){const path=join(dir,m.file),original=await readFile(path,'utf8');let record={id:m.id,status:'ERROR',before:digest(original)};
   try{assert.equal(original.split(m.find).length-1,1);const changed=original.split(m.find).join(m.replace);await writeFile(path,changed);record.mutated=digest(changed);record={...record,status:'CAUGHT',result:await runSuite(m.id)};}
   catch(error){record.error=String(error.stack??error);bad++;}
   finally{try{await writeFile(path,original);assert.equal(digest(await readFile(path)),record.before);}catch(error){sourceRestored=false;record={...record,status:'ERROR',restoreError:String(error.stack??error)};bad++;}records.push(record);await writeFile(join(receipt,m.id+'.result.json'),JSON.stringify(record)+'\n',{flag:'wx'});}
   if(record.status==='ERROR')break;
  }
 }catch(error){bad++;records.push({id:baseline?'matrix':'control',status:'ERROR',error:String(error.stack??error)});}
 finally{
  let ownershipError=null;try{assert(verifyNoOwnedProcesses().every(row=>row.executing.length===0));}catch(error){ownershipError=String(error.stack??error);bad++;}
  const completed=matrixCompleted(records,mutations.map(m=>m.id),bad,sourceRestored,ownershipError),controlPassed=records.length>=1&&records[0].id==='control'&&records[0].status==='PASS'&&baseline?.outcomes.some(row=>row.state==='passed')===true;
  await writeFile(join(receipt,'matrix-result.json'),JSON.stringify({kind:'repository21-named-assertion-mutation-result-v1',completed,controlOnly,controlPassed,records,ownershipError,workingCopy:dir,sourceRestored,defaultNamedTimeoutUnchanged:true,eachOwnedCommandBoundMs:300000})+'\n',{flag:'wx'});console.log('Mutation receipt: '+join(receipt,'matrix-result.json'));process.exitCode=(controlOnly?controlPassed&&records.length===1&&bad===0&&sourceRestored&&ownershipError===null:completed)?0:1;
 }
}
