import test from 'node:test';import assert from 'node:assert/strict';
import {ACCESSORY_COMPATIBLE_SLEEVES,COMPRESSION_TEE_BLOCKED_SLEEVES,COMPRESSION_TEES,LONG_SLEEVE_UNDERSHIRTS,SHORT_BLACK_TAPE_JAMO} from '../src/main/tools/equipment/core/armFit.js';
import {enforceEquipmentCompatibility,armAccessoryRestrictions} from '../src/main/tools/equipment/core/compatibility.js';
import {canGenerateEquipment} from '../src/main/tools/equipment/core/generatedCompatibility.js';
import {equipmentItem} from '../src/main/tools/equipment/catalog.js';
import {applyGlobalEquipmentFixes} from '../src/main/tools/equipment/core/globalFixes.js';
import {normalizeEquipmentOptions} from '../src/main/tools/equipment/runner.js';
import {quickstartSettings} from '../src/main/tools/equipmentQuickstart/runner.js';
import {applyUnlockedTattooPlan} from '../src/main/tools/equipment/core/tattoos.js';
const e=(slotType,itemAssetName)=>({slotType,itemAssetName,keep:'metadata'}),get=(items,slot)=>items.find(e=>e.slotType===slot)?.itemAssetName;
const quarter='GearArmSleeve_Quarter_sleeveLongUnderarmor_normal_White',full='GearArmSleeve_Full_sleeveLongUnderarmor_normal_White',wrist='GearWrist_wristTapedNormal_White',elbow='ElbowGear_elbowSweatbandFull_White';
const arms=(sleeve,shirt='Undershirt_None')=>[e('InnerShirt',shirt),...['Left','Right'].flatMap(side=>[e(side+'ArmWear',sleeve),e(side+'WristWear',wrist),e(side+'ElbowWear',elbow)]),e('LeftShoe','KeepShoe')];
test('every allowed sleeve/color preserves wrist and elbow gear, except the agreed black-tape elbow exception',()=>{
 assert.ok(ACCESSORY_COMPATIBLE_SLEEVES.size>=16);
 for(const sleeve of ACCESSORY_COMPATIBLE_SLEEVES){const items=arms(sleeve);enforceEquipmentCompatibility(items);for(const side of ['Left','Right']){assert.equal(get(items,side+'WristWear'),wrist);assert.equal(get(items,side+'ElbowWear'),sleeve===SHORT_BLACK_TAPE_JAMO?'ElbowGear_None':elbow);}assert.equal(get(items,'LeftShoe'),'KeepShoe');}
});
test('all other sleeves, including unknown future sleeves, block same-side wrist/elbow gear',()=>{
 for(const sleeve of [full,'GearArmSleeve_Baggy_White','GearArmSleeve_CompressionRolledUpShirt_White','FutureUnknownSleeve']){
  const items=arms(quarter);items.find(e=>e.slotType==='LeftArmWear').itemAssetName=sleeve;enforceEquipmentCompatibility(items);assert.equal(get(items,'LeftWristWear'),'GearWrist_None');assert.equal(get(items,'LeftElbowWear'),'ElbowGear_None');assert.equal(get(items,'RightWristWear'),wrist);assert.equal(get(items,'RightElbowWear'),elbow);
 }
});
test('all Longsleeve Undershirt colors remove both sleeves and all wrist/elbow gear, including exceptions',()=>{
 for(const shirt of LONG_SLEEVE_UNDERSHIRTS)for(const sleeve of [quarter,SHORT_BLACK_TAPE_JAMO,full,'FutureUnknownSleeve']){const items=arms(sleeve,shirt);enforceEquipmentCompatibility(items);for(const side of ['Left','Right']){assert.equal(get(items,side+'ArmWear'),'ArmSleeve_None');assert.equal(get(items,side+'WristWear'),'GearWrist_None');assert.equal(get(items,side+'ElbowWear'),'ElbowGear_None');}assert.equal(get(items,'InnerShirt'),shirt);assert.deepEqual(enforceEquipmentCompatibility(items),[]);}
});
test('Compression Tee colors block exactly the five named sleeve families, retaining the shirt and permitted arm tape',()=>{
 assert.equal(COMPRESSION_TEES.size,5);assert.ok(COMPRESSION_TEE_BLOCKED_SLEEVES.size>=20);
 for(const shirt of COMPRESSION_TEES)for(const sleeve of COMPRESSION_TEE_BLOCKED_SLEEVES){const items=arms(sleeve,shirt);enforceEquipmentCompatibility(items);assert.equal(get(items,'LeftArmWear'),'ArmSleeve_None');assert.equal(get(items,'RightArmWear'),'ArmSleeve_None');assert.equal(get(items,'InnerShirt'),shirt);assert.equal(get(items,'LeftWristWear'),wrist);assert.equal(get(items,'LeftElbowWear'),elbow);}
 for(const shirt of COMPRESSION_TEES){const items=arms('GearArmSleeve_Undershirt_armTape_normal_TeamColor',shirt);assert.deepEqual(enforceEquipmentCompatibility(items),[]);}
 assert.ok(!COMPRESSION_TEES.has('G_CompressionT_Crew_ShortSleeve_BasicJ_WHI'));assert.ok(!COMPRESSION_TEES.has('G_CompressionT_Crew_ShortSleeve_99Club_B_WHI'));
});
test('black short tape/RAW Jamo keeps the wrist free and blocks elbow gear in every mod context',()=>{
 for(const usingRawAccessoriesMod of [false,true]){assert.deepEqual(armAccessoryRestrictions(SHORT_BLACK_TAPE_JAMO,wrist,'Undershirt_None',{usingRawAccessoriesMod}),{wrist:false,elbow:true});const items=arms(SHORT_BLACK_TAPE_JAMO);enforceEquipmentCompatibility(items,{usingRawAccessoriesMod});assert.equal(get(items,'LeftWristWear'),wrist);assert.equal(get(items,'LeftElbowWear'),'ElbowGear_None');}
});
test('generation rejects new conflicts in either direction while respecting allowed sleeves',()=>{
 const outfits=sleeve=>[{loadoutType:'PlayerOnField',loadoutElements:arms(sleeve)}];
 assert.equal(canGenerateEquipment(outfits(full),equipmentItem(wrist),['LeftWristWear'],'WR'),false);
 assert.equal(canGenerateEquipment(outfits(quarter),equipmentItem(wrist),['LeftWristWear'],'WR'),true);
 assert.equal(canGenerateEquipment(outfits(quarter),equipmentItem(full),['LeftArmWear'],'WR'),false);
 assert.equal(canGenerateEquipment(outfits(SHORT_BLACK_TAPE_JAMO),equipmentItem(wrist),['LeftWristWear'],'WR',{usingRawAccessoriesMod:true}),true);
 assert.equal(canGenerateEquipment(outfits(SHORT_BLACK_TAPE_JAMO),equipmentItem(elbow),['LeftElbowWear'],'WR'),false);
});
const visual=base=>({isEmpty:false,RawData:JSON.stringify({keep:'root',loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[e('OuterPants','GearPants_AboveKnee'),e('OuterShirt','Gear_JerseyStyle_SleeveTight'),e('InnerShirt','Undershirt_None'),e('InnerPants',base),e('LeftShoe','KeepShoe')]}]})});
const player={FirstName:'Test',LastName:'Player',TeamIndex:1,Position:'WR',CharacterVisuals:(10).toString(2).padStart(15,'0')+'0'.repeat(17)};
test('leggings override defaults off, preserves existing leg layers when on and survives same-run compatibility checks',()=>{
 assert.equal(normalizeEquipmentOptions({},false).allowCutoffLegLayers,false);assert.equal(quickstartSettings({unlocked:true}).patcher.allowCutoffLegLayers,false);
 for(const base of ['GearLegsBase_LeftSleeve_White','GearLegsBase_RightSleeve_White','GearLegsBase_Tights_White'])for(const allow of [false,true]){
  const v=visual(base),before=JSON.parse(v.RawData),options=normalizeEquipmentOptions({cutoffPantsFix:true,allowCutoffLegLayers:allow,sleeveCompatibilityFix:true,protectOriginalEaPlayers:false,cutoffPantsCaps:{WR:100},fillFrequencies:{cutoffPants:true}},false);
  applyGlobalEquipmentFixes([player],[v],10,options);const after=JSON.parse(v.RawData).loadouts[0].loadoutElements;assert.equal(get(after,'InnerPants'),base);assert.equal(get(after,'OuterPants'),allow?'GearPants_Cutoff':'GearPants_AboveKnee');assert.equal(get(after,'LeftShoe'),'KeepShoe');if(allow)assert.deepEqual(enforceEquipmentCompatibility(after,{allowCutoffLegLayers:true}),[]);else assert.deepEqual(JSON.parse(v.RawData),before);
 }
});
test('leg override does not disable jersey/shirt fit rules and leg-tattoo additions can retain opted-in layers',()=>{
 const v=visual('GearLegsBase_LeftSleeve_White'),before=v.RawData;applyGlobalEquipmentFixes([player],[v],10,normalizeEquipmentOptions({cutoffPantsFix:true,allowCutoffLegLayers:true,adjustOutfitForCutoff:false,cutoffPantsCaps:{WR:100}},false));assert.equal(v.RawData,before);
 const parsed=JSON.parse(v.RawData);applyUnlockedTattooPlan(parsed,{arms:{},legs:{asset:'LegTattoo_Three',label:'Leg Tattoo Three'}},{preserveLegLayers:true});assert.equal(get(parsed.loadouts.find(l=>l.loadoutType==='PlayerOnField').loadoutElements,'InnerPants'),'GearLegsBase_LeftSleeve_White');
});
