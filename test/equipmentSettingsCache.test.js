import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EquipmentSettingsCache} from '../src/main/services/equipmentSettingsCache.js';

function fixture(t,limits){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'equipment-settings-cache-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const payload={toolId:'equipment-quickstart',savePath:path.join(directory,'save'),schemaPath:path.join(directory,'schema'),options:{protectOriginalEaPlayers:true}},memory=path.join(directory,'memory');
  fs.writeFileSync(payload.savePath,'save-a');fs.writeFileSync(payload.schemaPath,'schema-a');
  return {payload,memory,cache:new EquipmentSettingsCache(memory,limits)};
}
test('repeated settings use detached results, with independent tool/options and content-based invalidation',async t=>{
  const {payload,memory,cache}=fixture(t);let calls=0,hits=0;
  const load=async()=>({donors:[{name:'Original'}],sequence:++calls}),read=p=>cache.read(p,load,()=>hits++);
  const first=await read(payload);first.donors[0].name='Mutated';assert.equal((await read(payload)).donors[0].name,'Original');assert.equal(calls,1);assert.equal(hits,1);
  const second=await read(payload);second.donors.length=0;assert.equal((await read(payload)).donors.length,1);
  await read({...payload,options:{protectOriginalEaPlayers:false}});await read({...payload,toolId:'freshman-equipment'});assert.equal(calls,3);
  const stat=fs.statSync(payload.savePath);fs.writeFileSync(payload.savePath,'save-b');fs.utimesSync(payload.savePath,stat.atime,stat.mtime);await read(payload);assert.equal(calls,4,'Same path, length and mtime cannot conceal a changed save');
  fs.writeFileSync(memory,'tracking-1');await read(payload);assert.equal(calls,5);fs.writeFileSync(memory,'tracking-2');await read(payload);assert.equal(calls,6);fs.unlinkSync(memory);await read(payload);assert.equal(calls,6,'Old unchanged-save entry can be reused when identical tracking is restored');
  fs.writeFileSync(payload.schemaPath,'schema-b');await read(payload);assert.equal(calls,7);cache.clear();await read(payload);assert.equal(calls,8);
});
test('changed inputs during loading and failures are never cached; other tools bypass cache',async t=>{
  const {payload,cache}=fixture(t);let calls=0;
  await assert.rejects(cache.read(payload,async()=>{calls++;throw Error('bad save');}),/bad save/);
  await cache.read(payload,async()=>{calls++;fs.writeFileSync(payload.savePath,'save-b');return {count:1};});
  await cache.read(payload,async()=>{calls++;return {count:2};});assert.equal(calls,3);
  for(let i=0;i<2;i++)await cache.read({...payload,toolId:'equipment-mapper'},async()=>{calls++;return {};});assert.equal(calls,5,'Mapper sessions and catalog options retain their existing lifecycle');
});
test('settings cache bounds retained data and least-recently-used entries',async t=>{
  const {payload,cache}=fixture(t,{maxEntries:2,maxBytes:500});let calls=0;const read=n=>cache.read({...payload,options:{n}},async()=>({sequence:++calls}));
  await read(1);await read(2);await read(1);await read(3);assert.equal((await read(1)).sequence,1);await read(2);assert.equal(calls,4);
  const large=async()=>({large:'x'.repeat(600),sequence:++calls});await cache.read(payload,large);await cache.read(payload,large);assert.equal(calls,6);assert.ok(cache.bytes<=500);
});

test('overlapping settings reads keep exact byte accounting and remain cacheable',async t=>{
 const {payload,cache}=fixture(t,{maxBytes:8});const release=[];const read=()=>cache.read(payload,()=>new Promise(resolve=>release.push(resolve)));
 const pending=[read(),read(),read()];for(const resolve of release)resolve(['x']);await Promise.all(pending);
 assert.equal(cache.bytes,Buffer.byteLength(JSON.stringify(['x'])));assert.equal(cache.entries.size,1);assert.deepEqual(await cache.read(payload,()=>{throw Error('Expected cache hit');}),['x']);
});

test('clearing settings while a read is running cannot repopulate a discarded cache',async t=>{
 const {payload,cache}=fixture(t);let finish;const pending=cache.read(payload,()=>new Promise(resolve=>finish=resolve));cache.clear();finish({old:true});await pending;assert.equal(cache.entries.size,0);assert.equal(cache.bytes,0);assert.deepEqual(await cache.read(payload,async()=>({fresh:true})),{fresh:true});
});
