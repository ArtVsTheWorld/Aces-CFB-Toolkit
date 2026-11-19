import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import editor from '../src/shared/mapperEditor.cjs';
import {mapperCatalog} from '../src/main/tools/equipmentMapper/catalog.js';
const library=mapperCatalog({confirmed:true,unlocked:true,raw:true,eljax:true}),items=library.items;
const vanilla=items.find(i=>i.id==='catalog:InnerShirt:G_CompressionT_Crew_ShortSleeve_Basic_WHI');
const unlocked=items.find(i=>i.id==='catalog:InnerShirt:G_CompressionT_Crew_ShortSleeve_BasicJ_WHI');

test('base-game and Unlocked selections retain exact identities and clearly identify their sources',()=>{
 assert.equal(vanilla.name,'White Compression Tee');assert.equal(unlocked.name,'Irish Jamo Sleeves White');assert.notEqual(vanilla.id,unlocked.id);
 assert.deepEqual(editor.sourceLabels(vanilla,items),['CFB 27 Equipment']);assert.deepEqual(editor.sourceLabels(unlocked,items),['Unlocked']);
 const rule={action:'replace',sourceId:vanilla.id,replacementId:unlocked.id,wearingItemId:unlocked.id,frequency:60,fillToFrequency:false,matchMode:'exact'},before=structuredClone(rule),catalog=structuredClone(items);
 assert.deepEqual(editor.sourceSummary(rule,items),[['Existing','CFB 27 Equipment'],['Replacement','Unlocked'],['Only when wearing','Unlocked']]);
 assert.deepEqual(rule,before);assert.deepEqual(items,catalog);
});

test('every supported catalog origin has a readable label and unknown sources are not guessed',()=>{
 const names=new Set();for(const item of items){const labels=editor.sourceLabels(item,items);assert.equal(labels.length,1);assert.ok(!labels.includes('Source not verified'));names.add(labels[0]);}
 assert.deepEqual([...names].sort(),['CFB 27 Equipment','GameDay Gear','RAW Accessories','Unlocked']);
 for(const item of [{name:'Old saved item'},{origin:'not-a-real-mod'}])assert.deepEqual(editor.sourceLabels(item,items),['Source not verified']);
});

test('All Categories show their actual included sources, while Assign and Remove summaries identify the selected gear',()=>{
 const expanded=editor.withCategories(items),category=expanded.find(i=>i.id==='category:Undershirt:InnerShirt');assert.ok(category);
 assert.deepEqual(editor.sourceLabels(category,expanded),['CFB 27 Equipment','Unlocked']);
 const none=items.find(i=>i.slot==='InnerShirt'&&i.asset==='Undershirt_None');
 assert.deepEqual(editor.sourceSummary({action:'replace',sourceId:unlocked.id,replacementId:none.id},items),[['Existing','Unlocked']]);
 assert.deepEqual(editor.sourceSummary({action:'copy',replacementId:vanilla.id},items),[['Assign from','CFB 27 Equipment']]);
 const left=items.find(i=>i.origin==='raw'&&i.slot==='LeftHandWear'),right=items.find(i=>i.origin==='vanilla'&&i.slot==='RightHandWear');
 assert.ok(left&&right);assert.deepEqual(editor.sourceSummary({action:'copy',replacementId:left.id,replacementPairId:right.id,pairSides:true},items),[['Assign from','RAW Accessories'],['Other replacement','CFB 27 Equipment']]);
});

test('Mapper preview renders escaped source summaries and remains compatible with older saved reviews',()=>{
 const context=vm.createContext({escapeHtml:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;'),MapperEditor:editor,state:{page:'saved-review'}});
 vm.runInContext(fs.readFileSync('src/renderer/equipment-mapper.js','utf8'),context);
 const details={ruleSummaries:['Replace White Compression Tee with Irish Jamo Sleeves White.'],ruleSources:[editor.sourceSummary({action:'replace',sourceId:vanilla.id,replacementId:unlocked.id},items)]};
 const rendered=context.mapperPreviewExplanation({details});assert.match(rendered,/Existing: CFB 27 Equipment/);assert.match(rendered,/Replacement: Unlocked/);
 assert.doesNotThrow(()=>context.mapperPreviewExplanation({details:{ruleSummaries:details.ruleSummaries}}));
 assert.match(context.mapperPreviewExplanation({details:{...details,ruleSources:[[['Existing','<unsafe>']]]}}),/&lt;unsafe>/);
});
