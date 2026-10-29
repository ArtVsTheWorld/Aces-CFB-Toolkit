// Private EXAMPLE SAVES; all changes use owned temporary copies.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {readSaveMetadata,readToolHomeContext} from '../src/main/services/saveMetadata.js';
import {readDynastyIdentity} from '../src/main/services/dynastyIdentity.js';
import {readHomeContext} from '../src/main/services/homeContext.js';
import {loadEquipmentTables,SEASON_INFO_TABLE_UID} from '../src/main/tools/equipment/shared.js';
import {readTables} from '../src/main/services/save.js';
import {saveFingerprint} from '../src/main/tools/jersey/planStore.js';
import {prepareEquipmentTool} from '../src/main/tools/equipment/runner.js';

const source=path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'),schemaPath=path.resolve('resources/engine-data/C27_486_6.gz'),schemaDirectory=path.dirname(schemaPath);
test('detached metadata is immutable to callers and refreshes for changed contents at the same path',{timeout:60000,skip:!fs.existsSync(source)},async t=>{
  const original=saveFingerprint(source),directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-metadata-')),savePath=path.join(directory,'DYNASTY-TEST');
  t.after(()=>{if(path.dirname(directory)!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith('cfb-metadata-'))throw Error('Unsafe cleanup');fs.rmSync(directory,{recursive:true,force:true});});
  fs.copyFileSync(source,savePath);
  const expected=await readHomeContext(savePath,schemaPath),a=await readToolHomeContext(savePath,schemaPath);
  assert.deepEqual(a,expected);a.teams[0].name='Caller mutation';a.season.week=999;
  assert.deepEqual(await readToolHomeContext(savePath,schemaPath),expected);
  assert.equal(await readDynastyIdentity(savePath,schemaDirectory),expected.dynastyId);
  const loaded=await loadEquipmentTables(savePath,schemaPath,false,false);assert.equal(loaded.visuals,undefined);
  const {seasonInfo,franchiseInfo}=await readTables(loaded.franchise,{seasonInfo:SEASON_INFO_TABLE_UID,franchiseInfo:2226370608});
  const season=seasonInfo.records.find(record=>!record.isEmpty),league=franchiseInfo.records.find(record=>!record.isEmpty),stat=fs.statSync(savePath);
  season.CurrentWeekType='RegularSeason';season.CurrentWeek=8;league.LeagueID=expected.dynastyId===2147483647?1:expected.dynastyId+1;
  const newId=league.LeagueID;await loaded.franchise.save();fs.utimesSync(savePath,stat.atime,stat.mtime);
  assert.notEqual(saveFingerprint(savePath),original);
  assert.equal(await readDynastyIdentity(savePath,schemaDirectory),newId);
  const changed=await readToolHomeContext(savePath,schemaPath);assert.equal(changed.season.week,8);assert.equal(changed.dynastyId,newId);
  const renamed=path.join(directory,'RENAMED-SAME-DYNASTY');fs.copyFileSync(savePath,renamed);
  assert.deepEqual(await readSaveMetadata(renamed,schemaDirectory),await readSaveMetadata(savePath,schemaDirectory));
  const patcher=await prepareEquipmentTool({savePath,schemaPath,toolId:'equipment-patcher'});assert.deepEqual(patcher.donorPlayers,[]);assert.ok(patcher.removalCatalog.length);assert.ok(patcher.teams.some(team=>team.name==='LSU'));
  assert.equal(saveFingerprint(source),original);
});
