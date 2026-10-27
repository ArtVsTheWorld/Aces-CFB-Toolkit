import test from 'node:test';import assert from 'node:assert/strict';
import {mapperLibrary,resolveMapperSlot} from '../src/main/tools/equipmentMapper/library.js';
import {buildMapperPreview} from '../src/main/tools/equipmentMapper/core.js';
const gear=(slot,asset,extra={})=>({slotType:slot,itemAssetName:asset,...extra});
const person=(row,elements,extra={})=>({row,visualRow:row,player:`Player ${row}`,team:'Test',position:'WR',branding:'nike',rawData:JSON.stringify({skinTone:4,untouched:{flag:true},loadouts:[{loadoutType:'PlayerOnField',loadoutElements:elements},{loadoutCategory:'Base',loadoutElements:[{itemAssetName:'Body_DO_NOT_CHANGE'}]}]}),...extra});
test('one asset has one visible group across metadata, sides, and both-side wearers',()=>{
  const players=[person(1,[gear('LeftArmWear','Custom_Sleeve_Black'),gear('RightArmWear','Custom_Sleeve_Black')]),person(2,[gear('LeftArmWear','Custom_Sleeve_Black',{blends:[{baseBlend:.9}]})])],library=mapperLibrary(players);
  const groups=library.groups.filter(group=>group.asset==='Custom_Sleeve_Black'),items=library.items.filter(item=>item.asset==='Custom_Sleeve_Black');assert.equal(groups.length,1);assert.equal(groups[0].usage,3);assert.deepEqual(groups[0].wearers,[1,2]);assert.deepEqual(new Set(groups[0].slots),new Set(['LeftArmWear','RightArmWear']));assert.equal(items.length,3);assert.ok(library.items.some(item=>item.slot==='RightArmWear'&&item.asset==='ArmSleeve_None'));
});
test('backplate blend settings and handwarmer positions do not create repeated visible items',()=>{
  const players=[person(1,[gear('BackPlate','Backplate_Standard'),gear('WaistWear','Handwarmer_Standard'),gear('WaistWearOverride','HandwarmerStyle_Front')]),person(2,[gear('BackPlate','Backplate_Standard',{blends:[{baseBlend:.8}]}),gear('WaistWear','Handwarmer_Standard'),gear('WaistWearOverride','HandwarmerStyle_Back')])],library=mapperLibrary(players);
  for(const asset of ['Backplate_Standard','Handwarmer_Standard']){const group=library.groups.filter(group=>group.asset===asset);assert.equal(group.length,1);assert.equal(group[0].variantIds.length,2);assert.equal(group[0].wearers.length,2);}
});

test('verified catalog aliases share one visible item while retaining their original saved IDs',()=>{
  const players=[person(1,[gear('LeftShoe','GearFootwear_shoe_low_AirJordanRetro1')]),person(2,[gear('RightShoe','shoe_low_AirJordanRetro1')])],library=mapperLibrary(players);
  assert.equal(library.groups.length,1);assert.equal(library.groups[0].name,'Air Jordan Retro Low');assert.equal(library.groups[0].assets.length,2);assert.deepEqual(new Set(library.items.map(item=>item.element.itemAssetName)),new Set(['GearFootwear_shoe_low_AirJordanRetro1','shoe_low_AirJordanRetro1']));
});
test('uncataloged explicit gear and unresolved implicit gear are visible without guessing slots',()=>{
  const library=mapperLibrary([person(1,[gear('LeftWristWear','Community_Bracelet'),{itemAssetName:'Mystery_Unmapped_Item'}])]);
  assert.equal(library.groups.length,2);assert.equal(library.items.find(item=>item.asset==='Community_Bracelet').copyable,true);const unknown=library.items.find(item=>item.asset==='Mystery_Unmapped_Item');assert.equal(unknown.known,false);assert.equal(unknown.slot,'Unresolved');assert.equal(unknown.copyable,false);
});
test('implicit slots resolve only from a single verified slot, never ambiguous left/right catalog slots',()=>{
  assert.equal(resolveMapperSlot({itemAssetName:'GearFaceMask_Speedflex2Bar'}),'FaceMask');
  assert.equal(resolveMapperSlot({itemAssetName:'ArmSleeve_None'}),null);
  assert.equal(resolveMapperSlot({itemAssetName:'Custom_Band'},{Custom_Band:['LeftWristWear']}),'LeftWristWear');
  assert.equal(resolveMapperSlot({itemAssetName:'Custom_Band'},{Custom_Band:['LeftWristWear','RightWristWear']}),null);
});
test('implicit facemasks can be replaced without touching unrelated implicit fields or Base layers',()=>{
  const players=[person(1,[gear('HeadWear','GearHelmet_Speed_Flex'),{itemAssetName:'GearFaceMask_Speedflex2Bar'},{itemAssetName:'Unresolved_Custom_Keep'}]),person(2,[gear('HeadWear','GearHelmet_Speed_Flex'),gear('FaceMask','GearFaceMask_Speedflex2Bar_WR')])],library=mapperLibrary(players),source=library.items.find(item=>item.asset==='GearFaceMask_Speedflex2Bar'),replacement=library.items.find(item=>item.asset==='GearFaceMask_Speedflex2Bar_WR');
  const result=buildMapperPreview(players,library,[{action:'replace',sourceId:source.id,replacementId:replacement.id,matchMode:'asset'}]);assert.equal(result.blocked.length,0,JSON.stringify(result.blocked));const raw=JSON.parse(result.changes[0].newRawData);assert.equal(raw.loadouts[0].loadoutElements.filter(item=>item.itemAssetName===replacement.asset).length,1);assert.deepEqual(raw.loadouts[1],JSON.parse(players[0].rawData).loadouts[1]);assert.deepEqual(raw.loadouts[0].loadoutElements.find(item=>item.itemAssetName==='Unresolved_Custom_Keep'),{itemAssetName:'Unresolved_Custom_Keep'});
});

test('unresolved bilateral gear stays untouched when editing a verified slot',()=>{
  const asset='GearWrist_wristTapedMax_WhiteCross',players=[person(1,[{itemAssetName:asset},gear('InnerSocks','Gear_Socks_Low')]),person(2,[gear('InnerSocks','Gear_Socks_Mid')])],library=mapperLibrary(players),source=library.items.find(item=>item.asset==='Gear_Socks_Low'),replacement=library.items.find(item=>item.asset==='Gear_Socks_Mid');assert.equal(library.items.find(item=>item.asset===asset).slot,'Unresolved');
  const result=buildMapperPreview(players,library,[{action:'replace',sourceId:source.id,replacementId:replacement.id,matchMode:'asset'}]);assert.equal(result.blocked.length,0);assert.equal(result.changes.length,1);assert.deepEqual(JSON.parse(result.changes[0].newRawData).loadouts[0].loadoutElements.find(item=>item.itemAssetName===asset),{itemAssetName:asset});
});
test('inactive player gear is cataloged while coach wardrobe is excluded',()=>{
  const rawData=JSON.stringify({loadouts:[{loadoutType:'CoachOnField',loadoutElements:[gear('OuterShirt','Coach_Custom_Shirt')]}]}),library=mapperLibrary([person(1,[gear('OuterShirt','Player_Shirt')]),{row:'visual:20',player:'Saved Row',team:'Other',rawData},person(3,[gear('Visor','Retired_Custom_Visor')],{active:false})]);
  assert.ok(library.groups.some(group=>group.asset==='Retired_Custom_Visor'));assert.equal(library.items.some(item=>item.asset==='Coach_Custom_Shirt'),false);
});
test('same-slot item matching changes all blend variants but never the opposite side',()=>{
  const players=[person(1,[gear('LeftArmWear','ArmSleeve_None'),gear('RightArmWear','ArmSleeve_None')]),person(2,[gear('LeftArmWear','ArmSleeve_None',{blends:[{baseBlend:.5}]})]),person(3,[gear('LeftArmWear','Custom_Replacement')])],library=mapperLibrary(players),source=library.items.find(item=>item.asset==='ArmSleeve_None'&&item.slot==='LeftArmWear'),replacement=library.items.find(item=>item.asset==='Custom_Replacement'),result=buildMapperPreview(players,library,[{action:'replace',matchMode:'asset',sourceId:source.id,replacementId:replacement.id}]);
  assert.equal(result.changes.length,2);const first=JSON.parse(result.changes[0].newRawData).loadouts[0].loadoutElements;assert.equal(first.find(item=>item.slotType==='RightArmWear').itemAssetName,'ArmSleeve_None');assert.equal(first.find(item=>item.slotType==='LeftArmWear').itemAssetName,replacement.asset);
});
