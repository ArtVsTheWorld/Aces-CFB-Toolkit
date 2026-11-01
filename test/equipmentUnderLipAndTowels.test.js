import test from 'node:test';import assert from 'node:assert/strict';
import {equipmentItem,equipmentColorVariant,canGenerateItem} from '../src/main/tools/equipment/catalog.js';
import {modPoolDefinitions,normalizeModPools} from '../src/main/tools/equipment/core/modPools.js';
import {applyModdedRandomizerEquipment,mulberry32} from '../src/main/tools/equipment/core/patcher.js';
import {createGeneratedEquipmentState,canGenerateEquipment} from '../src/main/tools/equipment/core/generatedCompatibility.js';
import {enforceEquipmentCompatibility} from '../src/main/tools/equipment/core/compatibility.js';
import {mapperCatalog} from '../src/main/tools/equipmentMapper/catalog.js';
import {quickstartSettings} from '../src/main/tools/equipmentQuickstart/runner.js';
import {removalCatalog,removeSelectedEquipment} from '../src/main/tools/equipment/core/removal.js';

const defs=modPoolDefinitions(),under=['','_White','_Primary','_Secondary'].map(s=>'FaceGear_BalaclavaUnderLip'+s),directions=['North','NorthEast','East','SouthEast','South','SouthWest','West','NorthWest'],towels=directions.map(d=>'Towel_'+d);
const el=(slotType,itemAssetName)=>({slotType,itemAssetName}),outfit=(...elements)=>[{loadoutType:'PlayerOnField',loadoutElements:elements}];
function run(origin,category,asset,position='WR',elements=[]){
  const pools={_version:2,...Object.fromEntries(Object.entries(defs).map(([o,c])=>[o,Object.fromEntries(c.map(c=>[c.id,{chance:0,items:[]}]))]))};pools[origin][category]={chance:100,items:[asset]};
  const loadouts=outfit(...elements),state=createGeneratedEquipmentState(loadouts),changes=applyModdedRandomizerEquipment(loadouts,{position,branding:'nike'},mulberry32(22),1,state,{usingVanillaPool:true,usingUnlockedMod:origin==='unlocked',modPools:pools});return{loadouts,changes};
}

test('four under-lip colors are Unlocked catalog/pool options, deselected by default in both tools; normal mask defaults stay intact',()=>{
  const c=defs.unlocked.find(c=>c.id==='balaclavas');assert.equal(c.items.length,8);
  for(const asset of under){const item=equipmentItem(asset);assert.equal(item.origin,'unlocked');assert.equal(item.displayOnly,undefined);assert.equal(canGenerateItem(item),true);assert.equal(item.semantic.actualType,'balaclava');assert.ok(c.items.some(i=>i.itemName===asset));assert.match(item.displayName,/Balaclava \(Under Lip\)$/);}
  for(const pools of [normalizeModPools(),quickstartSettings({unlocked:true}).randomizer.modPools]){assert.equal(pools.unlocked.balaclavas.chance,5);assert.equal(pools.unlocked.balaclavas.items.length,4);assert.ok(pools.unlocked.balaclavas.items.every(a=>a.startsWith('FaceGear_BalaclavaOverNose')));assert.deepEqual(pools.vanilla.towels,{chance:1,items:towels});}
  assert.equal(canGenerateItem(equipmentItem('FaceGear_BalaclavaNone')),false);
  const old={_version:2,unlocked:{balaclavas:{chance:0,items:[]}},vanilla:{towels:{chance:37,items:[towels[0]]}}};const saved=normalizeModPools(old);assert.deepEqual(saved.unlocked.balaclavas,old.unlocked.balaclavas);assert.deepEqual(saved.vanilla.towels,old.vanilla.towels);assert.deepEqual(normalizeModPools(saved),saved);
  for(const [i,color]of ['black','white','primary','secondary'].entries())for(const asset of under)assert.equal(equipmentColorVariant(asset,color),under[i]);
});

test('under-lip generation retains current position, relaxed-tee and mouthpiece compatibility protections',()=>{
  for(const asset of under){assert.ok(run('unlocked','balaclavas',asset).changes.unlocked.some(c=>c.newItem===asset));for(const position of ['QB','LT','LG','C','RG','RT','DT','K','P'])assert.equal(run('unlocked','balaclavas',asset,position).changes.unlocked.length,0,position);}
  const item=equipmentItem(under[0]);
  assert.equal(canGenerateEquipment(outfit(el('MouthWear','GearMouthpiece_PacifierDual_White')),item,['FaceWear'],'WR',{usingUnlockedMod:true}),false);
  for(const tee of ['G_CompressionT_Crew_ShortSleeve_99Club_B_GOL','G_CompressionT_Crew_ShortSleeve_99Club_B_WHI','G_CompressionT_Crew_LongSleeve_99Club_B_GOL','G_CompressionT_Crew_LongSleeve_99Club_B_WHI'])assert.equal(canGenerateEquipment(outfit(el('InnerShirt',tee)),item,['FaceWear'],'WR',{usingUnlockedMod:true}),false);
  for(const result of [run('unlocked','balaclavas',under[0])])for(const l of result.loadouts)assert.deepEqual(enforceEquipmentCompatibility(structuredClone(l.loadoutElements),{usingUnlockedMod:true}),[]);
});

test('eight directional towels are named CFB 27 choices; no None or Unlocked String Towel leaks into their category',()=>{
  const c=defs.vanilla.find(c=>c.id==='towels');assert.deepEqual(c.items.map(i=>i.itemName),towels);assert.deepEqual(c.defaultItems,towels);assert.equal(c.defaultChance,1);
  for(const [i,asset]of towels.entries()){
    const item=equipmentItem(asset,{usingUnlockedMod:false});assert.equal(item.origin,'vanilla');assert.equal(item.displayName,'Towel - '+directions[i].replace(/East|West/g,m=>' '+m).trim());assert.deepEqual(item.slots,['Towel']);
    for(const position of ['WR','QB','LT','DT','K','P'])assert.ok(run('vanilla','towels',asset,position).changes.vanilla.some(c=>c.newItem===asset),position+' '+asset);
  }
  assert.deepEqual(normalizeModPools().unlocked.towels,{chance:1,items:['Towel2_South']});assert.equal(run('unlocked','towels','Towel2_South','DT').changes.unlocked.length,0);
});

test('Mapper exposes base towels without mods and under-lip only with Unlocked, with exact slots and usable removal',()=>{
  for(const mods of [{confirmed:true},{confirmed:true,unlocked:true},{confirmed:true,raw:true,gameday:true}]){
    const catalog=mapperCatalog(mods);
    for(const asset of towels){const item=catalog.items.find(i=>i.asset===asset);assert.ok(item,asset);assert.equal(item.slot,'Towel');assert.equal(item.origin,'vanilla');}
    for(const asset of under)assert.equal(catalog.items.some(i=>i.asset===asset),mods.unlocked===true);
    assert.ok(catalog.items.some(i=>i.asset==='Towel_None'));
  }
  const removal=removalCatalog();
  for(const asset of [...towels,...under]){assert.ok(removal.some(i=>i.value===asset));const parsed={loadouts:outfit(el(asset.startsWith('Towel_')?'Towel':'FaceWear',asset))};assert.equal(removeSelectedEquipment(parsed,[asset]).length,1);assert.deepEqual(parsed.loadouts[0].loadoutElements,[]);}
});
