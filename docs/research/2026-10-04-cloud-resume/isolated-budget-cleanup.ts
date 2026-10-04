/** Fail-closed nonexecuting-descendant check after framework teardown, max5s. */
import * as fs from 'node:fs';
import { join } from 'node:path';
export default async function cleanup(){
 const episode=process.env['ISOLATED_BUDGET_EPISODE']!,setup=process.env['ISOLATED_BUDGET_SETUP']!;
 const deadline=Date.now()+5000,started=Date.now(),owned=new Map<number,any>(),roots:any[]=[],errors:string[]=[];
 function stat(pid:number){try{const s=fs.readFileSync(`/proc/${pid}/stat`,'utf8'),f=s.slice(s.lastIndexOf(')')+2).split(' ');return{pid,starttime:f[19],ppid:Number(f[1]),pgrp:Number(f[2]),state:f[0]};}catch(e:any){if(['ENOENT','ESRCH','EACCES'].includes(e.code))return null;throw e;}}
 function walk(dir:string){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())walk(p);else if(/^isolated-.*-topology\.json$/.test(e.name)){const d=JSON.parse(fs.readFileSync(p,'utf8'));for(const r of d.records){const v={...r.identity,exe:r.exe};owned.set(v.pid,v);if(r.type==='browser'&&v.pgrp===v.pid)roots.push(v);}}}}
 walk(join(episode,'test-results'));
 const declaration=JSON.parse(fs.readFileSync(join(episode,'episode-declaration.json'),'utf8'));if(!roots.length){const floor=declaration.createdBootSeconds*declaration.clockTicksPerSecond;for(const name of fs.readdirSync('/proc').filter(n=>/^\d+$/.test(n))){const v=stat(Number(name));if(!v||v.pgrp!==v.pid||Number(v.starttime)<floor)continue;try{const exe=fs.readlinkSync(`/proc/${v.pid}/exe`);if(exe===join(setup,'browser/chrome-headless-shell')){const owner={...v,exe};roots.push(owner);owned.set(v.pid,owner);}}catch{}}}
 function snapshot(){const all=fs.readdirSync('/proc').filter(n=>/^\d+$/.test(n)).map(n=>stat(Number(n))).filter(Boolean) as any[];for(const root of roots){const now=stat(root.pid);if(now&&now.starttime!==root.starttime)continue;for(const v of all)if(v.pgrp===root.pgrp&&BigInt(v.starttime)>=BigInt(root.starttime)){try{const exe=fs.readlinkSync(`/proc/${v.pid}/exe`);if(exe===join(setup,'browser/chrome-headless-shell'))owned.set(v.pid,{...v,exe});}catch(e:any){if(e.code==='EACCES')errors.push(`Owned exe inaccessible:${v.pid}`);}}}}
 function live(){return[...owned.values()].filter(v=>{const n=stat(v.pid);return n&&n.starttime===v.starttime&&n.state!=='Z';});}
 snapshot();while(Date.now()<deadline-250&&live().length){for(const v of live()){const n=stat(v.pid);if(!n||n.starttime!==v.starttime||n.pgrp!==v.pgrp)continue;try{if(fs.readlinkSync(`/proc/${v.pid}/exe`)===v.exe)process.kill(v.pid,'SIGKILL');}catch(e:any){if(!['ENOENT','ESRCH'].includes(e.code))errors.push(String(e));}}await new Promise(r=>setTimeout(r,25));snapshot();}
 const remaining=live();fs.writeFileSync(join(episode,'owned-cleanup.json'),JSON.stringify({owned:[...owned.values()],remaining,errors,verifiedNonexecutingDescendants:remaining.length===0&&!errors.length,cleanupMs:Date.now()-started,limitation:'stateZ remains possible underPID1; not a reaping claim'},null,2)+'\n',{flag:'wx'});
 if(remaining.length||errors.length||Date.now()>deadline)throw Error('Owned budget-browser cleanup verification failed');
}
