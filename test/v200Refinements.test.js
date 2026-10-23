import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { normalizePlayerScope, matchesPlayerScope } from '../src/main/tools/playerScope.js';
import { patchPlayerCommentary } from '../src/main/tools/commentary/patcher.js';
import { patchTeamRatings } from '../src/main/tools/teamBoost/core.js';
import { patchDealbreakers, DEFAULT_DISTRIBUTION } from '../src/main/tools/dealbreaker/core.js';
import { normalizeJerseyCustom, attachJerseyLocks } from '../src/main/tools/jersey/customRules.js';
import { runNoDuplicatesRoster } from '../src/main/tools/jersey/core/noDuplicatesEngine.js';
import { runRenumberEngine } from '../src/main/tools/jersey/core/renumberEngine.js';
import { HELMET_MODELS } from '../src/main/tools/equipment/core/helmets.js';
import { helmetPopulationAudit } from '../src/main/tools/equipment/core/helmetPopulation.js';
import { approvedMatchupReport } from '../src/main/tools/forceWin/applyReport.js';
import { parseCsv } from '../src/main/services/reportAudit.js';
import { validatePresetConfiguration } from '../src/main/services/toolPresets.js';
import { ReviewSnapshots } from '../src/main/services/reviewSnapshots.js';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const player = (extra = {}) => ({ isEmpty: false, FirstName: 'One', LastName: 'James', TeamIndex: 1, Position: 'WR', SchoolYear: 'Freshman', RedshirtStatus: 'Eligible', IsNIL: false, OverallRating: 75, PlayerType: 'DeepThreat', JerseyNum: 9, PLYR_COMMENT: 0, SpeedRating: 75, AccelerationRating: 70, Age: 19, RecruitingDealbreaker: 'Invalid', ...extra });
const teams = new Map([[1, 'Test Team'], [2, 'Other Team']]);
test('composable scope intersects team, position, class, redshirt and individual selections', () => {
  const scope = normalizePlayerScope({ teams: ['Test Team'], positions: ['WR'], classes: ['Freshman'], redshirtStatuses: ['Eligible'], playerRows: ['1','1'] });
  assert.deepEqual(scope.playerRows, ['1']); assert.equal(matchesPlayerScope(player(), 1, scope, teams), true);
  for (const extra of [{ TeamIndex: 2 }, { Position: 'TE' }, { SchoolYear: 'Senior' }, { RedshirtStatus: 'Previous' }]) assert.equal(matchesPlayerScope(player(extra), 1, scope, teams), false);
  assert.equal(matchesPlayerScope(player(), 2, scope, teams), false);
  assert.throws(() => normalizePlayerScope({ playerRows: ['-1'] }), /Choose players/);
  assert.throws(() => normalizePlayerScope({ positions: ['NOPE'] }), /valid positions/);
});
test('Commentary scopes retain automatic original EA protection and do not mutate excluded players', () => {
  const rows = [player(), player({ IsNIL: true, PLYR_ASSETNAME:'SmithJeremiah_8726' }), player({ SchoolYear: 'Senior' })];
  const result = patchPlayerCommentary(rows, new Map([['James', 91]]), { apply: true, teamNames: teams, scope: normalizePlayerScope({ classes: ['Freshman'], positions: ['WR'] }) });
  assert.deepEqual(rows.map(row => row.PLYR_COMMENT), [91,0,0]); assert.equal(result.summary.skippedOriginalEa, 1);
});
test('Team Boost position ranges and class/redshirt/player filters retain whole-room averages', () => {
  const records = [player({ OverallRating: 60, RedshirtStatus: 'Previous' }), player({ OverallRating: 90, SchoolYear: 'Senior' }), player({ Position: 'QB' })];
  const options = { teamIndex: 1, mode: 'specific', attributes: ['SpeedRating'], playerScope: 'below-average', scope: { classes: ['Freshman'], redshirtStatuses: ['Previous'], playerRows: ['0'] }, positionRanges: { WR: { minimum: -4, maximum: -4 } }, minimum: 1, maximum: 1, apply: true };
  const result = patchTeamRatings(records, options);
  assert.equal(result.players.length, 1); assert.equal(result.players[0].roomAverage, 75);
  assert.equal(records[0].SpeedRating, 71); assert.equal(records[0].AccelerationRating, 70); assert.equal(records[1].SpeedRating, 75);
});
test('Dealbreaker type and individual protection retain None population accounting', () => {
  const records = [player(), player(), player({ RecruitingDealbreaker: 'PlayingStyle', Position: 'QB' })];
  const result = patchDealbreakers(records, { teamNames: teams, distribution: { ...DEFAULT_DISTRIBUTION, Invalid: 0, PlayingTime: DEFAULT_DISTRIBUTION.PlayingTime + DEFAULT_DISTRIBUTION.Invalid }, protectedRows: ['0'], protectedValues: ['PlayingStyle'], fixInvalidPlayingStyle: true, random: () => .9, apply: true });
  assert.equal(records[0].RecruitingDealbreaker, 'Invalid'); assert.equal(records[2].RecruitingDealbreaker, 'PlayingStyle');
  assert.equal(result.population.total, 3); assert.equal(result.outcomes.length, 1);
});
test('jersey locks reject missing source, another save, retired conflicts and duplicate locked numbers', () => {
  const options = normalizeJerseyCustom({ lockedRows: ['0'], lockSourcePath: 'SAVE-A', customRetired: { 'Test Team': [9] } });
  assert.throws(() => attachJerseyLocks([player()], teams, { ...options, enableRetiredNumbers: true }, false, 'SAVE-A'), /both locked and retired/);
  assert.throws(() => attachJerseyLocks([player()], teams, options, false, 'SAVE-B'), /active save/);
  assert.throws(() => attachJerseyLocks([player()], teams, { ...options, lockSourcePath: null }), /again/);
  assert.throws(() => attachJerseyLocks([player(), player()], teams, { ...options, customRetired: {}, lockedRows: ['0','1'] }, false, 'SAVE-A'), /two protected players/);
  assert.throws(() => attachJerseyLocks([player()], teams, { ...options, customRetired: {}, lockIdentities: { 0: { name: 'Another Player', team: 'Test Team' } } }, false, 'SAVE-A'), /locked player changed/);
  assert.throws(() => normalizeJerseyCustom({ customTraditions: [{ team: 'Test Team', number: 1, side: 'all', positions: [] }, { team: 'Test Team', number: 1, side: 'all', positions: [] }] }), /only one/);
});
for (const mode of ['standard', 'no-duplicates']) test(`custom jersey rules preserve individual locks in ${mode}`, () => {
  const records = [player({ userNumberLocked: true, JerseyNum: 9 }), player({ FirstName: 'Two', JerseyNum: 9, OverallRating: 85 })];
  const options = { enableTeamRules: true, enableRetiredNumbers: true, enablePromotions: false, customRetired: { 'Test Team': [1] }, customTraditions: [{ teamNames: ['Test Team'], number: 3, side: 'offense', eligiblePositions: ['WR'], label: 'Custom #3' }], random: () => 0 };
  if (mode === 'no-duplicates') runNoDuplicatesRoster(records, 'Test Team', options);
  else { const log = console.log; console.log = () => {}; try { runRenumberEngine(new Map([[1, { offense: records, defense: [], specialists: [] }]]), teams, options); } finally { console.log = log; } }
  // The standard engine sorts each roster by overall; verify identity, not array order.
  assert.equal(records.find(row => row.FirstName === 'One').JerseyNum, 9); assert.equal(records.find(row => row.FirstName === 'Two').JerseyNum, 3);
});
test('helmet diagnostics use actual post-correction models by team and group, including inherited targets', () => {
  const first = HELMET_MODELS[0].id, second = HELMET_MODELS[1].id, mix = Object.fromEntries(HELMET_MODELS.map(model => [model.id, model.id === second ? 100 : 0]));
  const audit = helmetPopulationAudit([{ visualsRow: 1, helmet: first, position: 'WR', team: 'Test Team', cohort: 'fbs' }], new Map([[1, second]]), { helmetDistribution: { mode: 'custom', global: mix, positions: {} } });
  assert.equal(audit.groups.length, 2);
  for (const group of audit.groups) { assert.equal(group.models.find(model => model.id === first).before, 1); assert.equal(group.models.find(model => model.id === second).after, 1); assert.equal(group.models.find(model => model.id === second).targetPercent, 100); }
});
test('Force Win Apply reports distinguish omitted proposals and actual writes, preserving multiline CSV', () => {
  const content = 'Record,ForceWinValue,Outcome,SummaryMetric,SummaryValue,Note\r\n1,2,proposed,,,"two\nlines"\r\n2,1,proposed,,,\r\n,,,forceWins,2,\r\n';
  const original = [{ row: 1, oldValue: 0, newValue: 2 }, { row: 2, oldValue: 0, newValue: 1 }], csv = parseCsv(approvedMatchupReport(content, original.slice(1), new Set([1]), original)), headers = csv[0];
  assert.equal(csv[1][headers.indexOf('ForceWinValue')], '0'); assert.equal(csv[1][headers.indexOf('PreviewForceWinValue')], '2');
  assert.equal(csv[1][headers.indexOf('ApplyDecision')], 'Left unchanged by user'); assert.equal(csv[1][headers.indexOf('Note')], 'two\nlines');
  assert.equal(csv[2][headers.indexOf('ActualWrittenForceWin')], '1'); assert.ok(headers.includes('PreviewSummaryMetric')); assert.ok(csv.every(row => row.length === headers.length));
});
test('portable preset validation blocks dangerous keys and newer schema versions', () => {
  assert.deepEqual(validatePresetConfiguration({ version: 1, values: {} }), { version: 1, values: {} });
  assert.throws(() => validatePresetConfiguration({ version: 2, values: {} }), /Invalid/);
  assert.throws(() => validatePresetConfiguration(JSON.parse('{"version":1,"values":{"__proto__":{}}}')), /Invalid/);
  assert.throws(() => validatePresetConfiguration({ version: 1, values: {}, teamSelections: { teams: 'not an array' } }), /Invalid preset selections/);
});

test('saved Force Win reviews retain user omissions even when full cached rows are supplied', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfb-v200-review-')); t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const store = new ReviewSnapshots(directory), id = randomUUID(), rows = [{ row: 11, existingForceWin: 0, proposedForceWin: 2, affected: true, forcedWinner: 'A' }, { row: 12, existingForceWin: 0, proposedForceWin: 1, affected: true, forcedWinner: 'B' }];
  store.save(id, { mode: 'apply', resultKind: 'automatic-force-win', details: { leaveUnchangedRows: [11] } }, rows);
  const review = store.get(id); assert.equal(review.rows[0].affected, false); assert.equal(review.rows[0].proposedForceWin, 0); assert.equal(review.rows[1].affected, true); assert.equal(rows[0].affected, true);
});

const renderer = fs.readFileSync(new URL('../src/renderer/renderer.js', import.meta.url), 'utf8'), refinements = fs.readFileSync(new URL('../src/renderer/refinements.js', import.meta.url), 'utf8');
for (const action of ['navigate', 'save-switch', 'interrupted-error']) test(`pending equipment results cannot replace current UI after ${action}`, async () => {
  let finish, renders = 0, histories = 0; const output = { isConnected: true, dataset: {}, innerHTML: '' }, status = { innerHTML: '' }, buttons = [{ disabled: false }];
  const context = vm.createContext({ state: { activeSave: { path: 'SAVE' }, page: 'equipment-patcher', equipmentPreviews: new Map() }, document: { querySelector: id => id === '#equipment-wizard-status' ? status : output, querySelectorAll: () => buttons }, window: { cfbToolkit: { runTool: () => new Promise((resolve, reject) => finish = action === 'interrupted-error' ? reject : resolve) } }, equipmentOptions: () => ({}), renderResult: () => renders++, refreshHistory: async () => histories++, readableError: error => error, showError: () => { throw new Error('stale error surfaced'); } });
  vm.runInContext('let toolRunSequence = 0; ' + refinements.match(/^function beginToolRun.*$/m)[0] + '\n' + refinements.match(/^function currentToolRun.*$/m)[0], context);
  vm.runInContext(renderer.match(/^async function runEquipment.*$/m)[0], context);
  const pending = context.runEquipment('equipment-patcher', 'preview');
  if (action === 'navigate') { context.state.page = 'home'; output.isConnected = false; }
  else context.state.activeSave.path = 'OTHER';
  finish(action === 'interrupted-error' ? new Error('Interrupted') : { planId: 'stale' }); await pending;
  assert.equal(renders, 0); assert.equal(context.state.equipmentPreviews.size, 0); assert.equal(histories, action === 'interrupted-error' ? 0 : 1);
});

for (const failure of [false, true]) test(`stale cached search ${failure ? 'errors' : 'responses'} do not replace a newer preview`, async () => {
  let listener, pending, finish, rendered = 0, surfaced = 0;
  const control = { value: 'Search', id: 'equipment-result-filter', tagName: 'INPUT', placeholder: '', closest: () => ({}), addEventListener: (_name, callback) => listener = callback };
  const output = { isConnected: true, dataset: { resultKey: 'plan-A' }, querySelector: () => control, querySelectorAll: selector => selector === '[data-preview-facet]' ? [] : [control] };
  const context = vm.createContext({ window: { cfbToolkit: { searchPreview: () => new Promise((resolve, reject) => finish = failure ? reject : resolve) } }, previewFilterToolbar: () => '', renderResult: () => rendered++, showError: () => surfaced++, readableError: value => value, clearTimeout() {}, setTimeout: callback => { pending = callback(); return 1; } });
  vm.runInContext(renderer.slice(renderer.indexOf('function bindCachedPreviewSearch('), renderer.indexOf('function renderResult(')), context);
  context.bindCachedPreviewSearch(output, { planId: 'plan-A', resultKind: 'freshman-equipment', details: {} }); listener({ target: control });
  output.dataset.resultKey = 'plan-B'; output.dataset.previewRequestVersion = '999'; finish(failure ? new Error('Expired') : { changes: [], totalMatches: 0 }); await pending;
  assert.equal(rendered, 0); assert.equal(surfaced, 0);
});
