import test from 'node:test';
import assert from 'node:assert/strict';
import editor from '../src/shared/mapperEditor.cjs';
import {mapperCatalog} from '../src/main/tools/equipmentMapper/catalog.js';
import {buildMapperPreview} from '../src/main/tools/equipmentMapper/core.js';
import {resolveMapperSlot} from '../src/main/tools/equipmentMapper/library.js';
const mods={confirmed:true,unlocked:true,raw:true,eljax:true},library=mapperCatalog(mods),items=editor.withCategories(library.items);
const cap='GuardianCap_GuardianXT2',sleeve='GuardianCap_GuardianXT2_Sleeve';
const player={row:1,visualRow:1,player:'Test',team:'A',teamIndex:1,position:'C',branding:'nike',rawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'HeadWear',itemAssetName:'GearHelmet_Speed_Flex'},{slotType:'GuardianCap',itemAssetName:cap}]}]})};
test('all actual caps share one category and only the verified GuardianCap slot',()=>{
 const groups=library.groups.filter(g=>g.asset.startsWith('GuardianCap_Guardian'));
 assert.equal(groups.length,4);
 for(const g of groups){assert.equal(g.category,'Guardian Caps');assert.deepEqual(g.slots,['GuardianCap']);assert.equal(g.variantIds.length,1);}
 assert.ok(library.groups.filter(g=>/Raw.*SkullCap/.test(g.asset)&&!g.asset.includes('LongDreadlocks')).every(g=>g.category==='Skullcaps'));
 assert.ok(library.groups.filter(g=>g.asset.startsWith('GuardianCap_RawLongDreadlocks')).every(g=>g.category==='Dreadlocks'));
 const all=items.find(i=>i.id==='category:Guardian%20Caps:GuardianCap');assert.equal(all.memberAssets.length,4);assert.ok(all.memberAssets.every(a=>a.startsWith('GuardianCap_Guardian')));
});
test('caps without explicit slots are recognized without overriding actual saved slots',()=>{
 assert.equal(resolveMapperSlot({itemAssetName:sleeve}),'GuardianCap');
 assert.equal(resolveMapperSlot({itemAssetName:sleeve,slotType:'Neckpad'}),'Neckpad');
 const input={...player,rawData:player.rawData.replace(',"slotType":"GuardianCap"','')};
 const rule={action:'replace',sourceId:'catalog:GuardianCap:'+cap,replacementId:'catalog:GuardianCap:'+sleeve,scope:'all'};
 assert.equal(buildMapperPreview([input],library,[rule]).changes.length,1);
});
test('every remaining item with multiple slots is a genuine left/right pair',()=>{
 for(const group of library.groups.filter(g=>g.slots.length>1)){
  assert.equal(group.slots.length,2,group.name);
  assert.deepEqual(group.slots.map(s=>s.replace(/^(Left|Right)/,'')).slice(0,1),group.slots.map(s=>s.replace(/^(Left|Right)/,'')).slice(1),group.name);
  assert.ok(group.slots.some(s=>s.startsWith('Left'))&&group.slots.some(s=>s.startsWith('Right')),group.name);
 }
});
test('saved incorrect Neckpad cap IDs still resolve and now write the verified cap slot',()=>{
 const source='catalog:Neckpad:GuardianCap_GuardianXT1',replacement='catalog:Neckpad:'+sleeve;
 const oldPlayer={...player,rawData:player.rawData.replace(cap,'GuardianCap_GuardianXT1')};
 const rule={action:'replace',sourceId:source,replacementId:replacement,matchMode:'asset',scope:'all',replacementCap:100};const saved=JSON.stringify(rule);
 assert.ok(items.find(i=>i.id===source).legacy);assert.equal(items.find(i=>i.id===replacement).slot,'GuardianCap');
 const result=buildMapperPreview([oldPlayer],library,[rule]);assert.equal(result.changes.length,1);assert.equal(result.blocked.length,0);
 const elements=JSON.parse(result.changes[0].newRawData).loadouts[0].loadoutElements;assert.ok(elements.some(e=>e.slotType==='GuardianCap'&&e.itemAssetName===sleeve));assert.ok(!elements.some(e=>e.slotType==='Neckpad'));assert.equal(JSON.stringify(rule),saved);
});
test('saved whole-category choices keep original membership after regrouping',()=>{
 const oldCaps=items.find(i=>i.id==='category:Guardian%20Cap%20%2F%20Neck%20Pad:GuardianCap');
 assert.ok(oldCaps.legacy);assert.deepEqual(new Set(oldCaps.memberAssets),new Set(['GuardianCap_GuardianXT_Sleeve',sleeve,'GuardianCap_GuardianXT1']));
 const oldMixed=items.find(i=>i.id==='category:Guardian%20Cap:GuardianCap');assert.ok(oldMixed.legacy);assert.equal(oldMixed.memberAssets.length,14);assert.ok(oldMixed.memberAssets.includes(cap));
 assert.ok(items.find(i=>i.id==='category:Guardian%20Cap%20%2F%20Neck%20Pad:Neckpad').legacy);
 const base=editor.withCategories(mapperCatalog({confirmed:true}).items);assert.ok(base.filter(i=>i.categorySelection).every(i=>i.memberIds.every(id=>base.some(m=>m.id===id&&m.origin==='vanilla'))));
});
