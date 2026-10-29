import test from 'node:test';
import assert from 'node:assert/strict';
import {applyGlobalEquipmentFixes} from '../src/main/tools/equipment/core/globalFixes.js';
import {normalizeEquipmentOptions} from '../src/main/tools/equipment/runner.js';
import {enforceEquipmentCompatibility} from '../src/main/tools/equipment/core/compatibility.js';
import {recolorQuickstartAccent} from '../src/main/tools/equipmentQuickstart/colorAccents.js';
import {SHORT_BLACK_TAPE_JAMO} from '../src/main/tools/equipment/core/armFit.js';
import {RAW_314} from '../src/main/tools/equipment/catalog.js';
const item=(slotType,itemAssetName)=>({slotType,itemAssetName,keep:'metadata'});
const player={FirstName:'Order',LastName:'Test',TeamIndex:1,Position:'WR',BodyType:'Standard',CharacterVisuals:(10).toString(2).padStart(15,'0')+'0'.repeat(17)};
const get=(items,slot)=>items.find(e=>e.slotType===slot)?.itemAssetName;
function run(elements,options){
 const v={isEmpty:false,RawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:elements}]})};
 const result=applyGlobalEquipmentFixes([player],[v],10,normalizeEquipmentOptions({protectOriginalEaPlayers:false,sleeveCompatibilityFix:true,...options},false));
 return {elements:JSON.parse(v.RawData).loadouts[0].loadoutElements,result};
}
test('compatibility runs after recoloring changes a tape asset to a differently constrained RAW stock alias',()=>{
 const {elements,result}=run([item('LeftArmWear','GearArmSleeve_Quarter_armTape_normal_OffWhite'),item('LeftWristWear','GearWrist_wristTapedNormal_White'),item('LeftElbowWear','ElbowGear_elbowSweatbandFull_White')],{unlockedRecolorFix:true,unlockedColorTheme:'black'});
 assert.equal(get(elements,'LeftArmWear'),'GearArmSleeve_RawJamo_TeamColor');
 assert.equal(get(elements,'LeftWristWear'),'GearWrist_None');
 assert.equal(get(elements,'LeftElbowWear'),'ElbowGear_None');assert.equal(result.sleeveCompatibilityPlayersChanged,1);
 assert.deepEqual(enforceEquipmentCompatibility(elements),[]);
});
test('removing a conflicting undershirt preserves sleeves and accessories it no longer conflicts with',()=>{
 const shirt='G_CompressionT_Crew_LongSleeve_NikeHQ_B_GLD',sleeve='GearArmSleeve_Quarter_sleeveLongUnderarmor_normal_White';
 const {elements}=run([item('InnerShirt',shirt),item('LeftArmWear',sleeve),item('LeftWristWear','GearWrist_wristTapedNormal_White'),item('LeftElbowWear','ElbowGear_elbowSweatbandFull_White')],{removeEquipment:true,removeEquipmentItems:[shirt]});
 assert.equal(get(elements,'LeftArmWear'),sleeve);assert.equal(get(elements,'LeftWristWear'),'GearWrist_wristTapedNormal_White');assert.equal(get(elements,'LeftElbowWear'),'ElbowGear_elbowSweatbandFull_White');
 assert.deepEqual(enforceEquipmentCompatibility(elements),[]);
});
test('removal wins over cutoff outfit fitting; missing required shirt safely restores above-knee pants',()=>{
 const shirt='Gear_Undershirt_CompressionTCrewSleeveless_White';
 const {elements}=run([item('OuterPants','GearPants_AboveKnee'),item('OuterShirt','Gear_JerseyStyle_RolledLowest_Untucked'),item('InnerShirt',shirt)],{cutoffPantsFix:true,cutoffPantsCaps:{WR:100},removeEquipment:true,removeEquipmentItems:[shirt]});
 assert.equal(get(elements,'OuterPants'),'GearPants_AboveKnee');assert.ok(!elements.some(e=>e.itemAssetName===shirt));assert.deepEqual(enforceEquipmentCompatibility(elements),[]);
});
test('late Quickstart accents cannot introduce RAW color-dependent sleeve conflicts or remove wrist gear',()=>{
 const loadouts=[{loadoutType:'PlayerOnField',loadoutElements:[item('LeftArmWear',SHORT_BLACK_TAPE_JAMO),item('LeftWristWear','GearWrist_wristTapedNormal_White')]}],before=structuredClone(loadouts);
 assert.equal(recolorQuickstartAccent(loadouts,()=>.99,{usingRawAccessoriesMod:true}),null);assert.deepEqual(loadouts,before);
});
