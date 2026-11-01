import test from 'node:test';import assert from 'node:assert/strict';
import{buildAppearancePreview}from'../src/main/tools/rosterGenerator/core.js';
import{clearPlayerTattoos}from'../src/main/tools/equipment/core/tattoos.js';

const appearance={loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[]}]},asset='Generic_0951_P_T0047_M_7_4_item',tattoo='ArmTattoo_Tattoos_Japanese_03_ForearmHalfSleeve';
const make=(head,base={loadoutCategory:'Base'})=>({keep:{original:'metadata'},loadouts:[head,base,{loadoutType:'PlayerOnField',loadoutElements:[]}]});
const element=()=>({slotType:'PlusHead',itemAssetName:asset});

test('empty native Head layers and generic face overrides are replaced with the generated face instead of blocking or retaining the old head',()=>{
 for(const head of [{loadoutCategory:'Head',loadoutType:'Head'},{loadoutCategory:'Head',loadoutType:'Head',loadoutElements:[]},{loadoutCategory:'Head',loadoutType:'Head',loadoutElements:[element()]},{loadoutCategory:'Head',loadoutType:'Head',loadoutElements:[{...element(),itemInstanceTag:asset,blends:[{}],transforms:[{}]}]}]){
  const input=make(head),before=structuredClone(input),result=buildAppearancePreview(input,appearance,'nike'),parsed=JSON.parse(result.raw);
  assert.deepEqual(result.unknownLayers,[]);assert.deepEqual(result.unknownLayerDetails,[]);assert.ok(result.removedOverrides.includes('Head loadout'));assert.deepEqual(parsed.loadouts,[input.loadouts[1],...appearance.loadouts]);assert.deepEqual(parsed.keep,input.keep);assert.deepEqual(input,before);assert.deepEqual(buildAppearancePreview(parsed,appearance,'nike').unknownLayers,[]);
 }
});

test('known tattoo instance tags reset alongside their asset, including old tags left by Clear Tattoos',()=>{
 for(const slotType of ['LeftArmTattoo','RightArmTattoo'])for(const itemAssetName of [tattoo,'ArmTattoo_None']){
  const input=make({loadoutType:'Head',loadoutCategory:'Head'},{loadoutCategory:'Base',loadoutElements:[{slotType,itemAssetName,itemInstanceTag:tattoo}]}),before=structuredClone(input),result=buildAppearancePreview(input,appearance,'nike');
  assert.deepEqual(result.unknownLayers,[]);assert.deepEqual(JSON.parse(result.raw).loadouts[0].loadoutElements,[{slotType,itemAssetName:'ArmTattoo_None',itemInstanceTag:'ArmTattoo_None'}]);assert.deepEqual(input,before);
 }
 const input=make({loadoutType:'Head',loadoutCategory:'Head'},{loadoutCategory:'Base',loadoutElements:[{slotType:'LeftArmTattoo',itemAssetName:tattoo,itemInstanceTag:tattoo}]});assert.ok(clearPlayerTattoos(input));assert.deepEqual(buildAppearancePreview(input,appearance,'nike').unknownLayers,[],'Clearing first is no longer a dead end');
});

test('custom heads, other personal slots, nonempty transform/blend data, malformed fields and unknown tattoo metadata still block intact',()=>{
 for(const head of [
  {loadoutType:'Head',loadoutCategory:'Head',unknown:1},
  {loadoutType:'Head',loadoutCategory:'Head',loadoutElements:[{...element(),itemAssetName:'Unique_RealPlayer_item'}]},
  {loadoutType:'Head',loadoutCategory:'Head',loadoutElements:[{...element(),slotType:'Hair'}]},
  {loadoutType:'Head',loadoutCategory:'Head',loadoutElements:[{...element(),blends:[{value:.5}]}]},
  {loadoutType:'Head',loadoutCategory:'Head',loadoutElements:[{...element(),transforms:[{scale:1}]}]},
  {loadoutType:'Head',loadoutCategory:'Head',loadoutElements:[{...element(),itemInstanceTag:'CustomTag'}]},
  {loadoutType:'Head',loadoutCategory:'Head',loadoutElements:[{...element(),transforms:[null]}]},
  {loadoutType:'Head',loadoutCategory:'Head',loadoutElements:[{...element(),paletteMods:[]}]},
  {loadoutType:'Head',loadoutCategory:'Head',loadoutElements:[element(),element()]},
  {loadoutType:'Head',loadoutCategory:'Head',loadoutElements:null},
  {loadoutType:'Head',loadoutElements:[element()]}
 ]){
  const input=make(head),result=buildAppearancePreview(input,appearance,'nike');assert.equal(result.unknownLayers.length,1);assert.deepEqual(JSON.parse(result.raw).loadouts[0],head);assert.ok(!result.removedOverrides.includes('Head loadout'));
 }
 for(const item of [{slotType:'LeftArmTattoo',itemAssetName:tattoo,itemInstanceTag:'UnknownTag'},{slotType:'LeftArmTattoo',itemAssetName:tattoo,custom:1},{slotType:'LeftArmTattoo',itemAssetName:'CustomTattoo',itemInstanceTag:'CustomTattoo'}]){
  const base={loadoutCategory:'Base',loadoutElements:[item]},result=buildAppearancePreview(make({loadoutType:'Head',loadoutCategory:'Head'},base),appearance,'nike');assert.equal(result.unknownLayers.length,1);assert.deepEqual(JSON.parse(result.raw).loadouts[0],base);
 }
});

test('ordinary on-field/Base appearances retain byte-identical output when no edited-head or tagged-tattoo support is needed',()=>{
 const input={skinTone:4,bodyType:'Original',jerseyName:'Old',keep:7,loadouts:[{loadoutCategory:'Base',loadoutElements:[{slotType:'LeftArmTattoo',itemAssetName:'CujoMatty_ArmTats_35'}]},{loadoutType:'PlayerOnField',loadoutElements:[]}]},result=buildAppearancePreview(input,appearance,'nike');
 assert.equal(result.raw,JSON.stringify({keep:7,loadouts:[{loadoutCategory:'Base',loadoutElements:[{slotType:'LeftArmTattoo',itemAssetName:'ArmTattoo_None'}]},...appearance.loadouts]}));assert.deepEqual(result.removedOverrides,['skinTone','bodyType','jerseyName']);
});
