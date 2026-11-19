import test from 'node:test';
import assert from 'node:assert/strict';
import {mapperCatalog} from '../src/main/tools/equipmentMapper/catalog.js';
import {buildMapperPreview} from '../src/main/tools/equipmentMapper/core.js';
import {createMapperReviewSource,applyMapperReviewChoices} from '../src/main/tools/equipmentMapper/conflictReview.js';
const library=mapperCatalog({confirmed:true,unlocked:true,raw:true,eljax:true});
const e=(slotType,itemAssetName)=>({slotType,itemAssetName,metadata:{preserve:true}});
const tee='G_CompressionT_Crew_ShortSleeve_99Club_B_GOL',sleeveless='Gear_Undershirt_CompressionTCrewSleeveless_White',rolled='Gear_JerseyStyle_RolledLowest_Untucked';
const copy=(slot,asset,extra={})=>({action:'copy',replacementId:library.items.find(i=>i.slot===slot&&i.asset===asset)?.id,scope:'all',...extra});
const make=(row,fieldIndexes,gear=[e('InnerShirt',tee),e('OuterShirt','Gear_JerseyStyle_SleeveTight')],team='Test')=>{
 const loadouts=Array.from({length:Math.max(...fieldIndexes)+1},(_,index)=>({loadoutType:'Base',unknown:index,loadoutElements:[{itemAssetName:'PreserveBase'+index}]}));
 for(const index of fieldIndexes)loadouts[index]={loadoutType:'PlayerOnField',unknown:index,loadoutElements:structuredClone(gear)};
 return {row,visualRow:row,team,player:'Player '+row,position:'WR',branding:'nike',rawData:JSON.stringify({unknown:{preserve:true},loadouts})};
};
const preview=players=>buildMapperPreview(players,library,[copy('OuterShirt',rolled)]);

test('identical visible fixes share one player-counted variant across outfit indices and repeated outfits',()=>{
 const players=[make(1,[0]),make(2,[1]),make(3,[2]),make(4,[0,2])],before=structuredClone(players),p=preview(players),source=createMapperReviewSource(p,library);
 assert.equal(source.groups.length,1);const group=source.groups[0];assert.equal(group.players.length,4);assert.equal(group.variants.length,1);
 const variant=group.variants[0];assert.equal(variant.count,4);assert.equal(variant.changes.length,1);assert.ok(!Object.hasOwn(variant.changes[0],'loadout'));
 assert.deepEqual(variant.changes[0],{slot:'InnerShirt',before:'Relaxed Tee White',after:'White Sleeveless Compression Undershirt'});
 assert.deepEqual(source.fixes.get(2).edits.map(e=>e.loadout),[1]);assert.deepEqual(source.fixes.get(4).edits.map(e=>e.loadout),[0,2]);
 const reviewed=applyMapperReviewChoices(source,{});assert.deepEqual(reviewed.summary,{fixed:4,skipped:0,anyway:0});
 for(const changed of reviewed.preview.changes){
  const original=JSON.parse(changed.rawData),actual=JSON.parse(changed.newRawData);assert.deepEqual(actual.unknown,original.unknown);
  for(const [index,outfit]of actual.loadouts.entries()){
   if(outfit.loadoutType!=='PlayerOnField'){assert.deepEqual(outfit,original.loadouts[index]);continue;}
   assert.equal(outfit.loadoutElements.find(e=>e.slotType==='InnerShirt').itemAssetName,sleeveless);
   assert.equal(outfit.loadoutElements.find(e=>e.slotType==='OuterShirt').itemAssetName,rolled);assert.equal(outfit.unknown,original.loadouts[index].unknown);
  }
 }
 assert.deepEqual(players,before);
});

test('visible fix order is irrelevant, but additional wrist and elbow adjustments stay separate',()=>{
 const full='GearArmSleeve_Full_sleeveLongUnderarmor_normal_White',gear=[e('InnerShirt',sleeveless),e('LeftArmWear',full)],extra=[e('LeftWristWear','GearWrist_wristTapedNormal_White'),e('LeftElbowWear','ElbowGear_elbowSweatbandFull_White')];
 const players=[make(1,[0],gear),make(2,[1],[...gear,...extra]),make(3,[2],[...gear,extra[1],extra[0]])];
 const p=buildMapperPreview(players,library,[copy('InnerShirt','G_CompressionT_Crew_LongSleeve_NikeHQ_B_GLD')]),source=createMapperReviewSource(p,library);
 assert.equal(source.groups.length,1);const variants=source.groups[0].variants;assert.equal(variants.length,2);assert.deepEqual(variants.map(v=>v.count).sort(),[1,2]);
 assert.deepEqual(variants.find(v=>v.count===1).changes.map(e=>e.slot),['LeftArmWear']);
 assert.deepEqual(variants.find(v=>v.count===2).changes.map(e=>e.slot),['LeftArmWear','LeftElbowWear','LeftWristWear']);
 assert.deepEqual(source.fixes.get(2).edits.map(e=>e.loadout),[1,1,1]);assert.deepEqual(source.fixes.get(3).edits.map(e=>e.loadout),[2,2,2]);
});

test('unavailable fixes never merge with available fixes and per-player choices remain independent',()=>{
 const quarter='GearArmSleeve_Quarter_sleeveLongUnderarmor_normal_White',players=[make(1,[0],[e('LeftArmWear',quarter)],'Fixable'),make(2,[1],[e('LeftArmWear',quarter)],'Locked')];
 const p=buildMapperPreview(players,library,[copy('InnerShirt','G_CompressionT_Crew_ShortSleeve_Basic_WHI'),copy('LeftArmWear',quarter,{teams:['Locked']})]),source=createMapperReviewSource(p,library);
 assert.equal(source.groups.length,1);assert.equal(source.groups[0].variants.length,2);assert.equal(source.groups[0].variants.filter(v=>v.available).length,1);
 assert.throws(()=>applyMapperReviewChoices(source,{}),/no verified fix/);
 const result=applyMapperReviewChoices(source,{players:{2:'skip'}});assert.deepEqual(result.summary,{fixed:1,skipped:1,anyway:0});assert.deepEqual(result.preview.changes.map(p=>p.row),[1]);
});

test('distinct conflict causes stay in separate groups even with equal visible fixes and all choices retain exact outcomes',()=>{
 const players=[make(1,[0]),make(2,[1]),make(3,[2])],p=preview(players);p.compatibilityWarnings[2].reason+=' Additional verified cause.';
 const before=structuredClone(p),source=createMapperReviewSource(p,library);assert.equal(source.groups.length,2);
 const first=source.groups.find(g=>g.players.length===2),second=source.groups.find(g=>g.players.length===1);assert.notEqual(first.id,second.id);assert.deepEqual(first.variants[0].changes,second.variants[0].changes);
 const result=applyMapperReviewChoices(source,{groups:{[first.id]:'skip'},players:{2:'anyway'}});
 assert.deepEqual(result.summary,{fixed:1,skipped:1,anyway:1});assert.deepEqual(result.preview.changes.map(p=>p.row),[2,3]);assert.deepEqual(result.preview.compatibilityWarnings.map(p=>p.row),[2]);
 assert.equal(JSON.parse(result.preview.changes[0].newRawData).loadouts[1].loadoutElements.find(e=>e.slotType==='InnerShirt').itemAssetName,tee);
 assert.equal(JSON.parse(result.preview.changes[1].newRawData).loadouts[2].loadoutElements.find(e=>e.slotType==='InnerShirt').itemAssetName,sleeveless);
 assert.deepEqual(p,before);
});
