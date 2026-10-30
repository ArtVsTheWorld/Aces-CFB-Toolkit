import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import editor from '../src/shared/mapperEditor.cjs';
import {mapperCatalog} from '../src/main/tools/equipmentMapper/catalog.js';
import {buildMapperPreview} from '../src/main/tools/equipmentMapper/core.js';
import {removalCatalog} from '../src/main/tools/equipment/core/removal.js';
import {createMapperReviewSource,applyMapperReviewChoices} from '../src/main/tools/equipmentMapper/conflictReview.js';
import {mapperTargetSession,queryMapperTargets} from '../src/main/tools/equipmentMapper/targets.js';
import {saveFingerprint} from '../src/main/tools/jersey/planStore.js';
const library=mapperCatalog({confirmed:true,unlocked:true,raw:true,eljax:true}),items=editor.withCategories(library.items),removable=removalCatalog().map(i=>i.value);
const all=(category,slot)=>{const item=items.find(i=>i.categorySelection&&i.category===category&&(!slot||i.slot===slot));assert.ok(item,category+' '+slot);return item;};
const find=(asset,slot)=>{const item=library.items.find(i=>i.asset===asset&&(!slot||i.slot===slot));assert.ok(item,asset);return item;};
const turtle=all('Turtlenecks'),none=find('NeckWear_None'),quarter=find('GearArmSleeve_Quarter_sleeveLongUnderarmor_normal_White','LeftArmWear');
const element=(slot,asset)=>({slotType:slot,itemAssetName:asset});
const players=(count,elements=[])=>Array.from({length:count},(_,row)=>({row,visualRow:row,player:'Player '+row,team:'A',teamIndex:1,position:'WR',branding:'nike',rawData:JSON.stringify({keep:'root',loadouts:[{loadoutType:'PlayerOnField',loadoutElements:structuredClone(elements)},{loadoutType:'PlayerOnField',loadoutElements:structuredClone(elements)},{loadoutCategory:'Base',loadoutElements:[{slotType:'Keep',itemAssetName:'Keep'}]}]})}));
const rule=extra=>({action:'copy',replacementId:turtle.id,scope:'all',frequency:100,fillToFrequency:true,...extra});
const asset=(p,slot,loadout=0)=>JSON.parse(p.newRawData).loadouts[loadout].loadoutElements.find(e=>e.slotType===slot)?.itemAssetName;
const assertBalanced=(changes,slot,eligible)=>{const counts=new Map(eligible.map(i=>[i.asset,0]));for(const p of changes){const a=asset(p,slot);assert.ok(counts.has(a),a);counts.set(a,counts.get(a)+1);}assert.ok(Math.max(...counts.values())-Math.min(...counts.values())<=1,JSON.stringify([...counts]));};

test('every nonempty catalog category has exact-slot All selections; IDs and existing items remain stable',()=>{
 assert.equal(editor.withCategories(items),items);assert.ok(items.length>library.items.length);
 assert.deepEqual(items.slice(0,library.items.length),library.items);
 for(const item of library.items.filter(i=>!editor.empty(i))){const category=all(editor.categoryOf(item),item.slot);assert.ok(category.memberIds.includes(item.id));}
 for(const category of items.filter(i=>i.categorySelection)){assert.ok(category.memberIds.length);assert.ok(category.memberIds.every(id=>{const i=items.find(i=>i.id===id);return i.slot===category.slot&&!editor.empty(i);}));assert.ok(!category.name.includes('undefined'));}
 assert.ok(turtle.memberIds.every(id=>/turtleneck/i.test(items.find(i=>i.id===id).name)));assert.ok(!items.some(i=>i.categorySelection&&i.category==='Empty Slots'));
 const base=mapperCatalog({confirmed:true}),baseItems=editor.withCategories(base.items);assert.ok(baseItems.filter(i=>i.categorySelection).every(c=>c.memberIds.every(id=>base.items.some(i=>i.id===id&&i.origin==='vanilla'))));
 assert.equal(baseItems.find(i=>i.categorySelection&&i.category==='Turtlenecks').id,turtle.id);
});
test('All removal clears every matching style and color, preserves all other slots and skips nonmembers',()=>{
 assert.equal(editor.removeReplacement(turtle,items,removable).id,none.id);
 const members=turtle.memberIds.map(id=>items.find(i=>i.id===id)),input=members.map((i,row)=>({...players(1,[element('NeckWear',i.asset),element('LeftArmWear',quarter.asset)])[0],row,visualRow:row}));
 input.push({...players(1,[element('NeckWear','GearNeckpad_QCollar')])[0],row:999});const before=structuredClone(input);
 const preview=buildMapperPreview(input,library,[rule({action:'replace',sourceId:turtle.id,replacementId:none.id,matchMode:'exact'})]);
 assert.equal(preview.blocked.length,0);assert.equal(preview.compatibilityWarnings.length,0);assert.equal(preview.changes.length,members.length);
 for(const p of preview.changes){assert.equal(asset(p,'NeckWear'),none.asset);assert.equal(asset(p,'LeftArmWear'),quarter.asset);assert.deepEqual(JSON.parse(p.newRawData).loadouts[2],JSON.parse(p.rawData).loadouts[2]);}assert.deepEqual(input,before);
 for(const category of ['Helmet Model','Facemask','Cleats'])assert.equal(editor.removeReplacement(all(category),items,removable),null);
});
test('All source replaces multiple styles with a single item without cascading',()=>{
 const replacement=find('NeckWear_Turtleneck_Tight_White'),members=turtle.memberIds.map(id=>items.find(i=>i.id===id)),input=members.filter(i=>i.id!==replacement.id).map((i,row)=>({...players(1,[element('NeckWear',i.asset)])[0],row}));
 const result=buildMapperPreview(input,library,[rule({action:'replace',sourceId:turtle.id,replacementId:replacement.id,matchMode:'asset'})]);assert.equal(result.blocked.length,0);assert.equal(result.changes.length,input.length);assert.ok(result.changes.every(p=>asset(p,'NeckWear')===replacement.asset));
});
test('All replacements respect original sources under legacy 100-percent caps and remain balanced',()=>{
 const input=players(63,[element('NeckWear',none.asset)]);input.push({...players(1,[element('NeckWear','GearNeckpad_QCollar')])[0],row:999});
 const r={action:'replace',sourceId:none.id,replacementId:turtle.id,scope:'all',matchMode:'asset',replacementCap:100};
 const result=buildMapperPreview(input,library,[r]);assert.equal(result.blocked.length,0);assert.equal(result.changes.length,63);assert.ok(!result.changes.some(p=>p.row===999));assertBalanced(result.changes,'NeckWear',turtle.memberIds.map(id=>items.find(i=>i.id===id)));
});
test('Keep Current Colors resolves implicit original slots before allocating category items',()=>{
 const input=players(47,[{itemAssetName:'Gear_Undershirt_CompressionTCrewSleeveless_White'}]),shirts=all('Undershirt','InnerShirt');
 const result=buildMapperPreview(input,library,[rule({replacementId:shirts.id,preserveColor:true})]);assert.equal(result.blocked.length,0);for(const p of result.changes)assert.ok(items.find(i=>i.asset===asset(p,'InnerShirt')).colors.includes('white'));
});
test('category assignment is balanced, deterministic independent of roster order and consistent across outfits',()=>{
 const input=players(83),before=structuredClone(input),r=rule(),a=buildMapperPreview(input,library,[r]),b=buildMapperPreview([...input].reverse(),library,[r]);
 assert.equal(a.blocked.length,0);assert.equal(a.compatibilityWarnings.length,0);assert.equal(a.changes.length,83);
 assertBalanced(a.changes,'NeckWear',turtle.memberIds.map(id=>items.find(i=>i.id===id)));
 const picks=new Map(a.changes.map(p=>[p.row,asset(p,'NeckWear')]));for(const p of b.changes)assert.equal(asset(p,'NeckWear'),picks.get(p.row));for(const p of a.changes){assert.equal(asset(p,'NeckWear',1),asset(p,'NeckWear'));assert.ok(!p.newRawData.includes('category:'));assert.equal(JSON.parse(p.newRawData).keep,'root');}assert.deepEqual(input,before);
});
test('paired category assignments share the same item on both sides and count each player once',()=>{
 const left=all('Arm Wear','LeftArmWear'),right=all('Arm Wear','RightArmWear'),preview=buildMapperPreview(players(53),library,[rule({replacementId:left.id,pairSides:true,replacementPairId:right.id})]);
 assert.equal(preview.blocked.length,0);assert.equal(preview.changes.length,53);assert.equal(preview.allocations[0].matchedPlayers,53);for(const p of preview.changes)assert.equal(asset(p,'LeftArmWear'),asset(p,'RightArmWear'));assertBalanced(preview.changes,'LeftArmWear',left.memberIds.map(id=>items.find(i=>i.id===id)));
 assert.throws(()=>buildMapperPreview(players(1),library,[rule({replacementId:left.id,pairSides:true,replacementPairId:turtle.id})]),/other side/);
});
test('frequency, filters and All Wearing conditions use original outfits and unique players',()=>{
 const input=players(100,[element('NeckWear',items.find(i=>i.id===turtle.memberIds[0]).asset)]).map((p,row)=>({...p,position:row<80?'WR':'CB'}));
 const result=buildMapperPreview(input,library,[rule({replacementId:quarter.id,wearingItemId:turtle.id,positions:['WR'],frequency:50})]);assert.equal(result.changes.length,40);assert.equal(result.impact.matching,80);assert.equal(result.allocations[0].limit,40);assert.equal(buildMapperPreview(input,library,[rule({frequency:0})]).changes.length,0);
});
test('pool candidates respect current colors and team brands without escaping the chosen category',()=>{
 const wrists=all('Wrist Wear','LeftWristWear'),input=players(73,[element('LeftWristWear','GearWrist_wristTapedNormal_White')]),result=buildMapperPreview(input,library,[rule({replacementId:wrists.id,preserveColor:true})]);
 assert.equal(result.blocked.length,0);const eligible=wrists.memberIds.map(id=>items.find(i=>i.id===id)).filter(i=>JSON.stringify(i.colors)==='["white"]');for(const p of result.changes)assert.ok(eligible.some(i=>i.asset===asset(p,'LeftWristWear')));
 const gloves=all('Gloves','LeftHandWear'),nike=players(45),g=buildMapperPreview(nike,library,[rule({replacementId:gloves.id})]);assert.equal(g.blocked.length,0);assert.ok(g.compatibilityWarnings.every(p=>!p.reason.includes('brand')));
});
test('category edits retain conflict review, requested-slot protection and structural shared-row blocks',()=>{
 const tee=find('G_CompressionT_Crew_ShortSleeve_99Club_B_GOL'),input=players(2,[element('InnerShirt',tee.asset)]),preview=buildMapperPreview(input,library,[rule()]);assert.equal(preview.compatibilityWarnings.length,2);
 const reviewed=applyMapperReviewChoices(createMapperReviewSource(preview,library),{});assert.equal(reviewed.preview.compatibilityWarnings.length,0);for(const p of reviewed.preview.changes)assert.equal(asset(p,'NeckWear'),asset(preview.changes.find(old=>old.row===p.row),'NeckWear'));
 const shared=buildMapperPreview([{...input[0],shared:true}],library,[rule()]);assert.equal(shared.changes.length,0);assert.match(shared.blocked[0].reason,/shares CharacterVisuals/);
});
test('category IDs cannot be forged, cross slots or bypass the installed-mod catalog',()=>{
 assert.throws(()=>buildMapperPreview(players(1),library,[rule({replacementId:'category:Fake:NeckWear'})]),/unavailable/);
 assert.throws(()=>buildMapperPreview(players(1),library,[rule({action:'replace',sourceId:turtle.id,replacementId:quarter.id})]),/same exact equipment slot/);
 const rawOnly=items.find(i=>i.categorySelection&&i.category==='Chin Cover');if(rawOnly&&!editor.withCategories(mapperCatalog({confirmed:true}).items).some(i=>i.id===rawOnly.id))assert.throws(()=>buildMapperPreview(players(1),mapperCatalog({confirmed:true}),[rule({replacementId:rawOnly.id})]),/unavailable/);
});
test('target picker accepts All categories and conditions, tracks frequency scope and guards stale saves',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mapper-category-target-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const savePath=path.join(dir,'SAVE');fs.writeFileSync(savePath,'test');const fingerprint=saveFingerprint(savePath),input=players(120,[element('NeckWear',items.find(i=>i.id===turtle.memberIds[0]).asset)]),sessionId=mapperTargetSession(savePath,fingerprint,input,library),r=rule({action:'replace',sourceId:turtle.id,replacementId:none.id});const query={savePath,fingerprint,sessionId,rule:r};
 assert.equal(queryMapperTargets(query).matchingPlayers,120);assert.equal(queryMapperTargets({...query,page:1}).rows.length,20);assert.equal(queryMapperTargets({...query,rule:rule({wearingItemId:turtle.id})}).matchingPlayers,120);fs.appendFileSync(savePath,'changed');assert.throws(()=>queryMapperTargets(query),/equipment list changed/);
});
test('saved single-item rules retain IDs, cap semantics and summaries; category rules round-trip unchanged',()=>{
 const old={action:'replace',sourceId:find('NeckWear_Turtleneck_Tight_White').id,replacementId:none.id,scope:'all',matchMode:'exact',replacementCap:5,fillToFrequency:false};
 assert.equal(editor.describe(old,library.items).sentence,'Remove Tight Turtleneck White.');assert.deepEqual(editor.withFrequency(old,false,5,false),{replacementCap:5,fillToFrequency:false});assert.equal(editor.actionOf(old,library.items,removable),'remove');
 const r=rule({wearingItemId:turtle.id,pairSides:false});assert.deepEqual(JSON.parse(JSON.stringify(r)),r);assert.match(editor.describe(r,library.items).sentence,/Assign evenly from All Turtlenecks/);
});
