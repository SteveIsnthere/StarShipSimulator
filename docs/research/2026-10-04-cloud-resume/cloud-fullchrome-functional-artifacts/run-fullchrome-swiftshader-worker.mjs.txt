/** Research-only FULL CHROME qualification;20draw functional topology, no acceptance verdict. */
import fs from 'node:fs/promises';
import syncfs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
const repo = '/workspace/StarShipSimulator';
const require = createRequire(`${repo}/package.json`);
const { chromium } = require('playwright');
const ts = require('typescript');
const setup = process.argv[2];
if (process.env.RUN_FULLCHROME_SWIFTSHADER_WORKER !== '1' || !setup || !/^\/tmp\/starship-fullchrome-worker\.[A-Za-z0-9]+$/.test(setup))
    throw Error('Explicit opt-in and exact prepared private directory required');
const receipt = JSON.parse(await fs.readFile(`${setup}/setup-receipt.json`, 'utf8'));
const sha = b => createHash('sha256').update(b).digest('hex');
let exportedBytes=0,consoleBytes=0,collectionTruncated=false;
const exportedCap=32*1024*1024,artifactCap=16*1024*1024,consoleCap=512*1024;
function encoded(value,emergency=false){const text=JSON.stringify(value,null,2)+'\n';const bytes=Buffer.byteLength(text);if(bytes>artifactCap||exportedBytes+bytes>exportedCap-(emergency?0:1024*1024)){collectionTruncated=true;throw Error('Declared raw receipt cap exceeded');}exportedBytes+=bytes;return text;}
const save = (name, value) => fs.writeFile(`${setup}/${name}`,encoded(value),{flag:'wx'});
let browser, server, page, browserPid, deadlineTimer, primaryError, launchPromise,launchFailure, stopped = false;
const ownedIdentities = new Map();
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
    const build = [];
    async function walk(dir) { for (const e of (await step(fs.readdir(dir, { withFileTypes: true }))).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
        const p = path.join(dir, e.name);
        if (e.isDirectory())
            await step(walk(p));
        else if (!p.endsWith('.map'))
            build.push([path.relative(`${repo}/dist`, p), sha(await step(fs.readFile(p)))]);
    } }
    await step(walk(`${repo}/dist`));
    build.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
    return { source, build, sourceSha256: sha(JSON.stringify(source)), buildSha256: sha(JSON.stringify(build)), head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), runnerSha256: sha(await step(fs.readFile(new URL(import.meta.url)))) };
}
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
 const manifest=JSON.parse(manifestBytes);if(manifest.copiedRoot!==`${setup}/browser`||manifest.originalRoot!==path.dirname(receipt.originalBrowser))throw Error('Bundle root mismatch');
 const order=(a,b)=>a.path<b.path?-1:a.path>b.path?1:0;const declared=manifest.files.map(p=>({path:p.path,mode:p.mode})).sort(order),dirs=manifest.directories.slice().sort(order);const originalInventory=await step(bundleInventory(manifest.originalRoot)),copyInventory=await step(bundleInventory(manifest.copiedRoot));if(JSON.stringify(originalInventory.files)!==JSON.stringify(declared)||JSON.stringify(copyInventory.files.filter(p=>p.path!=='SwiftShader.ini'))!==JSON.stringify(declared)||JSON.stringify(originalInventory.directories)!==JSON.stringify(dirs)||JSON.stringify(copyInventory.directories)!==JSON.stringify(dirs))throw Error('Bundle file/directory sets or modes changed');
 const pinnedBrowser=receipt.pinnedBrowserSha256;if(!/^[a-f0-9]{64}$/.test(pinnedBrowser))throw Error('Separate full-Chrome reviewed SHA pin missing');if(manifest.pinnedBrowserSha256!==pinnedBrowser||receipt.originalBrowserSha256!==pinnedBrowser||receipt.actualBrowserSha256!==pinnedBrowser||sha(await step(fs.readFile(receipt.originalBrowser)))!==pinnedBrowser||sha(await step(fs.readFile(receipt.actualBrowser)))!==pinnedBrowser)throw Error('Browser differs from preserved exact binary');
 for(const item of manifest.files){if(item.path.includes('..')||path.isAbsolute(item.path))throw Error('Unsafe bundle manifest path');const original=path.join(manifest.originalRoot,item.path),copied=path.join(manifest.copiedRoot,item.path);const a=await step(fs.stat(original)),b=await step(fs.stat(copied));if(a.dev===b.dev&&a.ino===b.ino)throw Error('Copy aliases original inode');if(sha(await step(fs.readFile(original)))!==item.sha256||sha(await step(fs.readFile(copied)))!==item.sha256)throw Error('Original/copied bundle identity changed');}
 if(process.execPath!==receipt.nodeExecutable||process.version!==receipt.nodeVersion||sha(await step(fs.readFile(process.execPath)))!==receipt.nodeExecutableSha256)throw Error('Managed Node identity changed');
 return{bundleManifestSha256:receipt.bundleManifestSha256,files:manifest.files.length,originalBrowser:receipt.originalBrowser,actualBrowser:receipt.actualBrowser,nodeVersion:process.version,nodeExecutable:process.execPath,nodeSha256:receipt.nodeExecutableSha256};
}
async function run() {
    if (receipt.browserImplementation!=='full-chrome'||receipt.registryRevision!=='1234'||receipt.registryVersion!=='151.0.7922.34'||receipt.originalBrowser!=='/workspace/cloud-bootstrap/starship-v1/browsers/chromium-1234/chrome-linux64/chrome'||receipt.actualBrowser!==`${setup}/browser/chrome`)throw Error('Exact full-Chrome route required, never headless-shell fallback');
    const registryPath=require.resolve('playwright-core/package.json').replace(/package\.json$/,'browsers.json');const registry=JSON.parse(await step(fs.readFile(registryPath,'utf8'))).browsers.find(b=>b.name==='chromium');if(registry?.revision!==receipt.registryRevision||registry.browserVersion!==receipt.registryVersion)throw Error('Full-Chrome registry changed');
    if (receipt.threadCount !== 3 || receipt.affinitySetting !== null)
        throw Error('Reviewed ThreadCount3-only preparation required');
    for (const [file, expected] of [[receipt.actualBrowser, receipt.actualBrowserSha256], [receipt.wrapper, receipt.wrapperSha256], [receipt.config, receipt.configSha256]])
        if (sha(await step(fs.readFile(file))) !== expected)
            throw Error(`Setup digest changed:${file}`);
    for (const file of ['index.html', 'sw.js'])
        if (!(await step(fs.stat(`${repo}/dist/${file}`))).isFile())
            throw Error('Required prebuilt dist missing');
    await step(save('before-bundle-identity.json',await step(bundleIdentity())));
    const before = await step(identity());
    await step(save('before-identity.json', before));
    if (JSON.stringify(before.source) !== JSON.stringify(receipt.sourceManifest) || JSON.stringify(before.build) !== JSON.stringify(receipt.buildFiles))
        throw Error('Source/build changed since preparation');
    server = http.createServer(async (req, res) => { try {
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        const file = path.resolve(`${repo}/dist`, '.' + (pathname === '/' ? '/index.html' : pathname));
        if (!file.startsWith(`${repo}/dist/`)) {
            res.writeHead(403).end();
            return;
        }
        const data = await step(fs.readFile(file));
        const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
        res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(data);
    }
    catch {
        res.writeHead(404).end();
    } });
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
    page = await step(browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 }));
    function consoleEvent(value){const bytes=Buffer.byteLength(JSON.stringify(value));if(consoleBytes+bytes>consoleCap){collectionTruncated=true;return;}consoleBytes+=bytes;events.push(value);}
    page.on('console',m=>consoleEvent({type:m.type(),text:m.text()}));
    page.on('pageerror',e=>consoleEvent({type:'pageerror',text:String(e)}));
    const output = ts.transpileModule(await step(fs.readFile(`${repo}/tests/e2e/visual-budget-probe.ts`, 'utf8')), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const sandbox = { exports: {} };
    vm.runInNewContext(output, sandbox);
    await step(page.addInitScript(sandbox.exports.installBudgetProbe));
    await step(page.addInitScript(() => { let stamp; const seen = new Set(); let active = false, calls = 0; const raf = requestAnimationFrame; window.requestAnimationFrame = cb => raf(t => { stamp = t; cb(t); }); const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (...args) { const gl = Reflect.apply(get, this, args); if (gl && this.getAttribute('data-testid') === 'world-canvas' && String(args[0]).includes('webgl'))
        for (const m of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced'])
            if (typeof gl[m] === 'function') {
                const old = gl[m];
                gl[m] = function (...a) { if (active) {
                    calls++;
                    seen.add(stamp);
                } return Reflect.apply(old, gl, a); };
            } return gl; }; window.__worldDrawWitness = { start() { seen.clear(); calls = 0; active = true; }, result() { return { timestamps: [...seen], calls }; } }; }));
    await step(page.goto(`http://127.0.0.1:${server.address().port}/?debug=1`, { timeout: 30000 }));
    await step(page.waitForFunction(() => {
        const debug=window.__simDebug;
        const canvas=document.querySelector('[data-testid="world-canvas"]');
        const readout=document.querySelector('[data-testid="readout-altitude-value"]');
        if(!debug||typeof debug.presentation!=='function'||!(canvas instanceof HTMLCanvasElement)||!canvas.width||!canvas.height||!readout?.textContent?.trim())return false;
        try{return !!debug.presentation().renderer;}
        catch(error){if(error instanceof Error&&error.message==='presentation is not mounted')return false;throw error;}
    },undefined,{timeout:20000,polling:100}));
    await step(page.evaluate(() => { window.__simDebug.pause(); window.__simDebug.setScenario('launch-pad'); window.__simDebug.pause(); }));
    await step(page.locator('[data-testid="auto-take-off"]').click());
    await step(page.evaluate(() => window.__simDebug.step(360)));
    await step(save('browser-identity.json', { version: browser.version(), browserPid,originalManagedBrowser:receipt.originalBrowser,actualCopiedBrowser:receipt.actualBrowser, actualArgv: (await step(fs.readFile(`/proc/${browserPid}/cmdline`, 'utf8'))).split('\0').filter(Boolean), wrapper: receipt.wrapper, flags: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], renderer: await step(page.evaluate(() => window.__simDebug.presentation().renderer)) }));
    if(browser.version()!==receipt.registryVersion)throw Error('Actual full-Chrome version changed');
    const beforeTopology=await step(topology(cdp,'before'));
    await step(page.evaluate(() => { window.__worldDrawWitness.start(); window.__visualBudget.start(0, 20); window.__simDebug.resume(); }));
    await step(page.waitForFunction(() => { const p = window.__visualBudget.result(); return p.done || p.errors.length; }, {}, { timeout: 60000, polling: 100 }));
    const result = await step(page.evaluate(() => {window.__simDebug.pause();return ({ worldDraws: window.__worldDrawWitness.result(), probe: window.__visualBudget.result(), presentation: window.__simDebug.presentation(), telemetry: window.__simDebug.telemetry() });}));
    await step(save('production-draw-receipt.json', result));
    const afterTopology=await step(topology(cdp,'after'));
    const gpuBefore=beforeTopology.processes.find(p=>p.type==='GPU'),gpuAfter=afterTopology.processes.find(p=>p.type==='GPU');if(gpuBefore.pid!==gpuAfter.pid||JSON.stringify(gpuBefore.workers.map(w=>w.tid))!==JSON.stringify(gpuAfter.workers.map(w=>w.tid)))throw Error('GPU/worker identity changed within functional sample');
    const world = result.probe.contexts.find(c => c.canvasTestId === 'world-canvas');
    if (!world || !world.renderer.toLowerCase().includes('swiftshader') || result.probe.errors.length || result.probe.frames.length !== 20 || result.worldDraws.timestamps.length < 20 || result.presentation.renderer.backend !== 'webgl')
        throw Error('Real production20draw/WebGL/SwiftShader proof failed');
    if(!Number.isFinite(result.telemetry['kinematics.altitude'])||result.telemetry['kinematics.altitude']<=0||Object.entries(result.telemetry).some(([key,value])=>key.startsWith('failures.')&&value===true)||events.some(e=>e.type==='pageerror'))throw Error('Functional launch physical health/pageerror proof failed');
    if(collectionTruncated)throw Error('Declared collection cap exceeded');
    const timestamps=result.probe.frames.map(f=>f.timestamp);const cadenceFps=(timestamps.length-1)*1000/(timestamps.at(-1)-timestamps[0]);await step(save('diagnostic-cadence.json',{count:20,cadenceFps,acceptance:false,requiresFreshReview:true,aroundPriorSlowRange:cadenceFps>=2&&cadenceFps<=4,noAutomatic300Trial:true}));
    await step(save('after-bundle-identity.json',await step(bundleIdentity())));
    const after = await step(identity());
    await step(save('after-identity.json', after));
    if (before.sourceSha256 !== after.sourceSha256 || before.buildSha256 !== after.buildSha256)
        throw Error('Boundary source/build identity changed');
    await step(save('functional-outcome.json', { passed: true, draws: 20, performanceAcceptance: false, limitation:'FULL CHROME functional topology only;20frame cadence diagnosis requires fresh actual-result review before any300trial; no hardwareGPU or performance acceptance' }));
}
try {
    await Promise.race([run(), deadline, interrupted]);
}
catch (e) {
    primaryError = e;
}
finally {
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
    function snapshotDescendants() { if(!browserPid){for(const name of syncfs.readdirSync('/proc'))if(/^\d+$/.test(name)){const v=processStat(Number(name));if(v?.ppid===process.pid&&['/usr/bin/bash','/bin/bash','/usr/bin/env'].includes(processIdentity(v.pid)?.exe)){try{const argv=syncfs.readFileSync(`/proc/${v.pid}/cmdline`,'utf8').split('\0');if(argv.includes(receipt.wrapper)){browserPid=v.pid;ownedIdentities.set(v.pid,processIdentity(v.pid));ownedPids.add(v.pid);break;}}catch{}}}}const root = ownedIdentities.get(browserPid); if (!root)
        return; const candidates = []; for (const name of syncfs.readdirSync('/proc'))
        if (/^\d+$/.test(name)) {
            const v = processStat(Number(name));
            if (v)
                candidates.push(v);
        } for (const v of candidates) {
        // Full Chrome may detach its private copied crashpad handler. Unique
        // bundle path plus post-owner starttime identifies these exact descendants.
        if(v.state!=='Z'&&BigInt(v.starttime)>=BigInt(root.starttime)){const n=processIdentity(v.pid);if(n?.exe?.startsWith(`${setup}/browser/`)){ownedIdentities.set(v.pid,n);ownedPids.add(v.pid);}}
        const currentRoot = processIdentity(root.pid);
        if (root.pgrp===root.pid&&v.pgrp === root.pgrp && BigInt(v.starttime) >= BigInt(root.starttime) && (!currentRoot || currentRoot.starttime === root.starttime) ) {
            ownedIdentities.set(v.pid,processIdentity(v.pid)??v);
            ownedPids.add(v.pid);
        }
        let cur = v, seen = new Set();
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
        try{receipt.renderer=window.__simDebug?.presentation().renderer??null;}catch(error){receipt.errors.push({component:'renderer',error:String(error)});}
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
    const finalIntegrity={sourceVerified:false,buildVerified:false,bundleVerified:false,error:null};
    try{
        const until=cleanupDeadline-100;const assertTime=()=>{if(Date.now()>=until)throw Error('Final integrity boundary exceeded shared cleanup time');};
        const finalSourcePaths=execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{cwd:repo,encoding:'utf8'}).split('\0').filter(p=>/^(src\/|tests\/|scripts\/|public\/|\.agents\/|\.nvmrc$|package[^/]*\.json$|[^/]*config\.[^/]+$)/.test(p)).sort();if(JSON.stringify(finalSourcePaths)!==JSON.stringify(receipt.sourceManifest.map(p=>p[0])))throw Error('Final source file set drift');
        for(const [name,expected] of receipt.sourceManifest){assertTime();const file=`${repo}/${name}`;const actual=syncfs.existsSync(file)?sha(syncfs.readFileSync(file)):null;if(actual!==expected)throw Error(`Final source mismatch:${name}`);}finalIntegrity.sourceVerified=true;
        const finalBuildPaths=[];function buildWalk(dir){for(const e of syncfs.readdirSync(dir,{withFileTypes:true})){assertTime();const file=path.join(dir,e.name);if(e.isDirectory())buildWalk(file);else if(!file.endsWith('.map'))finalBuildPaths.push(path.relative(`${repo}/dist`,file));}}buildWalk(`${repo}/dist`);if(JSON.stringify(finalBuildPaths.sort())!==JSON.stringify(receipt.buildFiles.map(p=>p[0])))throw Error('Final build file set drift');
        for(const [name,expected] of receipt.buildFiles){assertTime();if(sha(syncfs.readFileSync(`${repo}/dist/${name}`))!==expected)throw Error(`Final build mismatch:${name}`);}finalIntegrity.buildVerified=true;
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
    if(partial)durable('partial-progress.json',partial);
    if (primaryError)
        durable('failure.json', { error: String(primaryError), elapsedMs: Date.now() - started });
    durable('console.json', events);
    durable('cleanup.json', { actions, ownedIdentities: [...ownedIdentities.values()], remaining,inaccessibleOwned:[...inaccessibleOwned], verifiedDescendantAbsence: remaining.length === 0&&inaccessibleOwned.size===0, cleanupMs: Date.now() - cleanupStart, launchSettled: !!browser, elapsedMs: Date.now() - started });
    durable('collection-status.json',{exportedCapBytes:exportedCap,artifactCapBytes:artifactCap,consoleCapBytes:consoleCap,exportedBytes,consoleBytes,truncated:collectionTruncated});
    if(collectionTruncated||remaining.length||inaccessibleOwned.size||Date.now()>cleanupDeadline)primaryError??=Error('Cleanup bound or verified descendant absence failed');
    durable('qualification-outcome.json',{qualified:!primaryError,error:primaryError?String(primaryError):null,performanceAcceptance:false,requiresFreshActualResultReview:true,noAutomatic300Trial:true});
}
if (primaryError) {
    console.error(String(primaryError));
    process.exit(1);
}
process.exit(0);
