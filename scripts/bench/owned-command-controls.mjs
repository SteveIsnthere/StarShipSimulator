/** Bounded non-kernel positive controls for the owned process watchdog. */
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import {runOwnedCommand,verifyNoOwnedProcesses} from './owned-command.mjs';
const [root,receipt]=process.argv.slice(2);assert(root&&receipt);
const command=(name,code,deadlineMs=300000)=>runOwnedCommand({name,args:['-e',code],env:process.env,root,receipt,deadlineMs});
// Leader exits while a fork retains pipes; successful cleanup must stop that owned fork.
assert.equal(await command('owner-control-inherited-pipe',"const {spawn}=require('node:child_process');const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit'});console.log(child.pid);setTimeout(()=>process.exit(0),150);"),0);
await assert.rejects(()=>command('owner-control-timeout',"const {spawn}=require('node:child_process');spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit'});setInterval(()=>{},1000);",250),/process-timeout/);
await assert.rejects(()=>command('owner-control-output-overflow',"process.stdout.write(Buffer.alloc(8*1024*1024+1));setInterval(()=>{},1000);"),/output-overflow/);
writeFileSync(resolve(receipt,'owned-command-controls.json'),JSON.stringify({status:'pass',inheritedPipe:'owned descendant stopped',timeout:'bounded group stopped',overflow:'failed with retained prefix',absence:verifyNoOwnedProcesses()},null,2)+'\n');
