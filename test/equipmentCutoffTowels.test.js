import test from 'node:test';import assert from 'node:assert/strict';
import {equipmentItemsFor,equipmentItem} from '../src/main/tools/equipment/catalog.js';
import {enforceEquipmentCompatibility} from '../src/main/tools/equipment/core/compatibility.js';
import {cutoffPantsConflict,CUTOFF_PANTS} from '../src/main/tools/equipment/core/uniformCompatibility.js';
import {canGenerateEquipment,createGeneratedEquipmentState} from '../src/main/tools/equipment/core/generatedCompatibility.js';
import {applyGlobalEquipmentFixes} from '../src/main/tools/equipment/core/globalFixes.js';
import {normalizeEquipmentOptions} from '../src/main/tools/equipment/runner.js';
import {applyModdedRandomizerEquipment,mulberry32} from '../src/main/tools/equipment/core/patcher.js';
import {modPoolDefinitions} from '../src/main/tools/equipment/core/modPools.js';
import {mapperCatalog} from '../src/main/tools/equipmentMapper/catalog.js';
import {buildMapperPreview} from '../src/main/tools/equipmentMapper/core.js';
import {createMapperReviewSource,applyMapperReviewChoices} from '../src/main/tools/equipmentMapper/conflictReview.js';
const e=(slotType,itemAssetName)=>({slotType,itemAssetName,keep:'original metadata'});
const elements=(pants=CUTOFF_PANTS,towel='Towel_South')=>[e('OuterPants',pants),e('OuterShirt','Gear_JerseyStyle_RolledLowest_Untucked'),e('InnerShirt','Gear_Undershirt_CompressionTCrewSleeveless_White'),e('Towel',towel),e('LeftShoe','KeepCleats')];
const activeTowels=equipmentItemsFor('Towel').filter(item=>item.itemName!=='Towel_None');
const at=(items,slot)=>items.find(e=>e.slotType===slot)?.itemAssetName;
test('all base, Unlocked, RAW and unknown towels are removed in favor of valid cutoff pants',()=>{
 for(const towel of [...activeTowels.map(i=>i.itemName),'Future_Mod_Towel']){
  const items=elements(CUTOFF_PANTS,towel),before=structuredClone(items),corrections=enforceEquipmentCompatibility(items);
  assert.equal(at(items,'OuterPants'),CUTOFF_PANTS);assert.equal(at(items,'Towel'),'Towel_None');
  assert.equal(corrections.filter(c=>c.kind==='cutoff-towel').length,1);assert.match(corrections[0].reason,/Towels.*cutoff pants/);
  assert.deepEqual(items.filter(e=>e.slotType!=='Towel'),before.filter(e=>e.slotType!=='Towel'));
  assert.equal(items.find(e=>e.slotType==='Towel').keep,'original metadata');assert.equal(cutoffPantsConflict(items),null);
  assert.deepEqual(enforceEquipmentCompatibility(items),[]);
 }
});
test('normal pants keep towels; pre-existing leg and jersey restrictions still apply',()=>{
 for(const pants of ['GearPants_AboveKnee','GearPants_Standard']){const items=elements(pants),before=structuredClone(items);assert.deepEqual(enforceEquipmentCompatibility(items),[]);assert.deepEqual(items,before);}
 const incompatible=elements();incompatible.push(e('InnerPants','GearLegsBase_LeftSleeve_White'));
 enforceEquipmentCompatibility(incompatible);assert.equal(at(incompatible,'OuterPants'),'GearPants_AboveKnee');assert.equal(at(incompatible,'Towel'),'Towel_South');
 const allowed=elements();allowed.push(e('InnerPants','GearLegsBase_LeftSleeve_White'));enforceEquipmentCompatibility(allowed,{allowCutoffLegLayers:true});assert.equal(at(allowed,'OuterPants'),CUTOFF_PANTS);assert.equal(at(allowed,'Towel'),'Towel_None');
});
function patch(pants,towel,extra={}){
 const raw={unknown:'keep',loadouts:[{loadoutType:'Head',loadoutElements:[e('Towel','KeepHeadLayer')]},...[0,1].map(()=>({loadoutType:'PlayerOnField',loadoutElements:elements(pants,towel)}))]};
 const visuals=[{isEmpty:false,RawData:JSON.stringify(raw)}],players=[{isEmpty:false,FirstName:'Test',LastName:'Player',Position:'WR',SchoolYear:'Freshman',TeamIndex:1,CharacterVisuals:(10).toString(2).padStart(15,'0')+'0'.repeat(17)}];
 const options=normalizeEquipmentOptions({protectOriginalEaPlayers:false,cutoffPantsFix:true,cutoffPantsCaps:{WR:100},fillFrequencies:{cutoffPants:true},sleeveCompatibilityFix:false,...extra},false);
 const result=applyGlobalEquipmentFixes(players,visuals,10,{...options,...(extra.eligiblePlayer?{eligiblePlayer:extra.eligiblePlayer}:{})});return {before:raw,after:JSON.parse(visuals[0].RawData),result};
}
test('cutoff conversion is not blocked by a towel and clears every field outfit even with compatibility pass off',()=>{
 for(const towel of activeTowels){const p=patch('GearPants_AboveKnee',towel.itemName);assert.equal(p.result.uniformPopulation[0].cutoffSelected,1);
  for(const outfit of p.after.loadouts.filter(l=>l.loadoutType==='PlayerOnField')){assert.equal(at(outfit.loadoutElements,'OuterPants'),CUTOFF_PANTS);assert.ok(!at(outfit.loadoutElements,'Towel')||at(outfit.loadoutElements,'Towel')==='Towel_None');}
  assert.equal(p.after.unknown,'keep');assert.deepEqual(p.after.loadouts[0],p.before.loadouts[0]);
  assert.ok(p.result.cutoffPantsChanges.some(c=>c.slot==='Towel'));
 }
});
test('existing cutoff outfits are cleaned while excluded players and failed conversions keep their towels',()=>{
 const existing=patch(CUTOFF_PANTS,'Towel2_South');assert.ok(existing.result.cutoffPantsChanges.some(c=>c.slot==='Towel'));
 const skipped=patch('GearPants_AboveKnee','Towel_South',{eligiblePlayer:()=>false});assert.deepEqual(skipped.after,skipped.before);
 // Zero frequency leaves the valid original outfit alone; no towel is removed
 // until cutoff pants are actually selected for this player.
 const zero=patch('GearPants_AboveKnee','Towel_South',{cutoffPantsCaps:{WR:0}});assert.equal(at(zero.after.loadouts[1].loadoutElements,'Towel'),'Towel_South');
 const standard=patch('GearPants_Standard','Towel_South');assert.equal(at(standard.after.loadouts[1].loadoutElements,'Towel'),'Towel_South');
});
test('all towel pools reject re-additions after cutoff pants, while normal pants still allow towels',()=>{
 const defs=modPoolDefinitions();
 for(const [origin,asset]of [['vanilla','Towel_South'],['unlocked','Towel2_South'],['raw','Towel_RAW_Black_South_V217']]){
  const pools={_version:2,...Object.fromEntries(Object.entries(defs).map(([o,cats])=>[o,Object.fromEntries(cats.map(c=>[c.id,{chance:0,items:[]}]))]))};pools[origin].towels={chance:100,items:[asset]};
  for(const pants of [CUTOFF_PANTS,'GearPants_AboveKnee']){
   const loadouts=[{loadoutType:'PlayerOnField',loadoutElements:elements(pants,'Towel_None')}],state=createGeneratedEquipmentState(loadouts);
   assert.equal(canGenerateEquipment(loadouts,equipmentItem(asset),['Towel'],'WR'),pants!==CUTOFF_PANTS);
   applyModdedRandomizerEquipment(loadouts,{position:'WR',branding:'nike'},mulberry32(22),1,state,{usingVanillaPool:true,usingUnlockedMod:origin==='unlocked',usingRawAccessoriesMod:origin==='raw',modPools:pools});
   assert.equal(at(loadouts[0].loadoutElements,'Towel'),pants===CUTOFF_PANTS?'Towel_None':asset);
  }
 }
});
test('Mapper Review Fix removes the towel and retains requested cutoff pants; towel requests remain visible conflicts',()=>{
 const lib=mapperCatalog({confirmed:true,unlocked:true,raw:true}),id=(slot,asset)=>lib.items.find(i=>i.slot===slot&&i.asset===asset).id;
 const player=pants=>({row:1,visualRow:1,team:'Team',player:'Test Player',position:'WR',classYear:'Junior',branding:'nike',rawData:JSON.stringify({keep:true,loadouts:[{loadoutType:'PlayerOnField',loadoutElements:elements(pants)}]})});
 const preview=buildMapperPreview([player('GearPants_AboveKnee')],lib,[{action:'copy',replacementId:id('OuterPants',CUTOFF_PANTS),scope:'all'}]);
 assert.match(preview.compatibilityWarnings[0].reason,/Towels.*cutoff pants/);
 const source=createMapperReviewSource(preview,lib),fixed=applyMapperReviewChoices(source,{}).preview;
 assert.equal(fixed.compatibilityWarnings.length,0);const items=JSON.parse(fixed.changes[0].newRawData).loadouts[0].loadoutElements;
 assert.equal(at(items,'OuterPants'),CUTOFF_PANTS);assert.equal(at(items,'Towel'),'Towel_None');assert.equal(at(items,'LeftShoe'),'KeepCleats');
 const clean=player(CUTOFF_PANTS);clean.rawData=clean.rawData.replace('Towel_South','Towel_None');
 const adding=buildMapperPreview([clean],lib,[{action:'copy',replacementId:id('Towel','Towel_South'),scope:'all'}]);
 assert.match(adding.compatibilityWarnings[0].reason,/Towels.*cutoff pants/);
 const review=createMapperReviewSource(adding,lib);assert.equal(review.groups[0].variants[0].available,false,'Never change pants to keep a requested conflicting towel');
});
