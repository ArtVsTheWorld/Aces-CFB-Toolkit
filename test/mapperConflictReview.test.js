import test from 'node:test';import assert from 'node:assert/strict';
import {mapperCatalog} from '../src/main/tools/equipmentMapper/catalog.js';
import {buildMapperPreview,mapperCompatibilityIssue} from '../src/main/tools/equipmentMapper/core.js';
import {createMapperReviewSource,applyMapperReviewChoices,normalizeMapperReviewChoices,proposeMapperFix} from '../src/main/tools/equipmentMapper/conflictReview.js';
import {facemaskFitsHelmet} from '../src/main/tools/equipment/core/helmets.js';
const lib=mapperCatalog({confirmed:true,unlocked:true,raw:true,eljax:true}),e=(slotType,itemAssetName)=>({slotType,itemAssetName}),id=(slot,asset)=>{const item=lib.items.find(i=>i.slot===slot&&i.asset===asset);assert.ok(item,slot+' '+asset);return item.id;};
const copy=(slot,asset)=>({action:'copy',replacementId:id(slot,asset),scope:'all'}),remove=(slot,asset,none)=>({action:'replace',sourceId:id(slot,asset),replacementId:id(slot,none),scope:'all',matchMode:'asset'});
const player=(row,elements,extra={})=>({row,visualRow:row,team:'Test',player:'Test '+row,position:'WR',branding:'nike',rawData:JSON.stringify({keep:{unknown:true},loadouts:[{loadoutType:'PlayerOnField',loadoutElements:elements}]}),...extra});
const shirt='G_CompressionT_Crew_ShortSleeve_Basic_WHI',sleeveless='Gear_Undershirt_CompressionTCrewSleeveless_White',quarter='GearArmSleeve_Quarter_sleeveLongUnderarmor_normal_White',longshirt='G_CompressionT_Crew_LongSleeve_NikeHQ_B_GLD';
const cutoff=()=>[e('OuterPants','GearPants_Cutoff'),e('OuterShirt','Gear_JerseyStyle_RolledLowest_Untucked'),e('InnerShirt',shirt),e('FacePaint','FaceMarks_EyeTapeLeft')];
const source=(players,rules)=>createMapperReviewSource(buildMapperPreview(players,lib,rules),lib),asset=(raw,slot)=>JSON.parse(raw).loadouts[0].loadoutElements.find(e=>e.slotType===slot)?.itemAssetName;
test('Review Fix is the backend default and removing an undershirt preserves the removal while changing cutoff pants',()=>{
 const input=[player(1,cutoff()),player(2,cutoff())],before=structuredClone(input),s=source(input,[remove('InnerShirt',shirt,'Undershirt_None')]);
 assert.equal(s.groups.length,1);assert.equal(s.groups[0].players.length,2);assert.equal(s.groups[0].variants.length,1);assert.equal(s.groups[0].variants[0].available,true);assert.equal(normalizeMapperReviewChoices(s).groups[s.groups[0].id],'fix');
 const result=applyMapperReviewChoices(s,{});assert.deepEqual(result.summary,{fixed:2,skipped:0,anyway:0});assert.equal(result.preview.compatibilityWarnings.length,0);
 for(const p of result.preview.changes){assert.equal(asset(p.newRawData,'InnerShirt'),'Undershirt_None');assert.equal(asset(p.newRawData,'OuterPants'),'GearPants_AboveKnee');assert.equal(p.edits.filter(e=>e.compatibilityFix).length,1);assert.equal(asset(p.newRawData,'FacePaint'),'FaceMarks_EyeTapeLeft');assert.deepEqual(JSON.parse(p.newRawData).keep,{unknown:true});}
 assert.deepEqual(input,before);assert.equal(asset(s.preview.changes[0].newRawData,'OuterPants'),'GearPants_Cutoff');
});
test('Skip is atomic per player, Apply Anyway retains the original mapping, and per-player choices override a group',()=>{
 const s=source([player(1,cutoff()),player(2,cutoff()),player(3,cutoff())],[remove('InnerShirt',shirt,'Undershirt_None')]),g=s.groups[0].id;
 const r=applyMapperReviewChoices(s,{groups:{[g]:'skip'},players:{2:'anyway',3:'fix'}});assert.deepEqual(r.summary,{fixed:1,skipped:1,anyway:1});assert.deepEqual(r.preview.changes.map(p=>p.row),[2,3]);assert.deepEqual(r.preview.compatibilityWarnings.map(p=>p.row),[2]);assert.equal(asset(r.preview.changes[0].newRawData,'OuterPants'),'GearPants_Cutoff');assert.equal(r.preview.impact.unchanged,1);assert.match(r.preview.impact.unchangedReasons.at(-1).reason,/conflict review/);
 const skip=applyMapperReviewChoices(s,{groups:{[g]:'skip'}});assert.equal(skip.preview.changes.length,0);assert.equal(skip.preview.compatibilityWarnings.length,0);
 const again=applyMapperReviewChoices(s,{});assert.equal(again.preview.changes.length,3);assert.ok(again.preview.changes.every(p=>p.edits.filter(e=>e.compatibilityFix).length===1),'Editing choices never stacks repairs');
});
test('arm and shirt fixes preserve whichever item was requested',()=>{
 for(const [elements,rule,keptSlot,keptAsset] of [
  [[e('InnerShirt',shirt)],copy('LeftArmWear',quarter),'LeftArmWear',quarter],
  [[e('LeftArmWear',quarter)],copy('InnerShirt',shirt),'InnerShirt',shirt],
  [[e('LeftArmWear',quarter),e('LeftWristWear','GearWrist_wristTapedNormal_White')],copy('InnerShirt',longshirt),'InnerShirt',longshirt],
  [[e('LeftArmWear','GearArmSleeve_Full_sleeveLongUnderarmor_normal_White')],copy('LeftWristWear','GearWrist_wristTapedNormal_White'),'LeftWristWear','GearWrist_wristTapedNormal_White']
 ]){const s=source([player(1,elements)],[rule]);assert.equal(s.groups.length,1);assert.equal(s.groups[0].variants[0].available,true,JSON.stringify(s.groups));const r=applyMapperReviewChoices(s,{});assert.equal(asset(r.preview.changes[0].newRawData,keptSlot),keptAsset);assert.equal(r.preview.compatibilityWarnings.length,0);}
});
test('contradictory requested items and explicit no-op assignments cannot be undone by a fix',()=>{
 for(const elements of [[],[e('LeftArmWear',quarter)]]){
  const s=source([player(1,elements)],[copy('InnerShirt',shirt),copy('LeftArmWear',quarter)]);assert.equal(s.groups[0].variants[0].available,false);assert.throws(()=>applyMapperReviewChoices(s,{}),/no verified fix/);assert.equal(applyMapperReviewChoices(s,{groups:{[s.groups[0].id]:'anyway'}}).preview.changes.length,1);
 }
});
test('mask/mouthpiece and relaxed tee/jersey repairs keep requested slots and preserve unrelated layers',()=>{
 const mask=lib.items.find(i=>i.asset==='GearNeckpad_VintageNeckRoll'),tee='G_CompressionT_Crew_ShortSleeve_99Club_B_GOL';
 for(const [elements,rules,slot,value]of [
  [[e('MouthWear','GearMouthpiece_PacifierDual_White')],[copy(mask.slot,mask.asset)],mask.slot,mask.asset],
  [[e(mask.slot,mask.asset)],[copy('MouthWear','GearMouthpiece_PacifierDual_White')],'MouthWear','GearMouthpiece_PacifierDual_White'],
  [[e('OuterShirt','Gear_JerseyStyle_RolledLowest_Untucked')],[copy('InnerShirt',tee)],'InnerShirt',tee]
 ]){const s=source([player(1,elements)],rules);assert.equal(s.groups[0].variants[0].available,true,JSON.stringify(s.groups));const r=applyMapperReviewChoices(s,{});assert.equal(asset(r.preview.changes[0].newRawData,slot),value);}
});
test('helmet/facemask fixes choose a verified pairing while keeping the requested facemask',()=>{
 const helmet='GearHelmet_Speed_Flex',mask=lib.items.find(i=>i.slot==='FaceMask'&&!facemaskFitsHelmet(i.asset,helmet)&&lib.items.some(h=>h.slot==='HeadWear'&&facemaskFitsHelmet(i.asset,h.asset)));assert.ok(mask);
 const s=source([player(1,[e('HeadWear',helmet)])],[copy('FaceMask',mask.asset)]);assert.equal(s.groups[0].variants[0].available,true);const r=applyMapperReviewChoices(s,{}),raw=r.preview.changes[0].newRawData;assert.equal(asset(raw,'FaceMask'),mask.asset);assert.ok(facemaskFitsHelmet(mask.asset,asset(raw,'HeadWear')));
});
test('a requested wrong-brand item has no fake fix and structural blocks are never review choices',()=>{
 const shoe=lib.items.find(i=>i.slot==='LeftShoe'&&/adidas/i.test(i.name));assert.ok(shoe);const s=source([player(1,[])],[copy(shoe.slot,shoe.asset)]);assert.equal(s.groups[0].variants[0].available,false);
 const blocked=buildMapperPreview([player(2,[],{shared:true})],lib,[copy('InnerShirt',sleeveless)]);assert.equal(blocked.blocked.length,1);assert.equal(createMapperReviewSource(blocked,lib).groups.length,0);
});
test('review choices reject unknown groups, unknown players, arbitrary actions and malformed data',()=>{
 const s=source([player(1,cutoff())],[remove('InnerShirt',shirt,'Undershirt_None')]);for(const value of [null,[],{groups:[]},{groups:{fake:'fix'}},{players:{999:'skip'}},{players:{1:'delete'}},{groups:{[s.groups[0].id]:'resolve'}}])assert.throws(()=>normalizeMapperReviewChoices(s,value),/review|choices/i);
});
test('fixing one outfit does not change other outfits, existing unrelated conflicts or player data',()=>{
 const p=player(1,cutoff()),raw=JSON.parse(p.rawData);raw.loadouts.push({loadoutType:'PlayerOnField',loadoutElements:[e('OuterShirt','Gear_JerseyStyle_RolledLowest'),e('InnerShirt',sleeveless),e('OuterPants','GearPants_Cutoff')]});p.rawData=JSON.stringify(raw);
 const s=source([p],[remove('InnerShirt',shirt,'Undershirt_None')]),r=applyMapperReviewChoices(s,{});assert.deepEqual(JSON.parse(r.preview.changes[0].newRawData).loadouts[1],raw.loadouts[1]);
});
test('clearing covered accessories is compatible and None items still cannot occupy a wrong slot',()=>{
 const p=player(1,[e('InnerShirt',longshirt),e('LeftWristWear','GearWrist_wristTapedNormal_White')]),v=buildMapperPreview([p],lib,[remove('LeftWristWear','GearWrist_wristTapedNormal_White','GearWrist_None')]);assert.equal(v.changes.length,1);assert.equal(v.compatibilityWarnings.length,0);
 assert.equal(mapperCompatibilityIssue([e('HeadWear','ArmSleeve_None')],['HeadWear'],p,[],{usingUnlockedMod:true}).blocking,true);
});
test('separate conflict groups retain independent defaults and choices',()=>{
 const p1=player(1,cutoff()),p2=player(2,[e('LeftArmWear',quarter)],{team:'Other'}),r=source([p1,p2],[{...remove('InnerShirt',shirt,'Undershirt_None'),teams:['Test']},{...copy('InnerShirt',longshirt),teams:['Other']}]);assert.equal(r.groups.length,2);
 const first=r.groups.find(g=>g.players.some(p=>p.row===1)),second=r.groups.find(g=>g.players.some(p=>p.row===2));assert.notEqual(first.id,second.id);
 const result=applyMapperReviewChoices(r,{groups:{[first.id]:'skip'}});assert.deepEqual(result.preview.changes.map(p=>p.row),[2]);assert.equal(result.decisions.groups[second.id],'fix');assert.equal(result.preview.compatibilityWarnings.length,0);
});
