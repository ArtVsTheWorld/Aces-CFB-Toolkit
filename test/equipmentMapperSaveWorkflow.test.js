import {mapperCatalog} from '../src/main/tools/equipmentMapper/catalog.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {mapperPlayers,mapperSources,runEquipmentMapper} from '../src/main/tools/equipmentMapper/runner.js';
import {mapperLibrary,buildMapperPreview} from '../src/main/tools/equipmentMapper/core.js';
import {loadEquipmentTables,snapshotVisualRawData} from '../src/main/tools/equipment/shared.js';
import {takePlan} from '../src/main/tools/jersey/planStore.js';
import {ReportService} from '../src/main/services/reports.js';
const mods={confirmed:true,unlocked:true,raw:true,eljax:true};
const fixture=path.resolve(process.env.CFB_MAPPER_FIXTURE??'../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'),schemaPath=path.resolve('resources/engine-data/C27_486_6.gz');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),fileHash=file=>hash(fs.readFileSync(file));

test('Mapper real-save sleeve/undershirt workflows preserve the exact plan, all other gear, tables and original file',{timeout:480000,skip:!fs.existsSync(fixture)},async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-mapper-workflows-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const originalHash=fileHash(fixture);let loaded=await loadEquipmentTables(fixture,schemaPath,true,false);
  const players=mapperPlayers(loaded),library=mapperCatalog(mods),before=snapshotVisualRawData(loaded.visuals.records),otherTables=new Map(loaded.franchise.tables.filter(table=>table!==loaded.visuals).map(table=>[table.header.tableId,hash(table.data)]));loaded=null;
  const find=(slot,predicate)=>library.items.find(item=>item.copyable!==false&&item.slot===slot&&predicate(item.asset));
  const sleeve=find('LeftArmWear',asset=>/Quarter_sleeveLongUnderarmor_normal_White$/.test(asset));
  const pair=library.items.find(item=>item.copyable!==false&&item.slot==='RightArmWear'&&item.asset===sleeve?.asset);
  const shirt=find('InnerShirt',asset=>/CompressionTCrewSleeveless_White$/.test(asset))??find('InnerShirt',asset=>asset==='G_CompressionT_Crew_ShortSleeve_Basic_WHI');
  const noSleeve=find('LeftArmWear',asset=>asset==='ArmSleeve_None'),noShirt=find('InnerShirt',asset=>/(?:^|_)None$/i.test(asset));
  assert.ok(sleeve&&pair&&shirt&&noSleeve&&noShirt,'Real library contains sleeves, both sides, undershirts and empty items');
  const targetRules=(base,target)=>base.map(rule=>({...rule,scope:'selected',teams:[target.team],positions:[target.position],playerRows:[target.row],playerIdentities:[{row:target.row,player:target.player,team:target.team}]}));
  const candidates=[...players].sort((a,b)=>(b.team==='LSU')-(a.team==='LSU')||a.row-b.row).filter(player=>player.position==='WR'&&!player.shared);
  const scenarios=[
    ['assign a catalog arm tattoo',[{action:'copy',replacementId:library.items.find(item=>item.origin==='unlocked'&&item.slot==='LeftArmTattoo').id}]],
    ['copy one sleeve',[{action:'copy',replacementId:sleeve.id}]],
    ['copy paired sleeves',[{action:'copy',replacementId:sleeve.id,pairSides:true,replacementPairId:pair.id}]],
    ['copy a saved undershirt',[{action:'copy',replacementId:shirt.id}]],
    ['replace an empty sleeve',[{action:'replace',sourceId:noSleeve.id,replacementId:sleeve.id,matchMode:'asset'}]],
    ['remove an undershirt',[{action:'replace',sourceId:find('InnerShirt',asset=>asset==='Gear_Undershirt_CompressionTCrewSleeveless').id,replacementId:noShirt.id,matchMode:'asset'}]],
    ['queue sleeves and undershirt',[{action:'copy',replacementId:sleeve.id,pairSides:true,replacementPairId:pair.id},{action:'copy',replacementId:shirt.id}]]
  ];
  for(const [index,[name,base]] of scenarios.entries())await t.test(name,async()=>{
    const chosen=candidates.map(target=>({target,rules:targetRules(base,target)})).find(({target,rules})=>{const result=buildMapperPreview([target],library,rules);return result.blocked.length===0&&result.compatibilityWarnings.length===0&&result.changes.length===1;});
    assert.ok(chosen,'A compatible WR target is available for '+name);
    const caseDirectory=path.join(directory,String(index));fs.mkdirSync(caseDirectory);const savePath=path.join(caseDirectory,'DYNASTY-MAPPER');fs.copyFileSync(fixture,savePath);
    const context={savePath,schemaPath,reports:new ReportService(path.join(caseDirectory,'reports'))},options={mods,fingerprint:originalHash,rules:chosen.rules};
    const result=await runEquipmentMapper({...context,mode:'preview',options}),plan=takePlan(result.planId);assert.equal(fileHash(savePath),originalHash);assert.equal(result.details.canApply,true);assert.equal(plan.previewRows.length,1);assert.equal(plan.previewRows[0].row,chosen.target.row);
    const expected=new Map(plan.assignments.map(change=>[change.row,change.newValue]));assert.equal(expected.size,1);
    const changed=JSON.parse(expected.get(chosen.target.visualRow)),previous=JSON.parse(chosen.target.rawData),changedSlots=new Set(plan.previewRows[0].edits.map(edit=>edit.slot));
    for(let loadout=0;loadout<previous.loadouts.length;loadout++){
      const original=previous.loadouts[loadout],retained=original.loadoutElements?.filter(element=>!/(?:^|_)None$/i.test(element.itemAssetName));
      if(original.loadoutType!=='PlayerOnField'){const plannedSlots=new Set(plan.previewRows[0].edits.filter(edit=>edit.loadout===loadout).map(edit=>edit.slot));assert.deepEqual({...changed.loadouts[loadout],...(Array.isArray(changed.loadouts[loadout].loadoutElements)?{loadoutElements:changed.loadouts[loadout].loadoutElements.filter(element=>!plannedSlots.has(element.slotType))}:{})},{...original,...(retained?{loadoutElements:retained.filter(element=>!plannedSlots.has(element.slotType))}:{})},'Non-player/Base layers preserve every unplanned non-placeholder value');}
      else for(const element of retained??[])if(!changedSlots.has(element.slotType))assert.deepEqual(changed.loadouts[loadout].loadoutElements.find(item=>item.slotType===element.slotType&&item.itemAssetName===element.itemAssetName),element,'Every unrelated worn item and its metadata is preserved');
    }
    const applied=await runEquipmentMapper({...context,mode:'apply',options:{planId:result.planId}});assert.equal(fileHash(applied.backupPath),originalHash);assert.equal(applied.status,'completed');
    const reopened=await loadEquipmentTables(savePath,schemaPath,true,false),after=snapshotVisualRawData(reopened.visuals.records);
    for(const [row,raw]of before)if(typeof raw==='string')assert.deepEqual(JSON.parse(after.get(row)),JSON.parse(expected.get(row)??raw),'Exact target/untouched appearance '+row);
    for(const table of reopened.franchise.tables)if(otherTables.has(table.header.tableId))assert.equal(hash(table.data),otherTables.get(table.header.tableId),'Untouched table '+table.name);
    assert.equal(fs.statSync(savePath).size,fs.statSync(fixture).size);assert.equal(fileHash(fixture),originalHash);
    await assert.rejects(runEquipmentMapper({...context,mode:'apply',options:{planId:result.planId}}),/already been applied/);
  });
  await t.test('stale prepared library is rejected before a write or backup',async()=>{
    const savePath=path.join(directory,'DYNASTY-STALE');fs.copyFileSync(fixture,savePath);
    await assert.rejects(runEquipmentMapper({savePath,schemaPath,reports:new ReportService(path.join(directory,'reports-stale')),mode:'preview',options:{fingerprint:'0'.repeat(64),rules:[{action:'copy',replacementId:sleeve.id,scope:'all'}]}}),/out of date/);assert.equal(fileHash(savePath),originalHash);
  });
});
