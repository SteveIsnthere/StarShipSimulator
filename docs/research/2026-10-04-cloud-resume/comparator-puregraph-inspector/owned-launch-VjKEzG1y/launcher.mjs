import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {runOwnedCommand,verifyNoOwnedProcesses} from './owned-command.mjs';
import {installedToolSnapshot} from '/workspace/StarShipSimulator/scripts/bench/native-loader.mjs';
const root=process.cwd(),draft=resolve(root,'docs/research/2026-10-04-cloud-resume/comparator-puregraph-inspector');
const receipt=resolve(draft,'receipt-inspector-'+randomUUID());mkdirSync(receipt);
const digest=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const save=(name,value)=>writeFileSync(resolve(receipt,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const outer=resolve(process.argv[1]),owner=resolve(dirname(outer),'owned-command.mjs');
const pins={};let before=null,after=null,status=1,failure=null,stage='receipt-created',cleanup=null,sourceInventory=null;
function productFiles(){const files=[];function walk(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const p=resolve(dir,item.name);assert(item.isFile()||item.isDirectory());if(item.isDirectory())walk(p);else files.push(p);}}
 for(const dir of ['src','tests','scripts'])walk(resolve(root,dir));
 for(const item of readdirSync(root,{withFileTypes:true}))if(item.isFile()&&(/\.(?:ts|json)$/.test(item.name)||item.name==='package-lock.json'))files.push(resolve(root,item.name));return files.sort();}
const register=p=>{assert(!Object.hasOwn(pins,p));pins[p]=digest(p);};
const snapshot=()=>{if(sourceInventory)assert.deepEqual(productFiles(),sourceInventory,'Product source inventory drift');return {pins:Object.fromEntries(Object.keys(pins).map(p=>[p,digest(p)])),installed:installedToolSnapshot(root)};};
const processIdentity=()=>{const text=readFileSync(`/proc/${process.pid}/stat`,'utf8'),f=text.slice(text.lastIndexOf(')')+2).trim().split(/\s+/);
 return{pid:process.pid,start:f[19],group:Number(f[2]),session:Number(f[3])};};
save('parent-identity.json',processIdentity());
try{
 stage='preflight';assert.equal(process.version,'v22.23.3');assert.equal(process.platform,'linux');
 assert.equal(process.env.STARSHIP_CPU_SLOT_GRANTED,'puregraph-inspector');
 assert.equal(digest(resolve(draft,'launch-input-pins.json')),process.env.STARSHIP_CONTROL_LAUNCH_INPUT_SHA);
 assert.equal(digest(resolve(draft,'launcher-independent-review.md')),process.env.STARSHIP_CONTROL_LAUNCH_REVIEW_SHA);
 assert.equal(digest(resolve(draft,'launcher-independent-review-pins.json')),process.env.STARSHIP_CONTROL_LAUNCH_REVIEW_PINS_SHA);
 const reviewPins=JSON.parse(readFileSync(resolve(draft,'launcher-independent-review-pins.json'),'utf8'));
 assert.equal(reviewPins.review,digest(resolve(draft,'launcher-independent-review.md')));
 assert.equal(reviewPins.inputManifest,digest(resolve(draft,'launch-input-pins.json')));
 const manifest=JSON.parse(readFileSync(resolve(draft,'launch-input-pins.json'),'utf8'));
 for(const[p,h]of Object.entries(manifest)){assert.equal(digest(resolve(root,p)),h,p);register(resolve(root,p));}
 assert.equal(digest(outer),digest(resolve(draft,'launcher.mjs.txt')));
 assert.equal(digest(owner),digest(resolve(draft,'owned-command.mjs.txt')));
 for(const p of [outer,owner,process.execPath,resolve(draft,'launch-input-pins.json'),resolve(draft,'launcher-independent-review.md'),resolve(draft,'launcher-independent-review-pins.json')])if(!Object.hasOwn(pins,p))register(p);
 sourceInventory=productFiles();for(const p of sourceInventory)if(!Object.hasOwn(pins,p))register(p);
 // Bind exact reviewed candidate/control/body inputs and original failed witness.
 const base=JSON.parse(readFileSync(resolve(draft,'input-pins.json'),'utf8'));
 for(const[p,h]of Object.entries(base)){assert.equal(digest(resolve(root,p)),h,p);if(!Object.hasOwn(pins,resolve(root,p)))register(resolve(root,p));}
 const task=resolve(receipt,'materialized');mkdirSync(task);
 for(const name of ['graph-oracle.ts','diagnostic.ts','bootstrap.ts']){
  const path=resolve(task,name);writeFileSync(path,readFileSync(resolve(draft,name+'.txt')),{flag:'wx'});register(path);
 }
 before=snapshot();save('before-pins.json',before);stage='inspector';
 const cli=resolve(root,'node_modules/vite-node/dist/cli.mjs');assert.equal(digest(cli),base['node_modules/vite-node/dist/cli.mjs']);
 const code=await runOwnedCommand({name:'diagnostic',args:[cli,'--script',resolve(task,'bootstrap.ts'),receipt,resolve(task,'diagnostic.ts'),receipt,resolve(task,'graph-oracle.ts')],root,receipt,env:{...process.env},deadlineMs:30000});
 save('diagnostic.exit.json',{code});assert.equal(code,0);
 const result=JSON.parse(readFileSync(resolve(receipt,'diagnostic-finalized.json'),'utf8'));assert(result.finalized&&result.status==='pass'&&result.failure===null);
 assert.equal(result.completed,500);assert.equal(result.physicalImports,0);assert.equal(result.physicalTicks,0);
 assert.equal(result.originalDigest,'34fd9cf3959764b7273d5fa367ec96181b7bf9918aee7514bc23f77b66c3619e');
 const raw=JSON.parse(readFileSync(resolve(receipt,'raw.cpuprofile'),'utf8'));assert(raw.nodes.length>0&&raw.samples.length>0);assert.equal(raw.samples.length,raw.timeDeltas.length);
 status=0;stage='completed';
}catch(error){failure=String(error.stack??error).slice(0,32768);}
finally{
 try{cleanup=verifyNoOwnedProcesses();save('owned-cleanup.json',cleanup);}catch(error){status=1;failure??=String(error.stack??error).slice(0,32768);}
 try{after=snapshot();save('after-pins.json',after);assert(before,'Before-pin snapshot unavailable');assert.deepEqual(after,before);}catch(error){status=1;failure??=String(error.stack??error).slice(0,32768);save('integrity-failure.json',{beforeAvailable:Boolean(before),error:String(error.message)});}
 const ownFiles=[];function files(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const p=resolve(dir,item.name);assert(item.isFile()||item.isDirectory());if(item.isDirectory())files(p);else ownFiles.push(p);}}files(receipt);
 let storageBytes=0;for(const file of ownFiles)storageBytes+=readFileSync(file).length;
 // Reserve1MiB for bounded finalization/evidence metadata; finalize exactly once.
 if(storageBytes>255*1024*1024){status=1;failure??='256MiBresearchstoragebound (1MiBfinalizationreserve)';}
 save('finalized.json',{finalized:true,status:status===0?'pass':'failed',stage,failure,receipt,node:process.version,
  acceptance:'unchanged SSR comparator puregraph CPU samples only; no flight/cost acceptance'});
 ownFiles.push(resolve(receipt,'finalized.json'));
 save('evidence-manifest.json',{receipt,inputs:pins,files:Object.fromEntries(ownFiles.sort().map(p=>[p,digest(p)]))});
 console.log(receipt);process.exitCode=status;
}
