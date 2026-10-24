import assert from 'node:assert/strict';
import { graphOracle } from './graph-oracle.ts';
import { graphOracle as beforeOracle } from './graph-oracle-before.ts';
import { readFileSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const [receipt] = process.argv.slice(2);
assert(receipt); assert.equal(process.version, 'v22.23.3');
const results=[];
const apis=()=>[{SHIP:0,SUPER_HEAVY:0,CATCH:0},{SHIP:0,SUPER_HEAVY:0,CATCH:0}];
const both=(exercise)=>{for(const make of [beforeOracle,graphOracle])exercise(make(...apis()));};
const test=(name,fn)=>{fn();results.push({name,status:'passed'});};
const denied=(oracle,x,y,pattern)=>assert.throws(()=>oracle.compare(x,y),pattern);

test('previously complete immutable descendant reuses certificate under new parent',()=>{
 const x=Object.freeze({leaf:Object.freeze({n:1})}),y=Object.freeze({leaf:Object.freeze({n:1})});
 const o=graphOracle(...apis());o.compare(x,y);const first=o.counts();
 const result=o.compare(Object.freeze({child:x}),Object.freeze({child:y}));const last=o.counts();
 assert.equal(result.nodes,2);assert.equal(result.edges,2);
 assert.equal(last.immutableProbeVisits-first.immutableProbeVisits,2);
 assert.equal(last.immutableTrueHits-first.immutableTrueHits,2);
});
test('fully frozen cycle certification and reused cycle descendant',()=>{
 const a={},b={};a.self=a;b.self=b;Object.freeze(a);Object.freeze(b);
 both(o=>{o.compare(a,b);o.compare(Object.freeze({child:a}),Object.freeze({child:b}));});
});
test('partly mutable cyclic graph never publishes partial true certificate',()=>{
 const a={n:0},b={n:0},x={leaf:a},y={leaf:b};a.root=x;b.root=y;Object.freeze(x);Object.freeze(y);
 both(o=>{o.compare(x,y);b.n=1;denied(o,x,y,/0 !== 1/);b.n=0;});
});
test('mutable leaf below frozen parent remains fully compared',()=>{
 const a={n:0},b={n:0},x=Object.freeze({leaf:a}),y=Object.freeze({leaf:b});
 both(o=>{o.compare(x,y);b.n=1;denied(o,x,y,/0 !== 1/);b.n=0;});
});
test('previous negative descendant certificate conservatively rejects new parent',()=>{
 const a={n:1},b={n:1};const o=graphOracle(...apis());o.compare(a,b);const start=o.counts();
 o.compare(Object.freeze({child:a}),Object.freeze({child:b}));
 // Original deeplyFrozen(left) && deeplyFrozen(right) short-circuits on false.
 assert.equal(o.counts().immutableFalseHits-start.immutableFalseHits,1);
 b.n=2;denied(o,Object.freeze({child:a}),Object.freeze({child:b}),/1 !== 2/);
});
test('late freeze after rejected root does not promote cached false to true',()=>{
 both(o=>{const a={leaf:{n:1}},b={leaf:{n:1}};o.compare(a,b);
  Object.freeze(a.leaf);Object.freeze(b.leaf);Object.freeze(a);Object.freeze(b);
  o.compare(a,b);const repeat=o.compare(a,b);assert.equal(repeat.nodes,2);assert.equal(repeat.edges,3);
  denied(o,Object.freeze({child:a,n:0}),Object.freeze({child:b,n:1}),/0 !== 1/);
 });
});
test('forward alias mismatch after certified descendant remains denied',()=>{
 both(o=>{const a=Object.freeze({n:0}),b=Object.freeze({n:0});o.compare(a,b);
  denied(o,{a,b:a},{a:b,b:Object.freeze({n:0})},/forward alias mismatch/);});
});
test('reverse alias mismatch remains denied',()=>{
 both(o=>{const a={n:0};denied(o,{a:{n:0},b:{n:0}},{a,b:a},/reverse alias mismatch/);});
});
test('Object.is signed zero and NaN semantics remain exact',()=>{
 both(o=>{o.compare({n:NaN},{n:NaN});denied(o,{n:-0},{n:0},/-0 !== 0/);});
});
test('accessor denied without invoking getter',()=>{
 both(o=>{let calls=0;const a={};Object.defineProperty(a,'n',{get(){calls++;throw Error('must not execute');},enumerable:true});
  denied(o,a,{n:0},/accessor unsupported/);assert.equal(calls,0);});
});
test('descriptor mismatch remains denied',()=>{
 both(o=>{const a={},b={};Object.defineProperty(a,'n',{value:0,enumerable:true,writable:false,configurable:true});
  Object.defineProperty(b,'n',{value:0,enumerable:true,writable:true,configurable:true});denied(o,a,b,/writable/);});
});
test('unmapped function below frozen graph remains denied',()=>{
 both(o=>denied(o,Object.freeze({f(){}}),Object.freeze({f(){}}),/unmapped function/));
});
test('mapped functions retain role and alias correspondence',()=>{
 for(const make of [beforeOracle,graphOracle]){const a=()=>0,b=()=>0;const [l,r]=apis();l.operation=a;r.operation=b;
  const o=make(l,r);o.compare(Object.freeze({f:a}),Object.freeze({f:b}));denied(o,{f:a},{f:()=>0},/unmapped function/);}
});
test('symbols and unsupported prototypes remain denied',()=>{
 both(o=>{const sym=Symbol('n');denied(o,{[sym]:0},{[sym]:0},/unsupported symbol/);
  denied(o,Object.create({n:0}),Object.create({n:0}),/unsupported prototype/);});
});
// Tiny cap controls exercise identical check sites without allocating millions of
// objects. Original literal production caps are checked first and remain intact.
{
 const sources=['graph-oracle-before.ts','graph-oracle.ts'].map(f=>readFileSync(new URL(f,import.meta.url),'utf8'));
 const caps=['2_000_000','20_000_000','2_000_000_000','20_000_000_000'];
 for(const cap of caps)assert.equal(sources[0].split(cap).length,sources[1].split(cap).length);
 for(let i=0;i<sources.length;i++){
  let scaled=sources[i].replaceAll('20_000_000_000','20').replaceAll('2_000_000_000','8')
   .replaceAll('20_000_000','6').replaceAll('2_000_000','4');
  const js=stripTypeScriptTypes(scaled,{mode:'strip'});
  const {graphOracle: make}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
  const o=make(...apis());denied(o,{a:1,b:2,c:3,d:4,e:5,f:6},{a:1,b:2,c:3,d:4,e:5,f:6},/oracle edge budget/);
  const node=make(...apis());denied(node,{a:{b:{c:{d:{}}}}},{a:{b:{c:{d:{}}}}},/oracle node budget/);
  const aggregateNodes=make(...apis());for(let n=0;n<8;n++)aggregateNodes.compare({},{});
  denied(aggregateNodes,{},{},/oracle node budget/);
  const aggregateEdges=make(...apis());for(let n=0;n<17;n++)aggregateEdges.compare(0,0);
  denied(aggregateEdges,0,0,/oracle edge budget/);
 }
 results.push({name:'all original cap checks unchanged with bounded scaled-cap negative controls',status:'passed'});
}
writeFileSync(receipt,JSON.stringify({kind:'descendant-certificates-controls-v1',finalized:true,
 node:process.version,cases:results,passed:results.length,failed:0,
 physicalSteps:0,productionImports:0},null,2)+'\n',{flag:'wx'});
