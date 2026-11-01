import test from 'node:test';import assert from 'node:assert/strict';
import {RAW_321,RAW_ACCESSORIES_POOLS,equipmentItem,equipmentDisplayName,equipmentColorVariant,itemBrand} from '../src/main/tools/equipment/catalog.js';
import {modPoolDefinitions,normalizeModPools} from '../src/main/tools/equipment/core/modPools.js';
import {applyModdedRandomizerEquipment,mulberry32} from '../src/main/tools/equipment/core/patcher.js';
import {createGeneratedEquipmentState} from '../src/main/tools/equipment/core/generatedCompatibility.js';
import {quickstartSettings} from '../src/main/tools/equipmentQuickstart/runner.js';
import {mapperCatalog} from '../src/main/tools/equipmentMapper/catalog.js';
import {removalCatalog,removeSelectedEquipment} from '../src/main/tools/equipment/core/removal.js';
import {recolorPlayerAccessories} from '../src/main/tools/equipment/core/recolor.js';
const defs=modPoolDefinitions(),gloves=RAW_321.items.filter(x=>x.category==='Gloves'),towels=RAW_321.items.filter(x=>x.category==='Towel');
const empty=()=>({_version:2,...Object.fromEntries(Object.entries(defs).map(([origin,categories])=>[origin,Object.fromEntries(categories.map(c=>[c.id,{chance:0,items:[]}]))]))});
const outfit=()=>[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'LeftHandWear',itemAssetName:'GearHand_None',paletteMods:[{old:true}],blends:[{old:true}]},{slotType:'RightHandWear',itemAssetName:'GearHand_None'},{slotType:'Towel',itemAssetName:'Towel_None'}]}];
function generate(item,{position='WR',branding=itemBrand(item),raw=true,seed=1,vanillaTowel=false}={}){
  const pools=empty(),category=item.category==='Gloves'?'gloves':'towels';pools.raw[category]={chance:100,items:[item.itemName]};if(vanillaTowel)pools.vanilla.towels={chance:100,items:['Towel_North']};
  const loadouts=outfit(),state=createGeneratedEquipmentState(loadouts),changes=applyModdedRandomizerEquipment(loadouts,{position,branding},mulberry32(seed),1,state,{usingRawAccessoriesMod:raw,usingVanillaPool:vanillaTowel,modPools:pools,donorOnlyGlovesPositions:['QB']});return {loadouts,changes};
}
test('RAW 3.2.1 catalog has three exact fixed-pink branded gloves and all eight black towel directions',()=>{
  assert.equal(RAW_321.version,'3.2.1');assert.equal(gloves.length,3);assert.equal(towels.length,8);assert.equal(new Set(RAW_321.items.map(i=>i.numericId)).size,11);
  assert.deepEqual(gloves.map(itemBrand).sort(),['jordan','nike','underarmour']);
  for(const item of RAW_321.items){const known=equipmentItem(item.itemName);assert.equal(known.origin,'raw');assert.equal(equipmentDisplayName(item.itemName),item.displayName);assert.deepEqual(known.slots,item.category==='Gloves'?['LeftHandWear','RightHandWear']:['Towel']);assert.ok((item.category==='Gloves'?RAW_ACCESSORIES_POOLS.gloves:RAW_ACCESSORIES_POOLS.towels).some(i=>i.itemName===item.itemName));}
  assert.equal(equipmentItem('FaceMarks_RawNoEarrings'),undefined,'An empty model utility is not added as random facepaint');
});
test('Quickstart and Randomizer share 10% RAW gloves and 1% black towels; explicit old choices, zero chances and empty lists survive',()=>{
  for(const settings of [normalizeModPools(),quickstartSettings({raw:true}).randomizer.modPools]){assert.deepEqual(settings.raw.gloves,{chance:10,items:gloves.map(i=>i.itemName)});assert.deepEqual(settings.raw.towels,{chance:1,items:towels.map(i=>i.itemName)});assert.deepEqual(settings.raw.armSleeves,{chance:0,items:[]});}
  const previous={_version:2,raw:{neckwear:{chance:23,items:defs.raw.find(c=>c.id==='neckwear').defaultItems.slice(0,1)},armSleeves:{chance:0,items:[]}}};const normalized=normalizeModPools(previous);assert.deepEqual(normalized.raw.neckwear,previous.raw.neckwear);assert.deepEqual(normalized.raw.armSleeves,previous.raw.armSleeves);
  const disabled=normalizeModPools({...normalized,raw:{...normalized.raw,gloves:{chance:0,items:[]},towels:{chance:0,items:[]}}});assert.deepEqual(normalizeModPools(disabled),disabled);assert.deepEqual(disabled.raw.gloves,{chance:0,items:[]});
});
test('RAW pink gloves generate as a matching pair, clear old donor palette overrides, and respect team brand and pool position protection',()=>{
  for(const item of gloves){
    const result=generate(item);assert.equal(result.changes.raw.length,1);assert.deepEqual(result.changes.raw[0].slots,['LeftHandWear','RightHandWear']);
    for(const slot of ['LeftHandWear','RightHandWear']){const element=result.loadouts[0].loadoutElements.find(e=>e.slotType===slot);assert.equal(element.itemAssetName,item.itemName);assert.equal(element.paletteMods,undefined);assert.equal(element.blends,undefined);}
    for(const position of ['QB','LT','LG','C','RG','RT','OL','DT','K','P'])assert.equal(generate(item,{position}).changes.raw.length,0,position);
    for(const branding of ['nike','jordan','underarmour','adidas',''])if(branding!==itemBrand(item))assert.equal(generate(item,{branding}).changes.raw.length,0,branding);
  }
});
test('RAW entries require RAW and do not leak into either CFB 27 or Unlocked pools',()=>{
  for(const item of RAW_321.items){assert.deepEqual(generate(item,{raw:false}).changes,{});for(const origin of ['vanilla','unlocked'])assert.ok(defs[origin].every(c=>c.items.every(i=>i.itemName!==item.itemName)));}
});
test('all black towel directions can be rolled and compete fairly with base-game towels for one final slot',()=>{
  for(const item of towels){const result=generate(item);assert.equal(result.changes.raw[0].newItem,item.itemName);assert.equal(result.loadouts[0].loadoutElements.find(e=>e.slotType==='Towel').itemAssetName,item.itemName);}
  const counts={raw:0,vanilla:0};for(let seed=0;seed<200;seed++){const result=generate(towels[0],{seed,vanillaTowel:true}),changes=Object.entries(result.changes).filter(([,values])=>values.length);assert.equal(changes.length,1);counts[changes[0][0]]++;assert.equal(result.loadouts[0].loadoutElements.filter(e=>e.slotType==='Towel').length,1);}
  assert.ok(counts.raw>60&&counts.vanilla>60,JSON.stringify(counts));
});
test('fixed pink and black palettes remain their verified colors through recoloring; no unsupported variants are invented',()=>{
  for(const item of RAW_321.items)for(const theme of ['white','black','primary','secondary']){const loadouts=[{loadoutType:'PlayerOnField',loadoutElements:item.slots.map(slotType=>({slotType,itemAssetName:item.itemName}))}];recolorPlayerAccessories(loadouts,theme,theme);assert.ok(loadouts[0].loadoutElements.every(e=>e.itemAssetName===item.itemName));assert.equal(equipmentColorVariant(item.itemName,theme),null);}
});
test('Mapper gates new items by RAW selection and supports All categories, both glove sides and optional removal',()=>{
  const base=mapperCatalog({confirmed:true}),raw=mapperCatalog({confirmed:true,raw:true}),removal=new Set(removalCatalog().map(i=>i.value));
  for(const item of RAW_321.items){assert.ok(!base.items.some(i=>i.asset===item.itemName));const variants=raw.items.filter(i=>i.asset===item.itemName);assert.equal(variants.length,item.slots.length);assert.ok(variants.every(i=>i.origin==='raw'));assert.ok(removal.has(item.itemName));const parsed={loadouts:[{loadoutType:'PlayerOnField',loadoutElements:item.slots.map(slotType=>({slotType,itemAssetName:item.itemName}))}]};assert.equal(removeSelectedEquipment(parsed,[item.itemName]).length,item.slots.length);assert.deepEqual(parsed.loadouts[0].loadoutElements,[]);}
});
