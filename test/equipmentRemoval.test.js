import test from 'node:test';
import assert from 'node:assert/strict';
import {removalCatalog,normalizeRemovalItems,removeSelectedEquipment} from '../src/main/tools/equipment/core/removal.js';
import {EQUIPMENT_ITEMS,RAW_314} from '../src/main/tools/equipment/catalog.js';
import {applyGlobalEquipmentFixes} from '../src/main/tools/equipment/core/globalFixes.js';
test('removal offers every catalog and RAW sleeve item by readable name and validates exact saved IDs',()=>{
 const choices=removalCatalog(),ids=new Set(choices.map(item=>item.value));for(const item of [...EQUIPMENT_ITEMS,...RAW_314.jamoItems])assert.ok(ids.has(item.itemName));assert.ok(choices.every(item=>item.label));assert.throws(()=>normalizeRemovalItems(['Unknown_Invented_Item']),/catalog/);assert.deepEqual(normalizeRemovalItems([choices[0].value,choices[0].value]),[choices[0].value]);
});
test('removal covers repeated field/Base entries, preserves other metadata and clears dependent overrides',()=>{
 const parsed={skin:7,loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'WaistWear',itemAssetName:'Handwarmer_Standard',custom:4},{slotType:'WaistWearOverride',itemAssetName:'HandwarmerStyle_Front'},{slotType:'InnerShirt',itemAssetName:'Keep',custom:8}]},{loadoutCategory:'Base',loadoutElements:[{slotType:'LeftArmTattoo',itemAssetName:'Tattoo_Test'},{itemAssetName:'Body_Keep'}]}]};
 assert.equal(removeSelectedEquipment(parsed,['Handwarmer_Standard','Tattoo_Test']).length,3);assert.deepEqual(parsed,{skin:7,loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'InnerShirt',itemAssetName:'Keep',custom:8}]},{loadoutCategory:'Base',loadoutElements:[{itemAssetName:'Body_Keep'}]}]});assert.equal(removeSelectedEquipment(parsed,['Handwarmer_Standard']).length,0);
});
test('Patcher removes last after additions and respects player exclusion and shared visual protection',()=>{
 const player={FirstName:'Test',LastName:'Player',Position:'WR',SchoolYear:'Freshman',RedshirtStatus:'Eligible',CharacterBodyType:'Thin',TeamIndex:1,CharacterVisuals:(10).toString(2).padStart(15,'0')+'0'.repeat(17),isEmpty:false},make=()=>({isEmpty:false,RawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'OuterPants',itemAssetName:'GearPants_Standard'},{slotType:'HeadWear',itemAssetName:'KeepHelmet'}]}]})}),options={protectOriginalEaPlayers:false,pantsFix:true,removeEquipment:true,removeEquipmentItems:['GearPants_AboveKnee']};
 const visual=make(),result=applyGlobalEquipmentFixes([player],[visual],10,options);assert.ok(result.removeEquipmentChanges.length);assert.equal(JSON.parse(visual.RawData).loadouts[0].loadoutElements.some(item=>item.slotType==='OuterPants'),false);
 for(const extra of [{eligiblePlayer:()=>false},{excludedTeamIndexes:new Set([1])}]){const untouched=make(),raw=untouched.RawData;applyGlobalEquipmentFixes([player],[untouched],10,{...options,...extra});assert.equal(untouched.RawData,raw);}
 const shared=make(),raw=shared.RawData;applyGlobalEquipmentFixes([player,{...player}],[shared],10,{...options,eligiblePlayer:p=>p===player});assert.equal(shared.RawData,raw);assert.throws(()=>applyGlobalEquipmentFixes([player],[make()],10,{...options,removeEquipmentItems:[]}),/at least one/);
});
