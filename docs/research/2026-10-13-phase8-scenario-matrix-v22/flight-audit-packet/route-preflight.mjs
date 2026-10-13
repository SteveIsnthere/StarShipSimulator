import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { admitComposite } from '/workspace/StarShipSimulator/scripts/test/admission.mjs';
import { digest } from '/workspace/StarShipSimulator/scripts/test/integrity.mjs';
import { sourceSnapshot } from '/workspace/StarShipSimulator/scripts/bench/native-loader.mjs';

const root = '/workspace/StarShipSimulator';
const qualificationPath = resolve(root, 'docs/verification/native-flight-qualification.json');
const qualificationSha = '9920693d4d9c3c7e94880b50d508bce12facaa9b5f1f20242ca1fa5f2bb2c83e';
const sidecarPath = resolve(root, 'docs/verification/native-flight-qualification.sha256');
assert.equal(digest(qualificationPath), qualificationSha);
assert.equal(readFileSync(sidecarPath, 'utf8').trim(), qualificationSha);
const live = sourceSnapshot(root);
assert.equal(Object.keys(live).length, 803);
assert.equal(live['src/core/scenarios.ts'], 'bcd5fb6ca8070dfc9751485de6fce22ccfd8841ad6c2f4db6908117aafc94e7b');
assert.equal(live['tests/flies-every-scenario.test.ts'], 'ecb37ed056299d07a5edc05b4e9d3fed9345ca8fbb1510849dc3604f731b3959');
let reason = '';
try {
  await admitComposite(qualificationPath, qualificationSha);
  assert.fail('Default native qualification unexpectedly admits current source; SSR-only route is unsafe');
} catch (error) {
  reason = String(error?.message ?? error);
  assert(reason.includes('65a069084bf351d87d527dffddd340453a5789f6b57bc60e9fb808b56e11eadb'));
  assert(reason.includes('3c33d75d067ffc72eddcfee3281f148407ba81f814c2fb7da279860ad09327b7'));
}
process.stdout.write([
  'route=default-native-qualification-rejected; SSR-fallback',
  `qualification_path=${qualificationPath}`,
  `qualification_sha256=${qualificationSha}`,
  `live_source_rows=${Object.keys(live).length}`,
  `scenario_source_sha256=${live['src/core/scenarios.ts']}`,
  `matrix_test_sha256=${live['tests/flies-every-scenario.test.ts']}`,
  'qualification_rejection=known-stale-booster-guidance-source-row',
  'qualification_rejection_hashes=65a069084bf351d87d527dffddd340453a5789f6b57bc60e9fb808b56e11eadb/3c33d75d067ffc72eddcfee3281f148407ba81f814c2fb7da279860ad09327b7',
  'explicit_native_route=unset',
  'production_acceptance=false',
  '',
].join('\n'));
