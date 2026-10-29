import test from 'node:test';
import assert from 'node:assert/strict';
import {mapperCatalog} from '../src/main/tools/equipmentMapper/catalog.js';
import {buildMapperPreview} from '../src/main/tools/equipmentMapper/core.js';
import {enforceEquipmentCompatibility,RELAXED_TEE_REPLACEMENTS,relaxedTeeNeckwearConflict} from '../src/main/tools/equipment/core/compatibility.js';
import {generatedItemConflict} from '../src/main/tools/equipment/core/generatedCompatibility.js';
import {EQUIPMENT_ITEMS,equipmentItem} from '../src/main/tools/equipment/catalog.js';

const catalog=mapperCatalog({confirmed:true,unlocked:true,raw:true,eljax:true}),find=(asset,slot)=>{const item=catalog.items.find(i=>i.asset===asset&&(!slot||i.slot===slot));assert.ok(item,asset);return item;};
const white='G_CompressionT_Crew_ShortSleeve_99Club_B_GOL',black='G_CompressionT_Crew_ShortSleeve_99Club_B_WHI',normal='Gear_Undershirt_CompressionTCrewSleeveless_White',turtle='NeckWear_Turtleneck_Tight_White';
const e=(slotType,itemAssetName)=>({slotType,itemAssetName}),outfit=(shirt,neck=turtle)=>({loadoutType:'PlayerOnField',loadoutElements:[e('InnerShirt',shirt),e('NeckWear',neck)]});
const player=(row,loadouts,team='Test')=>({row,visualRow:row,team,teamIndex:team==='Test'?1:2,player:'Test '+row,position:'WR',branding:'nike',rawData:JSON.stringify({keep:{unchanged:true},loadouts})});
const rule=extra=>({action:'replace',sourceId:find(turtle).id,replacementId:find('NeckWear_None').id,wearingItemId:find(white).id,matchMode:'asset',scope:'all',frequency:100,fillToFrequency:true,...extra});
const neck=loadout=>loadout.loadoutElements.find(i=>i.slotType==='NeckWear').itemAssetName;

test('Wearing Item changes only the original matching outfit and retains unrelated players and colors',()=>{
  const input=[player(1,[outfit(white),outfit(normal)]),player(2,[outfit(black)]),player(3,[outfit(normal)]),player(4,[outfit(white,'NeckWear_None')])],before=structuredClone(input);
  const preview=buildMapperPreview(input,catalog,[rule()]);assert.equal(preview.blocked.length,0);assert.equal(preview.changes.length,1);
  const raw=JSON.parse(preview.changes[0].newRawData);assert.equal(neck(raw.loadouts[0]),'NeckWear_None');assert.deepEqual(raw.loadouts[1],JSON.parse(input[0].rawData).loadouts[1]);assert.equal(raw.loadouts[0].loadoutElements.find(i=>i.slotType==='InnerShirt').itemAssetName,white);assert.deepEqual(raw.keep,{unchanged:true});assert.deepEqual(input,before);
  const allColors=buildMapperPreview(input,catalog,[rule({wearingMatchMode:'item'})]);assert.equal(allColors.changes.length,2);assert.deepEqual(allColors.changes.map(p=>p.row),[1,2]);
});

test('Wearing Item participates in per-team frequency limits, scopes and original-equipment matching',()=>{
  const input=Array.from({length:12},(_,row)=>player(row,[outfit(row<4?white:normal)]));
  const preview=buildMapperPreview(input,catalog,[rule({frequency:50})]);assert.equal(preview.changes.length,2);assert.equal(preview.allocations[0].matchedPlayers,4);assert.equal(preview.allocations[0].limit,2);
  assert.equal(buildMapperPreview([...input,player(12,[outfit(white)],'Other')],catalog,[rule({teams:['Test'],positions:['WR']})]).changes.length,4);
  const addTee={action:'copy',replacementId:find(white).id,scope:'all',frequency:100,fillToFrequency:true};
  const staged=buildMapperPreview([player(1,[outfit(normal,'NeckWear_None')])],catalog,[addTee,rule()]);assert.equal(staged.statistics[1].matched,0);
  assert.equal(buildMapperPreview(input,catalog,[rule({scope:'selected'})]).changes.length,4);
  assert.throws(()=>buildMapperPreview(input,catalog,[rule({wearingItemId:'missing'})]),/Wearing Item/);
  assert.throws(()=>buildMapperPreview(input,catalog,[rule({wearingMatchMode:'bad'})]),/Wearing Item/);
  assert.throws(()=>buildMapperPreview(input,mapperCatalog({confirmed:true}),[rule()]),/Wearing Item|catalog/);
});

test('Wearing Item filters also cover shared tattoo layers and implicit None slots',()=>{
  const tattoo=catalog.items.find(i=>i.slot==='LeftArmTattoo'&&i.origin==='unlocked'),raw=[outfit(normal),{loadoutCategory:'Base',loadoutElements:[e('LeftArmTattoo',tattoo.asset)]}];
  assert.equal(buildMapperPreview([player(1,raw)],catalog,[rule({wearingItemId:tattoo.id})]).changes.length,1);
  const add={action:'copy',replacementId:find(normal).id,wearingItemId:find('Undershirt_None').id,scope:'all',frequency:100,fillToFrequency:true};
  assert.equal(buildMapperPreview([player(2,[{loadoutType:'PlayerOnField',loadoutElements:[]}])],catalog,[add]).changes.length,1);
});

test('Relaxed Tee variants retain their shirt while clearing turtlenecks and masks in the proper slot',()=>{
  const neckItems=catalog.items.filter(i=>['NeckWear','Neckpad','FaceWear'].includes(i.slot)&&relaxedTeeNeckwearConflict(white,i.asset));assert.ok(neckItems.length>=25);
  for(const shirt of Object.keys(RELAXED_TEE_REPLACEMENTS))for(const neckItem of neckItems){
    const elements=[{...e('InnerShirt',shirt),keep:'shirt'}, {...e(neckItem.slot,neckItem.asset),keep:'neck'},e('MouthWear','GearMouthpiece_None')],changes=enforceEquipmentCompatibility(elements);
    assert.equal(elements[0].itemAssetName,shirt);assert.equal(elements[0].keep,'shirt');assert.equal(elements[1].keep,'neck');assert.ok(/None$/.test(elements[1].itemAssetName));assert.ok(changes.some(c=>c.kind==='relaxed-tee-neckwear'));assert.deepEqual(enforceEquipmentCompatibility(elements),[]);
  }
  const unrelated=[e('InnerShirt',normal),e('NeckWear',turtle)];assert.deepEqual(enforceEquipmentCompatibility(unrelated),[]);assert.equal(unrelated[1].itemAssetName,turtle);
  const rolls=[e('Neckpad','GearNeckpad_VintageSingleNeckRoll')];assert.deepEqual(enforceEquipmentCompatibility(rolls),[]);
});

test('generated pools reject the Relaxed Tee/neckwear conflict in either assignment order and Mapper blocks new conflicts',()=>{
  const neckItem=equipmentItem(turtle),tee={...neckItem,itemName:white,slots:['InnerShirt']};assert.ok(neckItem);
  assert.match(generatedItemConflict([e('InnerShirt',white)],neckItem,['NeckWear'],'WR'),/Relaxed tees/);
  assert.match(generatedItemConflict([e('NeckWear',turtle)],tee,['InnerShirt'],'WR'),/Relaxed tees/);
  const glove=EQUIPMENT_ITEMS.find(i=>i.slots.includes('LeftHandWear')&&i.semantic?.poolEligible&&!/None$/.test(i.itemName));assert.ok(glove);
  assert.doesNotMatch(generatedItemConflict([e('InnerShirt',white),e('NeckWear',turtle)],glove,['LeftHandWear'],'WR')??'',/Relaxed tees/);
  const added=buildMapperPreview([player(1,[outfit(white,'NeckWear_None')])],catalog,[{action:'copy',replacementId:find(turtle).id,scope:'all',frequency:100,fillToFrequency:true}]);assert.equal(added.changes.length,1);assert.equal(added.blocked.length,0);assert.equal(added.compatibilityWarnings.length,1);
});
