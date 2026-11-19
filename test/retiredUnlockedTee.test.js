import test from 'node:test';
import assert from 'node:assert/strict';
import editor from '../src/shared/mapperEditor.cjs';
import {EQUIPMENT_ITEMS,RETIRED_EQUIPMENT_ITEMS,equipmentDisplayName} from '../src/main/tools/equipment/catalog.js';
import {mapperCatalog} from '../src/main/tools/equipmentMapper/catalog.js';
import {mapperLibrary,buildMapperPreview,normalizeMapperRules,mapperCompatibilityIssue} from '../src/main/tools/equipmentMapper/core.js';
import {modPoolDefinitions,normalizeModPools} from '../src/main/tools/equipment/core/modPools.js';
import {removalCatalog,normalizeRemovalItems} from '../src/main/tools/equipment/core/removal.js';
import {COMPRESSION_TEES} from '../src/main/tools/equipment/core/armFit.js';
import {simplifyQuickstartSleeves} from '../src/main/tools/equipmentQuickstart/sleeveStyling.js';
import {patchFreshmanEquipment} from '../src/main/tools/equipment/core/patcher.js';
import {auditRemovalCatalog} from '../scripts/audit-equipment-removal.mjs';
const invalid='G_CompressionT_Crew_ShortSleeve_BasicJ_JER',vanilla='G_CompressionT_Crew_ShortSleeve_Basic_WHI',jamo='G_CompressionT_Crew_ShortSleeve_BasicJ_WHI';
const id=asset=>'catalog:InnerShirt:'+asset,e=(slotType,itemAssetName)=>({slotType,itemAssetName,keep:'metadata'});
const library=mapperCatalog({confirmed:true,unlocked:true,raw:true,eljax:true});

test('only the invalid JER asset is retired across all selectable catalogs and category members',()=>{
 assert.ok(RETIRED_EQUIPMENT_ITEMS.has(invalid));assert.ok(!EQUIPMENT_ITEMS.some(i=>i.itemName===invalid));assert.ok(!removalCatalog().some(i=>i.value===invalid));
 for(const mods of [{confirmed:true},{confirmed:true,unlocked:true},{confirmed:true,unlocked:true,raw:true,eljax:true}]){
  const catalog=mapperCatalog(mods);assert.ok(!catalog.items.some(i=>i.asset===invalid));assert.ok(catalog.items.some(i=>i.id===id(vanilla)&&i.name==='White Compression Tee'));
  if(mods.unlocked)assert.ok(catalog.items.some(i=>i.id===id(jamo)&&i.name==='Irish Jamo Sleeves White'));
  for(const category of editor.withCategories(catalog.items).filter(i=>i.categorySelection))assert.ok(!category.memberAssets.includes(invalid));
 }
 for(const categories of Object.values(modPoolDefinitions()))for(const category of categories){assert.ok(!category.items.some(i=>i.itemName===invalid));assert.ok(!category.defaultItems.includes(invalid));}
 assert.ok(modPoolDefinitions().unlocked.flatMap(c=>c.items).some(i=>i.itemName===jamo));
 assert.equal(equipmentDisplayName(vanilla),'White Compression Tee');assert.equal(equipmentDisplayName(jamo),'Irish Jamo Sleeves White');assert.match(equipmentDisplayName(invalid),/Removed: Unlocked White Compression Tee/);
});

test('old saved Mapper IDs explain retirement in every active role and never substitute a supported tee or Jamo item',()=>{
 const normal={action:'replace',sourceId:id(vanilla),replacementId:id(jamo),scope:'all',frequency:60,fillToFrequency:false};
 for(const role of ['sourceId','replacementId','wearingItemId','sourcePairId','replacementPairId']){
  const rule={...normal,[role]:id(invalid),...(/PairId$/.test(role)?{pairSides:true}:{} )},before=structuredClone(rule);
  assert.match(editor.retiredRuleMessage(rule),/old Unlocked White Compression Tee.*not a valid selectable item/);
  assert.throws(()=>normalizeMapperRules([rule]),/Mapping 1:.*White Compression Tee.*Irish Jamo Sleeves White/);assert.deepEqual(rule,before);
 }
 const inactive={...normal,action:'copy',sourceId:id(invalid),sourcePairId:id(invalid),pairSides:false};
 assert.equal(editor.retiredRuleMessage(inactive),'');assert.doesNotThrow(()=>normalizeMapperRules([inactive]));
 assert.deepEqual(normalizeMapperRules([normal])[0].sourceId,id(vanilla));assert.deepEqual(normalizeMapperRules([normal])[0].replacementId,id(jamo));
});

test('observed legacy gear remains readable but cannot be copied from an old save-based library',()=>{
 const player={row:1,visualRow:1,team:'Test',player:'Legacy',position:'WR',rawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[e('InnerShirt',invalid)]}]})};
 const observed=mapperLibrary([player]),item=observed.items.find(i=>i.asset===invalid);assert.ok(item);assert.equal(item.copyable,false);assert.match(item.readOnlyReason,/not a valid selectable item/);
 assert.throws(()=>buildMapperPreview([player],library,[{action:'copy',replacementId:id(invalid),scope:'all'}]),/old Unlocked White Compression Tee/);
 const issue=mapperCompatibilityIssue([e('InnerShirt',invalid)],['InnerShirt'],player,[]);assert.equal(issue.blocking,true);assert.match(issue.reason,/not a valid selectable item/);
});

test('saved pool and removal selections fail clearly instead of silently assigning a different item',()=>{
 const config={_version:2,unlocked:{undershirts:{chance:33,items:[jamo,invalid]}}},before=structuredClone(config);
 assert.throws(()=>normalizeModPools(config),/old Unlocked White Compression Tee.*Irish Jamo Sleeves White/);assert.deepEqual(config,before);
 assert.throws(()=>normalizeRemovalItems([invalid]),/old Unlocked White Compression Tee/);
 const audit=auditRemovalCatalog();assert.deepEqual(audit.missing,[]);assert.equal(audit.rows.find(r=>r.id===invalid).reason,'Retired broken/unverified item');
});

test('invalid JER is not treated as a compression tee or converted by Quickstart; actual Jamo remains distinct',()=>{
 assert.ok(COMPRESSION_TEES.has(vanilla));assert.ok(!COMPRESSION_TEES.has(invalid));assert.ok(!COMPRESSION_TEES.has(jamo));
 for(const asset of [invalid,jamo]){
  const outfits=[{loadoutType:'PlayerOnField',loadoutElements:[e('InnerShirt',asset),e('LeftArmWear','GearArmSleeve_Half_sleeveLongUnderarmor_normal_White'),e('RightArmWear','GearArmSleeve_Half_sleeveLongUnderarmor_normal_White')]}],before=structuredClone(outfits);
  assert.deepEqual(simplifyQuickstartSleeves(outfits),[]);assert.deepEqual(outfits,before);
 }
});

test('single and mixed donor copying retain the recipient shirt instead of introducing the invalid donor item',()=>{
 const ref=row=>(10).toString(2).padStart(15,'0')+row.toString(2).padStart(17,'0');
 for(const mixedChance of [0,1]){
  const players=[0,1].map(row=>({FirstName:'Test',LastName:String(row),Position:'WR',SchoolYear:row?'Senior':'Freshman',RedshirtStatus:'Eligible',OverallRating:90-row,CharacterVisuals:ref(row),TeamIndex:1,IsNIL:false}));
  const raw=asset=>JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[e('InnerShirt',asset),e('OuterShirt','Gear_JerseyStyle_SleeveTight')]},{loadoutType:'Base',loadoutElements:[{itemAssetName:'PreserveBody'}]}]});
  const visuals=[{RawData:raw(vanilla)},{RawData:raw(invalid)}],before=structuredClone(visuals);
  const result=patchFreshmanEquipment(players,visuals,10,{seed:2,donorRows:[1],top:1,eligiblePlayer:p=>p.SchoolYear==='Freshman',protectOriginalEaPlayers:false,mixedChance,crossMixedChance:0,noDripProfile:false,usingVanillaPool:false});
  const changed=result.changes.find(p=>p.target.row===0);assert.ok(changed);const field=JSON.parse(changed.newRawData).loadouts[0];assert.equal(field.loadoutElements.find(e=>e.slotType==='InnerShirt').itemAssetName,vanilla);assert.ok(!field.loadoutElements.some(e=>e.itemAssetName===invalid));assert.deepEqual(visuals,before);
 }
});
