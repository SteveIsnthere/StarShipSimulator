/**
 * Regenerate every golden fixture.
 *
 *     npm run golden:regenerate
 *
 * Running this is a physics change unless the output is byte-identical.
 * `physics-change-policy` permits it only under a declared Bug-fix or Fidelity tier,
 * justified in the same commit. `git diff tests/golden/fixtures/` after running
 * it is the before/after evidence that commit owes.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { record, samplesOf, serialise } from './record';
import { GOLDEN_SPECS } from './scenarios';
import { isRecordingPlatform } from './compare';

/*
  Fixtures are committed only from the recording platform, where replay is
  checked bit for bit (compare.ts). Phase 5 re-blessed them on a Mac once, and
  main went red on Linux in the 16th digit. Elsewhere this refuses, unless asked
  for a local preview (GOLDEN_PREVIEW=1), whose output must not be committed.
*/
if (!isRecordingPlatform() && process.env['GOLDEN_PREVIEW'] !== '1') {
  console.error(
    'golden:regenerate: not the recording platform (x86-64 Linux, Node 22).\n' +
      '  Commit fixtures from .github/workflows/golden-regenerate.yml:\n' +
      '    git push origin HEAD:golden/<name>   then download the golden-fixtures artifact.\n' +
      '  For a local preview only (never committed): GOLDEN_PREVIEW=1 npm run golden:regenerate',
  );
  process.exit(1);
}

const DIR = fileURLToPath(new URL('./fixtures/', import.meta.url));
mkdirSync(DIR, { recursive: true });

for (const spec of GOLDEN_SPECS) {
  const golden = record(spec.id, spec.build(), spec.steps, spec.setup);
  writeFileSync(`${DIR}${spec.id}.json`, serialise(golden) + '\n');
  const samples = samplesOf(golden);
  const last = samples[samples.length - 1]!;
  console.log(
    `${spec.id.padEnd(26)} ${String(samples.length).padStart(4)} samples  ` +
      `alt ${Number(last['kinematics.altitude']).toFixed(1).padStart(10)} m  ` +
      `vy ${Number(last['kinematics.speedY']).toFixed(2).padStart(9)} m/s  ` +
      `${last['failures.crashed'] ? 'CRASHED' : last['status.landed'] ? 'landed' : ''}`,
  );
}
console.log(`\n${GOLDEN_SPECS.length} fixtures written to tests/golden/fixtures/`);
