import test from 'node:test';
import assert from 'node:assert/strict';
import {UNLOCKED_POOLS,brandedEquipmentItems,EQUIPMENT_ITEMS,itemBrand,normalBrand} from '../src/main/tools/equipment/catalog.js';
import {normalizeModPools,modPoolDefinitions,modPoolEditorCatalog} from '../src/main/tools/equipment/core/modPools.js';
import {applyUnlockedRandomizerEquipment,mulberry32} from '../src/main/tools/equipment/core/patcher.js';
import {quickstartSettings} from '../src/main/tools/equipmentQuickstart/runner.js';
import {normalizeEquipmentOptions} from '../src/main/tools/equipment/runner.js';
const outfit=()=>[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'HeadWear',itemAssetName:'GearHelmet_Speed_Flex'},{slotType:'LeftArmWear',itemAssetName:'ArmSleeve_None'},{slotType:'RightArmWear',itemAssetName:'ArmSleeve_None'}]}];

test('all four Unlocked biceps bands start unchecked in Randomizer and Quickstart but stay available',()=>{
  const bands=UNLOCKED_POOLS.bicepBands.map(item=>item.itemName);assert.equal(bands.length,4);
  const defaults=[normalizeModPools(),normalizeEquipmentOptions({usingUnlockedMod:true},true).modPools,quickstartSettings({unlocked:true}).randomizer.modPools];
  for(const pools of defaults)for(const band of bands)assert.ok(!pools.unlocked.elbowGear.items.includes(band),band);
  const category=modPoolEditorCatalog().unlocked.find(category=>category.id==='elbowGear');for(const band of bands)assert.ok(category.items.some(item=>item.value===band));
});
test('direct fallback generation excludes default biceps bands, while explicit selections and presets can enable each',()=>{
  for(const configuration of [undefined,{}, {elbowGear:{chance:100}}])for(let seed=0;seed<100;seed++){
    const loadouts=outfit(),changes=applyUnlockedRandomizerEquipment(loadouts,{position:'WR',branding:'nike'},mulberry32(seed),1,undefined,configuration);
    assert.ok(!changes.some(change=>/^GearBicepBand_/i.test(change.newItem)));assert.ok(!loadouts[0].loadoutElements.some(item=>/^GearBicepBand_/i.test(item.itemAssetName)));
  }
  for(const band of UNLOCKED_POOLS.bicepBands){
    const config=Object.fromEntries(modPoolDefinitions().unlocked.map(category=>[category.id,{chance:0,items:[]}]));config.elbowGear={chance:100,items:[band.itemName]};
    const normalized=normalizeModPools({unlocked:config});assert.deepEqual(normalizeModPools(JSON.parse(JSON.stringify(normalized))),normalized);
    const loadouts=outfit();applyUnlockedRandomizerEquipment(loadouts,{position:'WR',branding:'nike'},mulberry32(18),0,undefined,normalized.unlocked);
    for(const side of ['Left','Right'])assert.equal(loadouts[0].loadoutElements.find(item=>item.slotType===side+'ElbowWear')?.itemAssetName,band.itemName);
  }
});
test('cached branded pools exactly match uncached catalog filtering and callers cannot change another pool',()=>{
  for(const category of ['Gloves','Cleats','Undershirt','Unknown'])for(const brand of ['nike','Nike','adidas','under armour','jordan','Unknown']){
    const expected=EQUIPMENT_ITEMS.filter(item=>item.category===category&&item.itemName.startsWith('Gear')&&itemBrand(item)===normalBrand(brand)&&item.origin!=='unverified');
    const first=brandedEquipmentItems(category,brand);assert.deepEqual(first,expected);first.reverse();first.pop();first.push({itemName:'Fake'});assert.deepEqual(brandedEquipmentItems(category,brand),expected);
  }
});
