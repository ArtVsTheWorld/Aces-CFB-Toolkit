import test from'node:test';import assert from'node:assert/strict';
import{normalizeModPools,modPoolDefinitions,UNLOCKED_SPATS}from'../src/main/tools/equipment/core/modPools.js';
import{applyUnlockedRandomizerEquipment,mulberry32}from'../src/main/tools/equipment/core/patcher.js';
import{quickstartSettings}from'../src/main/tools/equipmentQuickstart/runner.js';
import{normalizeEquipmentOptions}from'../src/main/tools/equipment/runner.js';
const outfits=()=>[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'InnerShirt',itemAssetName:'Undershirt_None'},{slotType:'LeftShoe',itemAssetName:'KeepShoe'},{slotType:'LeftSpat',itemAssetName:'GearSpats_none'},{slotType:'RightSpat',itemAssetName:'GearSpats_spatThin_Black'}]}];

test('Unlocked String Towel defaults to one percent in both tools, remains selectable and does not strip existing towels',()=>{
 const definition=modPoolDefinitions().unlocked.find(c=>c.id==='towels'),asset='Towel2_South';assert.ok(definition.items.some(i=>i.itemName===asset));assert.deepEqual(definition.defaultItems,[asset]);assert.equal(definition.defaultChance,1);assert.deepEqual(normalizeEquipmentOptions({},true).modPools.unlocked.towels.items,[asset]);assert.deepEqual(quickstartSettings({unlocked:true}).randomizer.modPools.unlocked.towels.items,[asset]);
 const empty=Object.fromEntries(modPoolDefinitions().unlocked.map(c=>[c.id,{chance:0,items:[]}])) ,base=[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'Towel',itemAssetName:'Towel_Standard'}]}];
 const off=normalizeModPools({unlocked:{...empty,towels:{chance:100}}}).unlocked,before=structuredClone(base);applyUnlockedRandomizerEquipment(base,{position:'WR'},mulberry32(7),1,undefined,off);assert.deepEqual(base,before);
 const selected=normalizeModPools({unlocked:{...empty,towels:{chance:100,items:[asset]}}}).unlocked;applyUnlockedRandomizerEquipment(base,{position:'WR'},mulberry32(7),1,undefined,selected);assert.equal(base[0].loadoutElements[0].itemAssetName,asset);
 const retained=structuredClone(base);applyUnlockedRandomizerEquipment(base,{position:'WR'},mulberry32(7),1,undefined,off);assert.deepEqual(base,retained);
});
test('Spats is a Vanilla 5% category with only verified wearable spats, not cleat overrides',()=>{assert.equal(UNLOCKED_SPATS.length,4);assert.equal(normalizeModPools().vanilla.spats.chance,5);assert.equal(quickstartSettings({unlocked:true}).randomizer.modPools.vanilla.spats.chance,5);assert.ok(UNLOCKED_SPATS.every(i=>/^GearSpats_spatThin_/.test(i.itemName)));});
test('one successful spat roll equips matching pairs on both feet and preserves shoes',()=>{
 const empty=Object.fromEntries(modPoolDefinitions().vanilla.map(c=>[c.id,{chance:0,items:[]}])) ,chosen='GearSpats_spatThin_TeamColor',pools=normalizeModPools({vanilla:{...empty,spats:{chance:100,items:[chosen]}}}).vanilla;
 const raw=outfits(),changes=applyUnlockedRandomizerEquipment(raw,{position:'WR',branding:'nike'},mulberry32(7),.10,undefined,pools,true,{},"vanilla");assert.equal(changes.length,1);assert.deepEqual(changes[0].slots,['LeftSpat','RightSpat']);for(const slot of ['LeftSpat','RightSpat'])assert.equal(raw[0].loadoutElements.find(e=>e.slotType===slot).itemAssetName,chosen);assert.equal(raw[0].loadoutElements.find(e=>e.slotType==='LeftShoe').itemAssetName,'KeepShoe');
 const off=outfits(),before=structuredClone(off);applyUnlockedRandomizerEquipment(off,{position:'WR'},mulberry32(7),.10,undefined,{...pools,spats:{chance:0,items:[chosen]}},true,{},"vanilla");assert.deepEqual(off,before);
});
test('elbow braces and pads stay selectable but default off without disabling bands or an explicit saved selection',()=>{
 const definition=modPoolDefinitions().vanilla.find(c=>c.id==='elbowGear'),defaults=normalizeModPools().vanilla.elbowGear;
 const disabled=definition.items.filter(i=>/^ElbowGear_(?:elbowBrace|elbowpad)/i.test(i.itemName));assert.ok(disabled.length>=7);assert.ok(disabled.every(i=>!defaults.items.includes(i.itemName)));assert.ok(defaults.items.some(i=>/elbowSweatband/i.test(i)));assert.ok(!defaults.items.some(i=>/^GearBicepBand_/.test(i)));assert.deepEqual(normalizeModPools({vanilla:{elbowGear:{chance:100,items:disabled.map(i=>i.itemName)}}}).vanilla.elbowGear.items,disabled.map(i=>i.itemName));
});
