import assert from 'node:assert/strict';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { sourceSnapshot } from '/workspace/StarShipSimulator/scripts/bench/native-loader.mjs';
import { buildCacheTreeManifest, buildRuntimeTreeManifest, runtimeRoots } from './runtime-tree-manifest.mjs';
import { digest } from '/workspace/StarShipSimulator/scripts/test/integrity.mjs';

const root='/workspace/StarShipSimulator';
const packet=resolve(root,'docs/research/2026-10-13-phase8-scenario-matrix-v22/flight-audit-packet');
const read=name=>readFileSync(resolve(packet,name),'utf8');
const nodeModules=resolve(root,'node_modules');
const npmRoot='/workspace/cloud-bootstrap/starship-v1/node/lib/node_modules/npm';
const nodeLauncher='/workspace/cloud-bootstrap/starship-v1/node/bin/node';
const cpBinary='/usr/bin/cp';
const nodeBinary=realpathSync(process.execPath);
assert.equal(process.version,'v22.23.3');
assert.equal(nodeBinary,'/workspace/cloud-bootstrap/starship-v1/node/bin/node');
assert.equal(digest(process.execPath),'fde6a4bf8d0562f7751d1a2d6cb9b417c4cfe107bbcb0aa3e9a24e125e348f48');
const npmPackage=JSON.parse(readFileSync(resolve(npmRoot,'package.json'),'utf8'));
assert.equal(npmPackage.version,'10.9.9');
const source=sourceSnapshot(root);
assert.equal(Object.keys(source).length,803);
const sourcePins=read('source-pins.sha256').split('\n').filter(Boolean);
assert.equal(sourcePins.length,803);
for(const line of sourcePins){const match=/^([a-f0-9]{64})  (.+)$/.exec(line);assert(match);assert.equal(source[match[2]],match[1],match[2]);}
const roots=runtimeRoots({nodeModules,npmRoot,nodeLauncher,nodeBinary,cpBinary});
const runtimeManifest=buildRuntimeTreeManifest(roots,{excludeCacheDirs:['.vite','.vite-temp']});
assert.equal(runtimeManifest,read('runtime-tree-manifest.jsonl'));
const cacheRows=[];
for(const name of ['.vite','.vite-temp']){
 const baseline=resolve(packet,'cache-before/node_modules',name);
 const live=resolve(nodeModules,name);
 assert(lstatSync(live).isDirectory()&&!lstatSync(live).isSymbolicLink());
 const expected=read(name==='.vite'?'cache-before-vite-metadata.jsonl':'cache-before-vite-temp-metadata.jsonl');
 assert.equal(buildCacheTreeManifest(baseline),expected);
 assert.equal(buildCacheTreeManifest(live),expected);
 cacheRows.push(expected.trimEnd().split('\n').length);
}
const coverage=resolve(root,'coverage');
assert(lstatSync(coverage).isDirectory()&&!lstatSync(coverage).isSymbolicLink());
assert.equal(buildCacheTreeManifest(coverage),read('coverage-before-metadata.jsonl'));
const qualification=resolve(root,'docs/verification/native-flight-qualification.json');
const qualificationSidecar=resolve(root,'docs/verification/native-flight-qualification.sha256');
assert.equal(digest(qualification),'9920693d4d9c3c7e94880b50d508bce12facaa9b5f1f20242ca1fa5f2bb2c83e');
assert.equal(digest(qualificationSidecar),'17b4f3c6c68198637d215556264d22769d7621a6b026ffa300132eabf9f06aef');
const q=JSON.parse(readFileSync(qualification,'utf8'));
assert.equal(q.productionAcceptance,false);
assert(!existsSync(resolve(packet,'.one-shot-claimed')));
assert(!existsSync(resolve(packet,'actual-v1')));
const branchResult=spawnSync('/usr/bin/git',['branch','--show-current'],{cwd:root,encoding:'utf8',timeout:5000});
assert.equal(branchResult.status,0);assert.equal(branchResult.stdout.trim(),'claude/visuals');
const headResult=spawnSync('/usr/bin/git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',timeout:5000});
assert.equal(headResult.status,0);assert.equal(headResult.stdout.trim(),'8b8a8e30ec692cc16f91e6bfdec1db2c93456671');
process.stdout.write([
 'static_preflight=PASS',`branch=${branchResult.stdout.trim()}`,`head=${headResult.stdout.trim()}`,
 `node=${process.version}`,`npm=${npmPackage.version}`,'source_rows=803','source_hashes=PASS',
 `runtime_tree_rows=${runtimeManifest.trimEnd().split('\n').length}`,'runtime_tree_matches=PASS',
 `cache_metadata_rows=${cacheRows.join(',')}`,'live_cache_matches_saved_baselines=PASS',
 `coverage_metadata_rows=${read('coverage-before-metadata.jsonl').trimEnd().split('\n').length}`,
 'coverage_matches_baseline=PASS',`default_qualification_sha256=${digest(qualification)}`,
 'default_qualification_production_acceptance=false','one_shot_marker=ABSENT','actual_output=ABSENT',
 'candidate_packet_test=NOT_RUN','candidate_packet_build=NOT_RUN','candidate_packet_browser=NOT_RUN','',
].join('\n'));
