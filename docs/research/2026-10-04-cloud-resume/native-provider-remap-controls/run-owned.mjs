/** Research preparation/owner only. No automatic execution or retry. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { runOwnedCommand, verifyNoOwnedProcesses } from '../../../../scripts/bench/owned-command.mjs';
import { installedToolSnapshot } from '../../../../scripts/bench/native-loader.mjs';

assert.equal(process.env.RUN_NATIVE_PROVIDER_CONTROLS, '1', 'Explicit root cohort grant required');
const base = path.dirname(fileURLToPath(import.meta.url)), repo = '/workspace/StarShipSimulator';
const started = Date.now(), deadline = started + 30000;
const templateManifestPath = process.env.NATIVE_PROVIDER_TEMPLATE_MANIFEST;
const templateManifestPin = process.env.NATIVE_PROVIDER_TEMPLATE_MANIFEST_SHA256;
assert(templateManifestPath && templateManifestPath.startsWith(`${repo}/docs/research/`) && /^[a-f0-9]{64}$/.test(templateManifestPin || ''), 'Parent-pinned independent template manifest required');
const templateBytes = fs.readFileSync(templateManifestPath);
assert.equal(createHash('sha256').update(templateBytes).digest('hex'), templateManifestPin);
const templateManifest = JSON.parse(templateBytes);
const templateFiles = fs.readdirSync(base).map(name => path.relative(repo, path.join(base, name))).sort();
assert.deepEqual(Object.keys(templateManifest.files).sort(), templateFiles, 'Exact frozen twelve-template inventory required');
for (const file of templateFiles) assert.equal(createHash('sha256').update(fs.readFileSync(path.join(repo, file))).digest('hex'), templateManifest.files[file], 'Parent-approved template bytes drift');
const root = fs.mkdtempSync('/tmp/starship-native-provider-control.'); fs.chmodSync(root, 0o700);
console.log(`Private provider receipt: ${root}`);
fs.writeFileSync(path.join(root, 'preparation-created.json'), JSON.stringify({ root, node: process.execPath, version: process.version }));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const j = value => JSON.stringify(value);
const before = () => {
  const files = [...fs.readdirSync(base).map(name => path.join(base, name)),
    ...['package.json', 'package-lock.json', 'vitest.config.ts', 'vite.config.ts', 'scripts/bench/owned-command.mjs', 'scripts/bench/native-loader.mjs',
      'tests/core/booster-guidance.test.ts', 'tests/flies-every-scenario.test.ts'].map(name => path.join(repo, name))];
  for (const name of ['@vitest/coverage-v8/dist/provider.js', 'vitest/dist/chunks/coverage.DM_a_rWm.js',
    'ast-v8-to-istanbul/dist/index.mjs', 'vitest/vitest.mjs']) files.push(path.join(repo, 'node_modules', name));
  for (const specifier of ['vite', 'vitest', 'vitest/config', '@vitest/coverage-v8']) files.push(fileURLToPath(import.meta.resolve(specifier)));
  files.push(process.execPath, path.join(repo, 'node_modules/vitest/package.json'), path.join(repo, 'node_modules/@vitest/coverage-v8/package.json'));
  return files.sort().map(file => [file, sha(fs.readFileSync(file))]);
};
const pins = before(); fs.writeFileSync(path.join(root, 'original-inputs.json'), j(pins));
const npmCli = path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js');
const tools = installedToolSnapshot(repo, npmCli);
fs.writeFileSync(path.join(root, 'installed-tools-before.json'), j(tools));
assert.equal(JSON.parse(fs.readFileSync(path.join(repo, 'node_modules/vitest/package.json'))).version, '4.1.11');
assert.equal(JSON.parse(fs.readFileSync(path.join(repo, 'node_modules/@vitest/coverage-v8/package.json'))).version, '4.1.11');
function materialize(template, destination, values = {}) {
  let text = fs.readFileSync(path.join(base, template), 'utf8');
  for (const [key, value] of Object.entries(values)) text = text.replaceAll(`__${key}__`, j(value));
  fs.writeFileSync(path.join(root, destination), text, { flag: 'wx' });
}
for (const name of ['src', 'src/core', 'tests']) fs.mkdirSync(path.join(root, name));
materialize('coverage-control.ts.txt', 'src/core/coverage-control.ts');
materialize('unimported-control.ts.txt', 'src/core/unimported-control.ts');
materialize('outside-control.ts.txt', 'src/outside-control.ts');
materialize('entry.ts.txt', 'entry.ts');
materialize('ssr.test.mjs.txt', 'tests/ssr.test.mjs', { VITEST: import.meta.resolve('vitest') });
materialize('native.test.mjs.txt', 'tests/native-positive.test.mjs', { VITEST: import.meta.resolve('vitest'), CHOOSE: 1, CHOOSE_RESULT: 1, NESTED: 1, NESTED_RESULT: 1 });
materialize('native.test.mjs.txt', 'tests/native-opposite.test.mjs', { VITEST: import.meta.resolve('vitest'), CHOOSE: -1, CHOOSE_RESULT: 0, NESTED: 11, NESTED_RESULT: 10 });
materialize('config.mjs.txt', 'config.mjs.template', { VITEST_CONFIG: import.meta.resolve('vitest/config') });
materialize('raw-reporter.mjs.txt', 'raw-reporter.mjs.template');
materialize('finalize.mjs.txt', 'finalize.mjs');
materialize('cohort.mjs.txt', 'cohort.mjs', { ROOT: root, VITE: import.meta.resolve('vite'), VITEST_CLI: path.join(repo, 'node_modules/vitest/vitest.mjs') });
let code = 1, failure;
try {
  code = await runOwnedCommand({ name: 'provider-cohort', args: [path.join(root, 'cohort.mjs')], root,
    receipt: root, deadlineMs: Math.min(28000, deadline - Date.now() - 2000),
    env: { ...process.env, NATIVE_PROVIDER_DEADLINE_MS: String(deadline - 2000) } });
} catch (error) { failure = error; }
finally {
  try {
    const after = before(); fs.writeFileSync(path.join(root, 'original-inputs-after.json'), j(after));
    if (j(after) !== j(pins)) failure ||= Error('Original source/tool/harness bytes changed');
    const toolsAfter = installedToolSnapshot(repo, npmCli);
    fs.writeFileSync(path.join(root, 'installed-tools-after.json'), j(toolsAfter));
    if (j(toolsAfter) !== j(tools)) failure ||= Error('Complete installed compiler/provider/worker/native/npm bytes changed');
    if (Date.now() > deadline) failure ||= Error('Whole provider control work exceeded unchanged 30-second deadline');
    if (sha(fs.readFileSync(templateManifestPath)) !== templateManifestPin) failure ||= Error('Parent independent template manifest drift');
  } catch (error) { failure ||= error; }
  let ownership;
  try { ownership = verifyNoOwnedProcesses(); } catch (error) { failure ||= error; }
  fs.writeFileSync(path.join(root, 'owner-result.json'), j({ passed: !failure && code === 0, code, error: failure ? String(failure) : null, ownership,
    deadlineMs: 30000, templateManifestPin, installedToolFiles: Object.keys(tools).length,
    installedToolsSha256: sha(j(tools)), reusedReviewedOwner: true, noRetries: true, noProductChanges: true }));
}
if (failure) throw failure;
process.exitCode = code;
