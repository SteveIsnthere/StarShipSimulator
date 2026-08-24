/**
 * Regenerate every golden fixture.
 *
 *     npx vite-node tests/golden/regenerate.ts
 *
 * Running this is a physics change unless the output is byte-identical.
 * CLAUDE.md permits it only under a declared Bug-fix or Fidelity tier,
 * justified in the same commit. `git diff tests/golden/fixtures/` after running
 * it is the before/after evidence that commit owes.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { record, samplesOf, serialise } from './record';
import { GOLDEN_SPECS } from './scenarios';

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
