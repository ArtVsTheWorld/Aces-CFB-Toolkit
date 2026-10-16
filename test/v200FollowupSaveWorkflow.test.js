import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { openCfb27Save, tableByUniqueId } from '../src/main/services/save.js';
import { loadEquipmentTables, SEASON_INFO_TABLE_UID, snapshotVisualRawData } from '../src/main/tools/equipment/shared.js';
import { prepareEquipmentTool, runEquipmentPatcher, runFreshmanEquipment } from '../src/main/tools/equipment/runner.js';
import { clearPlayerTattoos, hasUnlockedBodyTattoo } from '../src/main/tools/equipment/core/tattoos.js';
import { ReportService } from '../src/main/services/reports.js';
import { parseCsv } from '../src/main/services/reportAudit.js';
import { takePlan } from '../src/main/tools/jersey/planStore.js';

const source = path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN');
const schemaPath = path.resolve('resources/engine-data/C27_486_6.gz');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function copy(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfb-v200-bowls-'));
  t.after(() => fs.rmSync(directory, {recursive:true,force:true}));
  const savePath = path.join(directory,'DYNASTY-TEST'); fs.copyFileSync(source,savePath);
  return {savePath,schemaPath,reports:new ReportService(path.join(directory,'reports')),sourceHash:hash(source)};
}
async function applyExact(run, context, options) {
  const before = await loadEquipmentTables(context.savePath,schemaPath), oldRows = snapshotVisualRawData(before.visuals.records), original = hash(context.savePath);
  const preview = await run({...context,mode:'preview',options});
  assert.equal(hash(context.savePath),original,'Preview does not write');
  const plan = takePlan(preview.planId); assert.ok(plan.assignments.length>0);
  assert.ok(plan.assignments.every(change=>change.table==='visuals'&&change.field==='RawData'));
  const applied = await run({...context,mode:'apply',options:{planId:preview.planId}});
  assert.equal(hash(applied.backupPath),original);
  const after = await loadEquipmentTables(context.savePath,schemaPath), expected = new Map(plan.assignments.map(change=>[change.row,change.newValue]));
  for(const [row,raw] of oldRows) if(typeof raw==='string') assert.equal(after.visuals.records[row].RawData,expected.get(row)??raw,'Exact equipment row '+row);
  // Compact fingerprints avoid retaining millions of assertion objects or
  // dumping an entire linked franchise object if an assertion fails.
  const recordHash = record => {
    const value = createHash('sha256').update(JSON.stringify(Object.keys(record._fields).map(field=>[field,record[field]]))).digest('hex');
    record.clearCachedFieldValues(); return value;
  };
  for(const [row,record] of before.players.records.entries()) if(!record.isEmpty) assert.equal(recordHash(after.players.records[row]),recordHash(record),'No player field changed: '+row);
  assert.equal(hash(source),context.sourceHash,'Source fixture untouched');
  return {preview,applied,assignments:plan.assignments,season:after.season};
}
test('real BowlSeason1 week 17 supports Randomizer Prepare/Preview/Apply and exact reopen', {timeout:120000}, async t=>{
  const context = copy(t), opened = await openCfb27Save(context.savePath,schemaPath), table = tableByUniqueId(opened.franchise,SEASON_INFO_TABLE_UID);
  await table.readRecords(); const season = table.records.find(record=>!record.isEmpty); season.CurrentWeekType='BowlSeason1';season.CurrentWeek=17;await opened.franchise.save();
  assert.ok((await prepareEquipmentTool(context)).teams.length>0);
  const result=await applyExact(runFreshmanEquipment,context,{includedTeams:['LSU'],positions:['TE'],classes:['Freshman','Sophomore','Junior'],redshirtGroup:'all',skipNilPlayers:false,top:3,crossPositionPercent:0,multipleDonorPercent:40});
  assert.equal(result.season.currentWeekType,'BowlSeason1');assert.equal(result.season.currentWeek,17);
});
test('tattoo Add then Clear uses exact cached Patcher plans, preserves all non-tattoo data and reports removals', {timeout:120000}, async t=>{
  const context = copy(t), scope = {includedTeams:['LSU'],positions:['WR'],skipNilPlayers:false};
  const added=await applyExact(runEquipmentPatcher,context,{...scope,unlockedTattooFix:true,unlockedTattooCap:100});
  assert.ok(added.preview.details.unlockedTattooPlayersChanged>0);
  const cleared=await applyExact(runEquipmentPatcher,context,{...scope,clearTattoos:true});
  assert.ok(cleared.preview.details.clearedTattooPlayers>0);
  for(const assignment of cleared.assignments) {
    const expected=JSON.parse(assignment.oldValue); assert.ok(clearPlayerTattoos(expected));
    assert.deepEqual(JSON.parse(assignment.newValue),expected); assert.equal(hasUnlockedBodyTattoo(expected),false);
  }
  const [headings,...rows] = parseCsv(fs.readFileSync(cleared.applied.reportPath,'utf8'));
  assert.ok(rows.some(row=>row[headings.indexOf('ChangeType')].includes('Clear tattoos')&&row[headings.indexOf('ChangedSlotsAndMetadata')].includes('Tattoo')));
  const repeat=await runEquipmentPatcher({...context,mode:'preview',options:{...scope,clearTattoos:true}});assert.equal(repeat.details.clearedTattooPlayers,0);assert.equal(takePlan(repeat.planId).assignments.length,0);
});
