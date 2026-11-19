import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import ratings from '../src/shared/ratingsDisplay.cjs';
import {SettingsStore, validateRatingsDisplay} from '../src/main/services/settings.js';
import {ReportService} from '../src/main/services/reports.js';
import {parseCsv} from '../src/main/services/reportAudit.js';
const renderer = name => fs.readFileSync(new URL(`../src/renderer/${name}`, import.meta.url), 'utf8');
function temporary(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfb-ratings-display-'));
  t.after(() => {
    const target = path.resolve(directory);
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
    assert.ok(path.basename(target).startsWith('cfb-ratings-display-'));
    fs.rmSync(target, {recursive: true, force: true});
  });
  return directory;
}
test('every integer rating matches the BTF five scales, including all +/− boundaries', () => {
  // Independent interval table transcribed from BTF EnhancementOptions.h.
  const intervals = [[0,59,'F'],[60,62,'D-'],[63,66,'D'],[67,69,'D+'],[70,72,'C-'],[73,76,'C'],
    [77,79,'C+'],[80,82,'B-'],[83,86,'B'],[87,89,'B+'],[90,92,'A-'],[93,96,'A'],[97,100,'A+']];
  for (let n = 0; n <= 100; n++) {
    const expected = n < 60 ? ['F','Poor'] : n < 70 ? ['D','Fair'] : n < 80 ? ['C','Good'] : n < 90 ? ['B','Great'] : ['A','Elite'];
    assert.equal(ratings.format(n, 'letters'), expected[0]);
    assert.equal(ratings.format(n, 'descriptive'), expected[1]);
    assert.equal(ratings.format(n, 's-tier'), n >= 95 ? 'S' : expected[0]);
    assert.equal(ratings.format(n, 'plus-minus'), intervals.find(([min,max]) => n >= min && n <= max)[2]);
    assert.equal(ratings.format(n, 'hidden'), '–');
    assert.equal(ratings.format(n), String(n));
  }
});
test('fractional averages do not round into a stronger band and numeric precision stays available', () => {
  assert.equal(ratings.format(89.99, 'letters'), 'B');
  assert.equal(ratings.format(96.99, 'plus-minus'), 'A');
  assert.equal(ratings.format(85, 'numeric', {digits: 2}), '85.00');
  assert.equal(ratings.format(85.375, 'numeric', {digits: 1}), '85.4');
});
test('unknown values never become false zero ratings; hidden mode hides unknowns too', () => {
  for (const value of [undefined, null, '', ' ', false, [], {}, NaN, Infinity, -1, 101, 'N/A']) {
    assert.equal(ratings.format(value), '—'); assert.equal(ratings.format(value, 'letters'), '?');
    assert.equal(ratings.format(value, 'hidden'), '–');
  }
  assert.equal(ratings.format(0, 'descriptive'), 'Poor');
});
test('scouted ranges use BTF endpoint rules without revealing values in hidden mode', () => {
  assert.equal(ratings.range(80, 89, 'letters'), 'B');
  assert.equal(ratings.range(80, 99, 'letters'), 'B–A');
  assert.equal(ratings.range(82.2, 86.2, 'plus-minus'), 'B-–B+');
  assert.equal(ratings.range(100, 90, 'letters'), '?');
  assert.equal(ratings.range(0, 100, 'hidden'), '–');
});
test('label formatting changes ratings without changing jersey numbers, years, heights, stats or IDs', () => {
  const input = '#87 Test Person · Age 19 · 2026 · 87 OVR · $90 · 6 ft 3 · ID 95';
  assert.equal(ratings.text(input, 'letters'), '#87 Test Person · Age 19 · 2026 · B OVR · $90 · 6 ft 3 · ID 95');
  assert.equal(ratings.text('Current avg OVR 82.5 · 85 players', 'hidden'), 'Current avg OVR – · 85 players');
  assert.equal(ratings.text('94 OFF · 88 DEF · 96 overall', 'descriptive'), 'Elite OFF · Great DEF · Elite overall');
  assert.equal(ratings.text('80 average OVR', 'plus-minus'), 'B- average OVR');
  assert.equal(ratings.text('High OVR (85–89) · Elite OVR (90+)', 'hidden'), 'High OVR (–) · Elite OVR (–)');
  assert.equal(ratings.text('High OVR (85–89)', 'letters'), 'High OVR (B)');
  assert.equal(ratings.text(input), input);
});
test('legacy settings keep their presets and defaults while ratings display starts numeric', t => {
  const file = path.join(temporary(t), 'settings.json');
  const old = {theme: 'dark', toolDefaults: {example: true}, toolPresets: [{name: 'Keep me', configuration: {minimum: '72'}}], futureKey: {preserve: true}};
  fs.writeFileSync(file, JSON.stringify(old));
  const store = new SettingsStore(file); assert.equal(store.load().ratingsDisplay, 'numeric');
  for (const mode of ratings.modes) {
    const updated = store.update({ratingsDisplay: validateRatingsDisplay(mode)});
    assert.deepEqual(updated.toolPresets, old.toolPresets); assert.deepEqual(updated.futureKey, old.futureKey);
    assert.deepEqual(updated.toolDefaults, old.toolDefaults);
    assert.equal(new SettingsStore(file).load().ratingsDisplay, mode);
  }
  for (const invalid of ['', 'blind-ish', 1, true, null, {}, ['letters']]) assert.throws(() => validateRatingsDisplay(invalid));
});
test('an invalid persisted display mode falls back without losing unrelated settings', t => {
  const file = path.join(temporary(t), 'settings.json'); fs.writeFileSync(file, JSON.stringify({ratingsDisplay: 'unknown', theme: 'dark'}));
  const loaded = new SettingsStore(file).load(); assert.equal(loaded.ratingsDisplay, 'numeric'); assert.equal(loaded.theme, 'dark');
});
function context(mode = 'numeric') {
  const ctx = vm.createContext({ToolkitRatingsDisplay: ratings, state: {bootstrap: {settings: {ratingsDisplay: mode}}, genericResultViews: new Map()},
    previewChanges: result => result.details.changes, localizedPosition: value => value, escapeHtml: value => String(value ?? ''),
    forceLogoUrl: () => '', rosterSchemeReview: () => '', modelHelpButton: () => ''});
  vm.runInContext(renderer('ratings-display.js'), ctx);
  return ctx;
}
test('the app settings offer all scales with clear export and display-only explanations', () => {
  for (const mode of ratings.modes) {
    const ctx = context(mode), markup = ctx.ratingsDisplaySettings();
    for (const value of ratings.modes) assert.ok(markup.includes(`value="${value}"`));
    assert.ok(markup.includes(`value="${mode}" selected`));
    assert.match(markup, /CSV exports keep their real values/);
    assert.match(markup, /Changes how ratings look, not how tools work/);
  }
});
test('roster cards, tables, and depth ratings follow the active setting without mutating generated data', () => {
  const row = {row: 1, team: 'School', player: 'New Person', oldPlayer: 'Old Person', position: 'WR', classYear: 'Freshman', overall: 87,
    before: {Position: 'WR', JerseyNum: 8}, fields: {Position: 'WR', JerseyNum: 12, SchoolYear: 'Freshman', OverallRating: 87,
      TraitDevelopment: 'Normal', PlayerType: 'DeepThreat', PLYR_HOME_TOWN: 'Town', PLYR_HOME_STATE: 'CA'},
    provenance: {}, highlights: [{label: 'Speed', value: 96}]};
  const result = {details: {changes: [row], totalPreviewRows: 1, teams: [{team: 'School', depthDistribution: {WR: {mode: 'balanced', average: 87.5, leading: [96, 90], backupAverage: 78.5}}}]}};
  const before = JSON.stringify(result);
  for (const mode of ratings.modes) {
    const ctx = context(mode); vm.runInContext(renderer('roster-evolution.js'), ctx); vm.runInContext(renderer('roster-generator.js'), ctx);
    const markup = ctx.rosterGeneratorResults(result);
    assert.ok(markup.includes(`<div class="roster-overall">${ratings.format(87, mode)}<small>Player OVR`));
    assert.ok(markup.includes(`<strong>${ratings.format(96, mode)}</strong>`));
    assert.ok(markup.includes(`#12 New Person`));
    assert.ok(markup.includes(`#8 Old Person`));
    if (mode !== 'numeric') { assert.doesNotMatch(markup, />87(?:\.5)?</); assert.doesNotMatch(markup, />96</); }
  }
  assert.equal(JSON.stringify(result), before);
});
test('rating fields are formatted by field identity while physical size and non-rating numbers stay intact', () => {
  const ctx = context('hidden');
  assert.equal(ctx.displayRatingField('SpeedRating', 95), '–');
  assert.equal(ctx.displayRatingField('OverallRating', 87), '–');
  assert.equal(ctx.displayRatingField('Age', 19), 19); assert.equal(ctx.displayRatingField('JerseyNum', 87), 87);
  assert.equal(ctx.displayRatingField('Weight', 330), 330); assert.equal(ctx.displayRatingField('PresentationId', 95), 95);
  assert.equal(ctx.displayRatingDelta(3), '↑'); assert.equal(ctx.displayRatingDelta(-3), '↓');
});
test('CSV reports retain exact numerical ratings in every app display mode', t => {
  const reports = new ReportService(temporary(t));
  for (const mode of ratings.modes) {
    const ctx = context(mode); assert.equal(ctx.displayRating(87), ratings.format(87, mode));
    const report = reports.create({toolId: 'team-boost', toolName: 'Team Boost', prefix: `test-${mode}`,
      headings: ['Player', 'Overall', 'OldRating', 'NewRating'], rows: [['Test Person', 87, 96, 98]]});
    assert.deepEqual(parseCsv(fs.readFileSync(report, 'utf8'))[1], ['Test Person', '87', '96', '98']);
  }
});
