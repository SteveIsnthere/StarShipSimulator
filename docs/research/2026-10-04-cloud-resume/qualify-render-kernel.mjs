/** Offline, separately granted qualification after one research build. No browser launch. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const repo = '/workspace/StarShipSimulator', setup = process.argv[2];
if (!setup || !/^\/tmp\/starship-render-kernel\.[A-Za-z0-9]+$/.test(setup)) throw Error('Exact private research directory required');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const buildResultBytes=await fs.readFile(`${setup}/kernel-build-result.json`),buildBeforeBytes=await fs.readFile(`${setup}/kernel-build-before.json`),buildAfterBytes=await fs.readFile(`${setup}/kernel-build-after.json`);
const buildResult=JSON.parse(buildResultBytes),buildBefore=JSON.parse(buildBeforeBytes),buildAfter=JSON.parse(buildAfterBytes);
if(!buildResult.passed||buildResult.childExit!==0||buildResult.childSignal||!buildResult.childSettled||buildResult.remaining.length||buildResult.errors.length||!buildResult.sourceToolBeforeAfter||JSON.stringify(buildBefore)!==JSON.stringify(buildAfter))throw Error('Actual successful owned research build/source/tool boundaries required');
if(buildResult.unregisteredChildPid!==null||!buildResult.ownerReceipt||buildResult.ownerReceipt.path!=='kernel-build-owner.json'||!buildResult.rawOutput||buildResult.rawOutput.path!=='kernel-build-output.txt'||buildResult.rawOutput.truncated)throw Error('Actual registered build owner and complete bounded raw child output required');
const ownerBytes=await fs.readFile(`${setup}/kernel-build-owner.json`),rawOutput=await fs.readFile(`${setup}/kernel-build-output.txt`),owner=JSON.parse(ownerBytes);
if(sha(ownerBytes)!==buildResult.ownerReceipt.sha256||owner.pgrp!==owner.pid||owner.exe!==buildBefore.node.path||!buildResult.owned.some(item=>item.pid===owner.pid&&item.starttime===owner.starttime)||sha(rawOutput)!==buildResult.rawOutput.sha256||rawOutput.length!==buildResult.rawOutput.bytes)throw Error('Stable registered owner/raw child evidence drift');
const files = [], sourceContents = [], unresolvedSources = [];
let compiledBytes=0;
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (entry.isFile()) {
      const bytes = await fs.readFile(file); compiledBytes+=bytes.length;if(compiledBytes>64*1024*1024||files.length>=5000)throw Error('Declared compiled64MiB/5000file cap exceeded');files.push([path.relative(`${setup}/compiled`, file), sha(bytes)]);
      if (file.endsWith('.map')) {
        const map = JSON.parse(bytes.toString());
        if (!map.sources.length || map.sources.length !== map.sourcesContent?.length) throw Error('Complete source content required');
        for (let i = 0; i < map.sources.length; i++) {
          const source = map.sources[i], content = map.sourcesContent[i];
          if (typeof content !== 'string') throw Error('Missing source content');
          const resolved = path.resolve(path.dirname(file), map.sourceRoot || '', source);
          if (!resolved.startsWith(`${repo}/`)) { unresolvedSources.push({ map: path.relative(setup,file), source, contentSha256: sha(content), reason: 'Virtual/external source requires explicit independent qualification' }); continue; }
          const actual = await fs.readFile(resolved);
          if (sha(actual) !== sha(content)) throw Error(`Source content mismatch:${source}`);
          sourceContents.push({ map: path.relative(setup,file), source, repositoryPath: path.relative(repo,resolved), sha256: sha(actual) });
        }
      }
    } else throw Error('No symlink/special compiled entries');
  }
}
await walk(`${setup}/compiled`); files.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
if (!files.some(row=>row[0]==='kernel.js') || !files.some(row=>row[0]==='kernel.js.map')) throw Error('Actual ESM entry and map required');
const ownedSources = [];
for (const name of ['render-kernel-entry.ts','render-kernel-build.config.mjs','run-render-kernel.mjs','kernel-program-attribution-hook.mjs','prepare-render-kernel.py','qualify-render-kernel.mjs','build-render-kernel.mjs']) {
  const relative = `docs/research/2026-10-04-cloud-resume/${name}`; ownedSources.push([relative,sha(await fs.readFile(`${repo}/${relative}`))]);
}
await fs.writeFile(`${setup}/kernel-compiled-manifest.json`,JSON.stringify({ purpose:'Research render kernel, not application dist/session acceptance', supervisedBuildReceipts:[['kernel-build-result.json',sha(buildResultBytes)],['kernel-build-before.json',sha(buildBeforeBytes)],['kernel-build-after.json',sha(buildAfterBytes)],['kernel-build-owner.json',sha(ownerBytes)],['kernel-build-output.txt',sha(rawOutput)]], files, sourceContents, unresolvedSources, ownedSources, requiresFreshIndependentActualBuildReview:true },null,2)+'\n',{flag:'wx'});
