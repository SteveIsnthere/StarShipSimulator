/** Research-only frozen-state actual program/framebuffer timer-query attribution; no acceptance verdict. */
import fs from 'node:fs/promises';
import syncfs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { installProgramAttribution } from './kernel-program-attribution-hook.mjs';
const repo = '/workspace/StarShipSimulator';
const require = createRequire(`${repo}/package.json`);
const { chromium } = require('playwright');
const ts = require('typescript');
const setup = process.argv[2];
if (process.env.RUN_RENDER_KERNEL !== '1' || !setup || !/^\/tmp\/starship-render-kernel\.[A-Za-z0-9]+$/.test(setup))
    throw Error('Explicit opt-in and exact prepared private directory required');
const receipt=JSON.parse(await fs.readFile(`${setup}/setup-receipt.json`,'utf8'));
const bundle=receipt.qualifiedBundle;if(bundle!=='/tmp/starship-fullchrome-worker.VB1uzYO9')throw Error('Exact prior qualified private bundle required');
const compiledPin=process.env.RENDER_KERNEL_COMPILED_MANIFEST_SHA256;if(!compiledPin||!/^[a-f0-9]{64}$/.test(compiledPin))throw Error('Independently reviewed research bundle digest required');
const sha = b => createHash('sha256').update(b).digest('hex');
let exportedBytes=0,consoleBytes=0,collectionTruncated=false;
const exportedCap=32*1024*1024,artifactCap=16*1024*1024,consoleCap=512*1024;
function lossless(value){if(typeof value==='number')return{$number:Number.isNaN(value)?'NaN':Object.is(value,-0)?'-0':String(value)};if(value===undefined)return{$undefined:true};if(typeof value==='bigint')return{$bigint:String(value)};if(ArrayBuffer.isView(value))return{$typedArray:value.constructor.name,values:Array.from(value instanceof DataView?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):value).map(lossless)};if(Array.isArray(value))return Array.from({length:value.length},(_,index)=>index in value?lossless(value[index]):{$hole:true});if(value!==null&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,lossless(item)]));return value;}
function encoded(value,emergency=false){const text=JSON.stringify(value,null,2)+'\n';const bytes=Buffer.byteLength(text);if(bytes>artifactCap||exportedBytes+bytes>exportedCap-(emergency?0:1024*1024)){collectionTruncated=true;throw Error('Declared raw receipt cap exceeded');}exportedBytes+=bytes;return text;}
const save = (name, value) => fs.writeFile(`${setup}/${name}`,encoded(value),{flag:'wx'});
let browser, server, page, browserPid, deadlineTimer, primaryError, launchPromise,launchFailure, stopped = false;
const ownedIdentities = new Map();
let compiledManifest;
function check() { if (stopped)
    throw Error('Preflight stopped'); }
async function step(p) { check(); const result = await p; check(); return result; }
const inaccessibleOwned=new Map();
function processStat(pid){try{const stat=syncfs.readFileSync(`/proc/${pid}/stat`,'utf8');const f=stat.slice(stat.lastIndexOf(')')+2).split(' ');return{pid,starttime:f[19],ppid:Number(f[1]),pgrp:Number(f[2]),state:f[0]};}catch(e){if(e.code==='EACCES'&&ownedIdentities.has(pid)){inaccessibleOwned.set(pid,String(e));return{...ownedIdentities.get(pid),state:'?',inaccessible:true};}if(e.code==='ENOENT'||e.code==='ESRCH'||e.code==='EACCES')return null;throw e;}}
function processIdentity(pid){const value=processStat(pid);if(!value)return null;try{return{...value,exe:syncfs.readlinkSync(`/proc/${pid}/exe`)};}catch(e){if(e.code==='ENOENT'||e.code==='ESRCH')return null;if(e.code==='EACCES'){inaccessibleOwned.set(pid,String(e));return{...value,exe:null,inaccessible:true};}throw e;}}

function capture(pid) { const value = processIdentity(pid); if (!value||!value.exe)
    throw Error('Owned PID vanished or inaccessible'); ownedIdentities.set(pid, value); ownedPids.add(pid); return value; }
function signalOwned(pid) { const saved = ownedIdentities.get(pid), now = processIdentity(pid); if (!saved || !now || now.starttime !== saved.starttime || now.pgrp !== saved.pgrp || !(now.exe===saved.exe||(pid===browserPid&&[receipt.actualBrowser,'/usr/bin/bash','/bin/bash'].includes(now.exe))))
    return false; process.kill(pid, 'SIGKILL'); return true; }
async function waitOwner() { for (;;) {
    check();if(launchFailure)throw launchFailure;
    try {
        const owner = JSON.parse(await fs.readFile(`${setup}/wrapper-owner.json`, 'utf8'));
        check();
        const now = processIdentity(owner.pid);
        if (!now || now.starttime !== owner.starttime || now.ppid !== process.pid || now.pgrp !== owner.pgrp||owner.pgrp!==owner.pid)
            throw Error('Wrapper owner identity mismatch');
        browserPid = owner.pid;
        capture(owner.pid);
        return owner;
    }
    catch (e) {
        if (e.code !== 'ENOENT')
            throw e;
    }
    await new Promise(r => setTimeout(r, 25));
    check();
} }
const events = [];
const ownedPids = new Set();
const started = Date.now();
const deadline = new Promise((_, reject) => { deadlineTimer = setTimeout(() => { stopped = true; reject(Error('Declared90s absolute preflight deadline')); }, 90000); });
let interrupt;
const interrupted = new Promise((_, reject) => { interrupt = signal => { stopped = true; reject(Error(`Interrupted:${signal}`)); }; });
process.once('SIGTERM', () => interrupt('SIGTERM'));
process.once('SIGINT', () => interrupt('SIGINT'));
async function identity() {
    for(const [name,expected] of receipt.additionalGithubFiles??[])if(sha(await step(fs.readFile(`${repo}/${name}`)))!==expected)throw Error('Pinned CI file changed');
    const listed = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: repo, encoding: 'utf8' }).split('\0').filter(p => /^(src\/|tests\/|scripts\/|public\/|\.agents\/|\.nvmrc$|package[^/]*\.json$|[^/]*config\.[^/]+$)/.test(p)).sort();
    const source = [];
    for (const p of listed) {
        try {
            source.push([p, sha(await step(fs.readFile(`${repo}/${p}`)))]);
        }
        catch (e) {
            if (e.code !== 'ENOENT')
                throw e;
            source.push([p, null]);
        }
    }
    const build = [], maps = [];
    async function walk(dir) { for (const e of (await step(fs.readdir(dir, { withFileTypes: true }))).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
        const p = path.join(dir, e.name);
        if (e.isDirectory())
            await step(walk(p));
        else (p.endsWith('.map')?maps:build).push([path.relative(`${repo}/dist`, p), sha(await step(fs.readFile(p)))]);
    } }
    await step(walk(`${repo}/dist`));
    build.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
    maps.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
    for(const proof of receipt.physicsProofs??[]){if(proof.outcome!=='passed'||sha(await step(fs.readFile(`${repo}/${proof.path}`)))!==proof.sha256)throw Error('Current approved physics proof changed');}
    return { source, build, maps, mapsSha256:sha(JSON.stringify(maps)), sourceSha256: sha(JSON.stringify(source)), buildSha256: sha(JSON.stringify(build)), head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), runnerSha256: sha(await step(fs.readFile(new URL(import.meta.url)))) };
}
async function kernelIdentity(){const bytes=await step(fs.readFile(`${setup}/kernel-compiled-manifest.json`));if(sha(bytes)!==compiledPin)throw Error('Reviewed research build manifest drift');const manifest=JSON.parse(bytes);for(const [file,expected] of manifest.supervisedBuildReceipts)if(sha(await step(fs.readFile(`${setup}/${file}`)))!==expected)throw Error('Supervised kernel build receipt drift');const files=[];async function walk(dir){for(const e of await step(fs.readdir(dir,{withFileTypes:true}))){const file=path.join(dir,e.name);if(e.isDirectory())await walk(file);else if(e.isFile())files.push([path.relative(`${setup}/compiled`,file),sha(await step(fs.readFile(file)))]);else throw Error('Kernel compiled symlink/special entry');}}await walk(`${setup}/compiled`);files.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);if(JSON.stringify(files)!==JSON.stringify(manifest.files))throw Error('Research compiled file set/bytes drift');for(const [file,expected] of manifest.ownedSources)if(sha(await step(fs.readFile(`${repo}/${file}`)))!==expected)throw Error('Owned kernel source drift');for(const source of manifest.sourceContents)if(sha(await step(fs.readFile(`${repo}/${source.repositoryPath}`)))!==source.sha256)throw Error('Actual kernel imported source drift');compiledManifest=manifest;return{manifestSha256:compiledPin,files:files.length,sourceContents:manifest.sourceContents.length,unresolvedSources:manifest.unresolvedSources.length};}
async function topology(cdp, label) {
    const processes = (await step(cdp.send('SystemInfo.getProcessInfo'))).processInfo;
    const records = [];
    for (const p of processes.filter(p => p.type === 'GPU' || p.type === 'browser')) {
        const pid = p.id;
        const base = `/proc/${pid}`;
        const exe = await step(fs.readlink(`${base}/exe`));
        if (exe !== receipt.actualBrowser)
            throw Error(`Unexpected ${p.type} executable`);
        if (p.type === 'browser') {
            browserPid = pid;
            ownedPids.add(pid);
        }
        const cwd = await step(fs.readlink(`${base}/cwd`));
        const config = await step(fs.readFile(`${base}/cwd/SwiftShader.ini`));
        const ancestry = [];
        let ancestor = pid;
        for (let depth = 0; depth < 16 && ancestor > 1; depth++) {
            const status = await step(fs.readFile(`/proc/${ancestor}/status`, 'utf8'));
            ancestry.push(ancestor);
            if (ancestor === browserPid)
                break;
            ancestor = Number(/^PPid:\s*(\d+)/m.exec(status)?.[1]);
        }
        if (p.type === 'GPU' && !ancestry.includes(browserPid))
            throw Error('GPU ancestry is outside owned browser');
        capture(pid);
        const threads = [];
        for (const tid of await step(fs.readdir(`${base}/task`))) {
            const t = `${base}/task/${tid}`;
            const comm = (await step(fs.readFile(`${t}/comm`, 'utf8'))).trim();
            const status = await step(fs.readFile(`${t}/status`, 'utf8'));
            threads.push({ tid: Number(tid), comm, affinity: /^Cpus_allowed_list:\s*(.*)$/m.exec(status)?.[1], stat: await step(fs.readFile(`${t}/stat`, 'utf8')) });
        }
        const workers = threads.filter(t => /^Thread<\d+>$/.test(t.comm));
        const swiftshaderMappings = (await step(fs.readFile(`${base}/maps`, 'utf8'))).split('\n').filter(l => l.includes('libvk_swiftshader.so'));
        const driver = path.join(path.dirname(receipt.actualBrowser), 'libvk_swiftshader.so');
        if (swiftshaderMappings.some(l => !l.endsWith(driver)))
            throw Error('Unexpected loaded SwiftShader path');
        const status=await step(fs.readFile(`${base}/status`,'utf8'));const safeStatus={};for(const key of ['Uid','Gid','NoNewPrivs','Seccomp','Seccomp_filters'])safeStatus[key]=new RegExp(`^${key}:\\s*(.*)$`,'m').exec(status)?.[1]??null;const actualArgv=(await step(fs.readFile(`${base}/cmdline`,'utf8'))).split('\0').filter(Boolean);
        records.push({ type: p.type, pid, exe, cwd,actualArgv,safeStatus, ancestry, configSha256: sha(config), threads, workers, swiftshaderMappings, loadedSwiftshaderSha256: sha(await step(fs.readFile(driver))) });
    }
    const result = { label, processes: records, cpuMax: (await step(fs.readFile('/sys/fs/cgroup/cpu.max', 'utf8'))).trim(), cpuset: (await step(fs.readFile('/sys/fs/cgroup/cpuset.cpus.effective', 'utf8'))).trim(), cpuStat: await step(fs.readFile('/sys/fs/cgroup/cpu.stat', 'utf8')) };
    await step(save(`${label}-topology.json`, result));
    const gpu = records.filter(p => p.type === 'GPU');
    if (gpu.length !== 1)
        throw Error('Exactly one identifiable GPU process required');
    if (gpu[0].cwd !== receipt.browserOnlyCwd || gpu[0].configSha256 !== receipt.configSha256 || gpu[0].workers.length !== 3 || gpu[0].workers.some(w=>w.affinity!==receipt.cpuset) || new Set(gpu[0].workers.map(t => t.comm)).size !== 3 || gpu[0].loadedSwiftshaderSha256 !== receipt.swiftshaderLibrarySha256 || !gpu[0].swiftshaderMappings.length || result.cpuMax !== receipt.cpuMax || result.cpuset !== receipt.cpuset)
        throw Error('GPU cwd/config/three-worker/loaded-driver proof failed');
    return result;
}
async function bundleInventory(root){const files=[],directories=[{path:'.',mode:(await step(fs.stat(root))).mode&0o7777}];async function walk(dir){for(const e of await step(fs.readdir(dir,{withFileTypes:true}))){const p=path.join(dir,e.name);if(e.isSymbolicLink())throw Error('Bundle symlink unsupported');const mode=(await step(fs.stat(p))).mode&0o7777;if(e.isDirectory()){directories.push({path:path.relative(root,p),mode});await step(walk(p));}else if(e.isFile())files.push({path:path.relative(root,p),mode});else throw Error('Special bundle file unsupported');}}await step(walk(root));const order=(a,b)=>a.path<b.path?-1:a.path>b.path?1:0;return{files:files.sort(order),directories:directories.sort(order)};}
async function bundleIdentity(){
 const manifestBytes=await step(fs.readFile(`${setup}/bundle-copy-manifest.json`));if(sha(manifestBytes)!==receipt.bundleManifestSha256)throw Error('Bundle manifest changed');
 const manifest=JSON.parse(manifestBytes);if(manifest.copiedRoot!==`${bundle}/browser`||manifest.originalRoot!==path.dirname(receipt.originalBrowser))throw Error('Bundle root mismatch');
 const order=(a,b)=>a.path<b.path?-1:a.path>b.path?1:0;const declared=manifest.files.map(p=>({path:p.path,mode:p.mode})).sort(order),dirs=manifest.directories.slice().sort(order);const originalInventory=await step(bundleInventory(manifest.originalRoot)),copyInventory=await step(bundleInventory(manifest.copiedRoot));if(JSON.stringify(originalInventory.files)!==JSON.stringify(declared)||JSON.stringify(copyInventory.files.filter(p=>p.path!=='SwiftShader.ini'))!==JSON.stringify(declared)||JSON.stringify(originalInventory.directories)!==JSON.stringify(dirs)||JSON.stringify(copyInventory.directories)!==JSON.stringify(dirs))throw Error('Bundle file/directory sets or modes changed');
 const pinnedBrowser=receipt.pinnedBrowserSha256;if(!/^[a-f0-9]{64}$/.test(pinnedBrowser))throw Error('Separate full-Chrome reviewed SHA pin missing');if(manifest.pinnedBrowserSha256!==pinnedBrowser||receipt.originalBrowserSha256!==pinnedBrowser||receipt.actualBrowserSha256!==pinnedBrowser||sha(await step(fs.readFile(receipt.originalBrowser)))!==pinnedBrowser||sha(await step(fs.readFile(receipt.actualBrowser)))!==pinnedBrowser)throw Error('Browser differs from preserved exact binary');
 for(const item of manifest.files){if(item.path.includes('..')||path.isAbsolute(item.path))throw Error('Unsafe bundle manifest path');const original=path.join(manifest.originalRoot,item.path),copied=path.join(manifest.copiedRoot,item.path);const a=await step(fs.stat(original)),b=await step(fs.stat(copied));if(a.dev===b.dev&&a.ino===b.ino)throw Error('Copy aliases original inode');if(sha(await step(fs.readFile(original)))!==item.sha256||sha(await step(fs.readFile(copied)))!==item.sha256)throw Error('Original/copied bundle identity changed');}
 if(process.execPath!==receipt.nodeExecutable||process.version!==receipt.nodeVersion||sha(await step(fs.readFile(process.execPath)))!==receipt.nodeExecutableSha256)throw Error('Managed Node identity changed');
 return{bundleManifestSha256:receipt.bundleManifestSha256,files:manifest.files.length,originalBrowser:receipt.originalBrowser,actualBrowser:receipt.actualBrowser,nodeVersion:process.version,nodeExecutable:process.execPath,nodeSha256:receipt.nodeExecutableSha256};
}
async function run() {
    if(receipt.method!=='timer-query'||receipt.methodFallback!==false)throw Error('Exactly supported timer-query or explicit capability stop required');
    const qualificationBytes=await step(fs.readFile(`${setup}/current-build-qualification.json`));if(sha(qualificationBytes)!==receipt.currentBuildQualificationSha256)throw Error('Current qualification receipt drift');
    if(receipt.sourceBridgeSha256){const bytes=await step(fs.readFile(`${setup}/source-bridge.json`));if(sha(bytes)!==receipt.sourceBridgeSha256)throw Error('Reviewed source bridge drift');const bridge=JSON.parse(bytes);if(bridge.currentSourceSha256!==receipt.sourceManifestSha256)throw Error('Reviewed current source bridge mismatch');}
    if (receipt.browserImplementation!=='full-chrome'||receipt.registryRevision!=='1234'||receipt.registryVersion!=='151.0.7922.34'||receipt.originalBrowser!=='/workspace/cloud-bootstrap/starship-v1/browsers/chromium-1234/chrome-linux64/chrome'||receipt.actualBrowser!==`${bundle}/browser/chrome`)throw Error('Exact full-Chrome route required, never headless-shell fallback');
    const registryPath=require.resolve('playwright-core/package.json').replace(/package\.json$/,'browsers.json');const registry=JSON.parse(await step(fs.readFile(registryPath,'utf8'))).browsers.find(b=>b.name==='chromium');if(registry?.revision!==receipt.registryRevision||registry.browserVersion!==receipt.registryVersion)throw Error('Full-Chrome registry changed');
    if (receipt.threadCount !== 3 || receipt.affinitySetting !== null)
        throw Error('Reviewed ThreadCount3-only preparation required');
    for (const [file, expected] of [[receipt.actualBrowser, receipt.actualBrowserSha256], [receipt.wrapper, receipt.wrapperSha256], [receipt.config, receipt.configSha256]])
        if (sha(await step(fs.readFile(file))) !== expected)
            throw Error(`Setup digest changed:${file}`);
    for (const file of ['index.html', 'sw.js'])
        if (!(await step(fs.stat(`${repo}/dist/${file}`))).isFile())
            throw Error('Required prebuilt dist missing');
    await step(save('before-kernel-identity.json',await step(kernelIdentity())));
    await step(save('before-bundle-identity.json',await step(bundleIdentity())));
    const before = await step(identity());
    await step(save('before-identity.json', before));
    if (JSON.stringify(before.source) !== JSON.stringify(receipt.sourceManifest) || JSON.stringify(before.build) !== JSON.stringify(receipt.buildFiles)||JSON.stringify(before.maps)!==JSON.stringify(receipt.mapFiles))
        throw Error('Source/build changed since preparation');
    server = http.createServer(async (req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:1280px;height:720px;overflow:hidden}canvas{display:block;width:1280px;height:720px}</style><canvas data-testid="world-canvas" width="1280" height="720"></canvas>');return;}const root=pathname.startsWith('/assets/')?`${repo}/public`:`${setup}/compiled`;const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+'/'))throw Error('Outside owned static root');const data=await step(fs.readFile(file));const types={'.js':'text/javascript','.map':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(data);}catch{res.writeHead(404).end();}});
    await step(new Promise(r => server.listen(0, '127.0.0.1', r)));
    check();
    launchPromise = chromium.launch({ executablePath: receipt.wrapper, headless: true, timeout: 30000, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    launchPromise.then(b => { browser = b; if (stopped)
        void b.close().catch(() => { }); }, e => {launchFailure=e;});
    await step(waitOwner());
    check();
    await step(fs.writeFile(`${setup}/GO`, 'authorized owned launch\n', { flag: 'wx' }));
    check();
    browser = await step(launchPromise);
    check();
    const cdp = await step(browser.newBrowserCDPSession());
    // Record owned browser PID early, before any GPU/config validation can fail.
    for (const p of (await step(cdp.send('SystemInfo.getProcessInfo'))).processInfo)
        if (p.type === 'browser') {
            if (await step(fs.readlink(`/proc/${p.id}/exe`)) !== receipt.actualBrowser)
                throw Error('Unexpected owned browser');
            browserPid = p.id;
            ownedPids.add(p.id);
        }
    const initialTopology=await step(topology(cdp,'initial'));
    const modeStates=[],modeShots=[];
    function comparable(state){const copy=structuredClone(state);delete copy.rendererPolicy.selectedBatchBound;delete copy.renderCount;return lossless(copy);}
    function policy(state,width){const p=state.rendererPolicy;if(p.selectedBatchBound!==width||p.originalBatchBound!==32||p.hardwareMaximum!==32||p.antialias!==true||p.resolution!==1||p.dpr!==1||p.backingWidth!==1280||p.backingHeight!==720||p.drawingBufferWidth!==1280||p.drawingBufferHeight!==720||state.viewport.width!==1280||state.viewport.height!==720)throw Error('Actual kernel policy/AA/DPR/resolution/backing changed');}
    function assertFrozen(before,after){if(JSON.stringify(comparable(before))!==JSON.stringify(comparable(after)))throw Error('Full core/camera/public-scene frozen witness drift');if(after.renderCount!==before.renderCount+20)throw Error('Exactly20 kernel renders required');}
    for(const width of [32,1]){
      // Separate fresh ESM realm prevents global DefaultShader sharing. First
      // page is completely closed before the second is even created.
      page=await step(browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}));
      function event(value){const bytes=Buffer.byteLength(JSON.stringify(value));if(consoleBytes+bytes>consoleCap){collectionTruncated=true;return;}consoleBytes+=bytes;events.push({width,...value});}
      page.on('console',m=>event({type:m.type(),text:m.text()}));page.on('pageerror',e=>event({type:'pageerror',text:String(e)}));
      const output=ts.transpileModule(await step(fs.readFile(`${repo}/tests/e2e/visual-budget-probe.ts`,'utf8')),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox={exports:{}};vm.runInNewContext(output,sandbox);
      await step(page.addInitScript({content:[sandbox.exports.installBudgetProbe,installProgramAttribution].map(fn=>`(${fn.toString()})();`).join('\n')}));
      await step(page.goto(`http://127.0.0.1:${server.address().port}/`,{timeout:30000}));
      await step(page.evaluate(async width=>{const module=await import('/kernel.js');window.__kernel=await module.createKernel(width);},width));
      const capability=await step(page.evaluate(()=>window.__programAttribution.capability()));await step(save(`width${width}-timer-capability.json`,capability));
      if(!capability.supported){await step(save('method-outcome.json',{method:'timer-query',unsupportedWidth:width,explicitCapabilityStop:true,noFallback:true,acceptance:false}));throw Error('Explicit actual timer capability stop');}
      const conditioning=await step(page.evaluate(()=>window.__kernel.condition()));await step(save(`width${width}-conditioning.json`,conditioning));
      const frozen=conditioning.frozen,p=frozen.presentation;policy(frozen,width);await step(save(`width${width}-conditioning-lossless.json`,lossless(conditioning)));
      if(frozen.renderCount!==3||!frozen.physicsFrozen||p.bell.visibleMounts<=0||!p.particles.some(row=>row.count>0)||!p.renderer.filters.some(f=>f.id==='bloom'&&f.attached&&f.enabled&&f.compatible)||!Number.isFinite(frozen.state.kinematics.altitude)||frozen.state.kinematics.altitude<=0||Object.entries(frozen.telemetry).some(([k,v])=>k.startsWith('failures.')&&v===true))throw Error('Deterministic positive fixture failed');
      if(modeStates.length&&JSON.stringify(comparable(modeStates[0]))!==JSON.stringify(comparable(frozen)))throw Error('Width32/1 deterministic core/camera/public-scene state differs before timing');
      modeStates.push(frozen);
      if(width===1){
        const bytes=await step(page.locator('[data-testid="world-canvas"]').screenshot({scale:'device',animations:'allow',timeout:10000}));if(bytes.length>artifactCap||exportedBytes+bytes.length>exportedCap-1024*1024){collectionTruncated=true;throw Error('Prewindow screenshot cap exceeded');}exportedBytes+=bytes.length;await step(fs.writeFile(`${setup}/width1-before-positive.png`,bytes,{flag:'wx'}));
        const pixels=await step(page.evaluate(async shots=>{const images=[];for(const shot of shots){const bitmap=await createImageBitmap(await(await fetch('data:image/png;base64,'+shot.data)).blob());const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),context=canvas.getContext('2d');if(!context)throw Error('Pixel decoder unavailable');context.drawImage(bitmap,0,0);images.push(context.getImageData(0,0,bitmap.width,bitmap.height));bitmap.close();}if(images.some(image=>image.width!==1280||image.height!==720))throw Error('Actual screenshot dimensions differ');let disagreement=0;for(let i=0;i<images[0].data.length;i+=4)if(Math.max(...[0,1,2].map(c=>Math.abs(images[0].data[i+c]-images[1].data[i+c])))>6)disagreement++;return{disagreement,thresholdPerChannel:6,sourcePositiveFixture:true,photographicAcceptance:false};},[modeShots[0],{width:1,data:bytes.toString('base64'),sha256:sha(bytes)}]));await step(save('candidate-prewindow-pixel-equivalence.json',pixels));if(pixels.disagreement)throw Error('Deterministic32/1 positive pixel mismatch before candidate timing');
      }
      const beforeTopology=await step(topology(cdp,`width${width}-before`));
      await step(page.evaluate(()=>{window.__programAttribution.start();window.__visualBudget.start(0,20);let count=0;function tick(){window.__kernel.draw();count++;if(count<20)requestAnimationFrame(tick);else requestAnimationFrame(()=>{});}requestAnimationFrame(tick);}));
      await step(page.waitForFunction(()=>{const p=window.__visualBudget.result();return p.done||p.errors.length;},undefined,{timeout:60000,polling:100}));
      const phase=await step(page.evaluate(()=>({probe:window.__visualBudget.result(),snapshot:window.__kernel.snapshot()})));await step(save(`width${width}-draws.json`,phase));await step(save(`width${width}-snapshot-lossless.json`,lossless(phase.snapshot)));policy(phase.snapshot,width);assertFrozen(frozen,phase.snapshot);
      if(!phase.probe.done||phase.probe.frames.length!==20||phase.probe.errors.length||phase.probe.frames.some(f=>f.callbacks<1||f.draws<1||f.gpuFences<1))throw Error('Incomplete actual20 kernel frames/fences');
      await step(page.waitForFunction(()=>{const q=window.__programAttribution.drain();return q.complete||q.disjoint||q.errors.length;},undefined,{timeout:10000,polling:100}));
      const attribution=await step(page.evaluate(()=>window.__programAttribution.result()));await step(save(`width${width}-actual-program-operations.json`,attribution));
      if(!attribution.captureDone||attribution.disjoint!==false||attribution.errors.length||attribution.glError!==0||!attribution.records.length||attribution.records.some(row=>!row.available||!Number.isFinite(row.gpuElapsedNs)||row.gpuElapsedNs<0))throw Error('Invalid/unavailable/disjoint timer samples; no subset accepted');
      const timestamps=phase.probe.frames.map(f=>f.timestamp);if(JSON.stringify([...new Set(attribution.records.map(r=>r.timestamp))])!==JSON.stringify(timestamps))throw Error('All20 timestamps must have complete queries');
      for(const frame of phase.probe.frames)if(attribution.records.filter(r=>r.timestamp===frame.timestamp&&(r.operation==='clear'||r.operation.startsWith('draw'))).length!==frame.draws)throw Error('Actual per-frame timed clear/draw count mismatch');
      const generatorPath=`${repo}/node_modules/pixi.js/lib/rendering/high-shader/shader-bits/generateTextureBatchBit.mjs`,generatorBytes=await step(fs.readFile(generatorPath));
      const {generateTextureBatchBitGl}=await step(import(generatorPath));
      const normalize=text=>text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'').replace(/\s+/g,'');
      const canonicalMain=generateTextureBatchBitGl(width).fragment.main;
      const batchLinks=[];
      for(const program of attribution.programs)for(const link of program.links){
        const executed=attribution.records.some(r=>r.programId===program.id&&r.programGeneration===link.generation);if(!executed)continue;
        const fragments=link.linkedShaders.filter(shader=>shader.kind===35632);
        const batchFragments=fragments.filter(shader=>/\buTextures\s*\[/.test(shader.source??'')||/SHADER_NAME\s+batch-fragment/.test(shader.source??''));
        if(!batchFragments.length)continue;
        for(const fragment of batchFragments){const match=fragment.source.match(/uniform\s+sampler2D\s+uTextures\s*\[\s*(\d+)\s*\]/);if(!match||Number(match[1])!==width||!normalize(fragment.source).includes(normalize(canonicalMain)))throw Error('Every executed batch generation must match declared width and locked generator body');}
        batchLinks.push({programId:program.id,...link});
      }
      if(!batchLinks.length)throw Error('No actual executed batch generation');
      const afterTopology=await step(topology(cdp,`width${width}-after`));
      const beforeGpu=beforeTopology.processes.find(p=>p.type==='GPU'),afterGpu=afterTopology.processes.find(p=>p.type==='GPU');if(beforeGpu.pid!==afterGpu.pid||JSON.stringify(beforeGpu.workers.map(w=>w.tid))!==JSON.stringify(afterGpu.workers.map(w=>w.tid)))throw Error('Actual GPU/worker identity changed inside window');
      const ticks=t=>{const f=t.stat.slice(t.stat.lastIndexOf(')')+2).split(' ');return Number(f[11])+Number(f[12]);};
      await step(save(`width${width}-summary.json`,{width,frames:20,firstFrameIncluded:true,kernelOnly:true,sessionAcceptance:false,lockedGeneratorSha256:sha(generatorBytes),canonicalGeneratedMain:canonicalMain,actualLinkedBatchShaders:batchLinks.map(link=>({...link,linkedShaders:link.linkedShaders.map(shader=>({...shader,sha256:sha(shader.source)}))})),queryTotalNs:attribution.records.reduce((sum,r)=>sum+r.gpuElapsedNs,0),batchQueryNs:attribution.records.filter(r=>batchLinks.some(link=>link.programId===r.programId&&link.generation===r.programGeneration)).reduce((sum,r)=>sum+r.gpuElapsedNs,0),cadenceFps:19000/(timestamps.at(-1)-timestamps[0]),workerCpuTicks:afterGpu.workers.map(w=>({tid:w.tid,ticks:ticks(w)-ticks(beforeGpu.workers.find(b=>b.tid===w.tid))})),clockTicksPerSecond:Number(execFileSync('getconf',['CLK_TCK'],{encoding:'utf8'}).trim()),cgroupBefore:beforeTopology.cpuStat,cgroupAfter:afterTopology.cpuStat,noShaderCpuClaim:true,initialGpuIdentity:initialTopology.processes.find(p=>p.type==='GPU')}));
      const bytes=await step(page.locator('[data-testid="world-canvas"]').screenshot({scale:'device',animations:'allow',timeout:10000}));if(bytes.length>artifactCap||exportedBytes+bytes.length>exportedCap-1024*1024){collectionTruncated=true;throw Error('Screenshot storage cap exceeded');}exportedBytes+=bytes.length;await step(fs.writeFile(`${setup}/width${width}-positive.png`,bytes,{flag:'wx'}));modeShots.push({width,data:bytes.toString('base64'),sha256:sha(bytes)});
      await step(page.evaluate(()=>window.__kernel.destroy()));await step(page.close());page=null;
    }
    const comparisonPage=await step(browser.newPage());page=comparisonPage;
    const pixels=await step(page.evaluate(async shots=>{const images=[];for(const shot of shots){const bitmap=await createImageBitmap(await(await fetch('data:image/png;base64,'+shot.data)).blob());const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),context=canvas.getContext('2d');if(!context)throw Error('Pixel decoder unavailable');context.drawImage(bitmap,0,0);images.push(context.getImageData(0,0,bitmap.width,bitmap.height));bitmap.close();}if(images.some(image=>image.width!==1280||image.height!==720))throw Error('Actual screenshot dimensions differ');let disagreement=0;for(let i=0;i<images[0].data.length;i+=4)if(Math.max(...[0,1,2].map(c=>Math.abs(images[0].data[i+c]-images[1].data[i+c])))>6)disagreement++;return{disagreement,thresholdPerChannel:6,sourcePositiveFixture:true,photographicAcceptance:false};},modeShots));await step(save('kernel-positive-pixels.json',pixels));if(pixels.disagreement)throw Error('Width32/1 frozen positive pixels differ');await step(page.close());page=null;
    if(events.some(e=>e.type==='pageerror')||collectionTruncated)throw Error('Pageerror or raw collection truncation');
    await step(save('after-kernel-identity.json',await step(kernelIdentity())));
    await step(save('after-bundle-identity.json',await step(bundleIdentity())));
    const after = await step(identity());
    await step(save('after-identity.json', after));
    if (before.sourceSha256 !== after.sourceSha256 || before.buildSha256 !== after.buildSha256||before.mapsSha256!==after.mapsSha256)
        throw Error('Boundary source/build identity changed');
    await step(save('functional-outcome.json', { passed: true, draws:40,conditioningDraws:6,performanceAcceptance:false, limitation:'NEW deterministic render-kernel32/1 causal fixture only; not old wall-conditioned replay, full session or throughput/quality acceptance' }));
}
async function cleanup(){
    stopped = true;
    clearTimeout(deadlineTimer);
    const cleanupStart = Date.now(), cleanupDeadline = cleanupStart + 5000;
    const actions = [];
    // STOP prevents an unregistered/late wrapper from executing Chromium. GO is
    // issued only after its PID/starttime is captured, so every permitted browser
    // has a stable owner even when launch's protocol promise never resolves.
    try {
        syncfs.writeFileSync(`${setup}/STOP`, 'stop\n', { flag: 'wx' });
    }
    catch (e) {
        if (e.code !== 'EEXIST')
            actions.push(String(e));
    }
    function snapshotDescendants() { if(!browserPid){for(const name of syncfs.readdirSync('/proc'))if(/^\d+$/.test(name)){const v=processStat(Number(name));if(v?.ppid===process.pid&&['/usr/bin/bash','/bin/bash','/usr/bin/env'].includes(processIdentity(v.pid)?.exe)){try{const argv=syncfs.readFileSync(`/proc/${v.pid}/cmdline`,'utf8').split('\0');if(argv.includes(receipt.wrapper)){browserPid=v.pid;ownedIdentities.set(v.pid,processIdentity(v.pid));ownedPids.add(v.pid);break;}}catch{/* Candidate vanished during read-only fallback ownership scan. */}}}}const root = ownedIdentities.get(browserPid); if (!root)
        return; const candidates = []; for (const name of syncfs.readdirSync('/proc'))
        if (/^\d+$/.test(name)) {
            const v = processStat(Number(name));
            if (v)
                candidates.push(v);
        } for (const v of candidates) {
        // Full Chrome may detach its private copied crashpad handler. Unique
        // bundle path plus post-owner starttime identifies these exact descendants.
        if(v.state!=='Z'&&BigInt(v.starttime)>=BigInt(root.starttime)){const n=processIdentity(v.pid);if(n?.exe?.startsWith(`${bundle}/browser/`)){ownedIdentities.set(v.pid,n);ownedPids.add(v.pid);}}
        const currentRoot = processIdentity(root.pid);
        if (root.pgrp===root.pid&&v.pgrp === root.pgrp && BigInt(v.starttime) >= BigInt(root.starttime) && (!currentRoot || currentRoot.starttime === root.starttime) ) {
            ownedIdentities.set(v.pid,processIdentity(v.pid)??v);
            ownedPids.add(v.pid);
        }
        let cur=v;const seen=new Set();
        while (cur && !seen.has(cur.pid)) {
            seen.add(cur.pid);
            if (cur.pid === root.pid && cur.starttime === root.starttime) {
                {
                    ownedIdentities.set(v.pid,processIdentity(v.pid)??v);
                    ownedPids.add(v.pid);
                }
                break;
            }
            cur = candidates.find(x => x.pid === cur.ppid);
        }
    } }
    snapshotDescendants();
    let partial;
    if(primaryError&&page){try{partial=await Promise.race([page.evaluate(()=>{
        const receipt={probe:null,renderer:null,errors:[]};
        try{receipt.probe=window.__visualBudget?.result()??null;}catch(error){receipt.errors.push({component:'probe',error:String(error)});}
        try{receipt.attribution=window.__programAttribution?.result()??null;}catch(error){receipt.errors.push({component:'attribution',error:String(error)});}
        try{receipt.kernel=window.__kernel?.snapshot()??null;}catch(error){receipt.errors.push({component:'kernel',error:String(error)});}
        try{receipt.renderer=window.__kernel?.snapshot().presentation.renderer??null;}catch(error){receipt.errors.push({component:'renderer',error:String(error)});}
        return receipt;
    }),new Promise(r=>setTimeout(r,500))]);}catch(e){actions.push(String(e));}}
    if (browser)
        void browser.close().catch(e => actions.push(String(e)));
    // Graceful close plus final identity-checked kill and absence verification all
    // fit the shared cleanup deadline; resolved browser.close alone is not proof.
    while (Date.now() < cleanupDeadline - 2250) {
        snapshotDescendants();
        const live = [...ownedIdentities.values()].filter(v => { const n = processIdentity(v.pid); return n && n.starttime === v.starttime && n.state !== 'Z'; });
        if (!live.length)
            break;
        if (Date.now() - cleanupStart > 2000)
            for (const v of live) {
                try {
                    actions.push({ pid: v.pid, killed: signalOwned(v.pid) });
                }
                catch (e) {
                    actions.push(String(e));
                }
            }
        await new Promise(r => setTimeout(r, 25));
    }
    snapshotDescendants();
    for (const v of ownedIdentities.values()) {
        try {
            signalOwned(v.pid);
        }
        catch (e) {
            actions.push(String(e));
        }
    }
    while(Date.now()<cleanupDeadline-2000){const live=[...ownedIdentities.values()].some(v=>{const n=processIdentity(v.pid);return n&&n.starttime===v.starttime&&n.state!=='Z';});if(!live)break;await new Promise(r=>setTimeout(r,25));}
    const remaining = [...ownedIdentities.values()].filter(v => { const n = processIdentity(v.pid); return n && n.starttime === v.starttime && n.state !== 'Z'; });
    server?.closeAllConnections();
    server?.close();
    // Reserve the final two seconds of the SAME five-second cleanup for an
    // independent filesystem boundary, even when the work deadline stopped run().
    const finalIntegrity={sourceVerified:false,buildVerified:false,bundleVerified:false,kernelVerified:false,error:null};
    try{
        const until=cleanupDeadline-100;const assertTime=()=>{if(Date.now()>=until)throw Error('Final integrity boundary exceeded shared cleanup time');};
        for(const [name,expected] of receipt.additionalGithubFiles??[]){assertTime();if(sha(syncfs.readFileSync(`${repo}/${name}`))!==expected)throw Error('Final CI pin changed');}
        const finalSourcePaths=execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{cwd:repo,encoding:'utf8'}).split('\0').filter(p=>/^(src\/|tests\/|scripts\/|public\/|\.agents\/|\.nvmrc$|package[^/]*\.json$|[^/]*config\.[^/]+$)/.test(p)).sort();if(JSON.stringify(finalSourcePaths)!==JSON.stringify(receipt.sourceManifest.map(p=>p[0])))throw Error('Final source file set drift');
        for(const [name,expected] of receipt.sourceManifest){assertTime();const file=`${repo}/${name}`;const actual=syncfs.existsSync(file)?sha(syncfs.readFileSync(file)):null;if(actual!==expected)throw Error(`Final source mismatch:${name}`);}finalIntegrity.sourceVerified=true;
        const finalBuildPaths=[],finalMapPaths=[];function buildWalk(dir){for(const e of syncfs.readdirSync(dir,{withFileTypes:true})){assertTime();const file=path.join(dir,e.name);if(e.isDirectory())buildWalk(file);else (file.endsWith('.map')?finalMapPaths:finalBuildPaths).push(path.relative(`${repo}/dist`,file));}}buildWalk(`${repo}/dist`);if(JSON.stringify(finalBuildPaths.sort())!==JSON.stringify(receipt.buildFiles.map(p=>p[0])))throw Error('Final build file set drift');
        for(const [name,expected] of receipt.buildFiles){assertTime();if(sha(syncfs.readFileSync(`${repo}/dist/${name}`))!==expected)throw Error(`Final build mismatch:${name}`);}if(JSON.stringify(finalMapPaths.sort())!==JSON.stringify(receipt.mapFiles.map(p=>p[0])))throw Error('Final map file set drift');for(const [name,expected] of receipt.mapFiles){assertTime();if(sha(syncfs.readFileSync(`${repo}/dist/${name}`))!==expected)throw Error('Final map digest drift');}for(const proof of receipt.physicsProofs){assertTime();if(sha(syncfs.readFileSync(`${repo}/${proof.path}`))!==proof.sha256)throw Error('Final approved physics proof drift');}finalIntegrity.buildVerified=true;
        if(!compiledManifest){const data=syncfs.readFileSync(`${setup}/kernel-compiled-manifest.json`);if(sha(data)!==compiledPin)throw Error('Final kernel manifest drift');compiledManifest=JSON.parse(data);}for(const [file,expected] of compiledManifest.supervisedBuildReceipts){assertTime();if(sha(syncfs.readFileSync(`${setup}/${file}`))!==expected)throw Error('Final supervised build receipt drift');}for(const [file,expected] of compiledManifest.ownedSources){assertTime();if(sha(syncfs.readFileSync(`${repo}/${file}`))!==expected)throw Error('Final owned kernel source drift');}for(const source of compiledManifest.sourceContents){assertTime();if(sha(syncfs.readFileSync(`${repo}/${source.repositoryPath}`))!==source.sha256)throw Error('Final imported kernel source drift');}const kernelFiles=[];function kernelWalk(dir){for(const e of syncfs.readdirSync(dir,{withFileTypes:true})){assertTime();const file=path.join(dir,e.name);if(e.isDirectory())kernelWalk(file);else if(e.isFile())kernelFiles.push([path.relative(`${setup}/compiled`,file),sha(syncfs.readFileSync(file))]);else throw Error('Final kernel special/symlink');}}kernelWalk(`${setup}/compiled`);kernelFiles.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);if(JSON.stringify(kernelFiles)!==JSON.stringify(compiledManifest.files))throw Error('Final kernel compiled inventory drift');finalIntegrity.kernelVerified=true;
        const bytes=syncfs.readFileSync(`${setup}/bundle-copy-manifest.json`);if(sha(bytes)!==receipt.bundleManifestSha256)throw Error('Final bundle manifest drift');const manifest=JSON.parse(bytes);
        for(const item of manifest.files){for(const root of [manifest.originalRoot,manifest.copiedRoot]){assertTime();const file=path.join(root,item.path);const st=syncfs.statSync(file);if((st.mode&0o7777)!==item.mode||sha(syncfs.readFileSync(file))!==item.sha256)throw Error(`Final bundle bytes/mode mismatch:${item.path}`);}}
        for(const item of manifest.directories){for(const root of [manifest.originalRoot,manifest.copiedRoot]){assertTime();if((syncfs.statSync(path.join(root,item.path)).mode&0o7777)!==item.mode)throw Error('Final bundle directory mode drift');}}
        const declaredFiles=manifest.files.map(f=>f.path).sort(),declaredDirs=manifest.directories.map(d=>d.path).filter(d=>d!=='.').sort();
        for(const root of [manifest.originalRoot,manifest.copiedRoot]){const files=[],dirs=[];function walk(dir){for(const e of syncfs.readdirSync(dir,{withFileTypes:true})){assertTime();const file=path.join(dir,e.name);if(e.isSymbolicLink())throw Error('Final bundle symlink');if(e.isDirectory()){dirs.push(path.relative(root,file));walk(file);}else if(e.isFile())files.push(path.relative(root,file));else throw Error('Final bundle special entry');}}walk(root);if(JSON.stringify(files.filter(f=>root!==manifest.copiedRoot||f!=='SwiftShader.ini').sort())!==JSON.stringify(declaredFiles)||JSON.stringify(dirs.sort())!==JSON.stringify(declaredDirs))throw Error('Final bundle sets drift');}
        assertTime();if(sha(syncfs.readFileSync(receipt.config))!==receipt.configSha256||sha(syncfs.readFileSync(process.execPath))!==receipt.nodeExecutableSha256)throw Error('Final config/Node drift');finalIntegrity.bundleVerified=true;
    }catch(error){finalIntegrity.error=String(error);primaryError??=error;}

    function durable(name, value) { try {
        syncfs.writeFileSync(`${setup}/${name}`,encoded(value,true),{flag:'wx'});
    }
    catch (e) {
        actions.push(String(e));primaryError??=e;
    } }
    if(collectionTruncated||remaining.length||inaccessibleOwned.size||Date.now()>cleanupDeadline)primaryError??=Error('Cleanup/integrity/collection qualification failed');
    durable('final-integrity.json',finalIntegrity);
    if(partial){durable('partial-progress.json',partial);if(partial.kernel)durable('partial-kernel-lossless.json',lossless(partial.kernel));}
    if (primaryError)
        durable('failure.json', { error: String(primaryError), elapsedMs: Date.now() - started });
    durable('console.json', events);
    durable('cleanup.json', { actions, ownedIdentities: [...ownedIdentities.values()], remaining,inaccessibleOwned:[...inaccessibleOwned], verifiedDescendantAbsence: remaining.length === 0&&inaccessibleOwned.size===0, cleanupMs: Date.now() - cleanupStart, launchSettled: !!browser, elapsedMs: Date.now() - started });
    durable('collection-status.json',{exportedCapBytes:exportedCap,artifactCapBytes:artifactCap,consoleCapBytes:consoleCap,exportedBytes,consoleBytes,truncated:collectionTruncated});
    if(collectionTruncated||remaining.length||inaccessibleOwned.size||Date.now()>cleanupDeadline)primaryError??=Error('Cleanup bound or verified descendant absence failed');
    durable('qualification-outcome.json',{qualified:!primaryError,error:primaryError?String(primaryError):null,performanceAcceptance:false,requiresFreshActualResultReview:true,noAutomatic300Trial:true});
}
try { await Promise.race([run(),deadline,interrupted]); }
catch(error){primaryError=error;}
finally {await cleanup();}
if (primaryError) {
    console.error(String(primaryError));
    process.exit(1);
}
process.exit(0);
