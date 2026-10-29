// Private EXAMPLE SAVES: seeded combinations and all writes use temporary copies.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {loadEquipmentTables,snapshotVisualRawData} from '../src/main/tools/equipment/shared.js';
import {mapperPlayers,prepareEquipmentMapper,runEquipmentMapper} from '../src/main/tools/equipmentMapper/runner.js';
import {mapperCatalog} from '../src/main/tools/equipmentMapper/catalog.js';
import {RELAXED_TEE_INCOMPATIBLE_JERSEYS} from '../src/main/tools/equipment/core/compatibility.js';
import {snapshotVisualsForVerification,saveEquipmentCandidate} from '../src/main/tools/equipment/visualsSafety.js';
import {runEquipmentPatcher} from '../src/main/tools/equipment/runner.js';
import {saveFingerprint,takePlan} from '../src/main/tools/jersey/planStore.js';
import {ReportService} from '../src/main/services/reports.js';
import {sf} from '../src/main/tools/equipment/openSave.js';
const source=path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'),schemaPath=path.resolve('resources/engine-data/C27_486_6.gz'),mods={confirmed:true,unlocked:true},white='G_CompressionT_Crew_ShortSleeve_99Club_B_GOL',black='G_CompressionT_Crew_ShortSleeve_99Club_B_WHI',normal='Gear_Undershirt_CompressionTCrewSleeveless_White',turtle='NeckWear_Turtleneck_Tight_White';
const set=(items,slotType,itemAssetName)=>{const previous=items.find(item=>item.slotType===slotType);if(previous)previous.itemAssetName=itemAssetName;else items.push({slotType,itemAssetName});};
const outfits=raw=>JSON.parse(raw).loadouts.filter(l=>l.loadoutType==='PlayerOnField'),get=(l,slot)=>l.loadoutElements.find(e=>e.slotType===slot)?.itemAssetName;
test('Wearing Item and compatibility each remove only clashing neckwear in native Preview/Apply/reopen',{timeout:150000,skip:!fs.existsSync(source)},async t=>{
  const original=saveFingerprint(source),directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-wearing-filter-')),seedPath=path.join(directory,'DYNASTY-SEED');
  t.after(()=>{if(path.dirname(directory)!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith('cfb-wearing-filter-'))throw Error('Unsafe cleanup');fs.rmSync(directory,{recursive:true,force:true});});
  fs.copyFileSync(source,seedPath);const loaded=await loadEquipmentTables(seedPath,schemaPath),snapshot=snapshotVisualsForVerification(loaded.visuals,snapshotVisualRawData(loaded.visuals.records)),players=mapperPlayers(loaded).filter(p=>p.team==='LSU'&&p.position==='WR'&&!p.shared).slice(0,3),assignments=[];
  assert.equal(players.length,3);const jersey=mapperCatalog(mods).items.find(i=>i.slot==='OuterShirt'&&!RELAXED_TEE_INCOMPATIBLE_JERSEYS.has(i.asset));assert.ok(jersey);
  for(const [index,p]of players.entries()){
    const raw=JSON.parse(p.rawData),gear=raw.loadouts.filter(l=>l.loadoutType==='PlayerOnField');if(gear.length===1){raw.loadouts.push(structuredClone(gear[0]));gear.push(raw.loadouts.at(-1));}
    for(const [outfitIndex,l]of gear.entries()){
      set(l.loadoutElements,'OuterShirt',jersey.asset);set(l.loadoutElements,'InnerShirt',index===0&&outfitIndex===0?white:index===2?black:normal);set(l.loadoutElements,'NeckWear',turtle);set(l.loadoutElements,'Neckpad','GearNeckpad_None');set(l.loadoutElements,'FaceWear','FaceGear_BalaclavaNone');
    }
    const newValue=JSON.stringify(raw);loaded.visuals.records[p.visualRow].RawData=newValue;assignments.push({table:'visuals',row:p.visualRow,field:'RawData',oldValue:p.rawData,newValue});
  }
  await saveEquipmentCandidate(loaded,schemaPath,snapshot,assignments,original);const seededHash=saveFingerprint(seedPath);
  for(const tool of ['mapper','patcher']){
    const savePath=path.join(directory,'DYNASTY-'+tool.toUpperCase());fs.copyFileSync(seedPath,savePath);const before=await loadEquipmentTables(savePath,schemaPath),oldRaw=snapshotVisualRawData(before.visuals.records),reports=new ReportService(path.join(directory,tool+'-reports'));let preview;
    if(tool==='mapper'){
      const prepared=await prepareEquipmentMapper({savePath,schemaPath,options:{mods}}),find=asset=>prepared.items.find(i=>i.asset===asset);
      preview=await runEquipmentMapper({savePath,schemaPath,reports,mode:'preview',options:{mods,fingerprint:prepared.fingerprint,rules:[{action:'replace',sourceId:find(turtle).id,replacementId:find('NeckWear_None').id,wearingItemId:find(white).id,wearingMatchMode:'item',matchMode:'asset',scope:'selected',playerRows:players.map(p=>p.row),playerIdentities:players.map(({row,player,team})=>({row,player,team})),frequency:100,fillToFrequency:true}]}});
      assert.equal(preview.details.canApply,true);assert.equal(preview.details.allocations[0].matchedPlayers,2);
    }else preview=await runEquipmentPatcher({savePath,schemaPath,reports,mode:'preview',options:{includedTeams:['LSU'],positions:['WR'],protectOriginalEaPlayers:false,sleeveCompatibilityFix:true}});
    assert.equal(saveFingerprint(savePath),seededHash);const plan=takePlan(preview.planId),expected=new Map(plan.assignments.map(a=>[a.row,a.newValue]));assert.ok(expected.has(players[0].visualRow)&&expected.has(players[2].visualRow));
    const run=tool==='mapper'?runEquipmentMapper:runEquipmentPatcher,applied=await run({savePath,schemaPath,reports,mode:'apply',options:{planId:preview.planId}}),after=await loadEquipmentTables(savePath,schemaPath);assert.equal(saveFingerprint(applied.backupPath),seededHash);
    for(const [row,raw]of oldRaw)if(typeof raw==='string')assert.equal(sf(after.visuals.records[row],'RawData'),expected.get(row)??raw);
    const a=outfits(sf(after.visuals.records[players[0].visualRow],'RawData')),b=outfits(sf(after.visuals.records[players[1].visualRow],'RawData')),c=outfits(sf(after.visuals.records[players[2].visualRow],'RawData'));
    assert.equal(get(a[0],'InnerShirt'),white);assert.ok(!get(a[0],'NeckWear')||get(a[0],'NeckWear')==='NeckWear_None');assert.equal(get(a[1],'NeckWear'),turtle);assert.ok(b.every(l=>get(l,'NeckWear')===turtle));assert.ok(c.every(l=>get(l,'InnerShirt')===black&&(!get(l,'NeckWear')||get(l,'NeckWear')==='NeckWear_None')));assert.equal(fs.statSync(savePath).size,fs.statSync(source).size);
  }
  assert.equal(saveFingerprint(source),original);
});
