import { writeFileSync } from 'node:fs';
import { record, samplesOf } from './tests/golden/record';
import { GOLDEN_SPECS } from './tests/golden/scenarios';
const results=GOLDEN_SPECS.map(spec=>({id:spec.id,samples:samplesOf(record(spec.id,spec.build(),spec.steps,spec.setup))}));
writeFileSync(process.argv[2]!,JSON.stringify(results));
console.log(`${results.length} golden-spec trajectories recorded in memory; no fixtures written`);
