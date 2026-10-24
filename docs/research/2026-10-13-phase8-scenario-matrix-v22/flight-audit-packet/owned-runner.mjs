import {
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import {
  assertRuntimeLinksStayPinned,
  buildCacheTreeManifest,
  buildRuntimeTreeManifest,
  runtimeRoots,
} from './runtime-tree-manifest.mjs';

const root = '/workspace/StarShipSimulator';
let digest;
let runOwnedCommand;
let verifyNoOwnedProcesses;
const packet = resolve(root, 'docs/research/2026-10-13-phase8-scenario-matrix-v22/flight-audit-packet');
const packetPrefix = 'docs/research/2026-10-13-phase8-scenario-matrix-v22/flight-audit-packet/';
const output = resolve(packet, 'actual-v1');
const marker = resolve(packet, '.one-shot-claimed');
const nodeModules = resolve(root, 'node_modules');
const npmRoot = '/workspace/cloud-bootstrap/starship-v1/node/lib/node_modules/npm';
const nodeLauncher = '/workspace/cloud-bootstrap/starship-v1/node/bin/node';
const cpBinary = '/usr/bin/cp';
const npmCli = resolve(npmRoot, 'bin/npm-cli.js');
const selectedCommand = [npmCli, 'run', 'test', '--', '--maxWorkers=1', 'tests/flies-every-scenario.test.ts'];
const defaultQualificationPath = resolve(root, 'docs/verification/native-flight-qualification.json');
const defaultQualificationShaPath = resolve(root, 'docs/verification/native-flight-qualification.sha256');
const defaultQualificationSha = '9920693d4d9c3c7e94880b50d508bce12facaa9b5f1f20242ca1fa5f2bb2c83e';
const defaultQualificationSidecarSha = '17b4f3c6c68198637d215556264d22769d7621a6b026ffa300132eabf9f06aef';
const sourcePins = resolve(packet, 'source-pins.sha256');
const sourceFiles = resolve(packet, 'source-files.txt');
const cachePins = resolve(packet, 'cache-before-pins.sha256');
const runtimePins = resolve(packet, 'runtime-pins.sha256');
const runtimeTreePins = resolve(packet, 'runtime-tree-manifest.jsonl');
const coveragePins = resolve(packet, 'coverage-before.sha256');
const coverageMetadata = resolve(packet, 'coverage-before-metadata.jsonl');
const routeScript = resolve(packet, 'route-preflight.mjs');
const routeBaseline = resolve(packet, 'route-preflight-v22.txt');
const cacheDefinitions = [
  {
    name: '.vite',
    live: resolve(nodeModules, '.vite'),
    baseline: resolve(packet, 'cache-before/node_modules/.vite'),
    metadata: resolve(packet, 'cache-before-vite-metadata.jsonl'),
  },
  {
    name: '.vite-temp',
    live: resolve(nodeModules, '.vite-temp'),
    baseline: resolve(packet, 'cache-before/node_modules/.vite-temp'),
    metadata: resolve(packet, 'cache-before-vite-temp-metadata.jsonl'),
  },
];

let interruptedSignal = null;
let outputExists = false;
let finalizing = false;
let receiptCommitStarted = false;
let receiptCommitted = false;
let forwardingSyntheticTerm = false;
const MAX_SIGNAL_COUNT = 1_000_000_000;
const signalLedger = {
  total: 0,
  overflow: false,
  counts: { SIGINT: 0, SIGTERM: 0, SIGHUP: 0, SIGQUIT: 0 },
  first: null,
  last: null,
};
function rememberSignal(signal) {
  if (receiptCommitStarted || receiptCommitted) return;
  const event = { signal, at: new Date().toISOString() };
  if (signalLedger.total < MAX_SIGNAL_COUNT) signalLedger.total += 1;
  else signalLedger.overflow = true;
  if (signalLedger.counts[signal] < MAX_SIGNAL_COUNT) signalLedger.counts[signal] += 1;
  else signalLedger.overflow = true;
  signalLedger.first ??= event;
  signalLedger.last = event;
  interruptedSignal ??= signal;
  if (finalizing) process.exitCode = 1;
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (signal === 'SIGTERM' && forwardingSyntheticTerm) return;
    rememberSignal(signal);
  });
}
for (const signal of ['SIGHUP', 'SIGQUIT']) {
  process.on(signal, () => {
    rememberSignal(signal);
    forwardingSyntheticTerm = true;
    try {
      process.emit('SIGTERM');
    } finally {
      forwardingSyntheticTerm = false;
    }
  });
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sortBytes = (left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right));
const within = (candidate, base) => {
  const rel = relative(resolve(base), resolve(candidate));
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
};
const entryExists = (path) => {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
};

function parseHashManifest(path) {
  const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean);
  return lines.map((line) => {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    if (!match) throw new Error(`Malformed SHA-256 manifest row in ${path}`);
    return { digest: match[1], name: match[2] };
  });
}

function verifyHashManifest(path, { base, allowedRoots }) {
  const rows = parseHashManifest(path);
  const paths = [];
  for (const row of rows) {
    const target = resolve(base, row.name);
    if (!allowedRoots.some((allowedRoot) => within(target, allowedRoot))) {
      throw new Error(`Manifest path escapes its allowed root: ${row.name}`);
    }
    const stat = lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Pinned path is not a regular file: ${target}`);
    if (sha256(readFileSync(target)) !== row.digest) throw new Error(`SHA-256 mismatch: ${target}`);
    paths.push(target);
  }
  return paths.sort(sortBytes);
}

function verifyPacket() {
  const packetStat = lstatSync(packet);
  if (!packetStat.isDirectory() || packetStat.isSymbolicLink()) throw new Error('Candidate packet root is missing or unsafe');
  const packetSidecar = resolve(packet, 'packet-pins.sha256');
  const sidecarStat = lstatSync(packetSidecar);
  if (!sidecarStat.isFile() || sidecarStat.isSymbolicLink()) throw new Error('Packet sidecar is missing or unsafe');
  const sidecarDigest = sha256(readFileSync(packetSidecar));
  const expectedSidecarDigest = process.env.STARSHIP_SCENARIO_AUDIT_PACKET_SHA256;
  if (!expectedSidecarDigest || sidecarDigest !== expectedSidecarDigest) {
    throw new Error('Packet sidecar digest differs from the reviewed wrapper binding');
  }
  const rows = parseHashManifest(packetSidecar);
  const seen = new Set();
  for (const row of rows) {
    if (!row.name.startsWith(packetPrefix)) throw new Error(`Packet pin escapes candidate-v22-ssr: ${row.name}`);
    if (seen.has(row.name)) throw new Error(`Duplicate packet pin: ${row.name}`);
    seen.add(row.name);
    const target = resolve(root, row.name);
    if (!within(target, packet)) throw new Error(`Packet pin path escapes candidate-v22-ssr: ${row.name}`);
    if (!lstatSync(target).isFile() || sha256(readFileSync(target)) !== row.digest) {
      throw new Error(`Candidate packet pin mismatch: ${row.name}`);
    }
  }
  if (!seen.has(`${packetPrefix}owned-runner.mjs`)
      || !seen.has(`${packetPrefix}runtime-tree-manifest.mjs`)) {
    throw new Error('Packet sidecar does not pin the exact wrapper and active runtime scripts');
  }
  return { sidecarDigest, count: rows.length };
}

function readPreflight() {
  const map = new Map();
  for (const line of readFileSync(resolve(packet, 'preflight-v22.txt'), 'utf8').split('\n').filter(Boolean)) {
    const equals = line.indexOf('=');
    if (equals < 1) throw new Error('Malformed preflight record');
    map.set(line.slice(0, equals), line.slice(equals + 1));
  }
  return map;
}

function verifySource() {
  const paths = verifyHashManifest(sourcePins, { base: root, allowedRoots: [root] });
  const listed = readFileSync(sourceFiles, 'utf8').split('\n').filter(Boolean).map((path) => resolve(root, path)).sort(sortBytes);
  if (JSON.stringify(paths) !== JSON.stringify(listed)) throw new Error('Source file list differs from the pinned source set');
  return paths.length;
}

function currentRuntimeManifest(preflight) {
  const preparedNodeBinary = preflight.get('node_binary');
  const roots = runtimeRoots({
    nodeModules,
    npmRoot,
    nodeLauncher,
    nodeBinary: preparedNodeBinary,
    cpBinary,
  });
  const manifest = buildRuntimeTreeManifest(roots, { excludeCacheDirs: ['.vite', '.vite-temp'] });
  assertRuntimeLinksStayPinned(manifest, roots);
  return { roots, manifest };
}

function verifyRuntime(preflight) {
  const { roots, manifest } = currentRuntimeManifest(preflight);
  const expected = readFileSync(runtimeTreePins, 'utf8');
  if (manifest !== expected) throw new Error('Runtime file, mode, owner, directory or symlink metadata differs from its pinned manifest');

  const contentPaths = verifyHashManifest(runtimePins, {
    base: root,
    allowedRoots: [nodeModules, npmRoot, cpBinary],
  });
  const runtimeRows = JSON.parse(`[${manifest.trimEnd().split('\n').map((line) => line).join(',')}]`);
  const runtimeFiles = runtimeRows
    .filter((row) => row.type === 'file' && (within(row.path, nodeModules) || within(row.path, npmRoot)))
    .map((row) => resolve(row.path))
    .sort(sortBytes);
  const contentRuntimeFiles = contentPaths.filter((path) => within(path, nodeModules) || within(path, npmRoot)).sort(sortBytes);
  if (JSON.stringify(runtimeFiles) !== JSON.stringify(contentRuntimeFiles)) {
    throw new Error('Runtime content hashes do not cover the exact regular-file set');
  }
  return { roots, contentFiles: contentPaths.length, manifestRows: runtimeRows.length, manifestSha256: sha256(manifest) };
}

function verifyCoverage() {
  const coverage = resolve(root, 'coverage');
  if (!lstatSync(coverage).isDirectory() || lstatSync(coverage).isSymbolicLink()) throw new Error('Coverage root is missing or unsafe');
  const paths = verifyHashManifest(coveragePins, { base: root, allowedRoots: [coverage] });
  const actualMetadata = buildCacheTreeManifest(coverage);
  if (actualMetadata !== readFileSync(coverageMetadata, 'utf8')) throw new Error('Coverage tree metadata differs from its baseline');
  return paths.length;
}

function verifyCaches() {
  const baselinePaths = verifyHashManifest(cachePins, { base: resolve(packet, 'cache-before'), allowedRoots: [resolve(packet, 'cache-before')] });
  for (const cache of cacheDefinitions) {
    const baselineMetadata = readFileSync(cache.metadata, 'utf8');
    if (buildCacheTreeManifest(cache.baseline) !== baselineMetadata) throw new Error(`Saved baseline cache metadata mismatch: ${cache.name}`);
    const liveStat = lstatSync(cache.live);
    if (!liveStat.isDirectory() || liveStat.isSymbolicLink()) throw new Error(`Live cache root is missing or unsafe: ${cache.name}`);
    if (buildCacheTreeManifest(cache.live) !== baselineMetadata) throw new Error(`Live cache differs from its baseline: ${cache.name}`);
  }
  return baselinePaths.length;
}

function createPrivateEmptyNpmConfig(name) {
  const path = resolve(output, name);
  if (!within(path, output)) throw new Error(`npm config escapes attempt output root: ${name}`);
  writeFileSync(path, '', { flag: 'wx', mode: 0o600 });
  const stat = lstatSync(path);
  const real = realpathSync(path);
  if (stat.isSymbolicLink() || !stat.isFile() || !within(real, output)
      || stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o600
      || stat.size !== 0 || stat.nlink !== 1 || readFileSync(path).length !== 0) {
    throw new Error(`npm config file is not a private empty regular file: ${name}`);
  }
  return {
    path,
    realPath: real,
    device: stat.dev,
    inode: stat.ino,
    uid: stat.uid,
    mode: stat.mode & 0o777,
    size: stat.size,
    links: stat.nlink,
    sha256: sha256(readFileSync(path)),
  };
}

function npmEnvironment() {
  const env = { ...process.env };
  const removedNpmConfig = Object.keys(env).filter((name) => /^npm_config_/i.test(name)).sort();
  const removedRouteControls = Object.keys(env).filter((name) => name.startsWith('NATIVE_FLIGHT_')).sort();
  const removedRuntimeControls = Object.keys(env)
    .filter((name) => name === 'NODE_PATH'
      || name === 'NODE_OPTIONS'
      || name === 'NODE_V8_COVERAGE'
      || name === 'BASH_ENV'
      || name === 'ENV'
      || name === 'GLIBC_TUNABLES'
      || name.startsWith('LD_')
      || name.startsWith('VITEST_')
      || name.startsWith('STARSHIP_SCENARIO_AUDIT_'))
    .sort();
  for (const name of [...removedNpmConfig, ...removedRouteControls, ...removedRuntimeControls]) delete env[name];

  env.HOME = resolve(output, 'home');
  env.TMPDIR = resolve(output, 'tmp');
  env.XDG_CACHE_HOME = resolve(output, 'xdg-cache');
  env.XDG_CONFIG_HOME = resolve(output, 'xdg-config');
  env.XDG_DATA_HOME = resolve(output, 'xdg-data');
  const userConfigFile = createPrivateEmptyNpmConfig('npm-user-config.npmrc');
  const globalConfigFile = createPrivateEmptyNpmConfig('npm-global-config.npmrc');
  if (userConfigFile.path === globalConfigFile.path
      || (userConfigFile.device === globalConfigFile.device && userConfigFile.inode === globalConfigFile.inode)) {
    throw new Error('npm user and global config files must be distinct filesystem objects');
  }
  env.NPM_CONFIG_USERCONFIG = userConfigFile.path;
  env.NPM_CONFIG_GLOBALCONFIG = globalConfigFile.path;
  env.NPM_CONFIG_CACHE = resolve(output, 'npm-cache');
  env.NPM_CONFIG_LOGS_DIR = resolve(output, 'npm-logs');
  env.NPM_CONFIG_LOGS_MAX = '0';
  env.NPM_CONFIG_OFFLINE = 'true';
  env.NPM_CONFIG_STRICT_SSL = 'true';
  env.NPM_CONFIG_AUDIT = 'false';
  env.NPM_CONFIG_FUND = 'false';
  env.NPM_CONFIG_UPDATE_NOTIFIER = 'false';
  if ('NATIVE_FLIGHT_COMPOSITE' in env || 'NATIVE_FLIGHT_COMPOSITE_SHA' in env) {
    throw new Error('SSR candidate must not set an explicit native qualification');
  }
  return {
    env,
    removedNpmConfig,
    removedRouteControls,
    removedRuntimeControls,
    configFiles: { user: userConfigFile, global: globalConfigFile },
  };
}

function cacheSavedPath(cache) {
  return resolve(output, 'cache-after', cache.name);
}

function restoreCaches() {
  const savedRoot = resolve(output, 'cache-after');
  mkdirSync(savedRoot, { recursive: false });
  for (const cache of cacheDefinitions) {
    const saved = cacheSavedPath(cache);
    const stage = resolve(nodeModules, `${cache.name}.scenario-audit-v22-restore-${process.pid}`);
    if (entryExists(saved) || entryExists(stage)) throw new Error(`Refusing to overwrite cache recovery path for ${cache.name}`);
    if (entryExists(cache.live)) {
      const liveStat = lstatSync(cache.live);
      if (!liveStat.isDirectory() || liveStat.isSymbolicLink()) throw new Error(`Refusing unsafe live cache for ${cache.name}`);
    }
  }
  const staged = [];
  for (const cache of cacheDefinitions) {
    const baselineMetadata = readFileSync(cache.metadata, 'utf8');
    const saved = cacheSavedPath(cache);
    const stage = resolve(nodeModules, `${cache.name}.scenario-audit-v22-restore-${process.pid}`);
    const postRunMetadataPath = resolve(output, `cache-after-${cache.name.slice(1)}-metadata.jsonl`);
    const hadPostRunCache = entryExists(cache.live);
    const postRunMetadata = hadPostRunCache ? buildCacheTreeManifest(cache.live) : '{"path":".","type":"absent"}\n';
    writeFileSync(postRunMetadataPath, postRunMetadata, { flag: 'wx' });

    const copy = spawnSync(cpBinary, ['-a', '--', cache.baseline, stage], {
      cwd: root,
      detached: true,
      encoding: 'utf8',
      timeout: 300000,
      maxBuffer: 1024 * 1024,
    });
    if (copy.error || copy.status !== 0) {
      if (entryExists(stage)) rmSync(stage, { recursive: true, force: true });
      for (const prior of staged) rmSync(prior.stage, { recursive: true, force: true });
      throw new Error(`Baseline cache staging failed for ${cache.name}: ${copy.error?.message ?? copy.stderr ?? copy.status}`);
    }
    if (buildCacheTreeManifest(stage) !== baselineMetadata) {
      rmSync(stage, { recursive: true, force: true });
      for (const prior of staged) rmSync(prior.stage, { recursive: true, force: true });
      throw new Error(`Staged cache differs from baseline for ${cache.name}`);
    }
    staged.push({ cache, baselineMetadata, saved, stage, postRunMetadataPath, postRunMetadata, hadPostRunCache, copy });
  }

  const receipts = [];
  for (const { cache, baselineMetadata, saved, stage, postRunMetadataPath, postRunMetadata, hadPostRunCache, copy } of staged) {
    try {
      if (hadPostRunCache) renameSync(cache.live, saved);
      renameSync(stage, cache.live);
    } catch (error) {
      if (!entryExists(cache.live) && entryExists(stage)) renameSync(stage, cache.live);
      if (!entryExists(cache.live) && entryExists(saved)) renameSync(saved, cache.live);
      throw error;
    }
    if (hadPostRunCache && buildCacheTreeManifest(saved) !== postRunMetadata) throw new Error(`Saved post-run cache verification failed for ${cache.name}`);
    if (buildCacheTreeManifest(cache.live) !== baselineMetadata) throw new Error(`Restored cache verification failed for ${cache.name}`);
    receipts.push({
      name: cache.name,
      hadPostRunCache,
      savedPath: hadPostRunCache ? saved : null,
      postRunMetadataPath,
      restored: true,
      copyProcess: { pid: copy.pid, status: copy.status, signal: copy.signal, detached: true, synchronouslyWaited: true },
    });
  }
  return receipts;
}

function readRoutePreflight() {
  const env = { ...process.env };
  for (const name of Object.keys(env)) {
    if (/^npm_config_/i.test(name)
        || name.startsWith('NATIVE_FLIGHT_')
        || name.startsWith('STARSHIP_SCENARIO_AUDIT_')
        || name === 'NODE_OPTIONS'
        || name === 'NODE_PATH'
        || name === 'NODE_V8_COVERAGE'
        || name === 'BASH_ENV'
        || name === 'ENV'
        || name === 'GLIBC_TUNABLES'
        || name.startsWith('LD_')) delete env[name];
  }
  const result = spawnSync(process.execPath, [routeScript], {
    cwd: root,
    env,
    encoding: 'utf8',
    timeout: 10000,
    maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error(`Read-only route preflight failed: ${result.error?.message ?? result.stderr ?? result.status}`);
  if (result.stdout !== readFileSync(routeBaseline, 'utf8')) throw new Error('Current flight-test admission differs from the pinned route preflight');
  return result.stdout;
}

function verifyRepoAndTools(preflight) {
  if (process.cwd() !== root) process.chdir(root);
  const branch = spawnSync('/usr/bin/git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8', timeout: 5000 });
  const head = spawnSync('/usr/bin/git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', timeout: 5000 });
  if (branch.error || branch.status !== 0 || branch.stdout.trim() !== 'claude/visuals') throw new Error('Candidate requires branch claude/visuals');
  if (head.error || head.status !== 0 || head.stdout.trim() !== '8b8a8e30ec692cc16f91e6bfdec1db2c93456671') throw new Error('Candidate source HEAD differs from the reviewed source');
  if (process.version !== 'v22.23.3') throw new Error(`Unexpected Node version: ${process.version}`);
  if (realpathSync(process.execPath) !== preflight.get('node_binary')) throw new Error('Running Node binary differs from the prepared binary');
  if (sha256(readFileSync(process.execPath)) !== preflight.get('node_binary_sha256')) throw new Error('Node binary digest differs from preflight');
  const npmPackage = JSON.parse(readFileSync(resolve(npmRoot, 'package.json'), 'utf8'));
  if (npmPackage.version !== '10.9.9' || npmPackage.version !== preflight.get('npm')) throw new Error('Pinned npm package version differs from preflight');
  if (realpathSync(npmCli) !== preflight.get('npm_cli')) throw new Error('npm CLI path differs from preflight');
  if (sha256(readFileSync(npmCli)) !== preflight.get('npm_cli_sha256')) throw new Error('npm CLI digest differs from preflight');
  if (entryExists(resolve(root, '.npmrc'))) throw new Error('Project .npmrc exists; refusing inherited npm config');
  return { branch: branch.stdout.trim(), head: head.stdout.trim(), node: process.version, npm: npmPackage.version };
}

function verifyDefaultQualification() {
  if (digest(defaultQualificationPath) !== defaultQualificationSha) throw new Error('Default native qualification bytes changed');
  if (digest(defaultQualificationShaPath) !== defaultQualificationSidecarSha
      || readFileSync(defaultQualificationShaPath, 'utf8').trim() !== defaultQualificationSha) {
    throw new Error('Default native qualification sidecar changed');
  }
  return { path: defaultQualificationPath, sha256: defaultQualificationSha, sidecarSha256: defaultQualificationSidecarSha, unchanged: true };
}

function collectQuiescence() {
  const census = verifyNoOwnedProcesses();
  const clear = Array.isArray(census) && census.every((owner) => Array.isArray(owner.executing) && owner.executing.length === 0);
  return { census, clear };
}

async function main() {
  const result = {
    kind: 'phase8-scenario-matrix-ssr-owned-run-v22',
    command: ['npm', 'run', 'test', '--', '--maxWorkers=1', 'tests/flies-every-scenario.test.ts'],
    startedAt: new Date().toISOString(),
    interruptedSignal: null,
    launcherMode: process.env.STARSHIP_SCENARIO_AUDIT_LAUNCHER_MODE ?? null,
    launcherClearedControlNames: process.env.STARSHIP_SCENARIO_AUDIT_CLEARED_CONTROL_NAMES ?? null,
    packetVerification: null,
    repo: null,
    sourceFileCount: null,
    runtime: null,
    cacheBeforeFileCount: null,
    coverageFileCount: null,
    routePreflight: null,
    nativeRoute: {
      kind: 'expected-ssr-fallback',
      defaultQualificationPath,
      defaultQualificationSha,
      defaultQualificationSidecarSha,
      productionAcceptance: false,
    },
    testLaunchStatus: 'not-started',
    testExitCode: null,
    testOwnerError: null,
    testProcessReceipt: null,
    testQuiescence: null,
    cacheRestore: null,
    postcheck: null,
    processClosureVerified: false,
  };
  let claimed = false;
  let ownerFailure = null;
  try {
    result.packetVerification = verifyPacket();
    const preflight = readPreflight();
    result.repo = verifyRepoAndTools(preflight);
    result.sourceFileCount = verifySource();
    const integrity = await import('/workspace/StarShipSimulator/scripts/test/integrity.mjs');
    digest = integrity.digest;
    const owner = await import('/workspace/StarShipSimulator/scripts/bench/owned-command.mjs');
    runOwnedCommand = owner.runOwnedCommand;
    verifyNoOwnedProcesses = owner.verifyNoOwnedProcesses;
    result.runtime = verifyRuntime(preflight);
    result.cacheBeforeFileCount = verifyCaches();
    result.coverageFileCount = verifyCoverage();
    result.defaultQualificationBefore = verifyDefaultQualification();
    result.routePreflight = readRoutePreflight();

    if (entryExists(marker) || entryExists(output)) throw new Error('One-shot marker or output already exists');
    mkdirSync(marker, { recursive: false });
    claimed = true;
    writeFileSync(resolve(marker, 'claim.txt'), `pid=${process.pid}\nhead=${result.repo.head}\n`, { flag: 'wx' });
    mkdirSync(output, { recursive: false });
    outputExists = true;
    mkdirSync(resolve(output, 'owner-receipts'), { recursive: false });
    mkdirSync(resolve(output, 'cleanup-receipts'), { recursive: false });
    for (const name of ['home', 'tmp', 'xdg-cache', 'xdg-config', 'xdg-data']) mkdirSync(resolve(output, name), { recursive: false });

    result.startedAt = new Date().toISOString();
    if (interruptedSignal === null) {
      const npm = npmEnvironment();
      result.removedNpmConfig = npm.removedNpmConfig;
      result.removedRouteControls = npm.removedRouteControls;
      result.removedRuntimeControls = npm.removedRuntimeControls;
      result.npmConfigFiles = npm.configFiles;
      result.npmConfig = {
        userconfig: npm.env.NPM_CONFIG_USERCONFIG,
        globalconfig: npm.env.NPM_CONFIG_GLOBALCONFIG,
        cache: npm.env.NPM_CONFIG_CACHE,
        logsDir: npm.env.NPM_CONFIG_LOGS_DIR,
        logsMax: npm.env.NPM_CONFIG_LOGS_MAX,
        offline: npm.env.NPM_CONFIG_OFFLINE,
        strictSsl: npm.env.NPM_CONFIG_STRICT_SSL,
        audit: npm.env.NPM_CONFIG_AUDIT,
        fund: npm.env.NPM_CONFIG_FUND,
        updateNotifier: npm.env.NPM_CONFIG_UPDATE_NOTIFIER,
        home: npm.env.HOME,
        tmpdir: npm.env.TMPDIR,
        xdgCacheHome: npm.env.XDG_CACHE_HOME,
        xdgConfigHome: npm.env.XDG_CONFIG_HOME,
        xdgDataHome: npm.env.XDG_DATA_HOME,
      };
      result.testLaunchStatus = 'owner-invoked';
      try {
        result.testExitCode = await runOwnedCommand({
          name: 'scenario-flight-audit',
          root,
          receipt: resolve(output, 'owner-receipts'),
          args: selectedCommand,
          env: npm.env,
          deadlineMs: 300000,
        });
      } catch (error) {
        ownerFailure = String(error?.stack ?? error);
        result.testOwnerError = ownerFailure;
      }
    } else {
      result.testOwnerError = `Interrupted by ${interruptedSignal} before the owned test command was invoked`;
    }

    try {
      result.testProcessReceipt = JSON.parse(readFileSync(resolve(output, 'owner-receipts/scenario-flight-audit.process.json'), 'utf8'));
    } catch (error) {
      if (result.testLaunchStatus === 'owner-invoked') result.testOwnerError ??= `Missing test owner receipt: ${String(error?.message ?? error)}`;
    }
    result.testQuiescence = collectQuiescence();
    const receiptClosed = result.testLaunchStatus === 'not-started'
      || (result.testProcessReceipt?.finished === true
        && result.testProcessReceipt?.closed === true
        && Array.isArray(result.testProcessReceipt?.cleanup?.executing)
        && result.testProcessReceipt.cleanup.executing.length === 0);
    const testClosed = receiptClosed && result.testQuiescence.clear;

    if (testClosed) {
      if (result.testLaunchStatus === 'owner-invoked') {
        try {
          result.cacheRestore = restoreCaches();
        } catch (error) {
          result.cacheRestore = { error: String(error?.stack ?? error), restored: false };
        }
      } else {
        result.cacheRestore = { notNeeded: true, reason: 'test command was never released' };
      }

      try {
        result.postcheck = {
          sourceFiles: verifySource(),
          runtime: verifyRuntime(preflight),
          cacheFiles: verifyCaches(),
          coverageFiles: verifyCoverage(),
          defaultQualification: verifyDefaultQualification(),
        };
      } catch (error) {
        result.postcheck = { error: String(error?.stack ?? error), passed: false };
      }
      if (result.postcheck && !result.postcheck.error) result.postcheck.passed = true;
    } else {
      result.cacheRestore = { skipped: true, reason: 'owned test process closure was not verified; recovery snapshots remain untouched' };
      result.postcheck = { skipped: true, reason: 'owned test process closure was not verified' };
    }
    result.processClosureVerified = testClosed;
  } catch (error) {
    ownerFailure ??= String(error?.stack ?? error);
    result.preflightError = ownerFailure;
    if (!outputExists) process.stderr.write('candidate-v22 coordinator failed before output creation: ' + ownerFailure + '\n');
    if (claimed && outputExists && result.testLaunchStatus === 'not-started') {
      result.cacheRestore ??= { notNeeded: true, reason: 'test command was never released' };
    }
  }

  result.claimed = claimed;
  if (outputExists) {
    finalizing = true;
    // Drain pending signal callbacks once after all owned work and recovery have closed.
    await new Promise((done) => setImmediate(done));
    // This is the immutable signal cutoff. The following receipt assembly and
    // writes are synchronous, so no later signal callback can alter its fields.
    receiptCommitStarted = true;
    const exit = result.preflightError
      ? 1
      : (interruptedSignal || ownerFailure || result.testExitCode !== 0 || result.cacheRestore?.error || result.postcheck?.error || result.postcheck?.passed !== true || !result.processClosureVerified ? 1 : 0);
    result.interruptedSignal = interruptedSignal;
    result.signalLedger = structuredClone(signalLedger);
    result.finishedAt = new Date().toISOString();
    result.exitCode = exit;
    result.receiptCommit = {
      boundary: 'receipt-commit-start-after-final-signal-drain-v2',
      startedAt: new Date().toISOString(),
      postCommitSignals: 'ignored after immutable signal cutoff; owner-result rename publishes the frozen receipt',
    };
    const ownerResultPath = resolve(output, 'owner-result.json');
    const exitPath = resolve(output, 'exit.txt');
    const temporary = resolve(output, `owner-result.${process.pid}.tmp`);
    const exitText = `owner_exit=${exit}\ntest_exit=${result.testExitCode ?? 'not-started'}\ninterrupted=${interruptedSignal ?? 'none'}\ncache_restore=${result.cacheRestore?.error ? 'failed' : (result.cacheRestore?.notNeeded ? 'not-needed' : 'complete')}\nprocess_closed=${result.processClosureVerified}\nreceipt_commit=${result.receiptCommit.boundary}\n`;
    writeFileSync(exitPath, exitText);
    writeFileSync(temporary, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
    renameSync(temporary, ownerResultPath);
    receiptCommitted = true;
    // All owned processes are closed and all receipts are synchronous. Do not
    // yield after atomic publication.
    process.exit(exit);
  }
  process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`candidate-v22-ssr coordinator failed: ${String(error?.stack ?? error)}\n`);
  process.exitCode = 1;
});
