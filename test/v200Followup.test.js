import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { validateEquipmentSeason } from '../src/main/tools/equipment/shared.js';
import { normalizeEquipmentOptions } from '../src/main/tools/equipment/runner.js';
import { clearPlayerTattoos } from '../src/main/tools/equipment/core/tattoos.js';
import { applyGlobalEquipmentFixes } from '../src/main/tools/equipment/core/globalFixes.js';

const renderer = fs.readFileSync(new URL('../src/renderer/renderer.js', import.meta.url), 'utf8');
const fn = name => renderer.slice(renderer.indexOf(`function ${name}(`), renderer.indexOf('\nfunction ', renderer.indexOf(`function ${name}(`) + 1));
const ref = row => '000000000001010' + row.toString(2).padStart(17, '0');
const appearance = () => ({ model: 'unchanged', loadouts: [
  { loadoutType: 'Head', metadata: { skin: 4 }, loadoutElements: [{ slotType: 'Face', itemAssetName: 'OriginalFace' }, { slotType: 'NeckTattoo', itemAssetName: 'OriginalNeckTattoo' }] },
  { loadoutCategory: 'Base', loadoutElements: [{ slotType: 'LeftArmTattoo', itemAssetName: 'CujoMatty_ArmTats_35', color: 2 }, { slotType: 'RightArmTattoo', itemAssetName: 'ArmTattoo_None' }, { slotType: 'LeftLegTattoo', itemAssetName: 'LegTattoo_Custom' }] },
  { loadoutType: 'PlayerOnField', loadoutElements: [{ slotType: 'HeadWear', itemAssetName: 'OriginalHelmet' }, { slotType: 'InnerSocks', itemAssetName: 'Gear_Socks_Mid' }, { slotType: 'LeftArmWear', itemAssetName: 'GearArmSleeve_Baggy_Black' }] }
] });
const player = (row, extra = {}) => ({ isEmpty: false, FirstName: 'Player', LastName: String(row), Position: 'LT', SchoolYear: 'Senior', RedshirtStatus: 'Previous', CharacterBodyType: 'Standard', TeamIndex: 1, IsNIL: false, CharacterVisuals: ref(row), ...extra });

test('equipment accepts the actual CFB bowl/championship stages, including absolute week 17', () => {
  for (const [type, week] of [['PreSeason',0],['RegularSeason',15],['BowlSeason1',17],['BowlSeason2',18],['BowlSeason3',19],['NationalChampionship',20],['NationalChampionship',21],['PostSeason',4]]) {
    assert.equal(validateEquipmentSeason({ CurrentWeekType:type, CurrentWeek:week, PostSeasonNumWeeks:5 }).currentWeekType, type);
  }
  // Named postseason stages are authoritative; do not compare absolute weeks
  // against a count of postseason weeks or invent a week-number cutoff.
  assert.doesNotThrow(() => validateEquipmentSeason({ CurrentWeekType:'BowlSeason1', CurrentWeek:17 }));
});
test('equipment continues rejecting offseason, unknown stages and invalid weeks', () => {
  for (const [type,week] of [['OffSeason',0],['Invalid',17],['PreSeason',1],['BowlSeason1',-1],['NationalChampionship',1.5],['PostSeason',5]]) {
    assert.throws(() => validateEquipmentSeason({CurrentWeekType:type,CurrentWeek:week,PostSeasonNumWeeks:5}), /supported season window/);
  }
});
test('Clear Tattoos defaults off and conflicts with Add Tattoos in runner and core', () => {
  assert.equal(normalizeEquipmentOptions({}, false).clearTattoos, false);
  assert.equal(normalizeEquipmentOptions({clearTattoos:true}, false).clearTattoos, true);
  assert.equal(normalizeEquipmentOptions({clearTattoos:true}, true).clearTattoos, false);
  assert.throws(() => normalizeEquipmentOptions({clearTattoos:true,unlockedTattooFix:true}, false), /cannot both/);
  assert.throws(() => applyGlobalEquipmentFixes([],[],10,{clearTattoos:true,unlockedTattooFix:true}), /cannot both/);
});
test('tattoo clearing preserves head/skin, layer metadata, sleeves, socks and all unrelated equipment', () => {
  const parsed = appearance(), before = structuredClone(parsed), result = clearPlayerTattoos(parsed);
  assert.equal(result.removed.length, 3);
  assert.deepEqual(parsed.loadouts[2], before.loadouts[2]);
  assert.deepEqual(parsed.loadouts[0], { ...before.loadouts[0], loadoutElements: [before.loadouts[0].loadoutElements[0]] });
  assert.equal(parsed.loadouts[1].loadoutElements[0].itemAssetName, 'ArmTattoo_None');
  assert.equal(parsed.loadouts[1].loadoutElements[0].color, 2);
  assert.equal(parsed.loadouts[1].loadoutElements[2].itemAssetName, 'LegTattoo_None');
  assert.equal(parsed.model, before.model);
  const cleared = JSON.stringify(parsed); assert.equal(clearPlayerTattoos(parsed), null); assert.equal(JSON.stringify(parsed), cleared);
});
test('clear-only correction works on OL and preserves excluded/NIL/shared players', () => {
  const players = [player(0),player(1,{IsNIL: true, PLYR_ASSETNAME:'SmithJeremiah_8726'}),player(2),player(3,{CharacterVisuals:ref(2),TeamIndex:2})];
  const visuals = Array.from({length:3},()=>({isEmpty:false,RawData:JSON.stringify(appearance())})), before = visuals.map(record=>record.RawData);
  const result = applyGlobalEquipmentFixes(players, visuals, 10, {clearTattoos:true,teamNames:new Map([[1,'Test'],[2,'Excluded']]),activePlayerRows:new Set([0,1,2,3]),eligiblePlayer:record=>record.TeamIndex===1});
  assert.equal(result.clearedTattooPlayers,1); assert.equal(result.clearedTattooChanges.length,1); assert.equal(result.visualsChanged,1);
  assert.equal(visuals[1].RawData,before[1]); assert.equal(visuals[2].RawData,before[2]);
  assert.deepEqual(JSON.parse(visuals[0].RawData).loadouts[2], JSON.parse(before[0]).loadouts[2]);
});
test('no-op settings restoration emits no change event, while real restored edits still do', () => {
  let changes=0;
  const controls = {scope:{value:'default',type:'text',dataset:{},dispatchEvent:()=>changes++},nil:{checked:true,type:'checkbox',dataset:{},dispatchEvent:()=>changes++}};
  const context = vm.createContext({toolLoading: message => message, state:{page:'tool',bootstrap:{registry:{tools:[{id:'tool'}]}},toolSettings:new Map([['tool',{scope:'default',nil:true}]])},document:{getElementById:id=>controls[id]},migrateOriginalEaProtectionSettings:()=>{},migrateEquipmentSessionSettings:()=>{},Event:class{}});
  vm.runInContext(fn('restoreToolSettings'),context); vm.runInContext('restoreToolSettings()',context); assert.equal(changes,0);
  controls.scope.dataset={};context.state.toolSettings.get('tool').scope='changed';vm.runInContext('restoreToolSettings()',context);assert.equal(changes,1);
  vm.runInContext('restoreToolSettings()',context);assert.equal(changes,1);
});
test('Commentary waits for scope restoration before snapshotting options and starting analysis', async () => {
  let ready, calls=0, scope=[]; const events=[], output={innerHTML:'',isConnected:true},button={dataset:{},isConnected:true};
  const context = vm.createContext({toolLoading: message => message, state:{page:'commentary-id',activeSave:{path:'SAVE'}},document:{querySelector:id=>id==='#analysis-output'?output:button},ensureCommentaryScope:()=>new Promise(resolve=>ready=resolve),commentaryOptionsFromForm:()=>({scope:{classes:scope}}),beginToolRun:()=>1,currentToolRun:()=>true,window:{cfbToolkit:{prepareTool:async request=>{calls++;assert.deepEqual(request.options.scope.classes,['Freshman']);return {proposals:[]};}}},render:()=>events.push('render'),runCommentaryReview:async()=>events.push('preview'),readableError:error=>error,showError:error=>{throw error;}});
  vm.runInContext('async '+fn('analyzeCommentary'),context);
  const pending=vm.runInContext('analyzeCommentary()',context);assert.equal(calls,0);assert.equal(button.disabled,true);
  await vm.runInContext('analyzeCommentary()',context);assert.equal(calls,0);
  scope=['Freshman'];ready(true);await pending;assert.equal(calls,1);assert.deepEqual(events,['render','preview']);assert.equal(button.disabled,false);
});
test('Commentary aborts a pending scope load when the active save changes', async () => {
  let ready,calls=0;const output={innerHTML:'',isConnected:true},button={dataset:{},isConnected:true};
  const context=vm.createContext({toolLoading: message => message, state:{page:'commentary-id',activeSave:{path:'OLD'}},document:{querySelector:id=>id==='#analysis-output'?output:button},ensureCommentaryScope:()=>new Promise(resolve=>ready=resolve),window:{cfbToolkit:{prepareTool:()=>calls++}}});
  vm.runInContext('async '+fn('analyzeCommentary'),context);const pending=vm.runInContext('analyzeCommentary()',context);context.state.activeSave.path='NEW';ready(true);await pending;assert.equal(calls,0);assert.equal(button.disabled,false);
});
