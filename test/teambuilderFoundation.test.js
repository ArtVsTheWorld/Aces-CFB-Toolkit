import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {randomBytes} from 'node:crypto';
import {encodeRosterTdf} from '../src/main/tools/equipment/rosterCodec.js';
import {unpackTeamBuilder, packTeamBuilder, headerText, setHeaderText, TEAMBUILDER_PROFILE} from '../src/main/tools/teambuilder/container.js';
import {patchJsonScalars} from '../src/main/tools/teambuilder/jsonPatch.js';
import {proposeTeamBuilder, GRADE_FIELDS} from '../src/main/tools/teambuilder/editor.js';
import {previewTeamBuilder, applyTeamBuilder, fingerprint} from '../src/main/tools/teambuilder/runner.js';

function fixture() {
  const pipelines = '{ "unknown":900719925474099312345, "pipelineInfluences" : [{"pipelineId":0,"pipelineValue":90},{"pipelineId":3,"pipelineValue":90}] }';
  const records = JSON.stringify({teamBuilderRecords: Object.fromEntries(['GAME', 'SEASON', 'CAREER'].map(period =>
    [`GC_RECORDS_${period}`, Object.fromEntries(['PASSING_YARDS', 'SACKS'].map(stat => [`GC_TEAM_RECORD_${stat}`,
      {GC_TEAM_FIRST_NAME: 'Siaki', GC_TEAM_LAST_NAME: 'Deng', GC_TEAM_POSITION: '0', GC_TEAM_YEAR: '2010', GC_TEAM_STAT_VALUE: stat === 'SACKS' ? '4.5' : '626'}]))]))});
  const rivals = '{"rivalries":[{"rivalTeamId":1113,"teamOneWins":0,"teamTwoWins":4,"streakLength":4,"extra":"keep me"}]}';
  const topPlayers = '{"topPlayerInfos":[{"firstName":"Untouched"}]}';
  const team = [['TEAM_NAME', 'East Point'], ['TEAM_NICKNAME', 'Green Storm'], ['TEAM_SHORTNAME', 'EPU'],
    ['YEAR_FOUNDED', '1980'], ['MY_SCHOOL_TEMPLATE_ID', '6'], ['DYNASTY_PIPELINE_INFO', pipelines],
    ['RECORD_DETAILS', records], ['RIVALRY_INFO', rivals], ['UNKNOWN_FUTURE_ENTRY', 'leave exactly']];
  for (const grade of GRADE_FIELDS) team.push([`${grade}_MIN`, '80'], [`${grade}_MAX`, '80']);
  const metadata = [['teamDisplayName', 'East Point'], ['teamNickname', 'Green Storm'], ['yearFounded', '1980'],
    ['mySchoolTemplateId', '6'], ['teamPrestige', '1.5'], ['pipelines', pipelines], ['teamRecords', records],
    ['rivals', rivals], ['topPlayers', topPlayers], ['unknownFutureEntry', 'leave exactly']];
  const document = {rootTerminated: true, types: new Map(), value: {
    DMAP: {TEST: Buffer.from([1, 0, 255, 3])}, TDAT: {FDAT: {TEST: Buffer.from('opaque sound and uniform data')},
      LGOS: Buffer.from('opaque image'), ROST: Buffer.from('opaque roster'), TINF: team}, TMDA: metadata,
  }};
  function schema(value, location) {
    if (Buffer.isBuffer(value)) document.types.set(location, {type: 2});
    else if (typeof value === 'string') document.types.set(location, {type: 1});
    else if (Array.isArray(value)) {
      document.types.set(location, {type: 5, keyType: 1, valueType: 1});
      document.types.set(`${location}{key}`, {type: 1}); document.types.set(`${location}{value}`, {type: 1});
    } else {
      if (location !== '$') document.types.set(location, {type: 3});
      for (const [key, child] of Object.entries(value)) schema(child, `${location}.${key}`);
    }
  }
  schema(document.value, '$');
  const offset = TEAMBUILDER_PROFILE.payloadOffset, capacity = 8192, bytes = Buffer.alloc(offset + capacity);
  bytes.write('FBCHUNKS'); bytes.writeUInt16LE(1, 8); bytes.writeUInt32LE(17932, 10);
  bytes.writeUInt32LE(capacity, 14); bytes.writeUInt32LE(capacity, 62);
  bytes[100] = 0x42; bytes[520] = 0x75; // Unknown nonzero header fields must survive.
  for (const [key, value] of Object.entries({compactName: 'EastPoint', assetName: 'DoNotRename', name: 'East Point',
    nickname: 'Green Storm', pipelines, records, topPlayers, rivals})) setHeaderText(bytes, key, value);
  bytes.writeUInt32LE(1980, 530); bytes.writeUInt32LE(6, 538);
  zlib.deflateSync(encodeRosterTdf(document), {level: 1}).copy(bytes, offset);
  return bytes;
}
const map = (container, which = 'team') => new Map(which === 'team' ? container.document.value.TDAT.TINF : container.document.value.TMDA);
function preserved(before, after) {
  assert.deepEqual(after.document.value.DMAP, before.document.value.DMAP);
  for (const key of ['FDAT', 'LGOS', 'ROST']) assert.deepEqual(after.document.value.TDAT[key], before.document.value.TDAT[key]);
  assert.equal(map(after).get('UNKNOWN_FUTURE_ENTRY'), 'leave exactly');
  assert.equal(map(after, 'meta').get('unknownFutureEntry'), 'leave exactly');
  assert.equal(headerText(after.bytes, 'assetName'), 'DoNotRename');
  assert.equal(headerText(after.bytes, 'topPlayers'), headerText(before.bytes, 'topPlayers'));
  assert.equal(after.bytes[100], 0x42); assert.equal(after.bytes[520], 0x75);
}

test('TeamBuilder no-op is byte exact and forced repack preserves the entire typed document and fixed header', () => {
  const bytes = fixture(), c = unpackTeamBuilder(bytes);
  assert.deepEqual(packTeamBuilder(c), bytes);
  const repacked = packTeamBuilder(c, c.document, undefined, {forceRepack: true});
  assert.notDeepEqual(repacked, bytes);
  assert.deepEqual(unpackTeamBuilder(repacked).document, c.document);
  assert.deepEqual(repacked.subarray(0, 17950), bytes.subarray(0, 17950));
  assert.equal(repacked.length, bytes.length);
});
test('reject malformed container lengths, reserved integrity data, unknown trailing bytes and bad zlib', () => {
  for (const mutate of [b => b.writeUInt16LE(2, 8), b => b.writeUInt32LE(1, 10), b => b.writeUInt32LE(1, 14),
    b => b.writeUInt32LE(1, 62), b => { b[18] = 1; }, b => { b[b.length - 1] = 1; }, b => { b[17950] = 0; }]) {
    const bytes = fixture(); mutate(bytes); assert.throws(() => unpackTeamBuilder(bytes));
  }
  assert.throws(() => unpackTeamBuilder(Buffer.alloc(10)));
});
test('a full record-book header cannot overrun the separate top-player field', () => {
  const bytes = fixture(); assert.throws(() => setHeaderText(bytes, 'records', 'x'.repeat(8192)), /limit/);
  assert.equal(headerText(bytes, 'topPlayers'), '{"topPlayerInfos":[{"firstName":"Untouched"}]}');
});
test('oversized payload fails without modifying the original container', () => {
  const original = fixture(), c = unpackTeamBuilder(original);
  c.document.value.DMAP.TEST = randomBytes(16384);
  assert.throws(() => packTeamBuilder(c), /capacity/);
  assert.deepEqual(c.bytes, original);
});
test('JSON token patches preserve unknown precision, escapes, formatting and array order', () => {
  const source = '{ "unknown":900719925474099312345,"escaped":"a\\\"b\\u0041", "a":[0, {"v":1e+03}],"keep":-0 }';
  const result = patchJsonScalars(source, [{path: ['a', 1, 'v'], value: 7}, {path: ['escaped'], value: 'new'}]);
  assert.equal(result, '{ "unknown":900719925474099312345,"escaped":"new", "a":[0, {"v":7}],"keep":-0 }');
});
test('JSON patches reject ambiguous keys, repeated edits, missing fields and non-scalar values', () => {
  assert.throws(() => patchJsonScalars('{"a":1,"a":2}', []), /Duplicate/);
  for (const updates of [[{path: ['missing'], value: 0}], [{path: ['a'], value: []}], [{path: ['a'], value: Infinity}],
    [{path: ['a'], value: 2}, {path: ['a'], value: 3}]]) assert.throws(() => patchJsonScalars('{"a":1}', updates));
});
for (const [label, edits] of Object.entries({name: {name: 'East Trial'}, nickname: {nickname: 'Storm Test'},
  abbreviation: {abbreviation: 'EPT'}, foundingYear: {foundingYear: 1999}, prestige: {prestige: 4.5},
  template: {template: 7}, grades: {grades: {ACADEMIC_PRESTIGE: {min: 90, max: 90}}},
  pipeline: {pipelineChanges: [{id: 0, value: 300}]}, rivalry: {rivalryChanges: [{index: 0, teamOneWins: 2}]},
  record: {recordChanges: [{period: 'GAME', stat: 'PASSING_YARDS', value: '777'}]},
  sacks: {recordChanges: [{period: 'CAREER', stat: 'SACKS', value: '39.5'}]}})) {
  test(`${label} edit preserves opaque data and the source document`, () => {
    const source = unpackTeamBuilder(fixture()), snapshot = encodeRosterTdf(source.document);
    const p = proposeTeamBuilder(source, edits), reopened = unpackTeamBuilder(p.bytes);
    assert.ok(p.changes.length); assert.equal(p.bytes.length, source.bytes.length);
    assert.deepEqual(encodeRosterTdf(source.document), snapshot); preserved(source, reopened);
  });
}
test('identity copies stay synchronized without changing asset IDs or commentary IDs', () => {
  const c = unpackTeamBuilder(proposeTeamBuilder(unpackTeamBuilder(fixture()), {name: 'East Trial', nickname: 'Storm Test', abbreviation: 'EPT', foundingYear: 1999}).bytes);
  assert.equal(map(c).get('TEAM_NAME'), 'East Trial'); assert.equal(map(c, 'meta').get('teamDisplayName'), 'East Trial');
  assert.equal(headerText(c.bytes, 'name'), 'East Trial'); assert.equal(headerText(c.bytes, 'compactName'), 'EastTrial');
  assert.equal(headerText(c.bytes, 'nickname'), 'Storm Test'); assert.equal(c.bytes.readUInt32LE(530), 1999);
  assert.equal(map(c).get('TEAM_SHORTNAME'), 'EPT'); assert.equal(c.discrepancies.length, 0);
});
test('prestige-only and template-only edits do not overwrite each other or school grades', () => {
  const c = unpackTeamBuilder(fixture());
  const prestige = unpackTeamBuilder(proposeTeamBuilder(c, {prestige: 4.5}).bytes);
  assert.equal(map(prestige).get('MY_SCHOOL_TEMPLATE_ID'), '6'); assert.equal(map(prestige).get('ACADEMIC_PRESTIGE_MIN'), '80');
  const template = unpackTeamBuilder(proposeTeamBuilder(c, {template: 7}).bytes);
  assert.equal(map(template, 'meta').get('teamPrestige'), '1.5'); assert.equal(map(template).get('ACADEMIC_PRESTIGE_MIN'), '80');
});
test('JSON mirror edits are exact token replacements in all three copies', () => {
  const c = unpackTeamBuilder(fixture()), before = map(c).get('DYNASTY_PIPELINE_INFO');
  const result = unpackTeamBuilder(proposeTeamBuilder(c, {pipelineChanges: [{id: 0, value: 300}]}).bytes);
  const expected = before.replace('"pipelineId":0,"pipelineValue":90', '"pipelineId":0,"pipelineValue":300');
  assert.equal(map(result).get('DYNASTY_PIPELINE_INFO'), expected);
  assert.equal(map(result, 'meta').get('pipelines'), expected); assert.equal(headerText(result.bytes, 'pipelines'), expected);
});
test('existing name differences survive unrelated changes; disagreeing JSON refuses edits', () => {
  const c = unpackTeamBuilder(fixture()); c.document.value.TDAT.TINF.find(p => p[0] === 'TEAM_NAME')[1] = 'Different';
  const different = unpackTeamBuilder(packTeamBuilder(c));
  assert.equal(map(unpackTeamBuilder(proposeTeamBuilder(different, {prestige: 4.5}).bytes)).get('TEAM_NAME'), 'Different');
  c.document.value.TMDA.find(p => p[0] === 'pipelines')[1] = '{"pipelineInfluences":[]}';
  const bad = unpackTeamBuilder(packTeamBuilder(c));
  assert.throws(() => proposeTeamBuilder(bad, {pipelineChanges: [{id: 0, value: 300}]}), /copies disagree/);
});
test('unsupported fields, unknown IDs, bad ranges, duplicate edits and invalid record units fail closed', () => {
  const c = unpackTeamBuilder(fixture());
  for (const edits of [{prestige: 5.5}, {prestige: 1.2}, {template: 999}, {foundingYear: -1}, {name: 'a'.repeat(64)},
    {name: 'x\0'}, {abbreviation: 'TOOLONG'}, {audio: []}, {grades: {ACADEMIC_PRESTIGE: {min: null}}},
    {grades: {ACADEMIC_PRESTIGE: {min: 90, max: 80}}}, {grades: {UNKNOWN: {min: 0}}},
    {pipelineChanges: [{id: 1, value: 90}]}, {pipelineChanges: [{id: 0, value: 4}]},
    {pipelineChanges: [{id: 0, value: 90}, {id: 0, value: 300}]}, {rivalryChanges: [{index: 9, teamOneWins: 2}]},
    {recordChanges: [{period: 'GAME', stat: 'PASSING_YARDS', value: '777.5'}]}]) assert.throws(() => proposeTeamBuilder(c, edits), JSON.stringify(edits));
});
function ownedFile(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfb-teambuilder-'));
  t.after(() => {
    const target = path.resolve(directory);
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
    assert.ok(path.basename(target).startsWith('cfb-teambuilder-'));
    fs.rmSync(target, {recursive: true, force: true});
  });
  const file = path.join(directory, 'TEAMBUILDER-001'); fs.writeFileSync(file, fixture()); return file;
}
test('Preview is read-only; Apply backs up exact original, verifies output and consumes the review', t => {
  const file = ownedFile(t), before = fs.readFileSync(file), p = previewTeamBuilder(file, {prestige: 4.5});
  assert.deepEqual(fs.readFileSync(file), before); assert.equal(fs.readdirSync(path.dirname(file)).length, 1);
  const applied = applyTeamBuilder(p);
  assert.equal(applied.changed, true); assert.deepEqual(fs.readFileSync(applied.backupPath), before);
  assert.equal(fingerprint(fs.readFileSync(file)), p.candidateHash);
  assert.equal(map(unpackTeamBuilder(fs.readFileSync(file)), 'meta').get('teamPrestige'), '4.5');
  assert.throws(() => applyTeamBuilder(p), /Preview/);
  assert.equal(fs.readdirSync(path.dirname(file)).some(name => name.includes('.writing-')), false);
});
test('no-op Apply does not write or create a backup', t => {
  const file = ownedFile(t), before = fs.statSync(file).mtimeMs, p = previewTeamBuilder(file, {});
  assert.equal(p.changed, false); assert.equal(applyTeamBuilder(p).changed, false);
  assert.equal(fs.statSync(file).mtimeMs, before); assert.equal(fs.readdirSync(path.dirname(file)).length, 1);
});
test('a changed source or fabricated Preview cannot be applied', t => {
  const file = ownedFile(t), p = previewTeamBuilder(file, {prestige: 4.5});
  assert.throws(() => applyTeamBuilder({...p}), /Preview/);
  const changed = fs.readFileSync(file); changed[100] ^= 1; fs.writeFileSync(file, changed);
  assert.throws(() => applyTeamBuilder(p), /changed after Preview/);
  assert.deepEqual(fs.readFileSync(file), changed); assert.equal(fs.readdirSync(path.dirname(file)).length, 1);
});
test('a failed atomic replacement keeps the original and verified backup and cleans only its own temporary file', t => {
  const file = ownedFile(t), before = fs.readFileSync(file), preview = previewTeamBuilder(file, {prestige: 4.5});
  const rename = fs.renameSync;
  try {
    fs.renameSync = () => { throw Error('Simulated locked destination'); };
    assert.throws(() => applyTeamBuilder(preview), /locked destination/);
  } finally { fs.renameSync = rename; }
  assert.deepEqual(fs.readFileSync(file), before);
  const backupDirectory = path.join(path.dirname(file), "Ace's CFB Toolkit Backups");
  assert.deepEqual(fs.readFileSync(path.join(backupDirectory, fs.readdirSync(backupDirectory)[0])), before);
  assert.equal(fs.readdirSync(path.dirname(file)).some(name => name.includes('.writing-')), false);
});
test('an external change while staging is preserved instead of overwritten', t => {
  const file = ownedFile(t), before = fs.readFileSync(file), changed = Buffer.from(before);
  changed[100] ^= 1;
  const preview = previewTeamBuilder(file, {prestige: 4.5}), sync = fs.fsyncSync;
  try {
    fs.fsyncSync = descriptor => { sync(descriptor); fs.writeFileSync(file, changed); };
    assert.throws(() => applyTeamBuilder(preview), /changed while applying/);
  } finally { fs.fsyncSync = sync; }
  assert.deepEqual(fs.readFileSync(file), changed);
  const backupDirectory = path.join(path.dirname(file), "Ace's CFB Toolkit Backups");
  assert.deepEqual(fs.readFileSync(path.join(backupDirectory, fs.readdirSync(backupDirectory)[0])), before);
  assert.equal(fs.readdirSync(path.dirname(file)).some(name => name.includes('.writing-')), false);
});
test('the separate TeamBuilder reader never accepts a dynasty, roster or mod filename', t => {
  const file = ownedFile(t);
  for (const name of ['DYNASTY-001', 'ROSTER-001', 'RTG-001', 'TEAMBUILDER-001.fbmod']) {
    const bad = path.join(path.dirname(file), name); fs.copyFileSync(file, bad);
    assert.throws(() => previewTeamBuilder(bad, {}), /TEAMBUILDER-/);
  }
});
