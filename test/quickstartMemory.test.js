import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {QuickstartMemory,quickstartPlayerKey,legacyQuickstartPlayerKey,equipmentDynastyId} from '../src/main/services/quickstartMemory.js';
import {quickstartOptions,quickstartSettings} from '../src/main/tools/equipmentQuickstart/runner.js';
import {normalizeEquipmentOptions} from '../src/main/tools/equipment/runner.js';

function fixture(t){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-quickstart-memory-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const saves=[101,-202];
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
test('Quickstart tracking persists after commit, stays separate per dynasty and deduplicates players',t=>{
  const {memory,saves}=fixture(t),key=quickstartPlayerKey(player,3);
  const snapshot=memory.snapshot(saves[0]);assert.equal(snapshot.keys.size,0);
  const staged=memory.stage(saves[0],[key,key],snapshot.revision);
  assert.equal(memory.snapshot(saves[0]).keys.size,0,'staging is not a completed Apply');
  assert.equal(staged.commit(),1);
  assert.ok(new QuickstartMemory(memory.filePath).snapshot(saves[0]).keys.has(key));
  assert.equal(memory.snapshot(saves[1]).keys.size,0);
  const fresh=memory.snapshot(saves[1]);memory.stage(saves[1],[key],fresh.revision).commit();
  memory.clear(saves[0]);assert.equal(memory.snapshot(saves[0]).keys.size,0);
  assert.equal(memory.snapshot(saves[1]).keys.size,1,'clearing one dynasty never clears another');
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
test('Quickstart fixes the simple pipeline, uses 30 donors and defaults No Drip on',()=>{
  const defaults=quickstartSettings({top:999});
  assert.equal(defaults.randomizer.top,30);assert.equal(normalizeEquipmentOptions({},true).top,30);
  assert.equal(normalizeEquipmentOptions({top:15},true).top,15,'Explicit donor counts and saved presets retain their value');
  assert.equal(normalizeEquipmentOptions({top:47},true).top,47);
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
  assert.equal(patcher.allowRandomMouthpieceColors,false);assert.equal(patcher.unlockedTattooCap,30);assert.equal(patcher.fillFrequencies.tattoos,true);
  assert.deepEqual(randomizer.donorOnlyPositions,['K','P']);
  const unprotected=quickstartSettings({protectOriginalEaPlayers:false});assert.equal(unprotected.randomizer.protectOriginalEaPlayers,false);assert.equal(unprotected.patcher.protectOriginalEaPlayers,false);
  assert.equal(quickstartSettings({raw:true,gameday:true}).patcher.unlockedMouthpieceFix,false);
  assert.throws(()=>quickstartOptions({unlocked:'yes'}),/checkboxes/);
});

test('native dynasty identity reads signed LeagueID and rejects missing or ambiguous identity',async()=>{
  const franchise=id=>({tables:[{header:{uniqueId:2226370608},readRecords:async()=>{},records:[{LeagueID:id}]}]});
  assert.equal(await equipmentDynastyId(franchise(-431592168)),-431592168);
  for(const id of [0,undefined,'123',NaN,2147483648])await assert.rejects(equipmentDynastyId(franchise(id)),/valid dynasty identifier/);
  await assert.rejects(equipmentDynastyId({tables:[]}),/supported dynasty identifier/);
  const ambiguous=franchise(12);ambiguous.tables[0].records.push({LeagueID:13});
  await assert.rejects(equipmentDynastyId(ambiguous),/valid dynasty identifier/);
});

test('player identities separate duplicate names, assets and presentation IDs by row',()=>{
  assert.notEqual(quickstartPlayerKey(player,3),quickstartPlayerKey(player,4));
  const generic={...player,PLYR_ASSETNAME:'',CharacterVisuals:'old'};
  assert.notEqual(quickstartPlayerKey(generic,3),quickstartPlayerKey(generic,4));
  assert.equal(quickstartPlayerKey(generic,3),quickstartPlayerKey({...generic,CharacterVisuals:'new'},3));
  assert.notEqual(quickstartPlayerKey(player,3),quickstartPlayerKey({...player,PresentationId:999},3));
  assert.throws(()=>quickstartPlayerKey(player),/valid player row/);
});

test('legacy path history recovers completed players by dynasty without marking new or ambiguous players',t=>{
  const {memory,saves}=fixture(t),directory=path.dirname(memory.filePath),savePath=path.join(directory,'DYNASTY-OLD');
  fs.writeFileSync(savePath,'legacy file');
  const canonical=fs.realpathSync(savePath);
  const oldScope=createHash('sha256').update(process.platform==='win32'?canonical.toLowerCase():canonical).digest('hex');
  const duplicate={...player,FirstName:'Duplicate'},records=[player,duplicate,{...duplicate}];
  const old={version:1,saves:{[oldScope]:{revision:'old-revision',keys:[legacyQuickstartPlayerKey(player,0),legacyQuickstartPlayerKey(duplicate,1)]}}};
  fs.writeFileSync(memory.filePath,JSON.stringify(old));
  const snapshot=memory.snapshot(saves[0],{savePath,players:{records}});
  assert.equal(snapshot.keys.size,1);
  assert.ok(snapshot.keys.has(quickstartPlayerKey(player,0)));
  assert.equal(memory.snapshot(saves[0]).keys.size,1);
  const stored=JSON.parse(fs.readFileSync(memory.filePath,'utf8'));
  assert.equal(stored.version,2);assert.equal(Object.keys(stored.legacySaves).length,0);
  assert.equal(memory.snapshot(saves[1]).keys.size,0);
});

test('clearing dynasty memory suppresses legacy history across filenames and invalidates other copies’ previews',t=>{
  const {memory,saves}=fixture(t),savePath=path.join(path.dirname(memory.filePath),'DYNASTY-OLD');
  fs.writeFileSync(savePath,'legacy file');
  const canonical=fs.realpathSync(savePath),oldScope=createHash('sha256').update(process.platform==='win32'?canonical.toLowerCase():canonical).digest('hex');
  fs.writeFileSync(memory.filePath,JSON.stringify({version:1,saves:{[oldScope]:{revision:'old',keys:[legacyQuickstartPlayerKey(player,0)]}}}));
  const snapshot=memory.snapshot(saves[0],{savePath,players:{records:[player]}});
  memory.clear(saves[0]);
  assert.equal(memory.snapshot(saves[0],{savePath,players:{records:[player]}}).keys.size,0);
  assert.throws(()=>memory.stage(saves[0],[],snapshot.revision,snapshot),/changed after Preview/);
});
