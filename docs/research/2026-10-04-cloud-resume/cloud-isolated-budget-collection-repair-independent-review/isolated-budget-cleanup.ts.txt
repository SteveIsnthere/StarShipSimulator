/** Five-second nonexecuting-descendant proof; unknown ownership/access fails. */
import * as fs from 'node:fs';
import { join } from 'node:path';
export default async function cleanup(){
 const episode=process.env['ISOLATED_BUDGET_EPISODE']!,setup=process.env['ISOLATED_BUDGET_SETUP']!;
 const started=Date.now(),deadline=started+5000,owned=new Map<number,any>(),roots:any[]=[],errors=new Set<string>();
 const declaration=JSON.parse(fs.readFileSync(join(episode,'episode-declaration.json'),'utf8'));
 const floor=declaration.createdBootSeconds*declaration.clockTicksPerSecond,expectedExe=join(setup,'browser/chrome-headless-shell');
 function stat(pid:number){
  try{const s=fs.readFileSync(`/proc/${pid}/stat`,'utf8'),f=s.slice(s.lastIndexOf(')')+2).split(' ');return{pid,starttime:f[19],ppid:Number(f[1]),pgrp:Number(f[2]),state:f[0]};}
  catch(e:any){if(['ENOENT','ESRCH'].includes(e.code))return null;if(e.code==='EACCES'){if(owned.has(pid)){errors.add(`Owned stat inaccessible:${pid}`);return{...owned.get(pid),state:'?',inaccessible:true};}return null;}throw e;}
 }
 function load(dir:string){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())load(p);else if(/^isolated-.*-topology\.json$/.test(e.name)){const d=JSON.parse(fs.readFileSync(p,'utf8'));for(const r of d.records){const v={...r.identity,exe:r.exe};owned.set(v.pid,v);if(r.type==='browser'&&v.pgrp===v.pid)roots.push(v);}}}}
 load(join(episode,'test-results'));
 const orphanedGroups=new Set<number>();
 function snapshot(){
  for(const name of fs.readdirSync('/proc').filter(n=>/^\d+$/.test(n))){
   const v=stat(Number(name));if(!v)continue;
   const known=owned.get(v.pid),root=roots.find(r=>r.pgrp===v.pgrp&&Number(v.starttime)>=Number(r.starttime));
   // Every new exact-copy process is checked, even if its leader already exited
   // before the first ownership receipt. Exclusive episode/path/starttime is
   // the declared fallback ownership contract; never infer absence from roots[].
   if(!known&&!root&&Number(v.starttime)<floor)continue;
   if(v.state==='Z'){if(known)owned.set(v.pid,{...known,...v});continue;}
   try{
    const exe=fs.readlinkSync(`/proc/${v.pid}/exe`);
    if(known&&v.starttime===known.starttime&&exe!==known.exe){errors.add(`Owned executable changed:${v.pid}`);continue;}
    if(exe===expectedExe){owned.set(v.pid,{...v,exe});if(!root)orphanedGroups.add(v.pgrp);}
   }catch(e:any){if(['ENOENT','ESRCH'].includes(e.code))continue;if(e.code==='EACCES'){errors.add(`${known||root?'Owned':'Unclassified new'} exe inaccessible:${v.pid}`);continue;}throw e;}
  }
 }
 function live(){return[...owned.values()].filter(v=>{const n=stat(v.pid);return n&&n.starttime===v.starttime&&n.state!=='Z';});}
 snapshot();
 while(Date.now()<deadline-250&&live().length){
  for(const v of live()){
   const n=stat(v.pid);if(!n||n.inaccessible||n.starttime!==v.starttime||n.pgrp!==v.pgrp)continue;
   try{if(fs.readlinkSync(`/proc/${v.pid}/exe`)===v.exe)process.kill(v.pid,'SIGKILL');else errors.add(`Kill identity changed:${v.pid}`);}
   catch(e:any){if(!['ENOENT','ESRCH'].includes(e.code))errors.add(String(e));}
  }
  await new Promise(r=>setTimeout(r,25));snapshot();
 }
 snapshot();const remaining=live();
 fs.writeFileSync(join(episode,'owned-cleanup.json'),JSON.stringify({owned:[...owned.values()],remaining,errors:[...errors],fallbackOrphanedGroups:[...orphanedGroups],verifiedNonexecutingDescendants:remaining.length===0&&!errors.size,cleanupMs:Date.now()-started,limitation:'stateZ remains possible underPID1; not a reaping claim'},null,2)+'\n',{flag:'wx'});
 if(remaining.length||errors.size||Date.now()>deadline)throw Error('Owned budget-browser cleanup verification failed');
}
