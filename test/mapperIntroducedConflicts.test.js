import test from 'node:test';
import assert from 'node:assert/strict';
import {mapperCatalog} from '../src/main/tools/equipmentMapper/catalog.js';
import {buildMapperPreview,mapperCompatibilityIssue} from '../src/main/tools/equipmentMapper/core.js';
import {createMapperReviewSource,applyMapperReviewChoices} from '../src/main/tools/equipmentMapper/conflictReview.js';

const library=mapperCatalog({confirmed:true,unlocked:true,raw:true,eljax:true});
const e=(slotType,itemAssetName)=>({slotType,itemAssetName,keep:{metadata:true}});
const full='GearArmSleeve_Full_sleeveLongUnderarmor_normal_White',quarter='GearArmSleeve_Quarter_sleeveLongUnderarmor_normal_White';
const wrist='GearWrist_wristTapedNormal_White',elbow='ElbowGear_elbowSweatbandFull_White';
const tee='G_CompressionT_Crew_ShortSleeve_99Club_B_GOL',sleeveless='Gear_Undershirt_CompressionTCrewSleeveless_White';
const jersey='Gear_JerseyStyle_RolledLowest_Untucked';
const p=elements=>({row:1,visualRow:1,team:'Test',player:'Test Player',position:'WR',branding:'nike',rawData:JSON.stringify({keep:{unknown:'preserve'},loadouts:[{loadoutType:'PlayerOnField',loadoutElements:elements},{loadoutType:'Base',loadoutElements:[{itemAssetName:'Unknown_Head'}]}]})});
const copy=(slot,asset)=>({action:'copy',replacementId:library.items.find(i=>i.slot===slot&&i.asset===asset)?.id,scope:'all'});
const elements=raw=>JSON.parse(raw).loadouts[0].loadoutElements;
const asset=(raw,slot)=>elements(raw).find(e=>e.slotType===slot)?.itemAssetName;
const review=(player,rules)=>createMapperReviewSource(buildMapperPreview([player],library,rules),library);

test('jersey Review Fix changes only the relaxed tee and keeps pre-existing sleeve/wrist/elbow conflicts',()=>{
 const input=p([e('OuterShirt','Gear_JerseyStyle_SleeveTight'),e('InnerShirt',tee),...['Left','Right'].flatMap(side=>[e(side+'ArmWear',full),e(side+'WristWear',wrist),e(side+'ElbowWear',elbow)])]);
 const before=structuredClone(input),source=review(input,[copy('OuterShirt',jersey)]);
 assert.equal(source.groups.length,1);assert.match(source.groups[0].reason,/Relaxed tees.*jersey/);
 assert.ok(source.fixes.get(1).available);
 const fixed=applyMapperReviewChoices(source,{}).preview.changes[0];
 assert.deepEqual(fixed.edits.filter(e=>e.compatibilityFix).map(e=>e.slot),['InnerShirt']);
 assert.equal(asset(fixed.newRawData,'OuterShirt'),jersey);assert.equal(asset(fixed.newRawData,'InnerShirt'),sleeveless);
 assert.deepEqual(elements(fixed.newRawData).filter(e=>!['InnerShirt','OuterShirt'].includes(e.slotType)),elements(input.rawData).filter(e=>!['InnerShirt','OuterShirt'].includes(e.slotType)));
 assert.deepEqual(JSON.parse(fixed.newRawData).loadouts[1],JSON.parse(input.rawData).loadouts[1]);
 assert.deepEqual(JSON.parse(fixed.newRawData).keep,{unknown:'preserve'});assert.deepEqual(input,before);
});

test('a harmless undershirt change does not flag existing arm conflicts just because the repair slot is checked',()=>{
 const input=p([e('InnerShirt',tee),e('LeftArmWear',full),e('LeftWristWear',wrist)]);
 const preview=buildMapperPreview([input],library,[copy('InnerShirt',sleeveless)]);
 assert.equal(preview.changes.length,1);assert.equal(preview.compatibilityWarnings.length,0);
 assert.equal(asset(preview.changes[0].newRawData,'LeftWristWear'),wrist);
});

test('an existing left-arm conflict cannot mask a new right-arm conflict with the same explanation',()=>{
 const input=p([e('InnerShirt',sleeveless),e('LeftArmWear',full),e('LeftWristWear',wrist),e('RightArmWear',quarter),e('RightWristWear',wrist)]);
 const source=review(input,[copy('RightArmWear',full)]);
 assert.equal(source.groups.length,1);assert.ok(source.fixes.get(1).available);
 const fixed=applyMapperReviewChoices(source,{}).preview.changes[0];
 assert.equal(asset(fixed.newRawData,'RightArmWear'),full);assert.match(asset(fixed.newRawData,'RightWristWear'),/None$/);
 assert.equal(asset(fixed.newRawData,'LeftWristWear'),wrist);assert.equal(asset(fixed.newRawData,'LeftArmWear'),full);
 assert.deepEqual(fixed.edits.filter(e=>e.compatibilityFix).map(e=>e.slot),['RightWristWear']);
});

test('changing a conflict participant to another incompatible item still warns and cannot undo requested items',()=>{
 const input=p([e('LeftArmWear',full),e('LeftWristWear',wrist)]),black=full.replace('White','Black');
 const source=review(input,[copy('LeftArmWear',black),copy('LeftWristWear',wrist)]);
 assert.equal(source.groups.length,1);assert.equal(source.fixes.get(1).available,false);
 assert.throws(()=>applyMapperReviewChoices(source,{}),/no verified fix/);
 assert.equal(asset(applyMapperReviewChoices(source,{players:{1:'anyway'}}).preview.changes[0].newRawData,'LeftWristWear'),wrist);
});

test('new longsleeve conflicts are detected even when a sleeve already covered the wrist',()=>{
 const before=[e('InnerShirt',sleeveless),e('LeftArmWear',full),e('LeftWristWear',wrist)];
 const after=structuredClone(before);after[0].itemAssetName='G_CompressionT_Crew_LongSleeve_NikeHQ_B_GLD';
 assert.match(mapperCompatibilityIssue(after,['InnerShirt'],p(before),before,{usingUnlockedMod:true}),/Longsleeve undershirts.*arm sleeves/);
 const source=review(p(before),[copy('InnerShirt',after[0].itemAssetName)]);
 assert.ok(source.fixes.get(1).available);
 const fixed=applyMapperReviewChoices(source,{}).preview.changes[0];
 assert.equal(asset(fixed.newRawData,'InnerShirt'),after[0].itemAssetName);
 assert.match(asset(fixed.newRawData,'LeftArmWear'),/None$/);assert.match(asset(fixed.newRawData,'LeftWristWear'),/None$/);
});

test('cutoff and helmet checks preserve unrelated pre-existing conflicts while still detecting newly affected pairs',()=>{
 const input=p([e('OuterPants','GearPants_Cutoff'),e('OuterShirt',jersey),e('InnerShirt',sleeveless),e('InnerPants','LegSleeve_Left'),e('HeadWear','GearHelmet_Speed_Flex')]);
 const harmless=buildMapperPreview([input],library,[copy('InnerShirt','Gear_Undershirt_CompressionTCrewSleeveless_Black')]);
 assert.equal(harmless.changes.length,1);assert.equal(harmless.compatibilityWarnings.length,0);
 const conflicting=buildMapperPreview([input],library,[copy('OuterShirt','Gear_JerseyStyle_RolledLowest')]);
 assert.match(conflicting.compatibilityWarnings[0].reason,/compatible untucked jersey/);
});
