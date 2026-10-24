import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { admitComposite, admitRun } from './admission.mjs';
import { digest, parse } from './integrity.mjs';
export async function prepareRun(path, sha) {
  const q = await admitComposite(path, sha);
  const privateRoot = mkdtempSync(resolve(tmpdir(), 'starship-official-flight.'));
  const directory = resolve(privateRoot, 'native');
  const receipt = directory + '.receipts'; mkdirSync(receipt);
  const owner = resolve(q.root, 'scripts/bench/owned-command.mjs');
  assert.equal(digest(owner), q.ownedCommandDigest);
  const { runOwnedCommand } = await import(pathToFileURL(owner).href);
  const code = await runOwnedCommand({ name: 'native-build', root: q.root, receipt,
    args: [resolve(q.root, 'scripts/test/build.mjs'), path, sha, directory],
    env: { ...process.env }, deadlineMs: 90000 });
  assert.equal(code, 0);
  const manifestPath = directory + '.json', manifestSha = digest(manifestPath);
  await admitRun(manifestPath, manifestSha);
  return { manifestPath, manifestSha, manifest: parse(manifestPath) };
}
