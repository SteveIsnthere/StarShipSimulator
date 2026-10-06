import {readFileSync,readdirSync,statSync,realpathSync,lstatSync,readlinkSync} from 'node:fs';
import {resolve,relative,join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {Script,constants} from 'node:vm';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
export const digestFile=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
export function filesUnder(directory){const rows=[];for(const entry of readdirSync(directory,{withFileTypes:true})){
 const path=join(directory,entry.name);if(entry.isDirectory())rows.push(...filesUnder(path));else if(entry.isFile())rows.push(path);
}return rows.sort();}
export function sourceSnapshot(root){const paths=['src','tests','scripts'].flatMap(name=>filesUnder(resolve(root,name)));
 for(const name of readdirSync(root))if(/^(?:package.*\.json|.*config\..*|\.nvmrc)$/.test(name)&&statSync(resolve(root,name)).isFile())paths.push(resolve(root,name));
 return Object.fromEntries([...new Set(paths)].sort().map(path=>[relative(root,path),digestFile(path)]));}
// Complete immutable installed trees; only known project/compiler generated outputs excluded.
export function installedToolSnapshot(root,npmCli=process.env.npm_execpath){
 assert(npmCli,'npm invocation identity required');const npmRoot=dirname(dirname(realpathSync(npmCli)));
 assert.equal(JSON.parse(readFileSync(resolve(npmRoot,'package.json'),'utf8')).name,'npm');
 const rows={};const excluded=new Set(['.cache','.vite','.vite-temp','.kit-types']);
 function walk(directory,prefix,top=false){for(const name of readdirSync(directory).sort()){
  if(top&&excluded.has(name))continue;const path=join(directory,name),key=`${prefix}/${name}`,stat=lstatSync(path);
  if(stat.isSymbolicLink()){const target=realpathSync(path);assert(statSync(target).isFile(),'Directory dependency symlink needs explicit qualification');rows[key]=`link:${readlinkSync(path)}:${digestFile(target)}`;}
  else if(stat.isDirectory())walk(path,key);else if(stat.isFile())rows[key]=digestFile(path);
 }}
 walk(resolve(root,'node_modules'),'node_modules',true);walk(npmRoot,'global-npm');return rows;
}
export function verifyQualification(root,qualification){
 assert.equal(qualification.schema,2);assert.equal(qualification.kind,'current-guidance-four-role-native-benchmark-v1');
 for(const [path,digest] of Object.entries(qualification.evidence))assert.equal(digestFile(resolve(root,path)),digest,'Semantic evidence changed');
 const baseline=JSON.parse(readFileSync(resolve(root,qualification.installedReference),'utf8'));
 assert.deepEqual(installedToolSnapshot(root),baseline.installed,'Installed compiler/native/npm differs from accepted current graph');
 assert.equal(baseline.node,qualification.nodeBinary);
 assert.equal(digestFile(resolve(root,'scripts/bench/owned-command.mjs')),qualification.ownedCommandDigest);
 for(const [path,digest] of Object.entries(qualification.timingSources))assert.equal(digestFile(resolve(root,path)),digest,'Original timing body changed');
 assert.equal(qualification.constantsContract.legacyVehicleHeight,50);assert.equal(qualification.constantsContract.shipHeight,52);assert.equal(qualification.constantsContract.ground,25);
}
export function verifyNativeGraph(root,directory,qualification){
 assert.deepEqual(filesUnder(directory).map(path=>relative(directory,path)).sort(),[...Object.keys(qualification.code),...Object.keys(qualification.mapRoles)].sort(),'Four-role closure changed');
 const mapped={};
 for(const [name,role] of Object.entries(qualification.mapRoles)){
  const path=resolve(directory,name),map=JSON.parse(readFileSync(path,'utf8'));
  assert(Array.isArray(map.sources)&&Array.isArray(map.sourcesContent));assert.equal(map.sources.length,map.sourcesContent.length);
  const routes=[];
  for(let i=0;i<map.sources.length;i++){
   assert.equal(typeof map.sourcesContent[i],'string');assert(!map.sources[i].includes('://'));
   const original=resolve(dirname(path),map.sourceRoot??'',map.sources[i]),route=relative(root,original);
   assert.equal(map.sourcesContent[i],readFileSync(original,'utf8'),'Mapped body differs from current source');routes.push(route);
   mapped[route]=createHash('sha256').update(map.sourcesContent[i]).digest('hex');
  }
  assert.deepEqual(routes,role.sources,'Ordered defining source roles changed');
  const shape=Object.fromEntries(Object.entries(map).filter(([key])=>!['sources','sourcesContent','sourceRoot'].includes(key)));
  assert.equal(createHash('sha256').update(JSON.stringify(shape)).digest('hex'),role.shapeSha256,'Map mappings/names/format changed');
 }
 assert.deepEqual(mapped,qualification.sourceGraph,'Current54core plus original-fall oracle graph changed');
}
export function verifyArtifact(manifestPath,expectedDigest,invocation){
 assert.equal(typeof expectedDigest,'string');assert.match(expectedDigest,/^[a-f0-9]{64}$/);
 assert.equal(digestFile(manifestPath),expectedDigest,'Missing/wrong/stale manifest digest');
 const m=JSON.parse(readFileSync(manifestPath,'utf8'));assert.equal(m.schema,2);assert.equal(m.kind,'current-guidance-four-role-native-benchmark-v1');assert.equal(m.invocation,invocation);
 assert.equal(realpathSync(m.root),realpathSync(process.cwd()),'Artifact belongs to another checkout');
 assert.deepEqual(sourceSnapshot(m.root),m.source,'Current source inventory/digests changed');
 assert.deepEqual(installedToolSnapshot(m.root,m.npmCli),m.installedTools,'Installed build/runner implementation/native bytes changed');
 assert.equal(process.version,m.nodeVersion);assert.equal(process.platform,m.platform);assert.equal(process.arch,m.arch);
 assert.equal(digestFile(process.execPath),m.nodeBinary,'Node binary changed');
 for(const [path,digest] of Object.entries(m.tools))assert.equal(digestFile(resolve(m.root,path)),digest,path);
 const qualification=JSON.parse(readFileSync(resolve(m.root,'scripts/bench/qualification.json'),'utf8'));
 assert.equal(digestFile(resolve(m.root,'scripts/bench/qualification.json')),m.qualificationDigest);verifyQualification(m.root,qualification);verifyNativeGraph(m.root,m.directory,qualification);
 assert.equal(process.versions.node,qualification.runtime.versions.node);assert.equal(process.platform,qualification.runtime.platform);assert.equal(process.arch,qualification.runtime.arch);
 assert.equal(digestFile(process.execPath),qualification.nodeBinary,'Runtime is not semantically qualified');
 for(const [path,digest] of Object.entries(qualification.toolInputs))assert.equal(digestFile(resolve(m.root,path)),digest,path);
 for(const [path,digest] of Object.entries(qualification.sourceGraph))assert.equal(digestFile(resolve(m.root,path)),digest,path);
 assert.deepEqual(m.options,qualification.options,'Production compilation options changed');
 assert.equal(digestFile(resolve(m.root,'tests/core/guidance-physics.timing.test.ts')),qualification.guidanceTimingHash,'Original guidance timing bodies changed');
 assert.deepEqual(Object.keys(m.code).sort(),Object.keys(qualification.code).sort());
 for(const [path,digest] of Object.entries(qualification.code))assert.equal(digestFile(resolve(m.directory,path)),digest,'Compiled native bindings differ; renewed semantic proof required');
 const actual=Object.fromEntries(filesUnder(m.directory).map(path=>[relative(m.directory,path),digestFile(path)]));
 assert.deepEqual(actual,m.files,'Artifact inventory/digests changed');
 assert.equal(m.entry,'entry.mjs');assert.equal(m.buildExitCode,0);
 return m;
}
export async function loadNativeGuidance(manifestPath,expectedDigest,invocation){
 const manifest=verifyArtifact(manifestPath,expectedDigest,invocation);
 const nativeImport=new Script('url => import(url)',{importModuleDynamically:constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInThisContext();
 const api=await nativeImport(pathToFileURL(resolve(manifest.directory,manifest.entry)).href);
 const qualification=JSON.parse(readFileSync(resolve(manifest.root,'scripts/bench/qualification.json'),'utf8'));
 for(const name of qualification.requiredExports)assert(name in api,`Missing qualified role ${name}`);
 assert.equal(api.SHIP.height,52);return api;
}
