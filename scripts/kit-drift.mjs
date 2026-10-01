/**
 * Report how src/ui/kit differs from flight_sim's web/src/ui, which it is a
 * byte-for-byte copy of (src/ui/kit/PROVENANCE.md). Reports; never fails: the
 * kit is re-synced deliberately, not by a gate.
 *
 * Usage: npm run kit:drift [-- <path to flight_sim/web/src/ui>]
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const KIT = join(ROOT, 'src/ui/kit');
const UPSTREAM = resolve(process.argv[2] ?? join(ROOT, '../flight_sim/web/src/ui'));
const OURS = new Set(['PROVENANCE.md']);

async function files(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await files(p)));
    else out.push(p);
  }
  return out;
}

if (!existsSync(UPSTREAM)) {
  console.log(`kit:drift: no flight_sim checkout at ${UPSTREAM}; nothing to compare.`);
  process.exit(0);
}
const ours = (await files(KIT)).map((p) => relative(KIT, p)).filter((p) => !OURS.has(p));
const theirs = (await files(UPSTREAM)).map((p) => relative(UPSTREAM, p));
const changed = [];
for (const p of ours.filter((p) => theirs.includes(p))) {
  const [a, b] = await Promise.all([readFile(join(KIT, p)), readFile(join(UPSTREAM, p))]);
  if (!a.equals(b)) changed.push(p);
}
const onlyOurs = ours.filter((p) => !theirs.includes(p));
const onlyTheirs = theirs.filter((p) => !ours.includes(p));
for (const [label, list] of [['changed upstream', changed], ['removed upstream', onlyOurs], ['new upstream', onlyTheirs]]) {
  for (const p of list) console.log(`${label.padEnd(17)} ${p}`);
}
console.log(
  changed.length + onlyOurs.length + onlyTheirs.length === 0
    ? 'kit:drift: identical to flight_sim.'
    : `kit:drift: ${changed.length} changed, ${onlyOurs.length} removed, ${onlyTheirs.length} new. Re-sync with rsync -a --delete --exclude PROVENANCE.md <flight_sim>/web/src/ui/ src/ui/kit/ and update PROVENANCE.md.`,
);
