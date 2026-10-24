/** Linux-only owned-group watchdog. No shell and no unbounded inherited pipes. */
import {spawn} from 'node:child_process';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const owners=[];
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
function processRow(pid){
 try{const text=readFileSync(`/proc/${pid}/stat`,'utf8'),end=text.lastIndexOf(')'),f=text.slice(end+2).trim().split(/\s+/);
 return {pid:Number(pid),state:f[0],parent:Number(f[1]),group:Number(f[2]),session:Number(f[3]),start:f[19]};
 }catch(error){if(['ENOENT','ESRCH'].includes(error.code))return null;throw error;}
}
function processes(){const rows=[];for(const name of readdirSync('/proc'))if(/^\d+$/.test(name)){
 const row=processRow(name);if(row)rows.push(row);
}return rows;}
const identity=row=>`${row.pid}:${row.start}`;
const executing=row=>!['Z','X'].includes(row.state);
function observe(owner){const rows=processes();let changed=true;
 // A newly created group is owned by the detached child; identities survive reparenting.
 const replacement=rows.find(row=>row.pid===owner.pid&&row.start!==owner.start);
 assert(!replacement,'Owned group leader PID was recycled; refusing unverified group signals');
 const members=rows.filter(row=>row.group===owner.group&&row.session===owner.session);
 if(!owner.groupCleared)for(const row of members)owner.known.set(identity(row),row);
 if(!members.length)owner.groupCleared=true;
 while(changed){changed=false;for(const row of rows){const parent=rows.find(p=>p.pid===row.parent);
  if(parent&&owner.known.has(identity(parent))&&!owner.known.has(identity(row))){owner.known.set(identity(row),row);changed=true;}
 }}
 const live=rows.filter(row=>owner.known.has(identity(row))&&executing(row));
 return {rows,live};
}
function signalOwned(owner,signal){const {live}=observe(owner);
 const grouped=live.filter(row=>row.group===owner.group&&row.session===owner.session);
 if(grouped.length){
  // Re-read a witnessed member immediately before the group signal. Never use a cached PID identity.
  const witness=grouped.map(row=>({row,actual:processRow(row.pid)})).find(pair=>pair.actual);
  if(witness){assert.equal(witness.actual.start,witness.row.start,'Owned group witness PID changed');
   assert.equal(witness.actual.group,owner.group,'Owned group witness moved');assert.equal(witness.actual.session,owner.session,'Owned group witness session changed');
   try{process.kill(-owner.group,signal);}catch(error){if(error.code!=='ESRCH')throw error;}
  }
 }
 for(const row of live.filter(row=>row.group!==owner.group||row.session!==owner.session)){
  const actual=processRow(row.pid);if(!actual)continue;
  assert.equal(actual.start,row.start,'Escaped owned PID changed');assert.equal(actual.group,row.group,'Escaped owned group changed');assert.equal(actual.session,row.session,'Escaped owned session changed');
  try{process.kill(row.pid,signal);}catch(error){if(error.code!=='ESRCH')throw error;}
 }
}
async function teardown(owner){let inspection=observe(owner);
 if(inspection.live.length){signalOwned(owner,'SIGTERM');const until=Date.now()+5000;
  while(Date.now()<until&&(inspection=observe(owner)).live.length)await sleep(50);
 }
 if(inspection.live.length){signalOwned(owner,'SIGKILL');const until=Date.now()+2000;
  while(Date.now()<until&&observe(owner).live.length)await sleep(50);
 }
 inspection=observe(owner);return {pid:owner.pid,start:owner.start,group:owner.group,session:owner.session,tracked:[...owner.known.values()],executing:inspection.live};
}
export function verifyNoOwnedProcesses(){const inspections=owners.map(owner=>({pid:owner.pid,start:owner.start,group:owner.group,executing:observe(owner).live}));
 assert(inspections.every(row=>row.executing.length===0),'Executing owned process remains');return inspections;}
export async function runOwnedCommand({name,args,env,root,receipt,deadlineMs=300000}){
 assert(Number.isFinite(deadlineMs)&&deadlineMs>0&&deadlineMs<=900000);
 const cap=8*1024*1024;const chunks={stdout:[],stderr:[]};const bytes={stdout:0,stderr:0};
 let child=null,owner=null,failure=null,exit=null,closed=false,timeout=null,monitor=null;
 let cleanup=null;
 let wake;const boundary=new Promise(done=>{wake=done;});
 const fail=(kind,error)=>{if(!failure)failure={kind,message:error?.message??kind};wake();};
 const capture=(stream,data)=>{const room=cap-bytes[stream];if(room>0){const kept=data.subarray(0,room);chunks[stream].push(kept);bytes[stream]+=kept.length;}
  if(data.length>room)fail('output-overflow',new Error(`${stream} exceeded ${cap} bytes; raw prefix retained`));};
 const handlers={};
 try{
  child=spawn(process.execPath,args,{cwd:root,env,detached:true,stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',data=>capture('stdout',data));child.stderr.on('data',data=>capture('stderr',data));
  child.stdout.on('error',error=>fail('stdout-error',error));child.stderr.on('error',error=>fail('stderr-error',error));
  child.on('error',error=>fail('spawn-error',error));
  child.on('exit',(code,signal)=>{exit={code,signal};wake();});child.on('close',()=>{closed=true;wake();});
  if(child.pid){
   const row=processes().find(row=>row.pid===child.pid);assert(row,'Could not establish child PID/start identity');assert.equal(row.group,child.pid);assert.equal(row.session,child.pid);
   owner={pid:row.pid,start:row.start,group:row.group,session:row.session,groupCleared:false,known:new Map([[identity(row),row]])};owners.push(owner);observe(owner);
   monitor=setInterval(()=>{try{observe(owner);}catch(error){fail('process-observation-error',error);}},100);
  }
  timeout=setTimeout(()=>fail('process-timeout',new Error(`${deadlineMs}ms process bound exceeded`)),deadlineMs);
  for(const signal of ['SIGINT','SIGTERM']){handlers[signal]=()=>fail(`parent-${signal}`,new Error(`Interrupted by ${signal}`));process.on(signal,handlers[signal]);}
  await boundary;
 }catch(error){fail('launch-or-observation-error',error);}
 finally{
  clearTimeout(timeout);clearInterval(monitor);
  try{if(owner)cleanup=await teardown(owner);else if(child?.pid){
    // No start identity means absence cannot be established: fail closed, never next lane.
    failure??={kind:'owner-identity-unavailable',message:'No verified PID/start identity'};}
   if(cleanup?.executing.length)failure={kind:'owned-cleanup-failure',message:'Executing owned processes remain'};
  }catch(error){failure={kind:'owned-cleanup-error',message:error.message};}
  // Descendant pipe holders must not prevent completion; bounded drainage after teardown.
  const until=Date.now()+1000;while(!closed&&Date.now()<until)await sleep(20);
  if(!closed&&child){failure??={kind:'pipe-close-bound',message:'Inherited output pipes did not close within one second'};child.stdout?.destroy();child.stderr?.destroy();}
  for(const [signal,handler] of Object.entries(handlers))process.removeListener(signal,handler);
  for(const stream of ['stdout','stderr'])writeFileSync(resolve(receipt,`${name}.${stream}.txt`),Buffer.concat(chunks[stream]));
  writeFileSync(resolve(receipt,`${name}.process.json`),JSON.stringify({exit,failure,bytes,cap,finished:true,closed,cleanup},null,2)+'\n');
 }
 if(failure)throw new Error(`${name}: ${failure.kind}: ${failure.message}`);
 assert(exit&&cleanup&&cleanup.executing.length===0,'Command termination/cleanup unverified');
 return exit.code===null?130:exit.code;
}
