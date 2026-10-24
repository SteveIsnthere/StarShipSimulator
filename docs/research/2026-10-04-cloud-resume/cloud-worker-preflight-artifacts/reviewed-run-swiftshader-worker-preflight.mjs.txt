/** Research-only, opt-in functional/topology preflight. No performance verdict. */
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
if (process.env.RUN_SWIFTSHADER_WORKER_PREFLIGHT !== '1' || !setup || !/^\/tmp\/starship-worker-preflight\.[A-Za-z0-9]+$/.test(setup))
    throw Error('Explicit opt-in and exact prepared private directory required');
const receipt = JSON.parse(await fs.readFile(`${setup}/setup-receipt.json`, 'utf8'));
const sha = b => createHash('sha256').update(b).digest('hex');
const save = (name, value) => fs.writeFile(`${setup}/${name}`, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
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
function signalOwned(pid) { const saved = ownedIdentities.get(pid), now = processIdentity(pid); if (!saved || !now || now.starttime !== saved.starttime || now.pgrp !== saved.pgrp || !(now.exe===saved.exe||(pid===browserPid&&[receipt.originalBrowser,'/usr/bin/bash','/bin/bash'].includes(now.exe))))
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
        if (exe !== receipt.originalBrowser)
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
        const driver = path.join(path.dirname(receipt.originalBrowser), 'libvk_swiftshader.so');
        if (swiftshaderMappings.some(l => !l.endsWith(driver)))
            throw Error('Unexpected loaded SwiftShader path');
        records.push({ type: p.type, pid, exe, cwd, ancestry, configSha256: sha(config), threads, workers, swiftshaderMappings, loadedSwiftshaderSha256: sha(await step(fs.readFile(driver))) });
    }
    const result = { label, processes: records, cpuMax: (await step(fs.readFile('/sys/fs/cgroup/cpu.max', 'utf8'))).trim(), cpuset: (await step(fs.readFile('/sys/fs/cgroup/cpuset.cpus.effective', 'utf8'))).trim(), cpuStat: await step(fs.readFile('/sys/fs/cgroup/cpu.stat', 'utf8')) };
    await step(save(`${label}-topology.json`, result));
    const gpu = records.filter(p => p.type === 'GPU');
    if (gpu.length !== 1)
        throw Error('Exactly one identifiable GPU process required');
    if (gpu[0].cwd !== setup || gpu[0].configSha256 !== receipt.configSha256 || gpu[0].workers.length !== 3 || new Set(gpu[0].workers.map(t => t.comm)).size !== 3 || gpu[0].loadedSwiftshaderSha256 !== receipt.swiftshaderLibrarySha256 || !gpu[0].swiftshaderMappings.length || result.cpuMax !== receipt.cpuMax || result.cpuset !== receipt.cpuset)
        throw Error('GPU cwd/config/three-worker/loaded-driver proof failed');
    return result;
}
async function run() {
    if (receipt.threadCount !== 3 || receipt.affinitySetting !== null)
        throw Error('Reviewed ThreadCount3-only preparation required');
    for (const [file, expected] of [[receipt.originalBrowser, receipt.originalBrowserSha256], [receipt.wrapper, receipt.wrapperSha256], [receipt.config, receipt.configSha256]])
        if (sha(await step(fs.readFile(file))) !== expected)
            throw Error(`Setup digest changed:${file}`);
    for (const file of ['index.html', 'sw.js'])
        if (!(await step(fs.stat(`${repo}/dist/${file}`))).isFile())
            throw Error('Required prebuilt dist missing');
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
            if (await step(fs.readlink(`/proc/${p.id}/exe`)) !== receipt.originalBrowser)
                throw Error('Unexpected owned browser');
            browserPid = p.id;
            ownedPids.add(p.id);
        }
    page = await step(browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 }));
    page.on('console', m => events.push({ type: m.type(), text: m.text() }));
    page.on('pageerror', e => events.push({ type: 'pageerror', text: String(e) }));
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
    await step(page.waitForFunction(() => window.__simDebug?.presentation().renderer, { timeout: 30000 }));
    await step(page.evaluate(() => { window.__simDebug.pause(); window.__simDebug.setScenario('launch-pad'); window.__simDebug.pause(); }));
    await step(page.locator('[data-testid="auto-take-off"]').click());
    await step(page.evaluate(() => window.__simDebug.step(360)));
    await step(save('browser-identity.json', { version: browser.version(), browserPid, actualArgv: (await step(fs.readFile(`/proc/${browserPid}/cmdline`, 'utf8'))).split('\0').filter(Boolean), wrapper: receipt.wrapper, flags: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], renderer: await step(page.evaluate(() => window.__simDebug.presentation().renderer)) }));
    await step(topology(cdp, 'before'));
    await step(page.evaluate(() => { window.__worldDrawWitness.start(); window.__visualBudget.start(0, 20); window.__simDebug.resume(); }));
    await step(page.waitForFunction(() => { const p = window.__visualBudget.result(); return p.done || p.errors.length; }, {}, { timeout: 60000, polling: 100 }));
    const result = await step(page.evaluate(() => ({ worldDraws: window.__worldDrawWitness.result(), probe: window.__visualBudget.result(), presentation: window.__simDebug.presentation(), telemetry: window.__simDebug.telemetry() })));
    await step(save('production-draw-receipt.json', result));
    await step(topology(cdp, 'after'));
    const world = result.probe.contexts.find(c => c.canvasTestId === 'world-canvas');
    if (!world || !world.renderer.toLowerCase().includes('swiftshader') || result.probe.errors.length || result.probe.frames.length !== 20 || result.worldDraws.timestamps.length < 20 || result.presentation.renderer.backend !== 'webgl')
        throw Error('Real production20draw/WebGL/SwiftShader proof failed');
    const after = await step(identity());
    await step(save('after-identity.json', after));
    if (before.sourceSha256 !== after.sourceSha256 || before.buildSha256 !== after.buildSha256)
        throw Error('Boundary source/build identity changed');
    await step(save('functional-outcome.json', { passed: true, draws: 20, performanceAcceptance: false, limitation: 'Functional topology only; not cadence or GPU hardware acceptance' }));
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
    if(primaryError&&page){try{partial=await Promise.race([page.evaluate(()=>({probe:window.__visualBudget?.result(),renderer:window.__simDebug?.presentation().renderer})),new Promise(r=>setTimeout(r,500))]);}catch(e){actions.push(String(e));}}
    if (browser)
        void browser.close().catch(e => actions.push(String(e)));
    // Graceful close plus final identity-checked kill and absence verification all
    // fit the shared cleanup deadline; resolved browser.close alone is not proof.
    while (Date.now() < cleanupDeadline - 750) {
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
    while(Date.now()<cleanupDeadline-200){const live=[...ownedIdentities.values()].some(v=>{const n=processIdentity(v.pid);return n&&n.starttime===v.starttime&&n.state!=='Z';});if(!live)break;await new Promise(r=>setTimeout(r,25));}
    const remaining = [...ownedIdentities.values()].filter(v => { const n = processIdentity(v.pid); return n && n.starttime === v.starttime && n.state !== 'Z'; });
    server?.closeAllConnections();
    server?.close();
    function durable(name, value) { try {
        syncfs.writeFileSync(`${setup}/${name}`, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
    }
    catch (e) {
        actions.push(String(e));
    } }
    if(partial)durable('partial-progress.json',partial);
    if (primaryError)
        durable('failure.json', { error: String(primaryError), elapsedMs: Date.now() - started });
    durable('console.json', events);
    durable('cleanup.json', { actions, ownedIdentities: [...ownedIdentities.values()], remaining,inaccessibleOwned:[...inaccessibleOwned], verifiedDescendantAbsence: remaining.length === 0&&inaccessibleOwned.size===0, cleanupMs: Date.now() - cleanupStart, launchSettled: !!browser, elapsedMs: Date.now() - started });
    if (remaining.length || inaccessibleOwned.size || Date.now() > cleanupDeadline)
        primaryError ??= Error('Cleanup bound or verified descendant absence failed');
}
if (primaryError) {
    console.error(String(primaryError));
    process.exit(1);
}
process.exit(0);
