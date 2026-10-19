// Private EXAMPLE SAVES integration. All writes go to owned temporary copies.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runRosterGenerator,prepareRosterGenerator} from '../src/main/tools/rosterGenerator/runner.js';
import {saveFingerprint,searchPlanRows} from '../src/main/tools/jersey/planStore.js';
import {loadEquipmentTables,snapshotVisualRawData} from '../src/main/tools/equipment/shared.js';
import {snapshotVisualsForVerification,saveEquipmentCandidate} from '../src/main/tools/equipment/visualsSafety.js';
import {snapshotProtectedPlayers,verifyProtectedPlayers} from '../src/main/tools/rosterGenerator/safety.js';
import {HEALTHY_FIELDS} from '../src/main/tools/rosterGenerator/playerState.js';
import {pitchMatches} from '../src/main/tools/dealbreaker/pitches.js';
import {WRITE_FIELDS} from '../src/main/tools/rosterGenerator/contract.js';
import {writeCsv} from '../src/main/services/files.js';
import {parseCsv} from '../src/main/services/reportAudit.js';

const fixture=path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'),schemaPath=path.resolve('resources/engine-data/C27_486_6.gz'),defaultMapPath=path.resolve('resources/commentary-data/PlayerCommentaryidMap.txt');
function setup(t){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-v205-app-test-')),savePath=path.join(directory,'DYNASTY-APP-TEST');fs.copyFileSync(fixture,savePath);let reports=0;
  t.after(()=>{if(path.dirname(directory)!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith('cfb-v205-app-test-'))throw new Error('Unsafe test cleanup.');fs.rmSync(directory,{recursive:true,force:true});});
  return {directory,savePath,context:{savePath,schemaPath,defaultMapPath,reports:{create:report=>writeCsv(path.join(directory,`report-${++reports}.csv`),report.headings,report.rows)}}};
}
test('multi-team app Preview/Apply/reload preserves protected fields, exact previews, backups, reports and deterministic order',{timeout:90000,skip:!fs.existsSync(fixture)},async t=>{
  const {context,savePath}=setup(t),original=saveFingerprint(savePath),sourceHash=saveFingerprint(fixture),options={teams:['LSU','Navy'],preset:'building-blocks',rosterAge:'seniors',seed:205};
  const prepared=await prepareRosterGenerator(context);assert.equal(prepared.presets.length,7);assert.ok(prepared.teams.some(team=>team.name==='Navy'));
  const before=await loadEquipmentTables(savePath,schemaPath,true,false),a=await runRosterGenerator({...context,mode:'preview',options}),b=await runRosterGenerator({...context,mode:'preview',options:{...options,teams:[...options.teams].reverse()}});
  assert.equal(saveFingerprint(savePath),original);assert.notEqual(a.details.seed,b.details.seed);assert.notDeepEqual(a.details.changes,b.details.changes);assert.equal(a.details.canApply,true);assert.equal(a.details.totalPreviewRows,170);
  const rows=searchPlanRows(a.planId,'').changes,protectedPlayers=snapshotProtectedPlayers(before.players,new Set(rows.map(row=>row.row)));
  assert.equal(searchPlanRows(a.planId,'',1000,{team:'Navy',position:'FB'}).totalMatches,4);
  await assert.rejects(()=>runRosterGenerator({...context,mode:'apply',options:{planId:a.planId}}),/Confirm/);assert.equal(saveFingerprint(savePath),original);
  const applied=await runRosterGenerator({...context,mode:'apply',options:{planId:a.planId,confirmRegeneration:true}});assert.equal(applied.status,'completed');assert.equal(saveFingerprint(applied.backupPath),original);assert.equal(saveFingerprint(fixture),sourceHash);assert.equal(fs.statSync(savePath).size,fs.statSync(applied.backupPath).size);
  const reopened=await loadEquipmentTables(savePath,schemaPath,true,false);verifyProtectedPlayers(protectedPlayers,reopened.players);
  const oldIds=new Set(before.players.records.filter(p=>!p.isEmpty).map(p=>p.PresentationId)),newIds=new Set(),historyFields=before.players.offsetTable.filter(f=>/Stats|Award/.test(f.name)).map(f=>f.name);
  assert.ok(WRITE_FIELDS.every(name=>before.players.offsetTable.some(f=>f.name===name)));
  for(const row of rows){const p=reopened.players.records[row.row];assert.ok(!oldIds.has(p.PresentationId));assert.ok(!newIds.has(p.PresentationId));newIds.add(p.PresentationId);assert.ok(p.PLYR_ASSETNAME.endsWith('_'+p.PresentationId));assert.ok(pitchMatches(p.RecruitingDealbreaker,p.IdealRecruitingPitch));for(const [field,value]of Object.entries(HEALTHY_FIELDS))assert.equal(p[field],value,field);for(const field of historyFields)assert.equal(p[field],before.players.records[row.row][field],field);}
  for(const name of ['LSU','Navy']){const team=before.teams.records.find(t=>!t.isEmpty&&t.DisplayName===name),generated=rows.filter(r=>r.team===name);assert.equal(generated.filter(r=>r.fields.PLYR_ISCAPTAIN).length,Math.min(team.DesiredTeamCaptains,generated.length));assert.ok(generated.every(r=>r.fields.CaptainsPatch===(r.fields.PLYR_ISCAPTAIN?'OneYear':'None')));}
  for(const row of rows){for(const field of WRITE_FIELDS)assert.equal(reopened.players.records[row.row][field],row.fields[field],`${row.row}/${field}`);assert.deepEqual(JSON.parse(reopened.visuals.records[row.visualRow].RawData),JSON.parse(row.rawData));assert.equal(row.fields.SchoolYear,'Senior');assert.equal(row.fields.RedshirtStatus,'Previous');}
  const [headings,...csv]=parseCsv(fs.readFileSync(applied.reportPath,'utf8'));assert.equal(csv.length,170);assert.ok(headings.includes('CalibrationJSON'));assert.ok(headings.includes('BeforeRawData'));assert.ok(headings.includes('AfterRawData'));assert.ok(headings.includes('PlayerStateJSON'));
  await assert.rejects(()=>runRosterGenerator({...context,mode:'apply',options:{planId:a.planId,confirmRegeneration:true}}),/already been applied/);
  await assert.rejects(()=>runRosterGenerator({...context,mode:'apply',options:{planId:b.planId,confirmRegeneration:true}}),/save changed/);
});
test('invalid scopes, stale saves and interrupted candidate verification cannot replace the source',{timeout:90000,skip:!fs.existsSync(fixture)},async t=>{
  const {context,savePath}=setup(t),original=saveFingerprint(savePath);
  for(const options of [{teams:[]},{teams:['Nonexistent']},{teams:['LSU'],positionStrength:{QB:1.5}},{teams:['LSU'],preset:'missing'}])await assert.rejects(()=>runRosterGenerator({...context,mode:'preview',options}));
  assert.equal(saveFingerprint(savePath),original);
  const loaded=await loadEquipmentTables(savePath,schemaPath,true,false),before=snapshotVisualsForVerification(loaded.visuals,snapshotVisualRawData(loaded.visuals.records)),player=loaded.players.records.find(record=>!record.isEmpty),oldValue=player.SpeedRating;
  player.SpeedRating=oldValue===99?98:99;
  await assert.rejects(()=>saveEquipmentCandidate(loaded,schemaPath,before,[{table:'players',row:player.index,field:'SpeedRating',oldValue,newValue:player.SpeedRating}],original,()=>{throw new Error('Injected validation interruption');}),/Injected validation interruption/);
  assert.equal(saveFingerprint(savePath),original);assert.ok(!fs.readdirSync(path.dirname(savePath)).some(name=>name.startsWith('.ace-equipment-')));
});
test('protected-bit guard catches unplanned player/reference changes without reading Age',{timeout:60000,skip:!fs.existsSync(fixture)},async t=>{
  const {savePath}=setup(t),loaded=await loadEquipmentTables(savePath,schemaPath,true,false),player=loaded.players.records.find(record=>!record.isEmpty),snapshot=snapshotProtectedPlayers(loaded.players,new Set([player.index]));
  player.SpeedRating=player.SpeedRating===99?98:99;assert.doesNotThrow(()=>verifyProtectedPlayers(snapshot,loaded.players));
  player.TeamIndex=Number(player.TeamIndex)===1?2:1;assert.throws(()=>verifyProtectedPlayers(snapshot,loaded.players),/protected player data/);
});
