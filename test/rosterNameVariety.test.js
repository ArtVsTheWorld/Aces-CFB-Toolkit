import test from'node:test';import assert from'node:assert/strict';
import{loadObservedCatalog}from'../src/main/tools/rosterGenerator/catalog.js';import{mixNamePools,USER_MIX_SURNAMES}from'../src/main/tools/rosterGenerator/appearanceMixes.js';
import{createNameHistory,recordNameUsage,variedMixName,validSurname}from'../src/main/tools/rosterGenerator/names.js';import{mulberry32}from'../src/main/tools/longSnap/core.js';
const catalog=loadObservedCatalog().catalog;
test('expanded theme lists use observed or explicitly approved tokens and fit the game fields',()=>{
 for(const mix of ['latino','polynesian']){const p=mixNamePools(catalog,mix);assert.ok(p.first.length>=110);assert.ok(p.last.length>=110);assert.equal(new Set(p.first).size,p.first.length);assert.equal(new Set(p.last).size,p.last.length);for(const n of p.first)assert.ok(catalog.names.first.includes(n)&&Buffer.byteLength(n)<=17);for(const n of p.last)assert.ok((catalog.names.last.includes(n)||USER_MIX_SURNAMES[mix].includes(n))&&Buffer.byteLength(n)<=21);}
});
for(const mix of ['latino','polynesian'])test(mix+' automatically spreads first names and root surnames across fourteen full rosters',()=>{
 const pool=mixNamePools(catalog,mix),run=createNameHistory(),unavailable=new Set(),all=[];
 for(let team=0;team<14;team++){
  const local=createNameHistory(),names=[];
  for(let row=0;row<85;row++){const [f,l,s]=variedMixName(pool.first,pool.last,unavailable,mulberry32(team*85+row),mix,local,run);recordNameUsage(local,f,s);recordNameUsage(run,f,s);assert.ok(validSurname(l,s,pool.last));names.push([f,l]);}
  assert.equal(new Set(names.map(n=>n[0])).size,85);assert.ok([...local.last.values()].every(n=>n<=1));all.push(...names.map(n=>n.join(' ')));
 }
 assert.equal(new Set(all).size,1190);
 const first=[...run.first.values()],last=[...run.last.values()];assert.ok(Math.max(...first)-Math.min(...first)<=1);assert.ok(Math.max(...last)-Math.min(...last)<=2);
});
test('unavailable combinations widen naturally and saturated pools retain supported suffixes',()=>{
 const local=createNameHistory(),run=createNameHistory(),blocked=new Set(['a x']);run.first.set('b',10);run.last.set('y',10);
 const result=variedMixName(['A','B'],['X','Y'],blocked,mulberry32(3),'latino',local,run,{hyphen:false,suffix:''});assert.notEqual(result[0]+' '+result[1],'A X');assert.equal(result[2].suffix,'');
 const saturated=new Set(['a x','a y','b x','b y']);const x=variedMixName(['A','B'],['X','Y'],saturated,mulberry32(9),'polynesian',createNameHistory(),createNameHistory(),{hyphen:false,suffix:''});assert.ok(x[2].suffix||x[2].parts.length===2);assert.ok(validSurname(x[1],x[2],['X','Y']));
});
test('the automatic name spreading is seeded and isolated from a previous run',()=>{
 const sample=()=>{const pool=mixNamePools(catalog,'polynesian'),local=createNameHistory(),run=createNameHistory(),used=new Set();return Array.from({length:85},(_,row)=>{const n=variedMixName(pool.first,pool.last,used,mulberry32(500+row),'polynesian',local,run);recordNameUsage(local,n[0],n[2]);recordNameUsage(run,n[0],n[2]);return n;});};assert.deepEqual(sample(),sample());
});
