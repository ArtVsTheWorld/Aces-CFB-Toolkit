import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import editor from '../src/shared/mapperEditor.cjs';
import {mapperCatalog} from '../src/main/tools/equipmentMapper/catalog.js';
import {removalCatalog} from '../src/main/tools/equipment/core/removal.js';
import {mapperTargetSession,queryMapperTargets} from '../src/main/tools/equipmentMapper/targets.js';
import {buildMapperPreview} from '../src/main/tools/equipmentMapper/core.js';
import {saveFingerprint} from '../src/main/tools/jersey/planStore.js';
const library=mapperCatalog({confirmed:true,unlocked:true,raw:true,eljax:true}),items=library.items,removable=removalCatalog().map(item=>item.value),find=(asset,slot)=>items.find(item=>item.asset===asset&&(!slot||item.slot===slot));
const tee='G_CompressionT_Crew_ShortSleeve_99Club_B_GOL',normal='Gear_Undershirt_CompressionTCrewSleeveless_White',turtle='NeckWear_Turtleneck_Tight_White';
test('guided removal uses verified None in the exact slot, excluding required gear',()=>{
  for(const asset of [tee,turtle,'GearArmSleeve_CompressionRolledUpShirt_White']){const item=items.find(item=>item.asset===asset);if(!item)continue;const replacement=editor.removeReplacement(item,items,removable);assert.ok(replacement,asset);assert.equal(replacement.slot,item.slot);assert.ok(editor.empty(replacement));}
  for(const item of items.filter(item=>['HeadWear','FaceMask','LeftShoe','RightShoe'].includes(item.slot)))assert.equal(editor.removeReplacement(item,items,removable),null);
  assert.equal(editor.actionOf({action:'replace',sourceId:find(turtle).id,replacementId:find('NeckWear_None').id},items,removable),'remove');assert.equal(editor.actionOf({action:'copy'},items,removable),'assign');
});
test('legacy caps and exact matching survive an unedited UI save, while explicit frequency edits opt into Frequency',()=>{
  assert.deepEqual(editor.withFrequency({replacementCap:5},false,5,false),{replacementCap:5});assert.deepEqual(editor.withFrequency({},false,100,false),{});
  assert.deepEqual(editor.withFrequency({frequency:5,fillToFrequency:true},false,5,true),{frequency:5,fillToFrequency:true});assert.deepEqual(editor.withFrequency({replacementCap:5},true,5,true),{frequency:5,fillToFrequency:true});
  const players=Array.from({length:4},(_,row)=>({row,team:'A',teamIndex:1,player:'Name '+row,position:'WR',rawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'NeckWear',itemAssetName:turtle}]}]})}));
  const original={action:'replace',sourceId:find(turtle).id,replacementId:find('NeckWear_None').id,matchMode:'exact',replacementCap:5,scope:'all'};
  assert.deepEqual(buildMapperPreview(players,library,[{...original,...editor.withFrequency(original,false,5,false)}]),buildMapperPreview(players,library,[original]));assert.equal(buildMapperPreview(players,library,[original]).changes.length,0);
});
test('paired slot lookup is reversible and rule summaries retain filter, condition and frequency information',()=>{
  for(const slot of ['LeftHandWear','RightHandWear','LeftShoe','RightShoe','LeftArmWear','RightArmWear'])assert.equal(editor.pairedSlot(editor.pairedSlot(slot)),slot);
  const summary=editor.describe({action:'replace',sourceId:find(turtle).id,replacementId:find('NeckWear_None').id,wearingItemId:find(tee).id,wearingMatchMode:'item',frequency:35,teams:['A'],positions:['WR'],pairSides:false},items);assert.match(summary.operation,/Remove.*Turtleneck/);assert.match(summary.condition,/Relaxed Tee.*any color/);assert.equal(summary.frequency,35);
});
test('background targets use original-outfit intersections, 100-row pages, selections and fresh fingerprints',t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'mapper-targets-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));const savePath=path.join(directory,'SAVE');fs.writeFileSync(savePath,'unmodified fixture');const fingerprint=saveFingerprint(savePath);
  const players=Array.from({length:260},(_,row)=>({row,team:row<250?'A':'B',teamIndex:row<250?1:2,player:'Player '+String(row).padStart(3,'0'),position:row<240?'WR':'MLB',rawData:JSON.stringify({loadouts:[{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'InnerShirt',itemAssetName:row<255?tee:normal},{slotType:'NeckWear',itemAssetName:turtle}]},{loadoutType:'PlayerOnField',loadoutElements:[{slotType:'InnerShirt',itemAssetName:normal}]}]})}));
  const sessionId=mapperTargetSession(savePath,fingerprint,players,library),rule={action:'replace',sourceId:find(turtle).id,replacementId:find('NeckWear_None').id,wearingItemId:find(tee).id,matchMode:'asset',scope:'all',teams:['A'],positions:['WR'],frequency:100,fillToFrequency:true},base={savePath,fingerprint,sessionId,rule};
  const a=queryMapperTargets(base),b=queryMapperTargets({...base,page:1});assert.equal(a.totalMatches,240);assert.equal(a.rows.length,100);assert.equal(b.rows.length,100);assert.equal(b.rows[0].row,100);assert.ok(a.rows.every(p=>!('rawData'in p)));assert.equal(queryMapperTargets({...base,page:2}).rows.length,40);
  assert.equal(queryMapperTargets({...base,selectedRows:[1,255]}).selectedOutsideFilters,1);const selected=queryMapperTargets({...base,selectedRows:[1,255],selectedOnly:true});assert.equal(selected.rows.length,2);assert.equal(selected.rows.find(p=>p.row===255).outsideFilters,true);
  assert.equal(queryMapperTargets({...base,query:'Player 005'}).rows[0].row,5);assert.equal(queryMapperTargets({...base,rule:{...rule,positions:[]},query:'MIKE'}).totalMatches,10);
  const native=buildMapperPreview(players,library,[rule]);assert.equal(a.matchingPlayers,native.allocations[0].matchedPlayers);
  assert.throws(()=>queryMapperTargets({...base,rule:{...rule,wearingItemId:'missing'}}),/available catalog/);fs.writeFileSync(savePath,'changed contents');assert.throws(()=>queryMapperTargets(base),/equipment list changed/);
});
