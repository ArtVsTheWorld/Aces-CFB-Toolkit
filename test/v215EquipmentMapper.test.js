import test from 'node:test';import assert from 'node:assert/strict';
import {mapperLibrary,buildMapperPreview,normalizeMapperRules} from '../src/main/tools/equipmentMapper/core.js';
import {EQUIPMENT_ITEMS} from '../src/main/tools/equipment/catalog.js';
import {getTool} from '../src/shared/toolRegistry.js';import {getToolHandler} from '../src/main/tools/handlers.js';
const element=(slot,asset,extra={})=>({slotType:slot,itemAssetName:asset,...extra});
const player=(row,elements,extra={})=>({row,visualRow:row,team:'Test',player:`Player ${row}`,position:'WR',branding:'nike',rawData:JSON.stringify({skinTone:4,customRoot:{untouched:true},loadouts:[{loadoutType:'PlayerOnField',loadoutCategory:'GearOnly',loadoutElements:elements},{loadoutCategory:'Base',loadoutElements:[{itemAssetName:'Body_DO_NOT_CHANGE'}]}]}),...extra});
const none=element('LeftArmWear','ArmSleeve_None'),quarter=EQUIPMENT_ITEMS.find(item=>item.slots.includes('LeftArmWear')&&/Quarter_.*White$/.test(item.itemName));
assert.ok(quarter);
const sleeve=element('LeftArmWear',quarter.itemName,{blends:[{baseBlend:.3,barycentricBlend:.7}]}),sample=()=>[player(1,[none]),player(2,[sleeve])];
const rule=(library,from,to,extra={})=>({action:'replace',sourceId:library.items.find(item=>item.asset===from)?.id,replacementId:library.items.find(item=>item.asset===to)?.id,matchMode:'exact',preserveSide:true,...extra});

test('Mapper is an independent registered preview/apply tool',()=>{assert.equal(getTool('equipment-mapper').category,'appearance');assert.equal(typeof getToolHandler('equipment-mapper').run,'function');});
test('library deduplicates canonical complete configs, counts unique wearers and preserves variant metadata',()=>{
  const players=[...sample(),player(3,[sleeve]),player(4,[element('LeftArmWear',quarter.itemName,{blends:[{baseBlend:1}]})])],library=mapperLibrary(players);
  assert.equal(library.items.length,3);const found=library.items.find(item=>item.wearers.length===2);assert.deepEqual(found.wearers,[2,3]);assert.equal(found.usage,2);assert.deepEqual(found.element,sleeve);
  assert.equal(mapperLibrary([player(5,[{itemAssetName:quarter.itemName,blends:sleeve.blends,slotType:'LeftArmWear'}])]).items[0].id,found.id);
});
test('exact replace copies complete source metadata, retains root/Base data, touches only planned slots',()=>{
  const players=sample(),library=mapperLibrary(players),before=structuredClone(players),result=buildMapperPreview(players,library,[rule(library,'ArmSleeve_None',quarter.itemName)]);
  assert.equal(result.blocked.length,0);assert.equal(result.changes.length,1);const parsed=JSON.parse(result.changes[0].newRawData),old=JSON.parse(players[0].rawData);assert.deepEqual(parsed.loadouts[0].loadoutElements,[sleeve]);assert.deepEqual(parsed.customRoot,old.customRoot);assert.deepEqual(parsed.loadouts[1],old.loadouts[1]);assert.deepEqual(players,before);
});
test('item matching ignores blend differences while exact matching does not',()=>{
  const players=[...sample(),player(3,[element('LeftArmWear',quarter.itemName,{blends:[{baseBlend:1}]})])],library=mapperLibrary(players),source=library.items.find(item=>item.wearers.includes(2)),replacement=library.items.find(item=>item.asset==='ArmSleeve_None');
  assert.equal(buildMapperPreview(players,library,[{action:'replace',sourceId:source.id,replacementId:replacement.id,matchMode:'exact'}]).changes.length,1);
  assert.equal(buildMapperPreview(players,library,[{action:'replace',sourceId:source.id,replacementId:replacement.id,matchMode:'item'}]).changes.length,2);
});
test('target teams, positions and individual players compose; stale row identities are rejected',()=>{
  const players=[...sample(),player(3,[none],{team:'Other',position:'QB'})],library=mapperLibrary(players),mapping=rule(library,'ArmSleeve_None',quarter.itemName,{teams:['Test'],positions:['WR'],playerRows:[1],playerIdentities:[{row:1,player:'Player 1',team:'Test'}]});
  assert.deepEqual(buildMapperPreview(players,library,[mapping]).changes.map(player=>player.row),[1]);mapping.playerIdentities[0].player='Wrong';assert.throws(()=>buildMapperPreview(players,library,[mapping]),/identities/);
});
test('copy needs explicit targets; missing or cross-slot replacement fails safely',()=>{
  assert.throws(()=>normalizeMapperRules([{action:'copy',replacementId:'x'}]),/targets/);assert.throws(()=>buildMapperPreview(sample(),mapperLibrary(sample()),[{action:'copy',scope:'all',replacementId:'gone'}]),/no longer present/);
  const players=[...sample(),player(3,[element('InnerSocks','Gear_Socks_Low')])],library=mapperLibrary(players);assert.throws(()=>buildMapperPreview(players,library,[rule(library,'ArmSleeve_None','Gear_Socks_Low')]),/same exact equipment slot/);
});
test('shared character visuals are blocked without mutating either player',()=>{
  const players=sample();players[0].shared=true;const result=buildMapperPreview(players,mapperLibrary(players),[rule(mapperLibrary(players),'ArmSleeve_None',quarter.itemName)]);assert.equal(result.changes.length,0);assert.match(result.blocked[0].reason,/shares/);
});
test('incompatible brand-sensitive items are rejected instead of replacing unrelated gear',()=>{
  const nike=EQUIPMENT_ITEMS.find(item=>item.category==='Cleats'&&item.itemName==='GearFootwear_shoe_low_NikeVaporEdge'),adidas=EQUIPMENT_ITEMS.find(item=>item.category==='Cleats'&&/AdidasAdizero_LTA58$/.test(item.itemName)),players=[player(1,[element('LeftShoe',nike.itemName)]),player(2,[element('LeftShoe',adidas.itemName)],{branding:'adidas'})],library=mapperLibrary(players),result=buildMapperPreview(players,library,[rule(library,nike.itemName,adidas.itemName)]);assert.equal(result.changes.length,0);assert.match(result.blocked[0].reason,/brand/);
});
test('a newly introduced sleeve conflict blocks; unrelated pre-existing conflicts are not repaired',()=>{
  const full=EQUIPMENT_ITEMS.find(item=>item.slots.includes('LeftArmWear')&&/GearArmSleeve_NikeProDriFitSleeve_White$/.test(item.itemName)),wrist=element('LeftWristWear','GearWrist_wristBandCoach_White');assert.ok(full);
  const players=[player(1,[none,wrist]),player(2,[element('LeftArmWear',full.itemName)])],library=mapperLibrary(players),result=buildMapperPreview(players,library,[rule(library,'ArmSleeve_None',full.itemName)]);assert.equal(result.changes.length,0);assert.ok(result.blocked.length);
});
test('batch results are deterministic and rules can resolve each other before final compatibility checks',()=>{
  const players=sample(),library=mapperLibrary(players),rules=[rule(library,'ArmSleeve_None',quarter.itemName),rule(library,quarter.itemName,'ArmSleeve_None')];assert.deepEqual(buildMapperPreview(players,library,rules),buildMapperPreview(players,library,rules));assert.equal(buildMapperPreview(players,library,rules).changes.length,1);
});
test('copy mode targets an absent slot and preserves complete item metadata',()=>{
  const players=[player(1,[]),player(2,[sleeve])],library=mapperLibrary(players),result=buildMapperPreview(players,library,[{action:'copy',replacementId:library.items[0].id,scope:'selected',playerRows:[1],playerIdentities:[{row:1,team:'Test',player:'Player 1'}]}]);assert.equal(result.blocked.length,0);assert.deepEqual(JSON.parse(result.changes[0].newRawData).loadouts[0].loadoutElements,[sleeve]);
});
test('opposite-side replacements are rejected even when old Preserve Side is false',()=>{
  const players=[player(1,[element('RightArmWear','ArmSleeve_None')]),player(2,[sleeve])],library=mapperLibrary(players),before=structuredClone(players);assert.throws(()=>buildMapperPreview(players,library,[rule(library,'ArmSleeve_None',quarter.itemName,{preserveSide:false,sourceId:library.items.find(item=>item.asset==='ArmSleeve_None'&&item.slot==='RightArmWear').id})]),/Left and right/);assert.deepEqual(players,before);
});
test('color preservation only uses verified color variants actually present in the library',()=>{
  const black=quarter.itemName.replace(/White$/,'Black');assert.ok(EQUIPMENT_ITEMS.some(item=>item.itemName===black));
  const players=[player(1,[element('LeftArmWear','GearArmSleeve_NikeProDriFitSleeve_Black')]),player(2,[sleeve]),player(3,[element('LeftArmWear',black)])],library=mapperLibrary(players),result=buildMapperPreview(players,library,[rule(library,'GearArmSleeve_NikeProDriFitSleeve_Black',quarter.itemName,{preserveColor:true})]);assert.equal(result.blocked.length,0);assert.equal(JSON.parse(result.changes[0].newRawData).loadouts[0].loadoutElements[0].itemAssetName,black);
  const missing=mapperLibrary(players.slice(0,2)),blocked=buildMapperPreview(players.slice(0,2),missing,[rule(missing,'GearArmSleeve_NikeProDriFitSleeve_Black',quarter.itemName,{preserveColor:true})]);assert.match(blocked.blocked[0].reason,/color variant/);
});
test('Item Only spans verified color variants; Exact Configuration does not',()=>{
  const black=quarter.itemName.replace(/White$/,'Black'),players=[...sample(),player(3,[element('RightArmWear',black)])],library=mapperLibrary(players),mapping=rule(library,quarter.itemName,'ArmSleeve_None',{matchMode:'item'});
  assert.equal(buildMapperPreview(players,library,[mapping]).changes.length,1);assert.equal(buildMapperPreview(players,library,[{...mapping,matchMode:'exact'}]).changes.length,1);assert.equal(players[2].rawData,player(3,[element('RightArmWear',black)]).rawData);
});
test('malformed JSON or loadouts are diagnosed in the library rather than crashing the browser',()=>{
  const bad=[{...sample()[0],rawData:'{'},{...sample()[1],rawData:JSON.stringify({loadouts:{}})}];const library=mapperLibrary(bad);assert.equal(library.issues.length,2);assert.equal(library.items.length,0);
});
