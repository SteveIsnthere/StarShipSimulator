import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,relative,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {sourceSnapshot,installedToolSnapshot,digestFile,filesUnder} from '../../../scripts/bench/native-loader.mjs';
import {runOwnedCommand,verifyNoOwnedProcesses} from '../../../scripts/bench/owned-command.mjs';

const root='/workspace/StarShipSimulator';
process.chdir(root);
const receipt=resolve(root,'docs/research/2026-10-04-cloud-resume/current-render-build-qualification');
assert(!existsSync(receipt),'Immutable qualification already exists');
mkdirSync(receipt);
const save=(name,value)=>writeFileSync(resolve(receipt,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const sha=value=>createHash('sha256').update(value).digest('hex');
const npmCli=resolve('/workspace/cloud-bootstrap/starship-v1/node/lib/node_modules/npm/bin/npm-cli.js');
const env={...process.env,npm_execpath:npmCli};
let source,tools,githubBefore,currentSource,qualification,status=1;
const finalErrors=[];
const harnessPath=new URL(import.meta.url),harnessDigest=digestFile(harnessPath);
const nodeDigest=digestFile(process.execPath),npmDigest=digestFile(npmCli);
const githubSnapshot=()=>filesUnder(resolve(root,'.github')).map(p=>[relative(root,p),digestFile(p)]);
try {
  assert.equal(process.versions.node,'22.23.3');
  assert.equal(process.platform,'linux');assert.equal(process.arch,'x64');
  source=sourceSnapshot(root);tools=installedToolSnapshot(root,npmCli);githubBefore=githubSnapshot();
  save('source-before.json',source);save('installed-tools-before.json',tools);
  save('github-before.json',githubBefore);
  save('runtime.json',{node:process.version,nodePath:process.execPath,nodeSha256:digestFile(process.execPath),npmCli,npmSha256:digestFile(npmCli),harnessSha256:digestFile(new URL(import.meta.url))});
  const oldBytes=readFileSync('/tmp/starship-fullchrome-worker.VB1uzYO9/setup-receipt.json');
  assert.equal(sha(oldBytes),'9a0d1d12414b0c251db98ef5bca3fd996b2a5c327600f2abfcef847be5a37e1f');
  const old=JSON.parse(oldBytes);
  assert.equal(process.execPath,old.nodeExecutable);assert.equal(process.version,old.nodeVersion);assert.equal(digestFile(process.execPath),old.nodeExecutableSha256);
  const listed=execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{encoding:'utf8'}).split('\0').filter(p=>/^(src\/|tests\/|scripts\/|public\/|\.agents\/|\.nvmrc$|package[^/]*\.json$|[^/]*config\.[^/]+$)/.test(p)).sort();
  currentSource=listed.map(p=>[p,existsSync(p)?digestFile(p):null]);
  const retained=p=>p.startsWith('src/view/')||p.startsWith('src/ui/')||p.startsWith('src/app/')||p.startsWith('public/');
  assert.deepEqual(currentSource.filter(([p])=>retained(p)),old.sourceManifest.filter(([p])=>retained(p)),'Qualified renderer/app/assets changed');
  const currentMap=new Map(currentSource),approvedCore=new Set(['src/core/control/guidance-physics.ts','src/core/physics/propulsion.ts','src/core/physics/aero.ts']);
  const oldMap=new Map(old.sourceManifest);
  const appPaths=[...new Set([...oldMap.keys(),...currentMap.keys()])].filter(p=>p.startsWith('src/')||p.startsWith('public/')).sort();
  const appDelta=appPaths.filter(p=>currentMap.get(p)!==oldMap.get(p)).map(p=>({path:p,before:oldMap.get(p)??null,after:currentMap.get(p)??null}));
  assert.equal(appDelta.length,3);assert(appDelta.every(d=>approvedCore.has(d.path)));
  for(const [p,h] of githubBefore)assert.equal(sha(execFileSync('git',['show',`${old.gitHead}:${p}`])),h,'CI changed from historical qualification');
  save('source-delta.json',{historicalReceiptSha256:sha(oldBytes),historicalHead:old.gitHead,appDelta,unchangedRendererAppAssetCount:currentSource.filter(([p])=>retained(p)).length});
  const checks='docs/research/2026-10-04-cloud-resume/burn-preparation-initial-checks/';
  const results=JSON.parse(readFileSync(checks+'test-results.json','utf8'));
  assert.equal(results.numTotalTests,92);assert.equal(results.numPassedTests,92);assert.equal(results.numFailedTests,0);assert(results.success);
  assert.equal(JSON.parse(readFileSync(checks+'tests-exit.json','utf8')).code,0);
  assert.equal(JSON.parse(readFileSync(checks+'build-exit.json','utf8')).code,0);
  const proven=JSON.parse(readFileSync(checks+'source-after.json','utf8'));
  assert.deepEqual(proven,JSON.parse(readFileSync(checks+'source-before.json','utf8')));
  for(const [p,h] of Object.entries(proven))assert.equal(digestFile(p),h,'Focused proof source drift');
  const full=JSON.parse(readFileSync('docs/research/2026-10-04-cloud-resume/non-golden-prepared-burn/parent-result.json','utf8'));
  assert.equal(full.actualChildReturnCode,1);assert.equal(full.files,247);
  const fullResults=JSON.parse(readFileSync('docs/research/2026-10-04-cloud-resume/non-golden-prepared-burn/results.json','utf8'));
  assert.equal(fullResults.numPassedTests,2652);assert.equal(fullResults.numFailedTests,2);assert.equal(fullResults.numPendingTests,1);assert.equal(fullResults.success,false);
  save('declaration.json',{oneBuild:true,reason:'Complete current source/tool/dist/map provenance for reviewed shader attribution',focusedTestsPassed:92,completeUnitCohort:full,originalRendererAppAssetsUnchanged:true});
  const code=await runOwnedCommand({name:'build',args:[npmCli,'run','build'],env,root,receipt,deadlineMs:120000});
  save('build-status.json',{actualChildReturnCode:code});assert.equal(code,0);
  assert.deepEqual(sourceSnapshot(root),source);assert.deepEqual(installedToolSnapshot(root,npmCli),tools);
  const afterListed=execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{encoding:'utf8'}).split('\0').filter(p=>/^(src\/|tests\/|scripts\/|public\/|\.agents\/|\.nvmrc$|package[^/]*\.json$|[^/]*config\.[^/]+$)/.test(p)).sort();
  assert.deepEqual(afterListed,listed);
  const after=afterListed.map(p=>[p,existsSync(p)?digestFile(p):null]);assert.deepEqual(after,currentSource);
  const buildFiles=[],mapFiles=[];
  for(const p of filesUnder(resolve(root,'dist')))(p.endsWith('.map')?mapFiles:buildFiles).push([relative(resolve(root,'dist'),p),digestFile(p)]);
  assert(mapFiles.length>0,'Configured source maps missing');
  for(const [p] of mapFiles){
    const map=JSON.parse(readFileSync(resolve(root,'dist',p),'utf8'));
    assert(Array.isArray(map.sources)&&Array.isArray(map.sourcesContent));assert.equal(map.sources.length,map.sourcesContent.length);
    for(let i=0;i<map.sources.length;i++){
      assert.equal(typeof map.sourcesContent[i],'string');assert(!map.sources[i].includes('://'));
      const original=resolve(dirname(resolve(root,'dist',p)),map.sourceRoot??'',map.sources[i]);
      assert.equal(readFileSync(original,'utf8'),map.sourcesContent[i],'Emitted map does not match current source');
    }
  }
  const proofPaths=['test-results.json','tests-exit.json','source-before.json','source-after.json','build-exit.json','build.txt','tests.txt'].map(p=>checks+p);
  const failedPaths=['parent-result.json','results.json','source-before.json','source-after.json'].map(p=>'docs/research/2026-10-04-cloud-resume/non-golden-prepared-burn/'+p);
  qualification={mode:'timer-query',methodFallback:false,historicalBrowserReceiptSha256:sha(oldBytes),sourceManifest:currentSource,sourceManifestSha256:sha(JSON.stringify(currentSource)),buildFiles,mapFiles,githubFiles:githubBefore,physicsProofs:proofPaths.map(path=>({path,sha256:digestFile(path),outcome:'passed'})),failedFullUnitReceipts:failedPaths.map(path=>({path,sha256:digestFile(path)})),completeUnitAcceptance:'FAILED: two original 30-second separation timeouts; never waived',buildReceipt:'current-render-build-qualification/build-status.json',appDelta};
  status=0;
} catch(error){save('failure.json',{message:error.message,stack:error.stack});}
finally {
  const audit=(name,fn)=>{try{fn();}catch(error){finalErrors.push({name,message:error.message});status=1;}};
  audit('ownership',()=>save('owned-processes.json',verifyNoOwnedProcesses()));
  audit('source',()=>{if(source){const after=sourceSnapshot(root);save('source-after.json',after);assert.deepEqual(after,source);}});
  audit('tools',()=>{if(tools){const after=installedToolSnapshot(root,npmCli);save('installed-tools-after.json',after);assert.deepEqual(after,tools);}});
  audit('github',()=>{if(githubBefore){const after=githubSnapshot();save('github-after.json',after);assert.deepEqual(after,githubBefore);}});
  audit('harness',()=>assert.equal(digestFile(harnessPath),harnessDigest));
  audit('runtime',()=>{assert.equal(digestFile(process.execPath),nodeDigest);assert.equal(digestFile(npmCli),npmDigest);});
  audit('full-source',()=>{if(currentSource)for(const [p,h] of currentSource)assert.equal(existsSync(p)?digestFile(p):null,h);});
  save('final-status.json',{status,finalErrors});
  if(status===0){qualification.buildEvidence=filesUnder(receipt).map(p=>({path:relative(root,p),sha256:digestFile(p)}));save('qualification.json',qualification);}
}
process.exitCode=status;
