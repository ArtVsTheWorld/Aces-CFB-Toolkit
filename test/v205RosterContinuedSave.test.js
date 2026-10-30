// Private EXAMPLE SAVES: every mutation is made on an owned temporary copy.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runRosterGenerator,prepareRosterGenerator} from '../src/main/tools/rosterGenerator/runner.js';
import {loadEquipmentTables,SEASON_INFO_TABLE_UID} from '../src/main/tools/equipment/shared.js';
import {readTables} from '../src/main/services/save.js';
import {saveFingerprint,searchPlanRows} from '../src/main/tools/jersey/planStore.js';
import {writeCsv} from '../src/main/services/files.js';
import {parseCsv} from '../src/main/services/reportAudit.js';
import {WRITE_FIELDS} from '../src/main/tools/rosterGenerator/contract.js';
const fixture=path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'),schemaPath=path.resolve('resources/engine-data/C27_486_6.gz');
function copy(t){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-roster-continued-')),savePath=path.join(directory,'DYNASTY-TEST');fs.copyFileSync(fixture,savePath);t.after(()=>{if(path.dirname(directory)!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith('cfb-roster-continued-'))throw new Error('Unsafe cleanup target.');fs.rmSync(directory,{recursive:true,force:true});});let n=0;return {savePath,schemaPath,reports:{create:report=>writeCsv(path.join(directory,`report-${++n}.csv`),report.headings,report.rows)}};}
test('custom talent/scheme/tone preview applies exactly with automatic seeds, finishing fixes, backups and diagnostic reports',{skip:!fs.existsSync(fixture),timeout:90000},async t=>{
  const context=copy(t),original=saveFingerprint(context.savePath),fixtureHash=saveFingerprint(fixture),options={teams:['LSU','Navy'],preset:'blue-blood',positionStrength:{QB:6,OL:-2,LB:3},offensiveScheme:'spread',defensiveScheme:'DEF_BASE3_4',skinTonePreset:'hbcu',rosterAge:'veteran',rosterPotential:'high',seed:1};
  const a=await runRosterGenerator({...context,mode:'preview',options}),b=await runRosterGenerator({...context,mode:'preview',options});assert.notEqual(a.details.seed,b.details.seed);assert.notEqual(a.details.seed,1);assert.equal(a.details.canApply,true,JSON.stringify(a.details.blocking));assert.equal(saveFingerprint(context.savePath),original);
  for(const team of a.details.teams){assert.ok(Math.abs(team.newAverage-79)<.1);assert.ok(team.positionStrength.QB.actual>80);assert.equal(team.finishing.jersey.retiredProtection,false);assert.equal(team.finishing.jersey.teamTraditions,false);}
  const rows=searchPlanRows(a.planId,'').changes,applied=await runRosterGenerator({...context,mode:'apply',options:{planId:a.planId,confirmRegeneration:true}}),after=await loadEquipmentTables(context.savePath,schemaPath,true,false);
  for(const row of rows){assert.equal(row.fields.LongSnapRating,0);assert.ok(row.backstory?.text);assert.ok(row.backstory?.eligibility);for(const field of WRITE_FIELDS)assert.equal(after.players.records[row.row][field],row.fields[field],`${row.row}/${field}`);assert.deepEqual(JSON.parse(after.visuals.records[row.visualRow].RawData),JSON.parse(row.rawData));}
  const [headings,...csv]=parseCsv(fs.readFileSync(applied.reportPath,'utf8'));for(const field of ['GenerationSettingsJSON','NamePoolJSON','SkinTone','FinishingChangesJSON','PositionTalentJSON','PotentialSource','AthleticismProfile','SurnameEvidenceJSON','BackstoryID','BackstoryText','BackstoryJSON','OutlierSize'])assert.ok(headings.includes(field));assert.equal(csv.length,170);assert.equal(saveFingerprint(applied.backupPath),original);assert.equal(saveFingerprint(fixture),fixtureHash);
});
test('prepare, preview and Apply support regular-season rosters while offseason requests remain blocked',{skip:!fs.existsSync(fixture),timeout:90000},async t=>{
  const context=copy(t),loaded=await loadEquipmentTables(context.savePath,schemaPath,true,false),{seasonInfo}=await readTables(loaded.franchise,{seasonInfo:SEASON_INFO_TABLE_UID}),season=seasonInfo.records.find(record=>!record.isEmpty);
  season.CurrentWeekType='RegularSeason';season.CurrentWeek=8;await loaded.franchise.save();const hash=saveFingerprint(context.savePath);
  const prepared=await prepareRosterGenerator(context);assert.equal(prepared.season.currentWeek,8);assert.equal(prepared.season.currentWeekType,'RegularSeason');
  const preview=await runRosterGenerator({...context,mode:'preview',options:{teams:['LSU']}});assert.equal(preview.details.canApply,true);assert.equal(saveFingerprint(context.savePath),hash);
  const rows=searchPlanRows(preview.planId,'').changes,applied=await runRosterGenerator({...context,mode:'apply',options:{planId:preview.planId,confirmRegeneration:true}}),reopened=await loadEquipmentTables(context.savePath,schemaPath,true,false);
  for(const row of rows){for(const field of WRITE_FIELDS)assert.equal(reopened.players.records[row.row][field],row.fields[field]);assert.deepEqual(JSON.parse(reopened.visuals.records[row.visualRow].RawData),JSON.parse(row.rawData));}
  const savedSeason=(await readTables(reopened.franchise,{seasonInfo:SEASON_INFO_TABLE_UID})).seasonInfo.records.find(record=>!record.isEmpty);assert.equal(savedSeason.CurrentWeek,8);assert.equal(savedSeason.CurrentWeekType,'RegularSeason');assert.equal(saveFingerprint(applied.backupPath),hash);
  savedSeason.CurrentWeekType='OffSeason';savedSeason.CurrentWeek=0;await reopened.franchise.save();const offseasonHash=saveFingerprint(context.savePath);
  await assert.rejects(()=>prepareRosterGenerator(context),/Roster Generator is available.*National Championship/);await assert.rejects(()=>runRosterGenerator({...context,mode:'preview',options:{teams:['LSU']}}),/Roster Generator is available.*National Championship/);assert.equal(saveFingerprint(context.savePath),offseasonHash);
});
