/** Research-only, unexecuted until independent review and exclusive CPU grant. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const self = fileURLToPath(import.meta.url);
const expectedPins = {
  'vitest.config.ts': '4debcf42809334dfc4fefcc4f8d7274fbdcfdc429d7fc99b06310eea588061b0',
  'package.json': 'a5eaca6986392da131d45c5c646204c2a58a2e9b1dc16af8a934175b9e2196f5',
  'package-lock.json': '44cec6ccb82883c53e56e184f4a45933454ad1fc879c25bdc14cdc46dfdcadc9',
  'node_modules/vitest/dist/chunks/coverage.DM_a_rWm.js': 'e509f3cc1bd81ae6426265253fa926cbde02be5cebfe35b1df422017bffdca31',
  'node_modules/@vitest/coverage-v8/dist/provider.js': 'e8e1c964f317bfacd48d7e24275cdc7dd29e10e6ccab064194df27bfe48065f8',
  'node_modules/@vitest/coverage-v8/dist/index.js': 'be14126e3dc6e83461555879c53945dd8adbce254d6ffba32e4e83ee04e270e7',
  'node_modules/@vitest/coverage-v8/dist/load-provider-CdgAx3rL.js': 'abbdb4bd0d65b5c4d624d45c3e3cd4360bb4759948a3ec4f6935e777902eb571',
  'node_modules/vitest/dist/node.js': '34be25dbabf478136f6ea1b1f7b9a075ab833a14df3da9fc69d39b671dc19551',
  'node_modules/vitest/package.json': 'a28126d97bcaf567da5bed69443b7f3bcd9a7a8c38c8b66e554686b6bb2c10e0',
  'node_modules/@vitest/coverage-v8/package.json': '2fda0ef9aa32bb1c64ae42c04652c9b3221d4881db6fb227d82535a6b6665c28',
};
const thresholds = {
  branches: 99, lines: 99, functions: 98, statements: 99,
  'src/core/physics/**': { branches: 100, lines: 100, functions: 100, statements: 98 },
  'src/core/control/**': { branches: 95, lines: 95, functions: 95, statements: 95 },
  'src/core/autopilot/**': { branches: 95, lines: 99, functions: 100, statements: 99 },
};
const groups = ['global', 'src/core/physics/**', 'src/core/control/**', 'src/core/autopilot/**'];
const metrics = ['branches', 'lines', 'functions', 'statements'];
const cases = [{ id: 'all-protected-metrics-100-positive', expectedStatus: 0, failures: [] }];
for (const group of groups) for (const metric of metrics) {
  const floor = group === 'global' ? thresholds[metric] : thresholds[group][metric];
  // Independently known percentage recipes: branches/functions/lines are floor-1;
  // statements are floor-0.1 (1000 statements per 100-line protected file).
  const failures = [{ group, metric }];
  if (group === 'global') {
    if (metric !== 'statements') failures.push({ group: groups[1], metric });
    if (['lines', 'functions', 'statements'].includes(metric)) failures.push({ group: groups[3], metric });
  }
  cases.push({ id: `${group === 'global' ? 'aggregate' : group.split('/')[2]}-${metric}-below-${floor}`, group, metric, floor, expectedStatus: 1, failures });
}

async function pins() {
  const result = {};
  for (const path of [...Object.keys(expectedPins), relative(root, self), 'docs/research/2026-10-04-cloud-resume/provider-api-feasibility-v1-declaration.md']) {
    result[path] = createHash('sha256').update(await readFile(resolve(root, path))).digest('hex');
  }
  for (const [path, hash] of Object.entries(expectedPins)) assert.equal(result[path], hash, `source/tool pin changed: ${path}`);
  return result;
}

function fileFixture(path, size) {
  const statementMap = {}, fnMap = {}, branchMap = {}, s = {}, f = {}, b = {};
  const loc = line => ({ start: { line, column: 0 }, end: { line, column: 1 } });
  for (let i = 0; i < size; i++) {
    statementMap[i] = loc(i + 1); s[i] = 1;
    fnMap[i] = { name: `fixture_${i}`, decl: loc(i + 1), loc: loc(i + 1), line: i + 1 }; f[i] = 1;
    branchMap[i] = { type: 'if', loc: loc(i + 1), locations: [loc(i + 1)], line: i + 1 }; b[i] = [1];
  }
  // Extra statements share the last covered line. This isolates statement and
  // line failures without calculating any provider coverage percentages.
  for (let i = size; i < size * 10; i++) { statementMap[i] = loc(size); s[i] = 1; }
  return { path: resolve(root, path), statementMap, fnMap, branchMap, s, f, b };
}

function fixture(testCase) {
  const entries = [
    ['src/core/physics/__synthetic_provider_probe__.ts', 100, groups[1]],
    ['src/core/control/__synthetic_provider_probe__.ts', 100, groups[2]],
    ['src/core/autopilot/__synthetic_provider_probe__.ts', 100, groups[3]],
    ['src/core/__synthetic_provider_probe__.ts', 1000, 'other'],
  ];
  return entries.map(([path, size, group]) => {
    const data = fileFixture(path, size);
    if (!testCase.metric || (testCase.group !== 'global' && testCase.group !== group)) return data;
    const count = testCase.metric === 'statements'
      ? (100 - testCase.floor) * size / 10 + size / 100
      : (101 - testCase.floor) * size / 100;
    assert(Number.isInteger(count));
    for (let i = 0; i < count; i++) {
      if (testCase.metric === 'branches') data.b[i] = [0];
      if (testCase.metric === 'functions') data.f[i] = 0;
      if (testCase.metric === 'lines') data.s[i] = 0;
      if (testCase.metric === 'statements') data.s[size + i] = 0;
    }
    return data;
  });
}

async function child(id, output) {
  const testCase = cases.find(value => value.id === id); assert(testCase, 'unknown declared case');
  const before = await pins();
  const { createVitest } = await import('vitest/node');
  const { default: coverageModule } = await import('@vitest/coverage-v8');
  const ctx = await createVitest('test', { root, config: resolve(root, 'vitest.config.ts'), watch: false, run: false, coverage: { enabled: true } });
  const errors = [];
  let receipt;
  const originalError = ctx.logger.error.bind(ctx.logger);
  ctx.logger.error = (...values) => { errors.push(values.map(String).join(' ')); originalError(...values); };
  try {
    assert.equal(ctx.config.testTimeout, 30000);
    assert.deepEqual(ctx.config.coverage.thresholds, thresholds);
    assert.equal(ctx.config.coverage.thresholds.autoUpdate, undefined);
    assert.equal(ctx.state.getFiles().length, 0, 'no test collection allowed');
    const provider = await coverageModule.getProvider();
    provider.initialize(ctx);
    assert.equal(provider.name, 'v8'); assert.equal(provider.version, '4.1.11');
    const map = provider.createCoverageMap();
    const data = fixture(testCase);
    for (const entry of data) map.addFileCoverage(entry);
    await provider.reportThresholds(map, true);
    const nativeExitCode = process.exitCode ?? 0;
    assert.equal(nativeExitCode, testCase.expectedStatus, 'native provider exit status');
    assert.equal(errors.length, testCase.failures.length, 'exact native failure count');
    for (const failure of testCase.failures) assert(errors.some(message =>
      message.includes(`Coverage for ${failure.metric} `) && message.includes(failure.group === 'global' ? 'global threshold' : `"${failure.group}" threshold`)), `missing named threshold error: ${JSON.stringify(failure)}`);
    assert.equal(ctx.state.getFiles().length, 0, 'threshold API must not collect/execute tests');
    receipt = { id, nativeExitCode, providerClass: provider.constructor.name, providerName: provider.name, providerVersion: provider.version, testTimeout: ctx.config.testTimeout, thresholds: provider.options.thresholds, collectedTestFiles: 0, fixturePaths: data.map(value => value.path), fixtureSha256: createHash('sha256').update(JSON.stringify(data)).digest('hex'), nativeErrors: errors, expectedFailures: testCase.failures, sourcePins: before };
  } finally { await ctx.close(); }
  const after = await pins();
  assert.deepEqual(after, before, 'source/config/tools changed during child');
  assert(receipt, 'missing tentative native provider result');
  await writeFile(resolve(output, `${id}.json`), JSON.stringify({ ...receipt, afterPins: after, finalized: true }, null, 2), { flag: 'wx' });
}

async function main(output) {
  assert(output, 'explicit fresh output directory required');
  const directory = resolve(output); await mkdir(directory); // EEXIST denies stale receipts.
  const before = await pins();
  await writeFile(resolve(directory, 'source-before.json'), JSON.stringify(before, null, 2));
  await writeFile(resolve(directory, 'cases.json'), JSON.stringify(cases, null, 2));
  const results = [];
  for (const testCase of cases) {
    const run = spawnSync(process.execPath, [self, '--case', testCase.id, directory], { cwd: root, encoding: 'utf8', timeout: 30000, killSignal: 'SIGKILL', maxBuffer: 4 * 1024 * 1024 });
    await writeFile(resolve(directory, `${testCase.id}.stdout.txt`), run.stdout ?? '');
    await writeFile(resolve(directory, `${testCase.id}.stderr.txt`), run.stderr ?? '');
    assert.equal(run.error, undefined, `child execution error: ${testCase.id}`);
    assert.equal(run.signal, null, `child signal: ${testCase.id}`);
    assert.equal(run.status, testCase.expectedStatus, `actual child status: ${testCase.id}`);
    const receipt = JSON.parse(await readFile(resolve(directory, `${testCase.id}.json`), 'utf8'));
    assert.equal(receipt.finalized, true, 'only fully finalized child proof is admissible');
    assert.deepEqual(receipt.afterPins, before, 'finalized child source/tool pins');
    assert.deepEqual(receipt.sourcePins, before, 'initial child source/tool pins');
    assert.equal(receipt.nativeExitCode, run.status);
    results.push({ id: testCase.id, actualStatus: run.status, nativeErrors: receipt.nativeErrors });
  }
  const after = await pins(); assert.deepEqual(after, before);
  await writeFile(resolve(directory, 'source-after.json'), JSON.stringify(after, null, 2));
  await writeFile(resolve(directory, 'summary.json'), JSON.stringify({ scope: 'synthetic public threshold API only; no test execution or real source coverage acceptance', node: process.version, cases: results }, null, 2));
}

try {
  if (process.argv[2] === '--case') await child(process.argv[3], resolve(process.argv[4]));
  else await main(process.argv[2]);
} catch (error) {
  console.error(error);
  // Native below-floor exit1 is expected; API/validation/close failure must
  // never impersonate it, even after reportThresholds already set exitCode1.
  process.exitCode = 2;
}
