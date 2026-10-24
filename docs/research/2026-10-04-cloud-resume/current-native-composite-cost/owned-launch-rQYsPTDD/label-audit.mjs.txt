/** Pure offline source-derived label audit; no runner, core import or test execution. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {basename,resolve} from 'node:path';
export function auditCompletedFall(old,inventory){
 const original=JSON.parse(readFileSync(resolve(old,'finalized.json'),'utf8'));
 assert(original.finalized&&original.status==='failed'&&original.mode==='kernels'&&original.stage==='fall-76');
 assert(original.failure.startsWith('AssertionError [ERR_ASSERTION]: literal76 name inventory'),'sole known inventory-label failure required');
 for(const stage of ['app-build','native-build','fall-76']){
  assert.equal(JSON.parse(readFileSync(resolve(old,`${stage}.exit.json`),'utf8')).code,0);
  const process=JSON.parse(readFileSync(resolve(old,`${stage}.process.json`),'utf8'));
  assert.equal(process.exit.code,0);assert.equal(process.failure,null);assert.deepEqual(process.cleanup.executing,[]);
 }
 for(const name of ['burn-2300.exit.json','burn-2300.process.json','burn-proof-result.json','burn-paid-cases.ndjson','admission.ndjson'])assert(!existsSync(resolve(old,name)),'unexecuted burn-only continuation domain');
 const report=JSON.parse(readFileSync(resolve(old,'fall-report.json'),'utf8'));
 assert.equal(report.numTotalTests,76);assert.equal(report.numPassedTests,76);assert.equal(report.numFailedTests,0);assert.equal(report.numPendingTests,0);
 const expected=new Map();
 for(const row of inventory){
  const collection=basename(row.collection).replace(/^fall-bundle-(preparation|continuation|boundary)-proof\.test\.ts\.txt$/, '$1.test.ts');
  if(!expected.has(collection))expected.set(collection,[]);expected.get(collection).push(row.name);
 }
 assert.equal(expected.size,6);assert.equal(report.testResults.length,6);
 for(const suite of report.testResults){
  const collection=basename(suite.name);assert(expected.has(collection),collection);
  assert.equal(suite.status,'passed');assert(suite.assertionResults.every(test=>test.status==='passed'));
  assert.deepEqual(suite.assertionResults.map(test=>test.title).sort(),expected.get(collection).sort(),`exact source-derived${collection} labels`);expected.delete(collection);
 }
 assert.equal(expected.size,0);
 return {status:'pass',domain:'offline exact title-only mapping audit',originalKernelStatus:'failed',completedFallTests:76,originalFailurePreserved:true,execution:'No build/test collection/76 rerun'};
}
