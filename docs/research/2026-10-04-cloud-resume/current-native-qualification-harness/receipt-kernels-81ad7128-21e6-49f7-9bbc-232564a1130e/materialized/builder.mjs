import {build,resolveConfig} from 'vite';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,dirname,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [receipt,plainEntry,countedEntry]=process.argv.slice(2).map(p=>resolve(p));
assert(receipt && plainEntry && countedEntry);
const configFile=resolve('vite.config.ts');
const resolved=await resolveConfig({configFile},'build','production');
const selected={target:resolved.build.target,minify:resolved.build.minify,sourcemap:resolved.build.sourcemap,
 cssMinify:resolved.build.cssMinify,mode:resolved.mode,base:resolved.base,
 tools:{vite:JSON.parse(readFileSync('node_modules/vite/package.json','utf8')).version,
 rolldown:JSON.parse(readFileSync('node_modules/rolldown/package.json','utf8')).version},
 adaptation:'ESM library entry/output retains proof API; Vite library-specific annotation/whitespace policy applies. No math/tier/fast-math overrides.'};
writeFileSync(resolve(receipt,'production-options.json'),JSON.stringify(selected,null,2)+'\n');
const virtual='\0fall-proof-counters';
const moduleText='let isa=0,controls=0,prepared=0,fallback=0;export function countIsa(){isa++;}export function countControls(){controls++;}export function countPrepared(){prepared++;}export function countFallback(){fallback++;}export function resetCounts(){isa=0;controls=0;prepared=0;fallback=0;}export function readCounts(){return {isa,controls,prepared,fallback};}';
const targets=[
 {path:resolve('src/core/physics/isa.ts'),needle:'export function isaAtmosphereInto(altitude: number, out: Atmosphere): void {',name:'countIsa'},
 {path:resolve('src/core/physics/damage-controls.ts'),needle:'export function writeDamageControls(state: DamageState, model: DamageControlModel,\n  q: number, incidence: number, frontCommand: number, aftCommand: number,\n  out: DamageControlForces): void {',name:'countControls'}];
targets.push({path:resolve('src/core/control/guidance-physics.ts'),needle:'perEngineFlow: number, vacuumThrust: number, exitArea: number, tailArea: number,\n): number {',name:'countPrepared'});
targets.push({path:resolve('src/core/control/guidance-physics.ts'),needle:'function backwardPass(\n  engines: number,\n  touchdownMass: number,\n  descentSpeed: number,\n  touchdownHeight: number,\n  scratch: BurnScratch,\n  model: VehicleDefinition,\n): number {',name:'countFallback'});
const transformations=[];
const digest=s=>createHash('sha256').update(s).digest('hex');
const counters={name:'research-passive-entry-counters',enforce:'pre',
 resolveId(id){if(id==='fall-proof-counters')return virtual;},
 load(id){if(id===virtual)return moduleText;},
 transform(code,id){const selected=targets.filter(t=>t.path===id);if(!selected.length)return;
  assert.equal(code,readFileSync(id,'utf8'),'Virtual input must equal pinned original bytes');
  let transformed=code;
  for(const target of selected){assert.equal(transformed.split(target.needle).length-1,1,'Exactly one function entry insertion');
   transformed=transformed.replace(target.needle,target.needle+`\n  ${target.name}();`);}
  transformed=`import {${selected.map(t=>t.name).join(',')}} from 'fall-proof-counters';\n`+transformed;
  transformations.push({path:id,originalHash:digest(code),transformedHash:digest(transformed),insertions:selected.length,
    original:code,transformed});return {code:transformed,map:null};}};

for(const [kind,entry] of [['plain',plainEntry],['counted',countedEntry]]){
 await build({configFile,plugins:kind==='counted'?[counters]:[],build:{
  target:resolved.build.target,minify:resolved.build.minify,sourcemap:resolved.build.sourcemap,
  cssMinify:resolved.build.cssMinify,outDir:resolve(receipt,kind),emptyOutDir:true,
  lib:{entry,formats:['es'],fileName:()=> 'entry.mjs'}}});
}
assert.equal(transformations.length,3,'Exactly three transformed source modules required');
assert.equal(new Set(transformations.map(t=>t.path)).size,3);
mkdirSync(resolve(receipt,'virtual-source'));
for(const [i,t] of transformations.entries()){
 writeFileSync(resolve(receipt,'virtual-source',`${i}-original.ts`),t.original);
 writeFileSync(resolve(receipt,'virtual-source',`${i}-transformed.ts`),t.transformed);
}
writeFileSync(resolve(receipt,'virtual-source-manifest.json'),JSON.stringify(transformations.map(({original,transformed,...meta})=>meta),null,2)+'\n');
writeFileSync(resolve(receipt,'counter-module.txt'),moduleText+'\n');
// Prove the plain emitted source maps describe exact current source bytes.
const sourceMaps=[];const mapped=new Set();
for(const name of readdirSync(resolve(receipt,'plain'))){
 if(!name.endsWith('.map'))continue;
 const mapPath=resolve(receipt,'plain',name),map=JSON.parse(readFileSync(mapPath,'utf8'));
 assert(Array.isArray(map.sources)&&Array.isArray(map.sourcesContent));
 assert.equal(map.sources.length,map.sourcesContent.length);
 for(let i=0;i<map.sources.length;i++){
  const source=map.sources[i];
  assert.equal(typeof map.sourcesContent[i],'string','Every plain mapped source must retain original content');
  assert(!source.includes('://'),'Unexpected virtual/network source in plain bundle');
  const path=isAbsolute(source)?source:resolve(dirname(mapPath),map.sourceRoot??'',source);
  assert.equal(map.sourcesContent[i],readFileSync(path,'utf8'),'Plain bundle map source differs from current pinned bytes');
  mapped.add(path);sourceMaps.push({map:name,source:path,hash:digest(map.sourcesContent[i])});
 }
}
for(const path of ['src/core/control/guidance-physics.ts','src/core/physics/isa.ts','src/core/physics/damage-controls.ts','src/core/vehicle.ts','src/core/vehicles/super-heavy.ts','src/core/step.ts','src/core/autopilot/booster.ts','src/core/scenarios.ts','src/core/physics/propulsion.ts','src/core/physics/aero.ts'])
 assert(mapped.has(resolve(path)),`Required exact current production source absent from maps: ${path}`);
writeFileSync(resolve(receipt,'plain-source-map-manifest.json'),JSON.stringify(sourceMaps,null,2)+'\n');
