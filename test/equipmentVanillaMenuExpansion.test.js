import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{modPoolDefinitions,normalizeModPools,POOL_OWNERSHIP}from'../src/main/tools/equipment/core/modPools.js';
import{equipmentItem,equipmentDisplayName}from'../src/main/tools/equipment/catalog.js';
import{applyModdedRandomizerEquipment,mulberry32}from'../src/main/tools/equipment/core/patcher.js';
import{createGeneratedEquipmentState,enforceGeneratedEquipmentCompatibility}from'../src/main/tools/equipment/core/generatedCompatibility.js';
import{mapperCatalog}from'../src/main/tools/equipmentMapper/catalog.js';
import{quickstartSettings}from'../src/main/tools/equipmentQuickstart/runner.js';
const menu=JSON.parse(fs.readFileSync(new URL('../src/main/tools/equipment/equipmentVanillaMenuInventory.json',import.meta.url),'utf8')),defs=modPoolDefinitions();
const empty=()=>({_version:2,...Object.fromEntries(Object.entries(defs).map(([o,c])=>[o,Object.fromEntries(c.map(c=>[c.id,{chance:0,items:[]}]))]))}),outfit=()=>[{loadoutType:'PlayerOnField',loadoutElements:[]}];
const run=(id,category,extra={},loadouts=outfit())=>{const pools=empty();pools.vanilla[category]={chance:100,items:[id]};const state=createGeneratedEquipmentState(loadouts),changes=applyModdedRandomizerEquipment(loadouts,{position:extra.position??'WR',branding:'nike'},mulberry32(101),1,state,{usingVanillaPool:true,usingUnlockedMod:false,usingRawAccessoriesMod:false,modPools:pools,...extra});return {loadouts,state,changes};};

test('the exact user-confirmed menu families and three uncolored leg layers are available without mods',()=>{
 const counts={jerseyStyles:5,undershirts:10,neckPads:4,armSleeves:48,wristGear:33,legSleeves:3,socks:4,guardianCaps:1,mouthpieces:8};
 assert.equal(menu.items.length,116);
 for(const [category,count]of Object.entries(counts))assert.equal(menu.items.filter(i=>POOL_OWNERSHIP.vanillaItems[i.itemName].poolCategory===category).length,count,category);
 const base=mapperCatalog({confirmed:true}),mod=mapperCatalog({confirmed:true,unlocked:true});
 for(const item of menu.items){const found=base.items.filter(i=>i.asset===item.itemName);assert.equal(found.length,item.slots.length,item.itemName);assert.ok(found.every(i=>i.name===item.displayName&&i.origin==='vanilla'));}
 for(const id of ['GearLegsBase_LeftSleeve','GearLegsBase_RightSleeve','GearLegBase_Socks_Under_Both'])assert.ok(base.items.some(i=>i.asset===id));
 for(const id of ['GearLegsBase_LeftSleeve_Black','GearLegsBase_RightSleeve_White','GearLegBase_Socks_Under_Both_Black','GearLegBase_Socks_Under_Both_Black2']){assert.ok(!base.items.some(i=>i.asset===id));assert.ok(mod.items.some(i=>i.asset===id));}
 assert.ok(defs.vanilla.some(c=>c.items.some(i=>i.displayName==='Arm Tape Long Off White')));assert.ok(defs.vanilla.some(c=>c.items.some(i=>i.displayName==='Arm Tape Short Off White')));
});

test('every newly confirmed choice can actually be generated and survives final checks in its correct slots',()=>{
 for(const item of menu.items){const category=POOL_OWNERSHIP.vanillaItems[item.itemName].poolCategory,result=run(item.itemName,category,{position:/^GearWrist_gloveTapedLarge_/.test(item.itemName)?'TE':'WR'}),changes=result.changes.vanilla;
  assert.ok(changes.some(c=>c.newItem===item.itemName),item.itemName);
  assert.ok(result.loadouts[0].loadoutElements.some(e=>e.itemAssetName===item.itemName&&item.slots.includes(e.slotType)),item.itemName);
  assert.deepEqual(enforceGeneratedEquipmentCompatibility(result.loadouts,result.state,/^GearWrist_gloveTapedLarge_/.test(item.itemName)?'TE':'WR'),[],item.itemName);
 }
});

test('new choices do not silently change defaults or saved item selections in Randomizer or Quickstart',()=>{
 const defaultCounts={armSleeves:20,wristGear:18,elbowGear:14,cleats:90,gloves:63,mouthpieces:0,neckwear:8,spats:4,facepaint:10};
 for(const pools of [normalizeModPools(),quickstartSettings({unlocked:true}).randomizer.modPools]){
  for(const c of defs.vanilla){assert.equal(pools.vanilla[c.id].items.length,defaultCounts[c.id]??0,c.id);if(!(c.id in defaultCounts))assert.equal(pools.vanilla[c.id].chance,0,c.id);}
  assert.ok(!pools.vanilla.wristGear.items.includes('GearWrist_wristbrace_CompressShort_Black'));
 }
 const old={_version:2,vanilla:{armSleeves:{chance:17,items:['GearArmSleeve_Baggy_Black']}},unlocked:{neckwear:{chance:0,items:[]}}};const before=structuredClone(old),normalized=normalizeModPools(old);assert.deepEqual(old,before);assert.deepEqual(normalized.vanilla.armSleeves,old.vanilla.armSleeves);assert.deepEqual(normalized.vanilla.wristGear,{chance:10,items:defs.vanilla.find(c=>c.id==='wristGear').defaultItems});assert.deepEqual(normalizeModPools(normalized),normalized);
});

test('vanilla neck rolls and RAW-displaced sleeves cannot silently roll their mod replacements',()=>{
 for(const id of ['GearNeckpad_VintageNeckRoll','GearNeckpad_VintageSingleNeckRoll']){
  assert.match(equipmentDisplayName(id,{usingUnlockedMod:false}),/Neck Roll/);assert.match(equipmentDisplayName(id,{usingUnlockedMod:true}),/Balaclava/);
  assert.equal(equipmentItem(id,{usingUnlockedMod:false}).semantic.actualType,'neck-roll');assert.equal(equipmentItem(id,{usingUnlockedMod:true}).semantic.poolEligible,false);
  const result=run(id,'neckPads',{usingUnlockedMod:true});assert.equal(result.changes.vanilla.length,0);assert.ok(!result.loadouts[0].loadoutElements.some(e=>e.itemAssetName===id));
 }
 for(const id of ['GearArmSleeve_Full_sleeveLongUnderarmor_normal_Black','GearArmSleeve_McDavidPaddedCompressionSleeve_White','GearArmSleeve_Shooter_sleeveLongUnderarmor_normal_SecondaryColor','GearArmSleeve_Quarter_armTape_normal_Black']){
  const base=mapperCatalog({confirmed:true}),raw=mapperCatalog({confirmed:true,raw:true});assert.equal(base.items.find(i=>i.asset===id).origin,'vanilla');assert.equal(raw.items.find(i=>i.asset===id).origin,'raw');
  assert.equal(run(id,'armSleeves',{usingRawAccessoriesMod:true}).changes.vanilla.length,0,id);
 }
});

test('new jersey and undershirt choices preserve cutoff-pants fit, and new sleeves respect existing accessories',()=>{
 const loadouts=[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'OuterPants',itemAssetName:'GearPants_Cutoff'},{slotType:'OuterShirt',itemAssetName:'Gear_JerseyStyle_RolledLow'},{slotType:'InnerShirt',itemAssetName:'Gear_Undershirt_CompressionTCrewSleeveless_White'}]}];
 assert.equal(run('Gear_JerseyStyle_SleeveStandard','jerseyStyles',{},loadouts).changes.vanilla.length,0);assert.equal(loadouts[0].loadoutElements.find(e=>e.slotType==='OuterShirt').itemAssetName,'Gear_JerseyStyle_RolledLow');
 const sleeves=[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'LeftWristWear',itemAssetName:'GearWrist_wristTapedNormal_White'},{slotType:'RightWristWear',itemAssetName:'GearWrist_wristTapedNormal_White'}]}];assert.equal(run('GearArmSleeve_Full_sleeveLongUnderarmor_normal_White','armSleeves',{},sleeves).changes.vanilla.length,0);
});

test('expanded Vanilla choices retain the existing elbow position safeguards',()=>{
 const expectations={QB:[],K:[],P:[],WR:['ElbowGear_elbowSweatbandFull_Black'],LT:['ElbowGear_armBraceSmall','ElbowGear_elbowSweatbandFull_Black'],CB:['ElbowGear_bicepShoulderStabilizer','ElbowGear_elbowSweatbandFull_Black']};
 for(const [position,allowed]of Object.entries(expectations))for(const id of ['ElbowGear_armBraceSmall','ElbowGear_bicepShoulderStabilizer','ElbowGear_elbowSweatbandFull_Black']){
  const pools=empty();pools.vanilla.elbowGear={chance:100,items:[id]};const loadouts=outfit(),changes=applyModdedRandomizerEquipment(loadouts,{position,branding:'nike'},mulberry32(10),1,undefined,{usingVanillaPool:true,modPools:pools});assert.equal(changes.vanilla.some(c=>c.newItem===id),allowed.includes(id),position+' '+id);
 }
});
