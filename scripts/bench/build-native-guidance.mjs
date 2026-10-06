import {build,resolveConfig} from 'vite';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {digestFile,filesUnder,sourceSnapshot,verifyArtifact,installedToolSnapshot,verifyQualification,verifyNativeGraph} from './native-loader.mjs';
export async function buildNativeGuidance(root,receipt,invocation){
 const qualification=JSON.parse(readFileSync(resolve(root,'scripts/bench/qualification.json'),'utf8'));
 assert.equal(process.versions.node,qualification.runtime.versions.node);assert.equal(process.platform,qualification.runtime.platform);assert.equal(process.arch,qualification.runtime.arch);
 assert.equal(digestFile(process.execPath),qualification.nodeBinary);
 verifyQualification(root,qualification);
 const before=sourceSnapshot(root),installedTools=installedToolSnapshot(root);
 for(const [path,digest] of Object.entries({...qualification.toolInputs,...qualification.sourceGraph}))assert.equal(digestFile(resolve(root,path)),digest,path);
 const entry=resolve(receipt,'native-entry.ts');
 const entryTemplate=readFileSync(resolve(root,'scripts/bench/native-guidance-entry.ts'),'utf8');
 assert.equal(entryTemplate.split('ORIGINAL_ORACLE_PLACEHOLDER').length-1,1);
 writeFileSync(entry,entryTemplate.replace('ORIGINAL_ORACLE_PLACEHOLDER',resolve(root,'tests/proofs/fixtures/unpowered-fall-original.ts')));
 const configFile=resolve(root,'vite.config.ts'),resolved=await resolveConfig({configFile},'build','production');
 const options={target:resolved.build.target,minify:resolved.build.minify,sourcemap:resolved.build.sourcemap,cssMinify:resolved.build.cssMinify,
 mode:resolved.mode,base:resolved.base,tools:{vite:JSON.parse(readFileSync(resolve(root,'node_modules/vite/package.json'),'utf8')).version,
 rolldown:JSON.parse(readFileSync(resolve(root,'node_modules/rolldown/package.json'),'utf8')).version},
 adaptation:'ESM library entry/output retains proof API; Vite library-specific annotation/whitespace policy applies. No math/tier/fast-math overrides.'};
 assert.deepEqual(options,qualification.options,'Build options require renewed semantic qualification');
 const directory=resolve(receipt,'native');
 await build({configFile,build:{copyPublicDir:false,target:resolved.build.target,minify:resolved.build.minify,sourcemap:resolved.build.sourcemap,cssMinify:resolved.build.cssMinify,
 outDir:directory,emptyOutDir:true,lib:{entry,formats:['es'],fileName:()=> 'entry.mjs'}}});
 assert.deepEqual(sourceSnapshot(root),before,'Source changed during native build');
 assert.deepEqual(installedToolSnapshot(root),installedTools,'Installed compiler/runner bytes changed during build');
 verifyNativeGraph(root,directory,qualification);
 const code=Object.fromEntries(Object.keys(qualification.code).sort().map(path=>[path,digestFile(resolve(directory,path))]));
 assert.deepEqual(code,qualification.code,'Fresh compiled native bindings differ; renew differential proof');
 const files=Object.fromEntries(filesUnder(directory).map(path=>[relative(directory,path),digestFile(path)]));
 const manifest={schema:2,kind:qualification.kind,invocation,root,directory,entry:'entry.mjs',buildExitCode:0,
 source:before,installedTools,npmCli:process.env.npm_execpath,tools:Object.fromEntries(Object.keys(qualification.toolInputs).map(path=>[path,digestFile(resolve(root,path))])),
 qualificationDigest:digestFile(resolve(root,'scripts/bench/qualification.json')),nodeVersion:process.version,platform:process.platform,arch:process.arch,
 nodeBinary:digestFile(process.execPath),options,code,files};
 const manifestPath=resolve(receipt,'native-manifest.json');writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 const digest=digestFile(manifestPath);verifyArtifact(manifestPath,digest,invocation);return {manifestPath,digest,entry};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [root,receipt,invocation]=process.argv.slice(2);assert(root&&receipt&&invocation);
 const result=await buildNativeGuidance(root,receipt,invocation);
 writeFileSync(resolve(receipt,'native-build-result.json'),JSON.stringify(result,null,2)+'\n');
}
