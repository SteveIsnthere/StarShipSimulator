/** Explicit composite-only paired consumer. Original green-kernel dispatcher remains untouched. */
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,relative,dirname,isAbsolute} from 'node:path';
import {randomUUID} from 'node:crypto';
import {sourceSnapshot,installedToolSnapshot,digestFile} from '/workspace/StarShipSimulator/scripts/bench/native-loader.mjs';
import {runOwnedCommand,verifyNoOwnedProcesses} from '/workspace/StarShipSimulator/docs/research/2026-10-04-cloud-resume/current-native-composite-paired-descendants/owned-launch-qEmDOnAe/owned-command.mjs';
import {auditCompletedFall} from '/workspace/StarShipSimulator/docs/research/2026-10-04-cloud-resume/current-native-composite-paired-descendants/owned-launch-qEmDOnAe/label-audit.mjs';
const root=process.cwd(),draft=resolve('docs/research/2026-10-04-cloud-resume/current-native-composite-paired-descendants');
const continuationDraft=resolve('docs/research/2026-10-04-cloud-resume/current-native-burn-continuation');
const originalDraft=resolve('docs/research/2026-10-04-cloud-resume/current-native-qualification-harness');
const original=resolve(originalDraft,'receipt-kernels-81ad7128-21e6-49f7-9bbc-232564a1130e');
const receipt=resolve(draft,`receipt-paired-${randomUUID()}`);mkdirSync(receipt);const task=resolve(receipt,'materialized');
let status=1,stage='receipt-created',failure=null,before=null,inputs=null,prior=null,acceptedReceipt=null,artifactPins={};
let previousPins={},ownPins={};const storageCap=512*1024*1024;
function files(path){return readdirSync(path,{withFileTypes:true}).flatMap(entry=>{assert(entry.isDirectory()||entry.isFile());return entry.isDirectory()?files(resolve(path,entry.name)):[resolve(path,entry.name)];}).sort();}
function register(path){assert(!Object.hasOwn(ownPins,path));ownPins[path]=digestFile(path);}
function verify(){for(const [p,h]of Object.entries({...previousPins,...ownPins}))assert.equal(digestFile(p),h,p);}
function evidence(receiptPath,expectedDigest){
 const manifest=resolve(receiptPath,'evidence-manifest.json');assert.equal(digestFile(manifest),expectedDigest);
 const result=JSON.parse(readFileSync(manifest,'utf8'));assert.equal(result.receipt,receiptPath);
 assert.deepEqual(Object.keys(result.files).filter(p=>p.startsWith(receiptPath+'/')).sort(),files(receiptPath).filter(p=>p!==manifest));
 for(const [p,h]of Object.entries(result.files))assert.equal(digestFile(p),h,p);
 return {...result.files,[manifest]:expectedDigest};
}
function snapshot(){
 for(const [p,h]of Object.entries(inputs))assert.equal(digestFile(resolve(root,p)),h,p);
 return {source:sourceSnapshot(root),installed:installedToolSnapshot(root),node:digestFile(process.execPath),inputs,
  inputManifest:digestFile(resolve(draft,'input-pins.json')),review:digestFile(resolve(draft,'independent-review.md')),reviewPins:digestFile(resolve(draft,'independent-review-pins.json'))};
}
function verifyGraph(){
 assert.deepEqual(Object.keys(artifactPins).sort(),['plain','counted'].flatMap(kind=>files(resolve(original,kind))).sort());
 for(const name of ['plain/entry.mjs','counted/entry.mjs'])assert(Object.hasOwn(artifactPins,resolve(original,name)));
 for(const [p,h]of Object.entries(artifactPins))assert.equal(digestFile(p),h,p);
}
function verifyCoreLineage(path){
 const pre=JSON.parse(readFileSync(resolve(path,'source-before.json'),'utf8')),post=JSON.parse(readFileSync(resolve(path,'source-after.json'),'utf8'));
 assert.deepEqual(pre,post);for(const key of ['source','installed','node'])assert.deepEqual(before[key],post[key],`${path}:${key}`);
}
function storage(){let total=0;for(const p of files(receipt)){total+=readFileSync(p).length;assert(total<=storageCap);}return total;}
function render(name,substitutions={}){
 let text=readFileSync(resolve(draft,`${name}.txt`),'utf8');for(const [token,value]of Object.entries(substitutions)){assert(text.includes(token));text=text.split(token).join(value);}
 assert(!/[A-Z_]+_PLACEHOLDER/.test(text));const path=resolve(task,name);writeFileSync(path,text);register(path);return path;
}
try{
 stage='preflight';mkdirSync(task);assert.equal(process.version,'v22.23.3');assert.equal(process.platform,'linux');
 assert.equal(process.env.STARSHIP_CPU_SLOT_GRANTED,'current-native-composite-paired-descendants');
 const review=resolve(draft,'independent-review.md'),reviewPinsPath=resolve(draft,'independent-review-pins.json');
 assert.equal(digestFile(review),process.env.STARSHIP_CURRENT_NATIVE_REVIEW_SHA);assert.equal(digestFile(reviewPinsPath),process.env.STARSHIP_CURRENT_NATIVE_REVIEW_PINS_SHA);
 const reviewPins=JSON.parse(readFileSync(reviewPinsPath,'utf8'));assert.equal(reviewPins.review,digestFile(review));assert.equal(reviewPins.inputManifest,digestFile(resolve(draft,'input-pins.json')));
 assert(process.env.npm_execpath&&isAbsolute(process.env.npm_execpath)&&existsSync(process.env.npm_execpath));
 const expectedOuter=readFileSync(resolve(draft,'launcher.mjs.txt'),'utf8')
  .split(['NATIVE','LOADER','PLACEHOLDER'].join('_')).join(resolve(root,'scripts/bench/native-loader.mjs'))
  .split(['OWNED','COMMAND','PLACEHOLDER'].join('_')).join(resolve(dirname(process.argv[1]),'owned-command.mjs'))
  .split(['LABEL','AUDIT','PLACEHOLDER'].join('_')).join(resolve(dirname(process.argv[1]),'label-audit.mjs'));
 assert.equal(readFileSync(process.argv[1],'utf8'),expectedOuter);
 for(const name of ['owned-command.mjs','label-audit.mjs'])assert.equal(digestFile(resolve(dirname(process.argv[1]),name)),digestFile(resolve(draft,`${name}.txt`)));
 for(const p of [process.argv[1],resolve(dirname(process.argv[1]),'owned-command.mjs'),resolve(dirname(process.argv[1]),'label-audit.mjs')])register(resolve(p));
 inputs=JSON.parse(readFileSync(resolve(draft,'input-pins.json'),'utf8'));before=snapshot();writeFileSync(resolve(receipt,'source-before.json'),JSON.stringify(before,null,2)+'\n');
 stage='accepted-composite';
 const approvalPath=process.env.STARSHIP_CURRENT_NATIVE_COMPOSITE_ACCEPTANCE;assert(approvalPath&&isAbsolute(approvalPath));
 assert.equal(digestFile(approvalPath),process.env.STARSHIP_CURRENT_NATIVE_COMPOSITE_ACCEPTANCE_SHA);
 const accepted=JSON.parse(readFileSync(approvalPath,'utf8'));assert.equal(accepted.accepted,true);assert.equal(accepted.kind,'accepted-current-native-kernels-composite-v1');assert.equal(accepted.mode,'kernels-composite');assert.equal(accepted.kernelOriginalFinalizedStatus,'failed');assert.equal(accepted.kernelReceipt,original);
 acceptedReceipt=accepted.receipt;assert(isAbsolute(acceptedReceipt)&&acceptedReceipt.startsWith(continuationDraft+'/receipt-burn-'));
 assert(!approvalPath.startsWith(acceptedReceipt+'/')&&!approvalPath.startsWith(original+'/'),'approval must stay outside immutable receipts');
 const finalizedPath=resolve(acceptedReceipt,'finalized.json'),compositePath=resolve(acceptedReceipt,'composite-kernel.json');
 assert.equal(digestFile(finalizedPath),accepted.finalizedDigest);assert.equal(digestFile(compositePath),accepted.compositeDigest);
 const finalized=JSON.parse(readFileSync(finalizedPath,'utf8'));assert(finalized.finalized&&finalized.status==='pass'&&finalized.mode==='burn-continuation');
 const composite=JSON.parse(readFileSync(compositePath,'utf8'));assert(composite.status==='pass'&&composite.kind==='current-native-kernels-composite-v1');
 for(const [a,b]of [[accepted.kernelFinalizedDigest,composite.completedOld.finalizedDigest],[accepted.kernelEvidenceDigest,composite.completedOld.evidenceDigest],[accepted.fallReportDigest,composite.completedOld.fallReportDigest],[accepted.labelCorrectionDigest,composite.labelCorrectionDigest],[accepted.labelAuditDigest,composite.labelAuditDigest],[accepted.burnResultDigest,composite.freshBurn.resultDigest],[accepted.paidCasesDigest,composite.freshBurn.paidCasesDigest],[accepted.branchWitnessDigest,composite.freshBurn.admissionDigest],[accepted.artifactInventoryDigest,composite.artifactInventoryDigest],[accepted.sourceLineageDigest,composite.sourceLineage]])assert.equal(a,b,'exact accepted composite field');
 assert.equal(digestFile(accepted.independentResultReview),accepted.independentResultReviewDigest);
 assert.equal(digestFile(accepted.independentResultReviewPins),accepted.independentResultReviewPinsDigest);
 assert.equal(composite.completedOld.receipt,original);assert.equal(composite.compiledOrigin,original);assert.equal(composite.completedOld.originalFinalizedStatus,'failed');
 const originalStatus=JSON.parse(readFileSync(resolve(original,'finalized.json'),'utf8'));assert(originalStatus.finalized&&originalStatus.status==='failed'&&originalStatus.stage==='fall-76');
 assert.equal(digestFile(resolve(original,'finalized.json')),composite.completedOld.finalizedDigest);
 assert.equal(digestFile(resolve(original,'fall-report.json')),composite.completedOld.fallReportDigest);
 assert.equal(digestFile(resolve(originalDraft,'kernel76-label-mismatch-independent-result-review.md')),composite.completedOld.independentResultReviewDigest);
 previousPins={...evidence(original,composite.completedOld.evidenceDigest),...evidence(acceptedReceipt,accepted.evidenceDigest),[approvalPath]:digestFile(approvalPath),[accepted.independentResultReview]:accepted.independentResultReviewDigest,[accepted.independentResultReviewPins]:accepted.independentResultReviewPinsDigest};
 verifyCoreLineage(original);verifyCoreLineage(acceptedReceipt);
 artifactPins=JSON.parse(readFileSync(resolve(original,'artifact-pins.json'),'utf8'));assert.equal(digestFile(resolve(original,'artifact-pins.json')),composite.artifactInventoryDigest);verifyGraph();
 assert.equal(composite.sourceLineage,digestFile(resolve(original,'source-after.json')));
 assert.equal(composite.labelCorrectionDigest,digestFile(resolve(continuationDraft,'fall-76-corrected-inventory.json')));
 assert.equal(composite.labelAuditDigest,digestFile(resolve(acceptedReceipt,'completed-fall-audit.json')));
 const offline=auditCompletedFall(original,JSON.parse(readFileSync(resolve(continuationDraft,'fall-76-corrected-inventory.json'),'utf8')));
 assert.deepEqual(offline,JSON.parse(readFileSync(resolve(acceptedReceipt,'completed-fall-audit.json'),'utf8')));
 assert.equal(composite.freshBurn.receipt,acceptedReceipt);
 for(const [name,field]of [['burn-proof-result.json','resultDigest'],['burn-paid-cases.ndjson','paidCasesDigest'],['admission.ndjson','admissionDigest']])assert.equal(digestFile(resolve(acceptedReceipt,name)),composite.freshBurn[field]);
 const burn=JSON.parse(readFileSync(resolve(acceptedReceipt,'burn-proof-result.json'),'utf8'));assert(burn.status==='pass'&&burn.backendCallsEach===2300&&burn.benchmarkInputCallsEach===2200&&burn.domainCallsEach===100);
 const paid=readFileSync(resolve(acceptedReceipt,'burn-paid-cases.ndjson'),'utf8').trim().split('\n').map(line=>JSON.parse(line));
 const recipes=JSON.parse(readFileSync(resolve(originalDraft,'burn-2300-inventory.json'),'utf8'));assert.equal(paid.length,2300);assert.deepEqual(paid,recipes.map(row=>({id:row.id,exactArgumentLiterals:row.exactArgumentLiterals,exactModelRole:row.exactModelRole})));
 const witnesses=readFileSync(resolve(acceptedReceipt,'admission.ndjson'),'utf8').trim().split('\n').map(line=>JSON.parse(line));assert.deepEqual(witnesses.map(row=>row.kind),['prepared-super','ship-fallback','custom-fallback']);
 for(const row of witnesses)if(row.kind==='prepared-super'){assert(row.counts.prepared>0);assert.equal(row.counts.fallback,0);}else{assert.equal(row.counts.prepared,0);assert(row.counts.fallback>0);}
 const burnProcess=JSON.parse(readFileSync(resolve(acceptedReceipt,'burn-2300.process.json'),'utf8'));assert.equal(burnProcess.exit.code,0);assert.equal(burnProcess.failure,null);assert.deepEqual(burnProcess.cleanup.executing,[]);
 prior={acceptedReceipt,approvalPath,approvalDigest:digestFile(approvalPath),compositeDigest:accepted.compositeDigest,originalCompiledOwner:original,originalStatus:'failed'};
 writeFileSync(resolve(receipt,'prior-composite.json'),JSON.stringify(prior,null,2)+'\n');writeFileSync(resolve(receipt,'artifact-pins.json'),JSON.stringify(artifactPins,null,2)+'\n');
 stage='accepted-control-and-failed-paired-lineage';
 const controlDraft=resolve(root,'docs/research/2026-10-04-cloud-resume/comparator-descendant-certificates');
 const controlPath=resolve(controlDraft,'accepted-controls.json');
 assert.equal(digestFile(controlPath),'557e74811919e5438a0dc18c4419bf4fa621e1812b9b4ceac11d47936a606a3f');
 const control=JSON.parse(readFileSync(controlPath,'utf8'));
 assert.equal(control.kind,'accepted-descendant-certificates-controls-v1');assert.equal(control.accepted,true);
 assert.equal(control.receipt,resolve(controlDraft,'receipt-controls-9a62a009-5818-402e-a3f1-4494cdddcc86'));
 assert(!controlPath.startsWith(control.receipt+'/'));
 for(const [file,field]of [['finalized.json','finalizedDigest'],['control-result.json','controlResultDigest'],['before-pins.json','beforePinsDigest'],['after-pins.json','afterPinsDigest']])assert.equal(digestFile(resolve(control.receipt,file)),control[field]);
 assert.equal(control.beforePinsDigest,control.afterPinsDigest);
 const controlFinal=JSON.parse(readFileSync(resolve(control.receipt,'finalized.json'),'utf8'));assert(controlFinal.finalized&&controlFinal.status==='pass'&&controlFinal.stage==='completed'&&controlFinal.failure===null);
 const controlResult=JSON.parse(readFileSync(resolve(control.receipt,'control-result.json'),'utf8'));assert(controlResult.finalized&&controlResult.kind==='descendant-certificates-controls-v1'&&controlResult.passed===15&&controlResult.failed===0&&controlResult.physicalSteps===0&&controlResult.productionImports===0);
 assert.equal(controlResult.cases.length,15);assert.equal(new Set(controlResult.cases.map(row=>row.name)).size,15);assert(controlResult.cases.every(row=>row.status==='passed'));
 for(const [file,field]of [['graph-oracle.ts.txt','candidateDigest'],['graph-oracle-before.ts.txt','originalDigest'],['controls.mjs.txt','controlsDigest'],['input-pins.json','candidateInputManifestDigest'],['launch-input-pins.json','launchInputManifestDigest']])assert.equal(digestFile(resolve(controlDraft,file)),control[field]);
 assert.equal(digestFile(resolve(draft,'graph-oracle.ts.txt')),control.candidateDigest);
 assert.equal(digestFile(resolve(root,'docs/research/2026-10-04-cloud-resume/current-native-composite-paired/graph-oracle.ts.txt')),control.originalDigest);
 assert.equal(digestFile(control.independentResultReview),control.independentResultReviewDigest);assert.equal(digestFile(control.independentResultReviewPins),control.independentResultReviewPinsDigest);
 const supplemental=resolve(controlDraft,'parent/independent-all-owned-postexit.json');assert.equal(digestFile(supplemental),control.supplementalOwnershipDigest);
 const controlProcess=JSON.parse(readFileSync(resolve(control.receipt,'controls.process.json'),'utf8'));assert(controlProcess.exit.code===0&&controlProcess.exit.signal===null&&controlProcess.failure===null&&controlProcess.firstFailure===null&&controlProcess.closed);assert.deepEqual(controlProcess.cleanup.executing,[]);
 previousPins={...previousPins,...evidence(control.receipt,control.evidenceDigest),[controlPath]:digestFile(controlPath),[control.independentResultReview]:control.independentResultReviewDigest,[control.independentResultReviewPins]:control.independentResultReviewPinsDigest,[supplemental]:control.supplementalOwnershipDigest};
 const controlEvidence=JSON.parse(readFileSync(resolve(control.receipt,'evidence-manifest.json'),'utf8'));
 const controlBefore=JSON.parse(readFileSync(resolve(control.receipt,'before-pins.json'),'utf8')),controlAfter=JSON.parse(readFileSync(resolve(control.receipt,'after-pins.json'),'utf8'));assert.deepEqual(controlBefore,controlAfter);
 for(const [p,h]of Object.entries({...controlEvidence.inputs,...controlBefore})){assert.equal(digestFile(p),h,p);previousPins[p]=h;}
 const failedPair=resolve(root,'docs/research/2026-10-04-cloud-resume/current-native-composite-paired/receipt-paired-be927172-3623-42de-8670-8a68993445c5');
 const failedFinal=JSON.parse(readFileSync(resolve(failedPair,'finalized.json'),'utf8'));assert(failedFinal.finalized&&failedFinal.status==='failed'&&failedFinal.mode==='composite-paired'&&failedFinal.stage==='paired-flight');assert.match(failedFinal.failure,/process-timeout: 900000ms/);
 const failedPrefix=JSON.parse(readFileSync(resolve(failedPair,'paired-first-failure.json'),'utf8'));assert.equal(failedPrefix.status,'failed');assert.equal(failedPrefix.ticks,2875);assert.match(failedPrefix.text,/research flight supervision bound/);
 assert.equal(failedPrefix.counts.totalNodes,8876134);assert.equal(failedPrefix.counts.totalEdges,66211688);
 previousPins={...previousPins,...evidence(failedPair,inputs[relative(root,resolve(failedPair,'evidence-manifest.json'))])};verifyCoreLineage(failedPair);
 prior={...prior,controlAcceptance:controlPath,controlAcceptanceDigest:digestFile(controlPath),failedPair,failedPairStatus:'failed',oracleDigest:control.candidateDigest};
 writeFileSync(resolve(receipt,'paired-predecessors.json'),JSON.stringify(prior,null,2)+'\n');
 stage='materialize-paired';
 const entry=render('entry.ts',{ORIGINAL_ORACLE_PLACEHOLDER:resolve('tests/proofs/fixtures/unpowered-fall-original.ts')});
 const helper=render('graph-oracle.ts');const driver=render('full-flight.ts',{GRAPH_ORACLE_PLACEHOLDER:relative(task,helper),SSR_ENTRY_PLACEHOLDER:relative(task,entry)});
 writeFileSync(resolve(receipt,'materialized-before.json'),JSON.stringify(ownPins,null,2)+'\n');verify();verifyGraph();
 stage='paired-flight';const commandStarted=performance.now();
 const code=await runOwnedCommand({name:'paired-flight',args:[resolve('node_modules/vite-node/dist/cli.mjs'),'--script',driver,'paired',resolve(original,'plain/entry.mjs'),receipt],root,receipt,env:{...process.env},deadlineMs:900000});
 writeFileSync(resolve(receipt,'paired-flight.exit.json'),JSON.stringify({code,wholeOwnedCommandWallMs:performance.now()-commandStarted})+'\n');assert.equal(code,0);verify();verifyGraph();storage();
 const result=JSON.parse(readFileSync(resolve(receipt,'paired-flight.json'),'utf8'));assert(result.status==='pass'&&result.mode==='paired');assert(result.ticks>0&&result.ticks<=108000);assert(/^[a-f0-9]{64}$/.test(result.semanticDigest));
 assert.deepEqual(snapshot(),before);status=0;
}catch(error){failure=String(error.stack??error).slice(0,32768);}
finally{
 let cleanup;try{cleanup=verifyNoOwnedProcesses();}catch(error){status=1;failure??=String(error.stack??error).slice(0,32768);}
 try{assert(before&&inputs,'source verification unavailable after incomplete preflight');const after=snapshot();writeFileSync(resolve(receipt,'source-after.json'),JSON.stringify(after,null,2)+'\n');assert.deepEqual(after,before);verify();if(prior)verifyGraph();storage();}catch(error){status=1;failure??=String(error.stack??error).slice(0,32768);writeFileSync(resolve(receipt,'source-verification.json'),JSON.stringify({status:'failed-or-unavailable',beforeAvailable:Boolean(before),message:String(error.message).slice(0,8192)})+'\n');}
 writeFileSync(resolve(receipt,'owned-cleanup.json'),JSON.stringify(cleanup??{unverified:true},null,2)+'\n');
 writeFileSync(resolve(receipt,'finalized.json'),JSON.stringify({finalized:true,status:status===0?'pass':'failed',mode:'composite-paired',receipt,stage,failure,prior,acceptance:'semantic research only; no mocks/coverage/time/gate claim'},null,2)+'\n');
 const evidenceFiles={...previousPins,...ownPins,...Object.fromEntries(files(receipt).map(p=>[p,digestFile(p)]))};
 writeFileSync(resolve(receipt,'evidence-manifest.json'),JSON.stringify({receipt,mode:'composite-paired',files:evidenceFiles},null,2)+'\n');console.log(receipt);process.exitCode=status;
}
