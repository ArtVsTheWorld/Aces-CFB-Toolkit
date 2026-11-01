import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CLEAT_COLOR_OVERRIDES,defaultTeamCleatColor,normalizeTeamCleatColors,teamCleatColor,applyCleatColorOverride} from '../src/main/tools/equipment/core/cleatColors.js';
import {normalizeEquipmentOptions} from '../src/main/tools/equipment/runner.js';
import {applyGlobalEquipmentFixes} from '../src/main/tools/equipment/core/globalFixes.js';
import {quickstartSettings} from '../src/main/tools/equipmentQuickstart/runner.js';
import {validatePresetConfiguration} from '../src/main/services/toolPresets.js';
import {retainPatcherResults} from '../src/main/tools/equipment/visualDraft.js';
import {applyModdedRandomizerEquipment,mulberry32} from '../src/main/tools/equipment/core/patcher.js';
import {modPoolDefinitions} from '../src/main/tools/equipment/core/modPools.js';
import {createGeneratedEquipmentState} from '../src/main/tools/equipment/core/generatedCompatibility.js';
const black='GearSpats_override_blabla';
const e=(slotType,itemAssetName)=>({slotType,itemAssetName});
const outfit=()=>({loadoutType:'PlayerOnField',loadoutElements:[{...e('LeftSpat','GearSpats_spatThin_White'),paletteMods:[{old:true}]},e('RightSpat','GearSpats_spatThin_Black'),e('LeftShoe','KeepCleat'),e('RightShoe','KeepCleat'),e('ShoeOverride','KeepUniformShoe')]});
const raw=()=>JSON.stringify({metadata:'keep',loadouts:[outfit(),{...outfit(),loadoutCategory:'Away'},{loadoutType:'Base',loadoutElements:[e('LeftSpat','KeepBase')]}]});
const player=(row,team=1)=>({FirstName:'Test',LastName:String(row),Position:'WR',SchoolYear:'Freshman',TeamIndex:team,IsNIL:false,CharacterBodyType:'Standard',CharacterVisuals:'000000000001010'+row.toString(2).padStart(17,'0'),OverallRating:70,RedshirtStatus:'Eligible'});
const options=extra=>({protectOriginalEaPlayers:false,unlockedRecolorFix:true,cleatColorMode:'override',teamNames:new Map([[1,'Alabama'],[2,'North Carolina']]),...extra});
test('only ten verified fixed Unlocked cleat overrides use official names; five schools default black',()=>{
 assert.equal(CLEAT_COLOR_OVERRIDES.length,10);assert.ok(CLEAT_COLOR_OVERRIDES.some(c=>c.label==='Black And Primary Color Cleats'));assert.ok(!CLEAT_COLOR_OVERRIDES.some(c=>c.value.includes('custom')||c.label==='Primary Cleats'));
 for(const name of ['Alabama','Georgia','USC','Penn State','Nebraska','Penn State Nittany Lions'])assert.equal(defaultTeamCleatColor(name),black);
 for(const name of ['North Carolina','Boise State','Southern Miss','Georgia Tech'])assert.equal(defaultTeamCleatColor(name),'unchanged');
 assert.equal(teamCleatColor('Alabama',normalizeTeamCleatColors({Alabama:'unchanged'})),'unchanged');
});
test('Patcher overrides are opt-in, inactive fields cannot enable them, and Quickstart remains unchanged',()=>{
 for(const freshman of [true,false])assert.equal(normalizeEquipmentOptions({},freshman).cleatColorMode,'leave');
 for(const extra of [{}, {unlockedRecolorFix:false}])assert.equal(normalizeEquipmentOptions({...extra,cleatColorMode:'override',teamCleatColors:{bad:'bad'}},false).cleatColorMode,'leave');
 assert.equal(normalizeEquipmentOptions({unlockedRecolorFix:true,cleatColorMode:'override'},true).cleatColorMode,'leave');
 assert.equal(quickstartSettings({unlocked:true}).patcher.cleatColorMode,'leave');
 assert.throws(()=>normalizeEquipmentOptions({unlockedRecolorFix:true,cleatColorMode:'bad'},false));
 assert.throws(()=>normalizeEquipmentOptions({unlockedRecolorFix:true,cleatColorMode:'override',teamCleatColors:{Alabama:'GearSpats_overrides_custom'}},false));
});
test('every override replaces both spats on every on-field loadout and preserves cleat models, uniform overrides and appearance layers',()=>{
 for(const c of CLEAT_COLOR_OVERRIDES){const parsed=JSON.parse(raw()),base=structuredClone(parsed.loadouts[2]);assert.equal(applyCleatColorOverride(parsed.loadouts,c.value).length,4);
 for(const l of parsed.loadouts.slice(0,2)){for(const slot of ['LeftSpat','RightSpat'])assert.deepEqual(l.loadoutElements.find(e=>e.slotType===slot),e(slot,c.value));assert.equal(l.loadoutElements.find(e=>e.slotType==='LeftShoe').itemAssetName,'KeepCleat');assert.equal(l.loadoutElements.find(e=>e.slotType==='ShoeOverride').itemAssetName,'KeepUniformShoe');}
 assert.deepEqual(parsed.loadouts[2],base);assert.deepEqual(applyCleatColorOverride(parsed.loadouts,c.value),[]);const before=JSON.stringify(parsed);assert.deepEqual(applyCleatColorOverride(parsed.loadouts,'unchanged'),[]);assert.equal(JSON.stringify(parsed),before);}
});
test('team override honors scope, shared visual safety and explicit No Change, and reports both feet once per player',()=>{
 const players=[player(0),player(1,2)],visuals=players.map(()=>({RawData:raw(),isEmpty:false})),original=visuals[1].RawData;
 const result=applyGlobalEquipmentFixes(players,visuals,10,options({unlockedColorTheme:'white'}));assert.equal(result.cleatColorPlayersChanged,1);assert.equal(result.cleatColorChanges.length,4);assert.equal(visuals[1].RawData===original,false,'Ordinary tape recoloring still applies independently');
 for(const l of JSON.parse(visuals[0].RawData).loadouts.slice(0,2))for(const slot of ['LeftSpat','RightSpat'])assert.equal(l.loadoutElements.find(e=>e.slotType===slot).itemAssetName,black);
 for(const extra of [{teamCleatColors:{alabama:'unchanged'}},{activePlayerRows:new Set()},{eligiblePlayer:()=>false},{protectOriginalEaPlayers:true}]){const p=player(0);if(extra.protectOriginalEaPlayers){const [asset,first,last]=JSON.parse(fs.readFileSync(new URL('../src/main/data/originalEaRoster.json',import.meta.url))).real[0];Object.assign(p,{PLYR_ASSETNAME:asset,FirstName:first,LastName:last});}const v={RawData:raw(),isEmpty:false};assert.equal(applyGlobalEquipmentFixes([p],[v],10,options(extra)).cleatColorChanges.length,0);}
 const shared=[player(0),{...player(1,2),CharacterVisuals:player(0).CharacterVisuals}],v={RawData:raw(),isEmpty:false};assert.equal(applyGlobalEquipmentFixes(shared,[v],10,options()).cleatColorChanges.length,0);
});
test('default leave preserves existing cleat overrides even when accessory/tape recoloring runs; removal remains final',()=>{
 const parsed=JSON.parse(raw());applyCleatColorOverride(parsed.loadouts,black);const v={RawData:JSON.stringify(parsed),isEmpty:false};const r=applyGlobalEquipmentFixes([player(0)],[v],10,options({cleatColorMode:'leave',unlockedColorTheme:'primary'}));assert.equal(r.cleatColorChanges.length,0);assert.equal(v.RawData,JSON.stringify(parsed));
 const removal={RawData:raw(),isEmpty:false};const removed=applyGlobalEquipmentFixes([player(0)],[removal],10,options({removeEquipment:true,removeEquipmentItems:[black]}));assert.equal(removed.cleatColorChanges.length,0);assert.ok(!JSON.parse(removal.RawData).loadouts.some(l=>l.loadoutElements.some(e=>e.itemAssetName===black)));
});
test('cleat preset validation keeps old presets and exact explicit No Change selections; capacity skips remove affected counts',()=>{
 const old={version:1,values:{'tape-color-mode':'accessory'}};assert.deepEqual(validatePresetConfiguration(old),old);const next={...old,cleatColors:{alabama:'unchanged','north carolina':'GearSpats_override_whipri'}};assert.deepEqual(validatePresetConfiguration(next),next);assert.throws(()=>validatePresetConfiguration({...old,cleatColors:{alabama:'fake'}}));
 const fixes={cleatColorChanges:[{row:0},{row:0},{row:1}],cleatColorPlayersChanged:2};retainPatcherResults(fixes,[player(0),player(1)],10,new Set([0]),[]);assert.deepEqual(fixes.cleatColorChanges,[{row:1}]);assert.equal(fixes.cleatColorPlayersChanged,1);
});
test('CFB 27 pool spats always use the same chosen item on both feet across loadouts',()=>{
 const defs=modPoolDefinitions();for(const item of defs.vanilla.find(c=>c.id==='spats').items){const pools={_version:2,...Object.fromEntries(Object.entries(defs).map(([origin,cs])=>[origin,Object.fromEntries(cs.map(c=>[c.id,{chance:0,items:[]}]))]))};pools.vanilla.spats={chance:100,items:[item.itemName]};
 const loadouts=[outfit(),outfit()],state=createGeneratedEquipmentState(loadouts);applyModdedRandomizerEquipment(loadouts,{position:'WR',branding:'nike'},mulberry32(2),1,state,{usingVanillaPool:true,modPools:pools});for(const l of loadouts)for(const slot of ['LeftSpat','RightSpat'])assert.equal(l.loadoutElements.find(e=>e.slotType===slot).itemAssetName,item.itemName);}
});
