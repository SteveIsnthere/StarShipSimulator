import assert from 'node:assert/strict';
// Research-only exact source-correspondence oracle. Weak ownership avoids retaining historical frames.
export function graphOracle(leftAPI:Record<string,unknown>,rightAPI:Record<string,unknown>){
 const forward=new WeakMap<object,object>(),reverse=new WeakMap<object,object>();
 const functions=new WeakMap<object,object>();const immutable=new WeakMap<object,boolean>();
 const proven=new WeakMap<object,object>();let totalNodes=0,totalEdges=0;
 let immutableProbeVisits=0,immutableTrueHits=0,immutableFalseHits=0;
 const bind=(a:object,b:object,path:string)=>{
  assert(!forward.has(a)||forward.get(a)===b,`forward alias mismatch ${path}`);
  assert(!reverse.has(b)||reverse.get(b)===a,`reverse alias mismatch ${path}`);
  forward.set(a,b);reverse.set(b,a);
 };
 // Every exported function has an exact role. New opaque state callbacks fail, never stringify/ignore them.
 for(const name of Object.keys(leftAPI))if(typeof leftAPI[name]==='function'){
  const a=leftAPI[name] as object,b=rightAPI[name] as object;assert.equal(typeof b,'function',name);
  bind(a,b,`operation:${name}`);functions.set(a,b);functions.set(b,a);
 }
 function deeplyFrozen(a:object):boolean{
  const cached=immutable.get(a);if(cached!==undefined)return cached;
  const seen=new WeakSet<object>(),pending=[a];let paid=0;
  while(pending.length){const node=pending.pop()!;if(seen.has(node))continue;seen.add(node);
   assert(++paid<=2_000_000,'deep immutable proof node budget');
   const completed=immutable.get(node);
   if(completed===false){immutableFalseHits++;immutable.set(a,false);return false;}
   if(completed===true){immutableTrueHits++;continue;}
   immutableProbeVisits++;
   if(!Object.isFrozen(node)){immutable.set(a,false);return false;}
   for(const key of Reflect.ownKeys(node)){
    const d=Object.getOwnPropertyDescriptor(node,key)!;
    if(!('value'in d)){immutable.set(a,false);return false;}
    if(typeof d.value==='function'){if(!functions.has(d.value)){immutable.set(a,false);return false;}}
    else if(d.value&&typeof d.value==='object')pending.push(d.value);
   }
  }
  immutable.set(a,true);return true;
 }
 const scalar=(value:unknown)=>typeof value==='number'?(Object.is(value,-0)?'-0':String(value)):String(value).slice(0,128);
 function compare(a:unknown,b:unknown,label='root'){
  const seen=new WeakSet<object>();let nodes=0,edges=0;
  function walk(x:unknown,y:unknown,path:string):void{
   assert(++edges<=20_000_000&&++totalEdges<=20_000_000_000,'oracle edge budget');
   if(typeof x==='function'||typeof y==='function'){
    assert(typeof x==='function'&&typeof y==='function'&&functions.get(x)===y,`unmapped function ${path}`);bind(x,y,path);return;
   }
   if(!x||typeof x!=='object'||!y||typeof y!=='object'){
    assert(Object.is(x,y),`${path}: ${scalar(x)} !== ${scalar(y)}`);return;
   }
   assert(++nodes<=2_000_000&&++totalNodes<=2_000_000_000,'oracle node budget');bind(x,y,path);
   if(seen.has(x))return;seen.add(x);
   if(proven.get(x)===y)return;
   assert.equal(Array.isArray(x),Array.isArray(y),`${path} array`);
   const xp=Object.getPrototypeOf(x),yp=Object.getPrototypeOf(y);
   assert((xp===null)===(yp===null),`${path} null prototype`);
   assert(xp===null||xp===Object.prototype||xp===Array.prototype,`${path} unsupported prototype`);
   assert(yp===null||yp===Object.prototype||yp===Array.prototype,`${path} unsupported prototype`);
   const keys=Reflect.ownKeys(x);assert.deepEqual(keys,Reflect.ownKeys(y),`${path} own keys`);
   assert.equal(Object.isFrozen(x),Object.isFrozen(y),`${path} frozen`);
   for(const key of keys){
    assert.equal(typeof key,'string',`${path} unsupported symbol`);
    const xd=Object.getOwnPropertyDescriptor(x,key)!,yd=Object.getOwnPropertyDescriptor(y,key)!;
    assert('value'in xd&&'value'in yd,`${path}.${String(key)} accessor unsupported`);
    for(const flag of ['enumerable','configurable','writable'] as const)assert.equal(xd[flag],yd[flag],`${path}.${String(key)}.${flag}`);
    walk(xd.value,yd.value,`${path}.${String(key)}`);
   }
   if(deeplyFrozen(x)&&deeplyFrozen(y))proven.set(x,y);
  }
  walk(a,b,label);return {nodes,edges,totalNodes,totalEdges};
 }
 for(const name of ['SHIP','SUPER_HEAVY','CATCH'])compare(leftAPI[name],rightAPI[name],`model:${name}`);
 return {compare,counts:()=>({totalNodes,totalEdges,immutableProbeVisits,immutableTrueHits,immutableFalseHits})};
}
