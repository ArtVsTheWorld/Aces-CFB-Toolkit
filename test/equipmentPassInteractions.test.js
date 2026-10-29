import test from 'node:test';import assert from 'node:assert/strict';
import {applyGlobalEquipmentFixes} from '../src/main/tools/equipment/core/globalFixes.js';
import {normalizeEquipmentOptions} from '../src/main/tools/equipment/runner.js';
import {captureRemovalItems,removeSelectedEquipment} from '../src/main/tools/equipment/core/removal.js';
import {applyUnlockedTattooPlan} from '../src/main/tools/equipment/core/tattoos.js';
import {cutoffPantsConflict} from '../src/main/tools/equipment/core/uniformCompatibility.js';
const shirt='Gear_Undershirt_CompressionTCrewSleeveless_White',leg='GearLegsBase_LeftSleeve_White';
const e=(slotType,itemAssetName)=>({slotType,itemAssetName,keep:'metadata'}),get=(raw,slot)=>raw.loadouts.find(l=>l.loadoutType==='PlayerOnField').loadoutElements.find(e=>e.slotType===slot)?.itemAssetName;
const outfit=(items=[])=>({root:'keep',loadouts:[{loadoutType:'PlayerOnField',loadoutCategory:'GearOnly',loadoutElements:[e('OuterPants','GearPants_AboveKnee'),e('OuterShirt','Gear_JerseyStyle_RolledLowest_Untucked'),e('InnerShirt',shirt),e('InnerSocks','Gear_Socks_Low'),...items]}]});
function run(raws,settings={}){
 const players=raws.map((_,row)=>({isEmpty:false,FirstName:'Order',LastName:String(row),Position:'WR',TeamIndex:1,CharacterBodyType:'Thin',SchoolYear:'Freshman',CharacterVisuals:(10).toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0')})),visuals=raws.map(raw=>({isEmpty:false,RawData:JSON.stringify(raw)}));
 const result=applyGlobalEquipmentFixes(players,visuals,10,{...normalizeEquipmentOptions({protectOriginalEaPlayers:false,sleeveCompatibilityFix:true,seed:123,...settings},false),...(settings.eligiblePlayer?{eligiblePlayer:settings.eligiblePlayer}:{})});return {result,raws:visuals.map(v=>JSON.parse(v.RawData))};
}
test('removal matches originally selected items after recolor as well as selected final colors, preserving unrelated items',()=>{
 const glove='GearHand_glove_AdidasAdizero11_white',black='GearHand_glove_AdidasAdizero11_black';
 for(const remove of [glove,black]){const raw=outfit([e('LeftHandWear',glove),e('RightHandWear',glove),e('LeftShoe','KeepShoes')]),{raws,result}=run([raw],{unlockedRecolorFix:true,unlockedColorTheme:'black',removeEquipment:true,removeEquipmentItems:[remove]});
  assert.equal(get(raws[0],'LeftHandWear'),undefined);assert.equal(get(raws[0],'RightHandWear'),undefined);assert.equal(get(raws[0],'LeftShoe'),'KeepShoes');assert.equal(result.removeEquipmentChanges.length,2);
 }
});
test('original removal identity survives tattoo Base insertion and does not accidentally remove another loadout slot',()=>{
 const raw=outfit([e('LeftWristWear','GearWrist_wristTapedNormal_White')]),originalItems=captureRemovalItems(raw,['GearWrist_wristTapedNormal_White']);
 applyUnlockedTattooPlan(raw,{arms:{left:{asset:'ArmTattoo_Three',label:'Test tattoo'}}});const wrist=raw.loadouts.find(l=>l.loadoutType==='PlayerOnField').loadoutElements.find(e=>e.slotType==='LeftWristWear');wrist.itemAssetName='GearWrist_wristTapedNormal_Black';
 const removals=removeSelectedEquipment(raw,['GearWrist_wristTapedNormal_White'],{originalItems});assert.equal(removals.length,1);assert.equal(removals[0].originalItem,'GearWrist_wristTapedNormal_White');assert.equal(get(raw,'LeftWristWear'),undefined);assert.equal(get(raw,'InnerShirt'),shirt);assert.ok(raw.loadouts.some(l=>l.loadoutCategory==='Base'));
});
const tattooOptions={unlockedTattooFix:true,unlockedTattooCap:100,tattooChances:{arm:0,leg:100,both:0},fillFrequencies:{tattoos:true,cutoffPants:true},cutoffPantsFix:true,cutoffPantsCaps:{WR:100}};
test('cutoff planning and execution use the same guaranteed leg-tattoo outcome; no clearing solely for pants',()=>{
 for(const allowCutoffLegLayers of [false,true]){
  const inputs=Array.from({length:6},()=>outfit([e('InnerPants',leg)])),{raws,result}=run(inputs,{...tattooOptions,allowCutoffLegLayers});
  assert.equal(result.unlockedTattooPlayersChanged,6);assert.equal(result.uniformPopulation[0].cutoffSelected,6);assert.equal(result.uniformPopulation[0].cutoffAfter,6);
  for(const raw of raws){assert.equal(get(raw,'OuterPants'),'GearPants_Cutoff');assert.equal(get(raw,'InnerPants'),allowCutoffLegLayers?leg:'BottomBase_None');assert.equal(get(raw,'InnerSocks'),'Gear_Socks_Low');assert.equal(cutoffPantsConflict(raw.loadouts.find(l=>l.loadoutType==='PlayerOnField').loadoutElements,{allowLegLayers:allowCutoffLegLayers}),null);}
 }
 const {raws}=run([outfit([e('InnerPants',leg)])],{cutoffPantsFix:true,cutoffPantsCaps:{WR:100}});assert.equal(get(raws[0],'InnerPants'),leg);assert.equal(get(raws[0],'OuterPants'),'GearPants_AboveKnee');
});
test('arm-only tattoos do not create leg eligibility and protected players stay unchanged',()=>{
 const raw=outfit([e('InnerPants',leg)]),{raws,result}=run([raw],{...tattooOptions,tattooChances:{arm:100,leg:0,both:0}});assert.equal(get(raws[0],'OuterPants'),'GearPants_AboveKnee');assert.equal(get(raws[0],'InnerPants'),leg);assert.equal(result.unlockedTattooPlayersChanged,1);
 const untouched=run([raw],{...tattooOptions,eligiblePlayer:()=>false});assert.deepEqual(untouched.raws,[raw]);
});
test('lowering an existing cutoff outfit selects the lowest untucked jersey and preserves pants without enabling cutoff pass',()=>{
 const raw=outfit();raw.loadouts[0].loadoutElements.find(e=>e.slotType==='OuterPants').itemAssetName='GearPants_Cutoff';raw.loadouts[0].loadoutElements.find(e=>e.slotType==='OuterShirt').itemAssetName='Gear_Low_TuckedUndershirt';
 const {raws,result}=run([raw],{lowerRolledJerseyFix:true,lowerJerseyCaps:{WR:100},fillFrequencies:{lowerJersey:true}});assert.equal(get(raws[0],'OuterPants'),'GearPants_Cutoff');assert.equal(get(raws[0],'OuterShirt'),'Gear_JerseyStyle_RolledLowest_Untucked');assert.equal(result.lowerJerseyChanges.length,1);assert.equal(result.sleeveCompatibilityPlayersChanged,0);
});
