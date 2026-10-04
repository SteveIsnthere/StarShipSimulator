/** Separately granted pure route/retained-byte proof. No build or provider. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { assertExactExternalMapRoute } from './external-map-route.mjs';
const base = path.dirname(fileURLToPath(import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const body = 'export const proof = 1;\n//# sourceMappingURL=control.mjs.map';
for (const suffix of ['', '\n', '\r\n']) assertExactExternalMapRoute(body + suffix);
for (const code of [body + '\nexport const trailing = 2;', body + '\n\n',
  body.replace('control.mjs.map', 'foreign.map'), body.replace('control.mjs.map', 'data:application/json;base64,e30='),
  body + '\n//# sourceMappingURL=control.mjs.map']) {
  assert.throws(() => assertExactExternalMapRoute(code), /map route|map routes/);
}
const originBytes = fs.readFileSync(path.join(base, 'compile-origin.json')), origin = JSON.parse(originBytes);
const codeBytes = fs.readFileSync(path.join(origin.retainedRoot, origin.artifact.retainedPath));
const mapBytes = fs.readFileSync(path.join(origin.retainedRoot, origin.map.retainedPath));
assert.equal(sha(codeBytes), origin.artifact.sha256); assert.equal(codeBytes.length, origin.artifact.bytes);
assert.equal(sha(mapBytes), origin.map.sha256); assert.equal(mapBytes.length, origin.map.bytes);
assertExactExternalMapRoute(codeBytes.toString());
const map = JSON.parse(mapBytes);
assert.equal(map.version, 3); assert.equal(map.file, 'control.mjs'); assert.equal(map.sources.length, map.sourcesContent.length);
const sourcePins = map.sources.map((name, index) => {
  const originalFile = path.resolve(origin.originalPrivateRoot, 'artifact', map.sourceRoot || '', name);
  assert(originalFile.startsWith(`${origin.originalPrivateRoot}/src/`));
  const relative = path.relative(origin.originalPrivateRoot, originalFile);
  assert.equal(typeof origin.retainedFiles[relative], 'string');
  const bytes = fs.readFileSync(path.join(origin.retainedRoot, origin.retainedFiles[relative]));
  assert.equal(bytes.toString(), map.sourcesContent[index]);
  assert.equal(sha(bytes), origin.fixtureFiles[relative]);
  return [relative, sha(bytes)];
});
assert.equal(sha(fs.readFileSync(path.join(origin.retainedRoot, 'owner-result.json'))), origin.ownerResultSha256);
assert.equal(sha(fs.readFileSync(path.join(origin.retainedRoot, 'cohort-outcome.json'))), origin.cohortOutcomeSha256);
const outcome = JSON.parse(fs.readFileSync(path.join(origin.retainedRoot, 'cohort-outcome.json')));
assert.equal(outcome.passed, false); assert.deepEqual(outcome.runs, []);
assert.match(outcome.error, /Native external map route missing/);
console.log(JSON.stringify({ passed: true, noBuildOrProvider: true, positiveEndings: ['none', 'LF', 'CRLF'],
  negatives: ['trailing code', 'extra blank line', 'wrong filename', 'inline map', 'duplicate route'],
  helperSha256: sha(fs.readFileSync(path.join(base, 'external-map-route.mjs'))), originSha256: sha(originBytes),
  actualArtifactSha256: sha(codeBytes), actualMapSha256: sha(mapBytes), sourcePins,
  originalOutcome: 'FAILED before any provider run, preserved without reinterpretation' }));
