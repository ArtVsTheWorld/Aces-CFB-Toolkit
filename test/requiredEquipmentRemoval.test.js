import test from 'node:test';
import assert from 'node:assert/strict';
import editor from '../src/shared/mapperEditor.cjs';
import {mapperCatalog} from '../src/main/tools/equipmentMapper/catalog.js';
import {buildMapperPreview,mapperCompatibilityIssue} from '../src/main/tools/equipmentMapper/core.js';
import {removalCatalog,normalizeRemovalItems,removeSelectedEquipment} from '../src/main/tools/equipment/core/removal.js';
const library=mapperCatalog({confirmed:true,unlocked:true,raw:true,eljax:true}),items=editor.withCategories(library.items),removable=removalCatalog().map(i=>i.value);
const find=slot=>library.items.find(i=>i.slot===slot&&!editor.empty(i)),player=(slot,asset)=>({row:0,visualRow:0,team:'Test',teamIndex:1,player:'Test Player',position:'WR',branding:'nike',rawData:JSON.stringify({keep:1,loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:slot,itemAssetName:asset,custom:7}]}]})});

test('socks, outer pants and jerseys share the required-equipment removal policy in Patcher and Mapper',()=>{
 const ids=new Set(removable);for(const slot of ['InnerSocks','OuterPants','OuterShirt']){
  assert.equal(editor.removalAllowed(slot),false);
  for(const i of library.items.filter(i=>i.slot===slot&&!editor.empty(i))){assert.equal(ids.has(i.asset),false);assert.throws(()=>normalizeRemovalItems([i.asset]),/cannot be removed/);assert.equal(editor.removeReplacement(i,items,[i.asset]),null);}
  for(const category of items.filter(i=>i.categorySelection&&i.slot===slot))assert.equal(editor.removeReplacement(category,items,removable),null);
 }
 assert.match(editor.removalRestriction,/socks, pants and jersey styles/);
});
test('explicit None and missing-slot proposals are structural blocks for all required equipment',()=>{
 for(const slot of editor.protectedRemovalSlots.filter(slot=>!slot.endsWith('Override'))){const original=[{slotType:slot,itemAssetName:'OriginalGear'}];
  for(const final of [[],[{slotType:slot,itemAssetName:'Test_None'}]]){const issue=mapperCompatibilityIssue(final,[slot],{branding:'nike'},original);assert.equal(issue.blocking,true,slot);assert.equal(issue.reason,editor.removalRestriction);}
 }
});
test('cleat override metadata can still be cleared while the required cleat remains equipped',()=>{
 const source=find('LeftShoe'),replacement={...source,id:'test-cleat-recipe',catalog:false,context:{LeftShoeOverride:null}},custom={...library,items:[...library.items,replacement]},input=player('LeftShoe',source.asset),raw=JSON.parse(input.rawData);raw.loadouts[0].loadoutElements.push({slotType:'LeftShoeOverride',itemAssetName:'OriginalCleatMetadata'});input.rawData=JSON.stringify(raw);
 const preview=buildMapperPreview([input],custom,[{action:'replace',sourceId:source.id,replacementId:replacement.id,scope:'all',matchMode:'asset'}]);assert.equal(preview.blocked.length,0);assert.equal(preview.changes.length,1);const elements=JSON.parse(preview.changes[0].newRawData).loadouts[0].loadoutElements;assert.equal(elements.find(i=>i.slotType==='LeftShoe').itemAssetName,source.asset);assert.ok(!elements.some(i=>i.slotType==='LeftShoeOverride'));
});
test('crafted or legacy copy/replace rules cannot clear required clothing or be offered compatibility confirmation',()=>{
 for(const slot of ['InnerSocks','OuterPants','OuterShirt']){
  const source=find(slot),empty={...source,id:'test-none:'+slot,asset:'Test_None',name:'Test None',element:{slotType:slot,itemAssetName:'Test_None'},context:{}},custom={...library,items:[...library.items,empty]},input=player(slot,source.asset),before=structuredClone(input);
  for(const action of ['copy','replace']){const preview=buildMapperPreview([input],custom,[{action,sourceId:source.id,replacementId:empty.id,scope:'all',matchMode:'asset',frequency:100}]);assert.equal(preview.changes.length,0);assert.equal(preview.compatibilityWarnings.length,0);assert.equal(preview.blocked.length,1);assert.match(preview.blocked[0].reason,/cannot be removed/);assert.deepEqual(input,before);}
 }
});
test('removing a real accessory cannot erase protected saved slots through an aliased asset or dependent context',()=>{
 const visor=library.items.find(i=>i.slot==='Visor'&&!editor.empty(i)),none=library.items.find(i=>i.slot==='Visor'&&editor.empty(i));assert.ok(visor&&none);
 const original={loadouts:[{loadoutType:'PlayerOnField',loadoutElements:['Visor','InnerSocks','OuterPants','OuterShirt'].map(slot=>({slotType:slot,itemAssetName:visor.asset,custom:4}))}]},parsed=structuredClone(original);const changes=removeSelectedEquipment(parsed,[visor.asset]);assert.equal(changes.length,1);assert.deepEqual(parsed.loadouts[0].loadoutElements,original.loadouts[0].loadoutElements.slice(1));
 const crafted={...none,id:'test-context',context:{InnerSocks:null,OuterPants:null,OuterShirt:null}},custom={...library,items:[...library.items,crafted]},input=player('Visor',visor.asset),raw=JSON.parse(input.rawData);raw.loadouts[0].loadoutElements.push({slotType:'OuterPants',itemAssetName:find('OuterPants').asset});input.rawData=JSON.stringify(raw);const preview=buildMapperPreview([input],custom,[{action:'replace',sourceId:visor.id,replacementId:crafted.id,scope:'all',matchMode:'asset'}]);assert.equal(preview.changes.length,0);assert.equal(preview.blocked.length,1);
});
test('normal clothing replacements and optional leg-base removal remain available',()=>{
 for(const slot of ['InnerSocks','OuterPants','OuterShirt']){const choices=library.items.filter(i=>i.slot===slot&&!editor.empty(i)),input=player(slot,choices[0].asset),preview=buildMapperPreview([input],library,[{action:'replace',sourceId:choices[0].id,replacementId:choices[1].id,scope:'all',matchMode:'asset'}]);assert.equal(preview.blocked.length,0);assert.equal(preview.changes.length,1);}
 const leggings=library.items.find(i=>i.slot==='InnerPants'&&!editor.empty(i));assert.ok(editor.removeReplacement(leggings,items,removable));assert.equal(editor.removalAllowed('InnerPants'),true);assert.ok(editor.removeReplacement(library.items.find(i=>i.asset==='NeckWear_Turtleneck_Tight_White'),items,removable));
});
