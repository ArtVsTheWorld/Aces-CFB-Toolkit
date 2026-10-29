import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { openCfb27Save, readTables, PLAYER_TABLE_UID, TEAM_TABLE_UID } from '../src/main/services/save.js';
import { ReportService } from '../src/main/services/reports.js';
import { parseCsv } from '../src/main/services/reportAudit.js';
import { runTeamBoost } from '../src/main/tools/teamBoost/runner.js';
import { prepareCommentary, runCommentary } from '../src/main/tools/commentary/runner.js';
import { runJerseyRenumber } from '../src/main/tools/jersey/standardRunner.js';
import { runJerseyNoDuplicates } from '../src/main/tools/jersey/noDuplicatesRunner.js';
import { runForceWin, TABLE_UIDS } from '../src/main/tools/forceWin/runner.js';
import { takePlan } from '../src/main/tools/jersey/planStore.js';

const schemaPath = path.resolve('resources/engine-data/C27_486_6.gz');
const fixtures = path.resolve('../EXAMPLE SAVES VANILLA GAME');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function copy(t, name = 'DYNASTY-LSUTESTSAVEPRESZN') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfb-v200-refinements-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const source = path.join(fixtures, name), savePath = path.join(directory, 'DYNASTY-TEST'), sourceHash = hash(source);
  fs.copyFileSync(source, savePath);
  return { savePath, source, sourceHash, schemaPath, defaultMapPath: path.resolve('resources/commentary-data/PlayerCommentaryidMap.txt'), reports: new ReportService(path.join(directory, 'reports')) };
}
async function players(context) {
  const opened = await openCfb27Save(context.savePath, schemaPath);
  return { ...opened, ...await readTables(opened.franchise, { players: PLAYER_TABLE_UID, teams: TEAM_TABLE_UID }) };
}
function compareRecords(before, after, assignments) {
  const changes = new Map(assignments.map(change => [`${change.row}|${change.field}`, change.newValue]));
  const digest = values => createHash('sha256').update(JSON.stringify(values)).digest('hex');
  for (const [row, record] of before.entries()) if (record && !record.isEmpty) {
    const fields = Object.keys(record._fields);
    const expected = fields.map(field => [field, changes.has(`${row}|${field}`) ? changes.get(`${row}|${field}`) : record[field]]);
    const actual = fields.map(field => [field, after[row][field]]);
    assert.equal(digest(actual), digest(expected), `Only approved fields: row ${row}`);
    // Field getters lazily cache decoded BitViews. Full-roster audits should
    // release those test-only caches as they go rather than retain millions.
    record.clearCachedFieldValues(); after[row].clearCachedFieldValues();
  }
}

test('Team Boost real save combines individual/class/redshirt scope with position ranges and changes only selected ratings', { timeout: 120000 }, async t => {
  const context = copy(t), before = await players(context);
  const row = before.players.records.findIndex(record => record && !record.isEmpty && record.Position === 'WR' && record.SpeedRating < 96 && Number(record.TeamIndex) !== 255);
  assert.ok(row >= 0); const player = before.players.records[row], team = before.teams.records.find(record => record && !record.isEmpty && record.TeamIndex === player.TeamIndex);
  const options = { teams: [team.DisplayName], positions: ['WR'], classes: [player.SchoolYear], redshirtStatuses: [player.RedshirtStatus], playerRows: [String(row)], playerScope: 'all', ratingMode: 'specific', attributes: ['SpeedRating'], minimum: 1, maximum: 1, positionRanges: { WR: { minimum: 3, maximum: 3 } } };
  const preview = await runTeamBoost({ ...context, mode: 'preview', options }), plan = takePlan(preview.planId);
  assert.equal(plan.assignments.length, 1); assert.equal(plan.assignments[0].row, row); assert.equal(plan.assignments[0].newValue, player.SpeedRating + 3);
  assert.equal(hash(context.savePath), context.sourceHash);
  const applied = await runTeamBoost({ ...context, mode: 'apply', options: { planId: preview.planId } }), after = await players(context);
  assert.equal(hash(applied.backupPath), context.sourceHash); compareRecords(before.players.records, after.players.records, plan.assignments);
  const csv = parseCsv(fs.readFileSync(applied.reportPath, 'utf8'));
  assert.equal(JSON.parse(csv[1][csv[0].indexOf('ResolvedOptionsJSON')]).scope.playerRows[0], String(row));
  await assert.rejects(runTeamBoost({ ...context, mode: 'apply', options: { planId: preview.planId } }), /already|expired|Preview/i);
  assert.equal(hash(context.source), context.sourceHash);
});

test('Commentary real save scoped review skips NIL players and protects against stale analysis settings', { timeout: 120000 }, async t => {
  const context = copy(t), seeded = await players(context), chosen = seeded.players.records.filter(record => record && !record.isEmpty && record.Position === 'WR' && Number(record.TeamIndex) !== 255).slice(0, 2);
  assert.equal(chosen.length, 2);
  for (const [index, player] of chosen.entries()) { player.LastName = 'James'; player.PLYR_COMMENT = 0; player.IsNIL = index === 1; }
  chosen[0].PLYR_ASSETNAME='Toolkit_Control_Fictional';
  await seeded.franchise.save(); const baseline = hash(context.savePath), before = await players(context), rows = chosen.map(record => seeded.players.records.indexOf(record));
  const options = { scope: { positions: ['WR'], playerRows: rows.map(String) }, phonetic: false, firstName: false };
  const prepared = await prepareCommentary({ ...context, options });
  const analyzed = { ...options, analysisSignature: prepared.analysisSignature, decisions: {} };
  await assert.rejects(runCommentary({ ...context, mode: 'preview', options: { ...analyzed, scope: { playerRows: [String(rows[1])] } } }), /changed.*Analyze/i);
  const preview = await runCommentary({ ...context, mode: 'preview', options: analyzed });
  assert.equal(preview.details.skippedOriginalEa, 1); assert.equal(preview.details.changes.length, 1); assert.equal(hash(context.savePath), baseline);
  const applied = await runCommentary({ ...context, mode: 'apply', options: analyzed }), after = await players(context);
  assert.equal(hash(applied.backupPath), baseline);
  compareRecords(before.players.records, after.players.records, preview.details.changes.map(change => ({ row: change.row, field: 'PLYR_COMMENT', newValue: change.proposedId })));
  assert.equal(hash(context.source), context.sourceHash);
});

test('Jersey real save preserves individual locks and validates custom retired/tradition rules', { timeout: 120000 }, async t => {
  const context = copy(t), seeded = await players(context), team = seeded.teams.records.find(record => record && !record.isEmpty && record.DisplayName === 'LSU');
  const chosen = seeded.players.records.filter(record => record && !record.isEmpty && record.Position === 'WR' && record.TeamIndex === team.TeamIndex).slice(0, 2);
  assert.equal(chosen.length, 2);
  for (const [index, player] of chosen.entries()) { player.JerseyNum = 9; player.IsNIL = false; player.OverallRating = index ? 99 : 50; }
  // Keep the custom recipient out of LSU's higher-priority built-in #7/#18 rules.
  const other=seeded.players.records.find(record=>!record.isEmpty&&record.TeamIndex===team.TeamIndex&&record.Position==='WR'&&!chosen.includes(record));assert.ok(other);
  for(const record of seeded.players.records.filter(record=>!record.isEmpty&&record.TeamIndex===team.TeamIndex&&record.Position==='WR'&&!chosen.includes(record)))record.OverallRating=90;
  other.OverallRating=99;chosen[1].OverallRating=97;chosen[1].SchoolYear='Freshman';chosen[1].RedshirtStatus='Eligible';chosen[1].CaptainsPatch='None';
  await seeded.franchise.save(); const baseline = hash(context.savePath), before = await players(context), locked = seeded.players.records.indexOf(chosen[0]), recipient = seeded.players.records.indexOf(chosen[1]);
  const reserved = new Set([0,7,9,18, ...before.players.records.filter(record => record && !record.isEmpty && record.TeamIndex === team.TeamIndex).map(record => record.JerseyNum)]);
  const customNumber = Array.from({ length: 20 }, (_, number) => number).find(number => !reserved.has(number)); assert.ok(customNumber !== undefined);
  const options = { skippedTeams: seeded.teams.records.filter(record => record && !record.isEmpty && record.DisplayName !== 'LSU').map(record => record.DisplayName), lockedRows: [String(locked)], lockSourcePath: context.savePath, customRetired: { LSU: [0] }, customTraditions: [{ team: 'LSU', number: customNumber, side: 'offense', positions: ['WR'] }], enablePromotions: false };
  await assert.rejects(runJerseyRenumber({ ...context, mode: 'preview', options: { ...options, customTraditions: [{ team: 'LSU', number: 3, side: 'offense', positions: ['WR'] }] } }), /held by protected original EA roster player/);
  assert.equal(hash(context.savePath), baseline);
  const preview = await runJerseyRenumber({ ...context, mode: 'preview', options:{...options,protectOriginalEaPlayers:false} }), plan = takePlan(preview.planId);
  assert.ok(!plan.assignments.some(change => change.row === locked)); assert.ok(plan.assignments.some(change => change.row === recipient && change.newNumber === customNumber));
  const applied = await runJerseyRenumber({ ...context, mode: 'apply', options: { planId: preview.planId } }), after = await players(context);
  assert.equal(hash(applied.backupPath), baseline);
  compareRecords(before.players.records, after.players.records, plan.assignments.map(change => ({ row: change.row, field: 'JerseyNum', newValue: change.newNumber })));
  assert.equal(after.players.records[locked].JerseyNum, 9); assert.equal(hash(context.source), context.sourceHash);
});

test('Force Win omitted matchups are never written, and all-omitted Apply leaves the save byte-identical', { timeout: 120000 }, async t => {
  const context = copy(t, 'DYNASTY-LSUTESTSAVEWEEK0'), opened = await openCfb27Save(context.savePath, schemaPath), before = await readTables(opened.franchise, { games: TABLE_UIDS.seasonGame });
  const options = { involvement: 'maximum', seed: 200, scope: 'regular', skippedTeamIds: [] };
  const first = await runForceWin({ ...context, mode: 'preview', options }), firstPlan = takePlan(first.planId);
  assert.ok(firstPlan.assignments.length > 1);
  const noChanges = await runForceWin({ ...context, mode: 'apply', options: { planId: first.planId, leaveUnchangedRows: firstPlan.assignments.map(change => change.row) } });
  assert.equal(noChanges.status, 'no-changes'); assert.equal(noChanges.backupPath, null); assert.equal(hash(context.savePath), context.sourceHash);
  const preview = await runForceWin({ ...context, mode: 'preview', options }), plan = takePlan(preview.planId), excluded = plan.assignments[0].row;
  const applied = await runForceWin({ ...context, mode: 'apply', options: { planId: preview.planId, leaveUnchangedRows: [excluded] } });
  assert.equal(hash(applied.backupPath), context.sourceHash);
  const reopened = await openCfb27Save(context.savePath, schemaPath), after = await readTables(reopened.franchise, { games: TABLE_UIDS.seasonGame });
  compareRecords(before.games.records, after.games.records, plan.assignments.filter(change => change.row !== excluded).map(change => ({ ...change, field: 'ForceWin' })));
  assert.equal(applied.summary.find(item => item.label === 'Games affected').value, plan.assignments.length - 1);
  assert.equal(hash(context.source), context.sourceHash);
});

for (const [mode, run] of [['standard',runJerseyRenumber],['no-duplicates',runJerseyNoDuplicates]]) test(`${mode}: personality-qualified jersey tradition survives Preview/Apply and preserves personality fields`, {timeout:120000}, async t=>{
  const context=copy(t), seeded=await players(context), team=seeded.teams.records.find(record=>!record.isEmpty&&record.DisplayName==='LSU');
  const roster=seeded.players.records.filter(record=>!record.isEmpty&&record.TeamIndex===team.TeamIndex&&record.Position==='WR'), chosen=roster.slice(0,2);
  assert.equal(chosen.length,2);
  for(const player of roster) player.Personality='Entertainer';
  chosen[0].OverallRating=99;chosen[1].OverallRating=97;chosen[1].Personality='Leader';chosen.forEach(player=>player.IsNIL=false);
  // Keep this recipient outside LSU's built-in upperclassman #18 rule, so
  // its normal priority cannot claim the player before the custom rule.
  chosen[1].SchoolYear='Freshman';chosen[1].RedshirtStatus='Eligible';chosen[1].CaptainsPatch='None';
  const held=new Set([0,7,18,...seeded.players.records.filter(record=>!record.isEmpty&&record.TeamIndex===team.TeamIndex).map(record=>record.JerseyNum)]);
  const number=Array.from({length:20},(_,index)=>index).find(number=>!held.has(number));assert.ok(number!==undefined);
  const recipient=seeded.players.records.indexOf(chosen[1]); await seeded.franchise.save();
  const baseline=hash(context.savePath), before=await players(context);
  const options={protectOriginalEaPlayers:false,skippedTeams:seeded.teams.records.filter(record=>!record.isEmpty&&record.DisplayName!=='LSU').map(record=>record.DisplayName),customRetired:{LSU:[]},customTraditions:[{team:'LSU',number,side:'offense',positions:['WR'],personality:'Leader'}],enablePromotions:false};
  const preview=await run({...context,mode:'preview',options}), plan=takePlan(preview.planId);
  assert.ok(plan.assignments.some(change=>change.row===recipient&&change.newNumber===number));assert.equal(hash(context.savePath),baseline);
  const applied=await run({...context,mode:'apply',options:{planId:preview.planId}}), after=await players(context);
  assert.equal(hash(applied.backupPath),baseline);
  compareRecords(before.players.records,after.players.records,plan.assignments.map(change=>({row:change.row,field:'JerseyNum',newValue:change.newNumber})));
  assert.equal(after.players.records[recipient].Personality,'Leader');assert.equal(hash(context.source),context.sourceHash);
  const csv=parseCsv(fs.readFileSync(applied.reportPath,'utf8'));
  assert.deepEqual(JSON.parse(csv[1][csv[0].indexOf('CustomRulesJSON')]).customTraditions[0].eligiblePersonalities,['Leader']);
});
