// Private EXAMPLE SAVES integration. All writes target disposable copies.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {prepareEquipmentMapper,runEquipmentMapper,mapperPlayers} from '../src/main/tools/equipmentMapper/runner.js';
import {runRosterGenerator} from '../src/main/tools/rosterGenerator/runner.js';
import {loadEquipmentTables,snapshotVisualRawData} from '../src/main/tools/equipment/shared.js';
import {saveEquipmentCandidate,snapshotVisualsForVerification} from '../src/main/tools/equipment/visualsSafety.js';
import {takePlan,saveFingerprint} from '../src/main/tools/jersey/planStore.js';
import {sf} from '../src/main/tools/equipment/openSave.js';
import {writeCsv} from '../src/main/services/files.js';
const fixture=path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'),schemaPath=path.resolve('resources/engine-data/C27_486_6.gz');
function copyContext(t,prefix){const directory=fs.mkdtempSync(path.join(os.tmpdir(),prefix));t.after(()=>{if(path.dirname(directory)!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith(prefix))throw Error('Unsafe cleanup');fs.rmSync(directory,{recursive:true,force:true});});const savePath=path.join(directory,'DYNASTY-TEST');fs.copyFileSync(fixture,savePath);let n=0;return {savePath,schemaPath,reports:{create:data=>writeCsv(path.join(directory,`report-${++n}.csv`),data.headings,data.rows)}};}
test('Mapper exact Preview/Apply/reopen, backup, stale-plan rejection and untouched player data',{timeout:120000,skip:!fs.existsSync(fixture)},async t=>{
  const context=copyContext(t,'cfb-v215-mapper-'),source=saveFingerprint(fixture),before=saveFingerprint(context.savePath),prepared=await prepareEquipmentMapper(context);
  const item=prepared.items.find(item=>item.asset==='Gear_Socks_Low'&&item.wearers.some(row=>prepared.players.some(player=>player.row===row&&!player.shared))),replacement=prepared.items.find(item=>item.asset==='Gear_Socks_Mid'&&item.copyable);assert.ok(item&&replacement);
  const playerRows=item.wearers.filter(row=>prepared.players.some(player=>player.row===row&&!player.shared)).slice(0,5),playerIdentities=prepared.players.filter(player=>playerRows.includes(player.row)).map(({row,player,team})=>({row,player,team}));
  const options={fingerprint:prepared.fingerprint,rules:[{action:'replace',sourceId:item.id,replacementId:replacement.id,matchMode:'exact',playerRows,playerIdentities}]};
  const preview=await runEquipmentMapper({...context,mode:'preview',options});assert.equal(preview.details.canApply,true,JSON.stringify(preview.details.blocked));assert.equal(preview.details.totalPreviewRows,playerRows.length);assert.equal(saveFingerprint(context.savePath),before);
  const again=await runEquipmentMapper({...context,mode:'preview',options});assert.deepEqual(takePlan(again.planId).assignments,takePlan(preview.planId).assignments);
  const plan=takePlan(preview.planId),applied=await runEquipmentMapper({...context,mode:'apply',options:{planId:preview.planId}});assert.equal(applied.status,'completed');assert.equal(saveFingerprint(applied.backupPath),before);const reopened=await loadEquipmentTables(context.savePath,schemaPath);
  for(const assignment of plan.assignments)assert.deepEqual(JSON.parse(sf(reopened.visuals.records[assignment.row],'RawData')),JSON.parse(assignment.newValue));
  const after=saveFingerprint(context.savePath);await assert.rejects(runEquipmentMapper({...context,mode:'apply',options:{planId:again.planId}}),/changed after Preview/);assert.equal(saveFingerprint(context.savePath),after);await assert.rejects(runEquipmentMapper({...context,mode:'apply',options:{planId:preview.planId}}),/already been applied/);assert.equal(saveFingerprint(fixture),source);
});
test('Mapper discovers implicit facemasks and persists a same-slot replacement without changing other gear',{timeout:120000,skip:!fs.existsSync(fixture)},async t=>{
  const context=copyContext(t,'cfb-v215-facemask-'),original=saveFingerprint(fixture),before=saveFingerprint(context.savePath),prepared=await prepareEquipmentMapper(context),loaded=await loadEquipmentTables(context.savePath,schemaPath);
  const source=prepared.items.find(item=>item.asset==='GearFaceMask_Speedflex2Bar'&&item.copyable&&item.implicitOccurrences>0),replacement=prepared.items.find(item=>item.asset==='GearFaceMask_Speedflex2Bar_WR'&&item.copyable);assert.ok(source&&replacement);
  const player=mapperPlayers(loaded).find(player=>!player.shared&&source.wearers.includes(player.row)&&JSON.parse(player.rawData).loadouts.some(loadout=>loadout.loadoutType==='PlayerOnField'&&loadout.loadoutElements?.some(element=>!element.slotType&&element.itemAssetName===source.asset)));assert.ok(player);
  const preview=await runEquipmentMapper({...context,mode:'preview',options:{fingerprint:prepared.fingerprint,rules:[{action:'replace',sourceId:source.id,replacementId:replacement.id,matchMode:'asset',scope:'selected',playerRows:[player.row],playerIdentities:[{row:player.row,player:player.player,team:player.team}]}]}});
  assert.equal(preview.details.canApply,true,JSON.stringify(preview.details.blocked));assert.equal(preview.details.totalPreviewRows,1);assert.equal(preview.details.changes[0].changes[0].currentValue,source.name);assert.equal(saveFingerprint(context.savePath),before);
  const plan=takePlan(preview.planId);for(const edit of plan.previewRows[0].edits)assert.equal(edit.slot,'FaceMask');
  const assignment=plan.assignments[0],oldRaw=JSON.parse(assignment.oldValue),newRaw=JSON.parse(assignment.newValue),withoutMask=raw=>({...raw,loadouts:raw.loadouts.map(loadout=>({...loadout,...(Array.isArray(loadout.loadoutElements)?{loadoutElements:loadout.loadoutElements.filter(element=>element.slotType!=='FaceMask'&&element.itemAssetName!==source.asset&&element.itemAssetName!==replacement.asset)}:{})}))});assert.deepEqual(withoutMask(newRaw),withoutMask(oldRaw));
  const applied=await runEquipmentMapper({...context,mode:'apply',options:{planId:preview.planId}}),reopened=await loadEquipmentTables(context.savePath,schemaPath);assert.equal(saveFingerprint(applied.backupPath),before);assert.deepEqual(JSON.parse(sf(reopened.visuals.records[assignment.row],'RawData')),newRaw);assert.equal(saveFingerprint(fixture),original);
});

test('regeneration preserves funded team NIL totals exactly across Preview/Apply/reopen',{timeout:180000,skip:!fs.existsSync(fixture)},async t=>{
  const context=copyContext(t,'cfb-v215-roster-'),loaded=await loadEquipmentTables(context.savePath,schemaPath),rows=mapperPlayers(loaded).filter(player=>['Georgia','LSU'].includes(player.team)),before=snapshotVisualsForVerification(loaded.visuals,snapshotVisualRawData(loaded.visuals.records)),fingerprint=saveFingerprint(context.savePath);
  const funding=rows.map((player,index)=>({table:'players',row:player.row,field:'CurrentNILCompensation',oldValue:sf(loaded.players.records[player.row],'CurrentNILCompensation'),newValue:5*(10+index%17)}));
  for(const item of funding)loaded.players.records[item.row][item.field]=item.newValue;
  await saveEquipmentCandidate(loaded,schemaPath,before,funding,fingerprint);
  const funded=saveFingerprint(context.savePath),expected=Object.fromEntries(['Georgia','LSU'].map(team=>[team,rows.filter(player=>player.team===team).reduce((sum,player)=>sum+funding.find(item=>item.row===player.row).newValue,0)]));
  const preview=await runRosterGenerator({...context,mode:'preview',options:{teams:['Georgia','LSU'],preset:'building-blocks'}});assert.equal(preview.details.canApply,true,JSON.stringify(preview.details.blocking));
  for(const team of preview.details.teams)assert.deepEqual(team.nilBudget,{before:expected[team.team],after:expected[team.team]});
  const plan=takePlan(preview.planId),tampered=plan.rosters[0].players[0];tampered.fields.CurrentNILCompensation++;await assert.rejects(runRosterGenerator({...context,mode:'apply',options:{planId:preview.planId,confirmRegeneration:true}}),/NIL compensation/);assert.equal(saveFingerprint(context.savePath),funded);tampered.fields.CurrentNILCompensation--;
  const applied=await runRosterGenerator({...context,mode:'apply',options:{planId:preview.planId,confirmRegeneration:true}});assert.equal(saveFingerprint(applied.backupPath),funded);const reopened=await loadEquipmentTables(context.savePath,schemaPath);
  for(const roster of plan.rosters){
    assert.equal(roster.players.reduce((sum,player)=>sum+sf(reopened.players.records[player.row],'CurrentNILCompensation'),0),expected[roster.team.name]);
    for(const player of roster.players){
      assert.equal(sf(reopened.players.records[player.row],'CurrentNILCompensation'),player.fields.CurrentNILCompensation);
      assert.equal(sf(reopened.players.records[player.row],'BaseNILValue'),player.fields.CurrentNILCompensation);
    }
  }
});
