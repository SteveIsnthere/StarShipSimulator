import assert from 'node:assert/strict';
import {Session} from 'node:inspector';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [receipt,oraclePath]=process.argv.slice(2);assert(receipt&&oraclePath);assert.equal(process.version,'v22.23.3');
const source=readFileSync(oraclePath,'utf8'),sha=x=>createHash('sha256').update(x).digest('hex');
assert.equal(sha(source),'34fd9cf3959764b7273d5fa367ec96181b7bf9918aee7514bc23f77b66c3619e');
const session=new Session();session.connect();
const request=(method,params={})=>new Promise((done,reject)=>session.post(method,params,(error,result)=>error?reject(error):done(result)));
const scripts=new Map();session.on('Debugger.scriptParsed',({params})=>scripts.set(params.scriptId,params));
const save=(name,value)=>{const text=JSON.stringify(value,null,2)+'\n';assert(Buffer.byteLength(text)<=16*1024*1024,'Research artifact16MiBbound');writeFileSync(resolve(receipt,name),text,{flag:'wx'});};
let active=false,profile=null,failure=null,completed=0,verified=null,loadedSource=null;
const recipe={warmIterations:50,measuredIterations:500,cells:64,samplingIntervalUs:100,softDiagnosticBoundMs:25000};
function inputs(){
 const sharedLeft=Object.freeze({n:NaN,z:-0}),sharedRight=Object.freeze({n:NaN,z:-0});
 const left=Array.from({length:recipe.cells},(_,i)=>({n:i,z:-0,nan:NaN,inf:Infinity,...Object.fromEntries(Array.from({length:12},(_,k)=>['v'+k,i+k]))}));
 const right=Array.from({length:recipe.cells},(_,i)=>({n:i,z:-0,nan:NaN,inf:Infinity,...Object.fromEntries(Array.from({length:12},(_,k)=>['v'+k,i+k]))}));
 return{left,right,sharedLeft,sharedRight};
}
function tick(oracle,data,i){
 for(let j=0;j<recipe.cells;j++){data.left[j].n=i+j;data.right[j].n=i+j;}
 return oracle.compare({cells:data.left,alias:data.left[0],frozen:Object.freeze({shared:data.sharedLeft})},
  {cells:data.right,alias:data.right[0],frozen:Object.freeze({shared:data.sharedRight})},'puregraph');
}
const api=()=>[{SHIP:0,SUPER_HEAVY:0,CATCH:0},{SHIP:0,SUPER_HEAVY:0,CATCH:0}];
try{
 await request('Debugger.enable');
 const {graphOracle}=await import('./graph-oracle.ts');
 const loaded=[...scripts.values()].filter(row=>row.url===pathToFileURL(oraclePath).href||row.url===oraclePath);assert.equal(loaded.length,1,'One exact executing oracle scriptURL');
 const metadata=loaded[0];loadedSource=(await request('Debugger.getScriptSource',{scriptId:metadata.scriptId})).scriptSource;
 // Authoritative SSR executing bytes/offsets; never substitute native stripping.
 assert(loadedSource.includes('deep immutable proof node budget'));
 assert(loadedSource.includes('immutableProbeVisits'));
 assert(loadedSource.includes('oracle edge budget'));
 let actualMap=null;
 if(metadata.sourceMapURL?.startsWith('data:')){
  const comma=metadata.sourceMapURL.indexOf(',');assert(comma>0);
  const body=metadata.sourceMapURL.slice(comma+1);
  actualMap=JSON.parse(metadata.sourceMapURL.slice(0,comma).includes(';base64')?Buffer.from(body,'base64').toString('utf8'):decodeURIComponent(body));
  assert(actualMap.sourcesContent?.some(text=>text===source),'SSR source map must contain exact unchanged oracle');
 }
 save('executing-source-map.json',{map:actualMap,sourceMapURL:metadata.sourceMapURL??null,originalLineAttribution:actualMap!==null});
 save('executing-script.json',{metadata,source:loadedSource,digest:sha(loadedSource),originalDigest:sha(source),lineCount:loadedSource.split('\n').length});
 // Same exact comparator two independent owned graphs: complete paid counts and
 // probe counts are compared before profiling, not inferred from expected totals.
 const a=graphOracle(...api()),b=graphOracle(...api()),x=inputs(),y=inputs();
 assert.deepEqual(Object.keys(x.left[0]),['n','z','nan','inf',...Array.from({length:12},(_,i)=>'v'+i)]);
 for(let i=0;i<16;i++){
  const left=tick(a,x,i),right=tick(b,y,i);assert.deepEqual(left,right);
  assert.equal(right.nodes,69);assert.equal(right.edges,i===0?1096:1094);
 }
 assert.deepEqual(a.counts(),b.counts());
 assert.deepEqual(b.counts(),{totalNodes:1104,totalEdges:17509,immutableProbeVisits:115,immutableTrueHits:32,immutableFalseHits:0});
 let denied=false;try{a.compare({n:-0},{n:0});}catch(error){assert.equal(error.name,'AssertionError');assert.equal(error.message,'root.n: -0 !== 0');denied=true;}assert(denied);
 verified={controlIterations:16,counts:b.counts(),negativeSignedZeroDenied:true};save('positive-controls.json',verified);
 const oracle=graphOracle(...api()),data=inputs();
 for(let i=0;i<recipe.warmIterations;i++)tick(oracle,data,i);
 const before=oracle.counts();assert.deepEqual(before,{totalNodes:3450,totalEdges:54705,immutableProbeVisits:217,immutableTrueHits:100,immutableFalseHits:0});
 await request('Profiler.setSamplingInterval',{interval:recipe.samplingIntervalUs});
 await request('Profiler.enable');await request('Profiler.start');active=true;
 const started=performance.now();
 for(let i=0;i<recipe.measuredIterations;i++){
  assert(performance.now()-started<=recipe.softDiagnosticBoundMs,'Puregraph25ssoftbound');
  tick(oracle,data,i+recipe.warmIterations);completed++;
 }
 profile=(await request('Profiler.stop')).profile;active=false;
 const after=oracle.counts();const delta=Object.fromEntries(Object.keys(after).map(key=>[key,after[key]-before[key]]));
 assert.deepEqual(delta,{totalNodes:34500,totalEdges:547000,immutableProbeVisits:1500,immutableTrueHits:1000,immutableFalseHits:0});
 save('paid-counts.json',{recipe,before,after,delta,completed,physicalTicks:0});
}catch(error){failure=String(error.stack??error).slice(0,32768);}
finally{
 if(active)try{profile=(await request('Profiler.stop')).profile;active=false;}catch(error){failure??=String(error.stack??error).slice(0,32768);}
 if(profile){
  save('raw.cpuprofile',profile);
  try{
   const sources={};let sourceBytes=0;
   for(const node of profile.nodes){const id=node.callFrame.scriptId;if(id==='0'||Object.hasOwn(sources,id))continue;
    const meta=scripts.get(id);if(!meta)continue;
    const text=(await request('Debugger.getScriptSource',{scriptId:id})).scriptSource;
    sourceBytes+=Buffer.byteLength(text);assert(sourceBytes<=16*1024*1024,'Loaded sampled script source cap');
    sources[id]={metadata:meta,digest:sha(text),source:text};
   }
   const locations=profile.nodes.map(node=>{const text=sources[node.callFrame.scriptId]?.source;
    const lines=text?.split('\n'),line=node.callFrame.lineNumber,column=node.callFrame.columnNumber;
    const valid=lines&&line>=0&&line<lines.length&&column>=0&&column<=lines[line].length;
    const offset=valid?lines.slice(0,line).reduce((n,value)=>n+value.length+1,0)+column:null;
    return{id:node.id,callFrame:node.callFrame,hitCount:node.hitCount??null,
     executingSourceDigest:sources[node.callFrame.scriptId]?.digest??null,definitionOffset:offset,
     definitionLine:valid?lines[line]:null,positionTicks:node.positionTicks??[],
     positionLines:(node.positionTicks??[]).map(row=>({line:row.line,ticks:row.ticks,
      code:lines&&row.line>=1&&row.line<=lines.length?lines[row.line-1]:null})),
     exactOracleScript:node.callFrame.url===pathToFileURL(oraclePath).href||node.callFrame.url===oraclePath};});
   save('sampled-script-sources.json',sources);save('sampled-code-locations.json',locations);
  }catch(error){failure??=String(error.stack??error).slice(0,32768);}
 }

 session.disconnect();
 save('diagnostic-finalized.json',{finalized:true,status:failure===null?'pass':'failed',failure,completed,recipe,verified,
  originalDigest:sha(source),executingDigest:loadedSource===null?null:sha(loadedSource),physicalImports:0,physicalTicks:0,backend:'same locked vite-node SSR as full-flight comparator',
  acceptance:'unchanged comparator puregraph samples only; no physical trajectory/timing acceptance'});
 process.exitCode=failure===null?0:1;
}
