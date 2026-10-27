import test from 'node:test';
import assert from 'node:assert/strict';
import {removalCatalog,normalizeRemovalItems,removeSelectedEquipment} from '../src/main/tools/equipment/core/removal.js';
import {EQUIPMENT_ITEMS,RAW_314} from '../src/main/tools/equipment/catalog.js';
import {applyGlobalEquipmentFixes} from '../src/main/tools/equipment/core/globalFixes.js';
import {REMOVAL_NAMED_ITEMS} from '../src/main/tools/equipment/core/removalInventory.js';
import {MOD_FACE_PAINT_ITEMS,VANILLA_FACE_PAINT_OPTIONS} from '../src/main/tools/equipment/core/facepaint.js';
import {auditRemovalCatalog} from '../scripts/audit-equipment-removal.mjs';
test('all named assets in every inventory and the readable reference are accounted for',()=>{
 const audit=auditRemovalCatalog();assert.ok(audit.namedAssets>1100);assert.deepEqual(audit.missing,[]);
 assert.ok(audit.rows.filter(row=>row.sources.includes('docs/catalogs/gear-catalog-readable.md')).length>300);
 const ids=new Set(removalCatalog().map(item=>item.value));
 const choices=new Map(removalCatalog().map(item=>[item.value,item]));
 assert.ok(audit.rows.filter(row=>row.sources.includes('docs/catalogs/gear-catalog-readable.html')).length>300);
 for(const row of audit.rows.filter(row=>row.reason==='Offered'))for(const name of row.labels){const choice=choices.get(row.id);assert.ok(choice.label.includes(name)||choice.searchAliases.includes(name),`${row.id}: ${name} remains searchable`);}
 for(const item of [...REMOVAL_NAMED_ITEMS,...EQUIPMENT_ITEMS.filter(item=>item.slots.includes('InnerPants'))])assert.ok(ids.has(item.itemName),item.itemName);
 for(const id of [...VANILLA_FACE_PAINT_OPTIONS,...Object.values(MOD_FACE_PAINT_ITEMS).flat()])assert.ok(ids.has(id),id);
 assert.ok(!ids.has('LegTattoo_TEST'),'No Tattoo is an empty choice');
 for(const item of RAW_314.jamoItems){const original=EQUIPMENT_ITEMS.find(stock=>stock.itemName===item.itemName),label=removalCatalog().find(row=>row.value===item.itemName).label;assert.ok(label.includes(item.displayName));if(original)assert.ok(label.includes(original.displayName),'Stock name remains searchable');}
});
test('supplemental named items remove only optional slots and do not become generation items',()=>{
 for(const item of REMOVAL_NAMED_ITEMS){
  const parsed={loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:item.slots[0],itemAssetName:item.itemName},{slotType:'OuterShirt',itemAssetName:item.itemName},{slotType:'HeadWear',itemAssetName:item.itemName},{slotType:'HeadBand',itemAssetName:item.itemName},{slotType:'InnerShirt',itemAssetName:'KeepMe'}]}]};
  assert.equal(removeSelectedEquipment(parsed,[item.itemName]).length,1,item.itemName);assert.equal(parsed.loadouts[0].loadoutElements.length,4);
 }
 for(const id of ['G_Hoodie_Sleeveless_Ravens_ML_PUR','G_CompressionT_Crew_ShortSleeve_BasicJ_JER','FaceMarks_RawDiamondStudEarrings']){
  const parsed={loadouts:[{loadoutElements:[{itemAssetName:id}]}]};assert.equal(removeSelectedEquipment(parsed,[id]).length,0,'Unverified backing assets need an explicit optional saved slot');
  assert.ok(!EQUIPMENT_ITEMS.some(item=>item.itemName===id),'Removal does not add generation eligibility');
 }
});
test('removal only offers supported optional categories and rejects protected gear even through direct API calls',()=>{
 const choices=removalCatalog(),ids=new Set(choices.map(item=>item.value));assert.ok(choices.length>100);assert.ok(choices.every(item=>item.label&&item.group));for(const item of RAW_314.jamoItems)assert.ok(ids.has(item.itemName));
 for(const item of EQUIPMENT_ITEMS.filter(item=>item.slots.some(slot=>['HeadWear','FaceMask','LeftShoe','RightShoe'].includes(slot)))){assert.equal(ids.has(item.itemName),false,item.itemName);assert.throws(()=>normalizeRemovalItems([item.itemName]),/cannot be removed/);}
 assert.throws(()=>normalizeRemovalItems(['Unknown_Invented_Item']),/supported None/);assert.deepEqual(normalizeRemovalItems([choices[0].value,choices[0].value]),[choices[0].value]);assert.ok(ids.has('Gear_Undershirt_CompressionTCrewSleeveless_White'));assert.ok(ids.has('FaceGear_BalaclavaOverNose_White'));assert.equal(ids.has('FaceGear_BalaclavaNone'),false);assert.equal(ids.has('Gear_JerseyStyle_Rolled'),false,'Jerseys have no eligible None category');
});
test('removal includes native NeckWear turtlenecks and Q Collar with an existing None representation',()=>{
 const ids=new Set(removalCatalog().map(item=>item.value)),neckwear=EQUIPMENT_ITEMS.filter(item=>item.slots.includes('NeckWear'));
 assert.ok(neckwear.some(item=>item.itemName==='NeckWear_Raw_Turtleneck'));
 assert.ok(neckwear.some(item=>item.itemName==='NeckWear_Turtleneck_Tight2'));
 assert.ok(neckwear.some(item=>item.itemName==='GearNeckpad_QCollar'));
 for(const item of neckwear){
  assert.ok(ids.has(item.itemName),item.itemName);
  const keep={slotType:'InnerShirt',itemAssetName:'Keep_Undershirt',custom:3},parsed={loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'NeckWear',itemAssetName:item.itemName},keep]},{loadoutCategory:'Base',loadoutElements:[{slotType:'NeckWear',itemAssetName:item.itemName}]}]};
  assert.equal(removeSelectedEquipment(parsed,[item.itemName]).length,2,item.itemName);
  assert.deepEqual(parsed.loadouts[0].loadoutElements,[keep]);assert.deepEqual(parsed.loadouts[1].loadoutElements,[]);
 }
});
test('removal covers repeated field/Base entries, preserves other metadata and clears dependent overrides',()=>{
 const parsed={skin:7,loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'WaistWear',itemAssetName:'Handwarmer_Standard',custom:4},{slotType:'WaistWearOverride',itemAssetName:'HandwarmerStyle_Front'},{slotType:'InnerShirt',itemAssetName:'Keep',custom:8}]},{loadoutCategory:'Base',loadoutElements:[{slotType:'LeftArmTattoo',itemAssetName:'CujoMatty_ArmTats_21'},{itemAssetName:'Body_Keep'}]}]};
 assert.equal(removeSelectedEquipment(parsed,['Handwarmer_Standard','CujoMatty_ArmTats_21']).length,3);assert.deepEqual(parsed,{skin:7,loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'InnerShirt',itemAssetName:'Keep',custom:8}]},{loadoutCategory:'Base',loadoutElements:[{itemAssetName:'Body_Keep'}]}]});assert.equal(removeSelectedEquipment(parsed,['Handwarmer_Standard']).length,0);
});
test('Patcher removes last after additions and respects player exclusion and shared visual protection',()=>{
 const player={FirstName:'Test',LastName:'Player',Position:'WR',SchoolYear:'Freshman',RedshirtStatus:'Eligible',CharacterBodyType:'Thin',TeamIndex:1,CharacterVisuals:(10).toString(2).padStart(15,'0')+'0'.repeat(17),isEmpty:false},make=()=>({isEmpty:false,RawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'Visor',itemAssetName:'GearVisor_visorClear'},{slotType:'HeadWear',itemAssetName:'KeepHelmet'}]}]})}),options={protectOriginalEaPlayers:false,oakleyVisorFix:true,removeEquipment:true,removeEquipmentItems:['GearVisor_visorOakley_clear']};
 const visual=make(),result=applyGlobalEquipmentFixes([player],[visual],10,options);assert.ok(result.removeEquipmentChanges.length);assert.equal(JSON.parse(visual.RawData).loadouts[0].loadoutElements.some(item=>item.slotType==='Visor'),false);
 for(const extra of [{eligiblePlayer:()=>false},{excludedTeamIndexes:new Set([1])}]){const untouched=make(),raw=untouched.RawData;applyGlobalEquipmentFixes([player],[untouched],10,{...options,...extra});assert.equal(untouched.RawData,raw);}
 const shared=make(),raw=shared.RawData;applyGlobalEquipmentFixes([player,{...player}],[shared],10,{...options,eligiblePlayer:p=>p===player});assert.equal(shared.RawData,raw);assert.throws(()=>applyGlobalEquipmentFixes([player],[make()],10,{...options,removeEquipmentItems:[]}),/at least one/);
});
