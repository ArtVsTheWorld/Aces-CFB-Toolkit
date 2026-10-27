import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {openCfb27Save,readTables,PLAYER_TABLE_UID,TEAM_TABLE_UID} from '../src/main/services/save.js';
import {runTeamBoost,prepareTeamBoost} from '../src/main/tools/teamBoost/runner.js';
import {SUPPORTED_ATTRIBUTES,POSITION_RELEVANT_RATINGS} from '../src/main/tools/teamBoost/core.js';
import {PHYSICAL_RATING_FIELDS} from '../src/main/tools/teamBoost/ratingWeights.js';
import {takePlan} from '../src/main/tools/jersey/planStore.js';
import {ReportService} from '../src/main/services/reports.js';
const fixture=path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'),schemaPath=path.resolve('resources/engine-data/C27_486_6.gz');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),fileHash=file=>hash(fs.readFileSync(file));
const open=async file=>{const opened=await openCfb27Save(file,schemaPath);return {...opened,...await readTables(opened.franchise,{players:PLAYER_TABLE_UID,teams:TEAM_TABLE_UID})};};

test('Boise State WRs receive all three route boosts, exact Apply/reopen and unrelated ratings/players/tables stay intact',{timeout:180000,skip:!fs.existsSync(fixture)},async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-position-boost-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const savePath=path.join(directory,'DYNASTY-BOOST');fs.copyFileSync(fixture,savePath);const originalHash=fileHash(fixture),context={savePath,schemaPath,reports:new ReportService(path.join(directory,'reports'))};
  const prepared=await prepareTeamBoost(context),team=prepared.teams.find(team=>/boise/i.test(team.name));assert.ok(team,'Pristine fixture contains Boise State');
  let before=await open(savePath);const fields=[...SUPPORTED_ATTRIBUTES,'FirstName','LastName','JerseyNum','Position','SchoolYear','PlayerType','PLYR_ASSETNAME','CharacterVisuals'];
  const snapshots=before.players.records.map(record=>record&&!record.isEmpty?Object.fromEntries(fields.map(field=>[field,record[field]])):null),otherTables=new Map(before.franchise.tables.filter(table=>table!==before.players).map(table=>[table.header.tableId,hash(table.data)])),targets=[];
  before.players.records.forEach((record,row)=>{if(record&&!record.isEmpty&&Number(record.TeamIndex)===Number(team.teamIndex)&&record.Position==='WR')targets.push(row);});assert.ok(targets.length>0);before=null;
  const preview=await runTeamBoost({...context,mode:'preview',options:{teams:[team.name],positions:['WR'],ratingMode:'nonphysical',minimum:2,maximum:2}});assert.equal(fileHash(savePath),originalHash);
  const plan=takePlan(preview.planId),expected=new Map(plan.assignments.map(change=>[change.row+'|'+change.field,change.newValue]));
  for(const row of targets)for(const field of ['ShortRouteRunningRating','MediumRouteRunningRating','DeepRouteRunningRating']){
    const old=snapshots[row][field];if(old<99)assert.equal(expected.get(row+'|'+field),Math.min(99,old+2),'Every Boise WR '+field);
  }
  assert.ok(plan.assignments.every(change=>targets.includes(change.row)&&POSITION_RELEVANT_RATINGS.WR.includes(change.field)&&!PHYSICAL_RATING_FIELDS.has(change.field)));
  const applied=await runTeamBoost({...context,mode:'apply',options:{planId:preview.planId}});assert.equal(fileHash(applied.backupPath),originalHash);assert.equal(applied.status,'completed');
  const after=await open(savePath);for(let row=0;row<snapshots.length;row++)if(snapshots[row])for(const field of fields)assert.equal(after.players.records[row][field],expected.get(row+'|'+field)??snapshots[row][field],'Exact planned/unplanned player '+row+' '+field);
  for(const table of after.franchise.tables)if(otherTables.has(table.header.tableId))assert.equal(hash(table.data),otherTables.get(table.header.tableId),'Unchanged table '+table.name);
  assert.equal(fs.statSync(savePath).size,fs.statSync(fixture).size);assert.equal(fileHash(fixture),originalHash);
});
