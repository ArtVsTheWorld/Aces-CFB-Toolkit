import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {QuickstartMemory,quickstartPlayerKey} from '../src/main/services/quickstartMemory.js';
import {quickstartOptions,quickstartSettings} from '../src/main/tools/equipmentQuickstart/runner.js';
import {normalizeEquipmentOptions} from '../src/main/tools/equipment/runner.js';

function fixture(t){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-quickstart-memory-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const saves=['DYNASTY-A','DYNASTY-B'].map(name=>path.join(directory,name));
  saves.forEach(file=>fs.writeFileSync(file,'test save'));
  return {memory:new QuickstartMemory(path.join(directory,'tracking.json')),saves};
}
const player={PLYR_ASSETNAME:'GeneratedPlayer1',FirstName:'Gage',LastName:'Jones',PresentationId:0,SchoolYear:'Freshman',TeamIndex:1,Position:'QB',JerseyNum:4};
test('Quickstart identity survives progression, renumbering and transfers, but not replacement',()=>{
  const key=quickstartPlayerKey(player,3);
  assert.equal(quickstartPlayerKey({...player,TeamIndex:9,Position:'HB',SchoolYear:'Senior',RedshirtStatus:'Previous',JerseyNum:39},3),key);
  assert.equal(quickstartPlayerKey({...player,FirstName:' GAGE '},3),key);
  assert.notEqual(quickstartPlayerKey({...player,LastName:'Smith'},3),key);
  assert.notEqual(quickstartPlayerKey({...player,PLYR_ASSETNAME:'NewPlayer'},3),key);
});
test('Quickstart tracking persists after commit, stays separate per save and deduplicates players',t=>{
  const {memory,saves}=fixture(t),key=quickstartPlayerKey(player,3);
  const snapshot=memory.snapshot(saves[0]);assert.equal(snapshot.keys.size,0);
  const staged=memory.stage(saves[0],[key,key],snapshot.revision);
  assert.equal(memory.snapshot(saves[0]).keys.size,0,'staging is not a completed Apply');
  assert.equal(staged.commit(),1);
  assert.ok(new QuickstartMemory(memory.filePath).snapshot(saves[0]).keys.has(key));
  assert.equal(memory.snapshot(saves[1]).keys.size,0);
  const fresh=memory.snapshot(saves[1]);memory.stage(saves[1],[key],fresh.revision).commit();
  memory.clear(saves[0]);assert.equal(memory.snapshot(saves[0]).keys.size,0);
  assert.equal(memory.snapshot(saves[1]).keys.size,1,'clearing one save never clears another');
});
test('failed Apply staging and stale previews never mark players',t=>{
  const {memory,saves}=fixture(t),key=quickstartPlayerKey(player,3),snapshot=memory.snapshot(saves[0]);
  const staged=memory.stage(saves[0],[key],snapshot.revision);staged.cancel();
  assert.equal(memory.snapshot(saves[0]).keys.size,0);
  memory.clear(saves[0]);assert.throws(()=>memory.stage(saves[0],[key],snapshot.revision),/changed after Preview/);
  assert.ok(!fs.readdirSync(path.dirname(memory.filePath)).some(name=>name.includes('.pending-')));
});
test('tracking rejects damaged stores instead of silently randomizing everyone again',t=>{
  const {memory,saves}=fixture(t);
  for(const value of ['broken','null','{}',JSON.stringify({version:1,saves:{abc:null}}),JSON.stringify({version:1,saves:{abc:{revision:'id',keys:['not-a-hash']}}})]){
    fs.writeFileSync(memory.filePath,value);
    assert.throws(()=>memory.snapshot(saves[0]),/tracking.*(read|damaged)/i);
  }
});
test('tracking blocks concurrent runs and clear operations',async t=>{
  const {memory,saves}=fixture(t);let release;
  const pending=memory.exclusive(()=>new Promise(resolve=>release=resolve));
  assert.throws(()=>memory.clear(saves[0]),/Wait/);
  await assert.rejects(memory.exclusive(()=>{}),/busy/);release();await pending;
  memory.clear(saves[0]);
});
test('Quickstart fixes the simple pipeline, uses 15 donors and defaults No Drip on',()=>{
  const defaults=quickstartSettings({top:999,protectOriginalEaPlayers:false});
  assert.equal(defaults.randomizer.top,15);assert.equal(normalizeEquipmentOptions({},true).top,15);
  assert.deepEqual(defaults.randomizer.classes,[]);assert.deepEqual(defaults.randomizer.redshirtStatuses,[]);
  assert.equal(defaults.randomizer.protectOriginalEaPlayers,true);assert.equal(defaults.randomizer.noDripProfile,true);
  for(const name of ['helmetFix','visorFix','oakleyVisorFix','pantsFix','rolledJerseyFix','sleeveCompatibilityFix'])assert.equal(defaults.patcher[name],true,name);
  for(const name of ['unlockedTattooFix','unlockedMouthpieceFix','unlockedRecolorFix','lowerRolledJerseyFix','cutoffPantsFix','unlockedSocksFix','removeHandwarmers','sockFix','nikeThighPads','clearTattoos'])assert.equal(defaults.patcher[name],false,name);
});
test('Quickstart mod switches enable the correct default pools and Unlocked corrections only',()=>{
  const {randomizer,patcher}=quickstartSettings({unlocked:true,raw:true,gameday:true,noDrip:false});
  for(const name of ['usingUnlockedMod','usingRawAccessoriesMod','usingEquipmentTruckMod'])assert.equal(randomizer[name],true,name);
  assert.equal(randomizer.noDripProfile,true,'legacy No Drip opt-out is ignored in Quickstart');
  for(const name of ['unlockedTattooFix','unlockedMouthpieceFix','unlockedRecolorFix','lowerRolledJerseyFix','cutoffPantsFix','unlockedSocksFix'])assert.equal(patcher[name],true,name);
  assert.equal(patcher.unlockedColorTheme,'team');assert.equal(patcher.tapeColorMode,'accessory');
  assert.equal(patcher.allowRandomMouthpieceColors,false);assert.equal(patcher.unlockedTattooCap,40);
  assert.equal(quickstartSettings({raw:true,gameday:true}).patcher.unlockedMouthpieceFix,false);
  assert.throws(()=>quickstartOptions({unlocked:'yes'}),/checkboxes/);
});
