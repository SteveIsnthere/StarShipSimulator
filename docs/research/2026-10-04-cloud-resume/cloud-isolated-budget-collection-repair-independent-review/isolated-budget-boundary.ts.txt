/** Boundary-only metadata for the scoped original300-frame launch test. */
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import type { Browser, TestInfo } from '@playwright/test';
import { writeVisualJSON } from '../../../tests/e2e/visual-runtime-receipt';
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const originalSpec='98504af61fb46edf0f2555e7f1fec419308cfcbd6363fe3f9b5b104fdea4ce79';
const pinnedBrowser='e11fc9ce65c96313476f7ee9844b6fb6a9220fb048693cfe9eee00acf4170a9f';
async function inventory(root:string){
 const files:{path:string;mode:number}[]=[],directories=[{path:'.',mode:(await stat(root)).mode&0o7777}];
 async function walk(dir:string){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isSymbolicLink())throw Error('Bundle symlink unsupported');const mode=(await stat(p)).mode&0o7777;if(e.isDirectory()){directories.push({path:relative(root,p),mode});await walk(p);}else if(e.isFile())files.push({path:relative(root,p),mode});else throw Error('Special bundle file unsupported');}}
 await walk(root);const order=(a:{path:string},b:{path:string})=>a.path<b.path?-1:a.path>b.path?1:0;return{files:files.sort(order),directories:directories.sort(order)};
}
export async function isolatedBudgetBoundary(browser:Browser,info:TestInfo,label:string,requireWorkers:boolean){
 const setup=process.env['ISOLATED_BUDGET_SETUP']!;
 const receipt=JSON.parse(await readFile(join(setup,'setup-receipt.json'),'utf8'));
 if(sha(await readFile('tests/e2e/visual-budget.spec.ts'))!==originalSpec)throw Error('Canonical original budget source changed');
 const bundleBytes=await readFile(join(setup,'bundle-copy-manifest.json'));if(sha(bundleBytes)!==receipt.bundleManifestSha256)throw Error('Bundle manifest changed');
 const bundle=JSON.parse(bundleBytes);if(receipt.bundleManifestSha256!=='07ef404bb5667e951f53099c703ccd06567c8c65e76341d8fc6729b9f200fd49'||bundle.files.length!==287||bundle.directories.length!==3||receipt.threadCount!==3||receipt.affinitySetting!==null)throw Error('Approved functional bundle identity required');
 const episode=process.env['ISOLATED_BUDGET_EPISODE']!;const episodeDeclaration=JSON.parse(await readFile(join(episode,'episode-declaration.json'),'utf8'));if(sha(await readFile(join(setup,'setup-receipt.json')))!==episodeDeclaration.setupReceiptSha256)throw Error('Episode setup receipt changed');
 for(const file of episodeDeclaration.harness)if(sha(await readFile(file.path))!==file.sha256)throw Error('Reviewed research harness changed');
 const cdp=await browser.newBrowserCDPSession();
 let records:any[]=[];
 try{
  const processes=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
  for(const p of processes){
   const base=`/proc/${p.id}`,exe=await readFile(`${base}/stat`,'utf8');const fields=exe.slice(exe.lastIndexOf(')')+2).split(' ');
   const identity={pid:p.id,starttime:fields[19],ppid:Number(fields[1]),pgrp:Number(fields[2])};
   const {readlink}=await import('node:fs/promises');const actualExe=await readlink(`${base}/exe`);if(actualExe!==receipt.actualBrowser)throw Error('Unexpected budget browser process implementation');
   const status=await readFile(`${base}/status`,'utf8'),safeStatus:Record<string,string|null>={};for(const key of ['Uid','Gid','NoNewPrivs','Seccomp','Seccomp_filters'])safeStatus[key]=new RegExp(`^${key}:\\s*(.*)$`,'m').exec(status)?.[1]??null;
   const threads:any[]=[];if(p.type==='GPU')for(const tid of await readdir(`${base}/task`)){const t=`${base}/task/${tid}`,s=await readFile(`${t}/status`,'utf8');threads.push({tid:Number(tid),comm:(await readFile(`${t}/comm`,'utf8')).trim(),affinity:/^Cpus_allowed_list:\s*(.*)$/m.exec(s)?.[1],stat:await readFile(`${t}/stat`,'utf8')});}
   records.push({type:p.type,identity,exe:actualExe,cwd:await readlink(`${base}/cwd`),actualArgv:(await readFile(`${base}/cmdline`,'utf8')).split('\0').filter(Boolean),safeStatus,workers:threads.filter(t=>/^Thread<\d+>$/.test(t.comm)),threads,swiftshaderMappings:p.type==='GPU'?(await readFile(`${base}/maps`,'utf8')).split('\n').filter(l=>l.includes('libvk_swiftshader.so')):[]});
  }
 }catch(error){await writeVisualJSON(info,`isolated-${label}-topology.json`,{label,records,reference:receipt.originalBrowser,actual:receipt.actualBrowser,requestedWorkers:3,error:String(error)});throw error;}finally{await cdp.detach();}
 // Save ownership immediately before any large identity reads/assertions fail.
 await writeVisualJSON(info,`isolated-${label}-topology.json`,{label,records,reference:receipt.originalBrowser,actual:receipt.actualBrowser,requestedWorkers:3,harness:episodeDeclaration.harness});
 const root=records.find(p=>p.type==='browser');if(!root||root.identity.pgrp!==root.identity.pid)throw Error('Dedicated owned browser group required');
 const quota=(await readFile('/sys/fs/cgroup/cpu.max','utf8')).trim(),cpuset=(await readFile('/sys/fs/cgroup/cpuset.cpus.effective','utf8')).trim();if(quota!==receipt.cpuMax||cpuset!==receipt.cpuset)throw Error('CPU contract changed');
 if(requireWorkers){const gpu=records.filter(p=>p.type==='GPU');if(gpu.length!==1||gpu[0].workers.length!==3||new Set(gpu[0].workers.map((t:any)=>t.comm)).size!==3)throw Error('Exactly3 observed software workers required');if(!gpu[0].swiftshaderMappings.length||gpu[0].swiftshaderMappings.some((l:string)=>!l.endsWith(join(setup,'browser/libvk_swiftshader.so'))))throw Error('Actual copied driver required');}
 const verifyCompleteBundle=label==='pre-controls'||label==='after-measured'||label==='failure';
 if(verifyCompleteBundle){
  const order=(a:{path:string},b:{path:string})=>a.path<b.path?-1:a.path>b.path?1:0;
  const declared=bundle.files.map((f:any)=>({path:f.path,mode:f.mode})).sort(order),dirs=bundle.directories.slice().sort(order);
  for(const dir of [bundle.originalRoot,bundle.copiedRoot]){const data=await inventory(dir);if(dir===bundle.copiedRoot)data.files=data.files.filter(f=>f.path!=='SwiftShader.ini');if(JSON.stringify(data.files)!==JSON.stringify(declared)||JSON.stringify(data.directories)!==JSON.stringify(dirs))throw Error('Complete file/directory/mode identity changed');}
  for(const f of bundle.files){const a=join(bundle.originalRoot,f.path),b=join(bundle.copiedRoot,f.path);const sa=await stat(a),sb=await stat(b);if(sa.dev===sb.dev&&sa.ino===sb.ino||sha(await readFile(a))!==f.sha256||sha(await readFile(b))!==f.sha256)throw Error('Original/copied bytes or inode isolation changed');}
  if(sha(await readFile(receipt.actualBrowser))!==pinnedBrowser||sha(await readFile(receipt.originalBrowser))!==pinnedBrowser||sha(await readFile(receipt.config))!==receipt.configSha256||sha(await readFile(join(setup,'browser/libvk_swiftshader.so')))!==receipt.swiftshaderLibrarySha256)throw Error('Binary/config/driver identity changed');
  if(process.execPath!==receipt.nodeExecutable||process.version!==receipt.nodeVersion||sha(await readFile(process.execPath))!==receipt.nodeExecutableSha256)throw Error('Managed Node identity changed');
 }
 await writeVisualJSON(info,`isolated-${label}-identity.json`,{label,bundleManifestSha256:receipt.bundleManifestSha256,files:bundle.files.length,directories:bundle.directories.length,harness:episodeDeclaration.harness,configSha256:receipt.configSha256,librarySha256:receipt.swiftshaderLibrarySha256,browserSha256:pinnedBrowser,node:process.version,nodeExecutable:process.execPath,quota,cpuset,cpuStat:await readFile('/sys/fs/cgroup/cpu.stat','utf8'),scope:verifyCompleteBundle?'complete original/copy identity before any flight/control initialization or after pause':'lightweight GPU/ownership boundary outside measured RAF window'});
}
