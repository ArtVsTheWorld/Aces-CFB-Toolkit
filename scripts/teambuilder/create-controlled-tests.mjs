// Local research only. Does not open the app, modify the originals, or install files.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {unpackTeamBuilder, packTeamBuilder, headerText, HEADER_FIELDS} from '../../src/main/tools/teambuilder/container.js';
import {previewTeamBuilder, applyTeamBuilder, fingerprint} from '../../src/main/tools/teambuilder/runner.js';

const [sourceDirectory, requestedOutput] = process.argv.slice(2);
if (!sourceDirectory || !requestedOutput) throw Error('Usage: node scripts/teambuilder/create-controlled-tests.mjs <original-saves-folder> <new-folder-under-outputs>');
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.resolve(requestedOutput), permitted = path.join(project, 'outputs');
const relative = path.relative(permitted, output);
if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || fs.existsSync(output)) throw Error('Choose a NEW directory inside this project’s outputs folder.');
const sampleNumbers = ['001', '003', '004', '005', '006', '007', '008', '010', '011'];
const originals = sampleNumbers.map(number => {
  const file = path.resolve(sourceDirectory, `TEAMBUILDER-${number}`), bytes = fs.readFileSync(file);
  const c = unpackTeamBuilder(bytes), repacked = unpackTeamBuilder(packTeamBuilder(c, c.document, undefined, {forceRepack: true}));
  assert.deepEqual(repacked.document, c.document);
  assert.deepEqual(repacked.bytes.subarray(0, 17950), bytes.subarray(0, 17950));
  assert.deepEqual(packTeamBuilder(c), bytes);
  return {number, file, hash: fingerprint(bytes), bytes, discrepancies: c.discrepancies};
});
const baseline = originals[0], parsed = unpackTeamBuilder(baseline.bytes);
const originalTeam = new Map(parsed.document.value.TDAT.TINF), originalMeta = new Map(parsed.document.value.TMDA);
assert.equal(originalTeam.get('TEAM_NAME'), 'East Point'); assert.equal(originalTeam.get('TEAM_SHORTNAME'), 'EPU');
assert.equal(originalMeta.get('teamPrestige'), '1.5'); assert.equal(originalTeam.get('MY_SCHOOL_TEMPLATE_ID'), '6');
function exactReplace(text, before, after) {
  assert.equal(text.split(before).length, 2, `Expected exactly one occurrence of ${before}`);
  return text.replace(before, after);
}
const pipelineText = exactReplace(originalTeam.get('DYNASTY_PIPELINE_INFO'), '"pipelineId":3,"pipelineValue":90', '"pipelineId":3,"pipelineValue":300');
const rivalText = exactReplace(originalTeam.get('RIVALRY_INFO'), '"firstYearPlayed":2006,"teamOneWins":0', '"firstYearPlayed":2006,"teamOneWins":2');
function recordText(period, before, after) {
  const records = JSON.parse(originalTeam.get('RECORD_DETAILS'));
  const leaf = records.teamBuilderRecords[`GC_RECORDS_${period}`].GC_TEAM_RECORD_PASSING_YARDS;
  assert.equal(leaf.GC_TEAM_STAT_VALUE, before);
  const oldLeaf = JSON.stringify(leaf), newLeaf = oldLeaf.replace(`"GC_TEAM_STAT_VALUE":"${before}"`, `"GC_TEAM_STAT_VALUE":"${after}"`);
  const prefix = `"GC_RECORDS_${period}":{"GC_TEAM_RECORD_PASSING_YARDS":`;
  return exactReplace(originalTeam.get('RECORD_DETAILS'), prefix + oldLeaf, prefix + newLeaf);
}
const cases = [
  {id: '00-original-control', title: 'Original control', edits: {}, check: 'East Point / Green Storm / EPU. Load the team and import it into a NEW disposable dynasty. Check roster, uniforms and logos. Save, exit and reload. This is an exact original copy; stop here if it fails.'},
  {id: '01-repacked-control', title: 'Repacked control', edits: {}, forceRepack: true, check: 'Everything should look exactly like 00. Load, import into a NEW disposable dynasty, save, exit and reload. Check roster, uniforms, logos and school info. Stop if this control fails.'},
  {id: '02-team-name', title: 'Team name only', edits: {name: 'East Trial'}, team: {TEAM_NAME: 'East Trial'}, meta: {teamDisplayName: 'East Trial'}, header: {name: 'East Trial', compactName: 'EastTrial'}, check: 'Team name should read East Trial in the team listing and after a NEW dynasty import. Nickname stays Green Storm; abbreviation stays EPU. Stadium name, rivalry names, artwork and commentary are intentionally unchanged. Save, exit and reload; check the new name persists.'},
  {id: '03-nickname', title: 'Nickname only', edits: {nickname: 'Storm Test'}, team: {TEAM_NICKNAME: 'Storm Test'}, meta: {teamNickname: 'Storm Test'}, header: {nickname: 'Storm Test'}, check: 'Nickname should read Storm Test. Team name stays East Point and abbreviation stays EPU. Spoken commentary may still use the old nickname because its commentary ID was preserved. Import into a NEW dynasty, save, exit and reload.'},
  {id: '04-abbreviation', title: 'Abbreviation only', edits: {abbreviation: 'EPT'}, team: {TEAM_SHORTNAME: 'EPT'}, check: 'Look for EPT instead of EPU in the scoreboard/team screens after a NEW dynasty import. Name stays East Point and nickname stays Green Storm. Save, exit and reload.'},
  {id: '05-founding-year', title: 'Founding year only', edits: {foundingYear: 1999}, team: {YEAR_FOUNDED: '1999'}, meta: {yearFounded: '1999'}, integers: {530: 1999}, check: 'Founding year changes from 1980 to 1999 wherever the game exposes it. If no screen displays it, report not visible; do not count that as a failure. Check the team still imports normally, then save, exit and reload.'},
  {id: '06-prestige-only', title: 'Stored prestige only', edits: {prestige: 4.5}, meta: {teamPrestige: '4.5'}, check: 'Stored prestige is 4.5 instead of 1.5. Template stays 6 and ALL grade ranges are original. Record the stars shown in the local team screen (if shown), immediately after NEW dynasty import, after save/reload, and after advancing one week. Note if the game keeps 4.5, resets it, or changes grades.'},
  {id: '07-template-only', title: 'My School template only', edits: {template: 7}, team: {MY_SCHOOL_TEMPLATE_ID: '7'}, meta: {mySchoolTemplateId: '7'}, integers: {538: 7}, check: 'Template changes from 6 to 7; stored prestige stays 1.5 and ALL explicit grade ranges stay original. Photograph/list every My School grade and prestige immediately after a NEW import, after save/reload, and after one week. Compare with 00, 06 and 08. The expected visible result is deliberately unknown: this tests template precedence.'},
  {id: '08-academic-grade-only', title: 'Academic grade only', edits: {grades: {ACADEMIC_PRESTIGE: {min: 90, max: 90}}}, team: {ACADEMIC_PRESTIGE_MIN: '90', ACADEMIC_PRESTIGE_MAX: '90'}, check: 'Academic starting range changes from 80–80 to 90–90; prestige stays 1.5 and template stays 6. Record the academic letter grade immediately after NEW import, after save/reload, after one week, and at next preseason if practical. Other grade inputs are unchanged. We have not assumed a numeric-to-letter conversion.'},
  {id: '09-pipeline', title: 'One recruiting pipeline', edits: {pipelineChanges: [{id: 3, value: 300}]}, team: {DYNASTY_PIPELINE_INFO: pipelineText}, meta: {pipelines: pipelineText}, header: {pipelines: pipelineText}, check: 'Only pipeline ID 3 changes, from influence 90 to 300. Compare the recruiting pipeline map with 00 after NEW import: identify which region/tier changed. We have not assigned an unverified region name or treated influence as a percent. Save, exit and reload; check other regions remain the same.'},
  {id: '10-rivalry', title: 'One rivalry win count', edits: {rivalryChanges: [{index: 0, teamOneWins: 2}]}, team: {RIVALRY_INFO: rivalText}, meta: {rivals: rivalText}, header: {rivals: rivalText}, check: 'In the East Point/Boston College rivalry, teamOneWins changes 0 → 2; teamTwoWins stays 4. Check which school the game gives the two wins to (side mapping is the question). Other rivals, the first year, streak and last-game score are intentionally unchanged. Save/reload and compare with 00.'},
  {id: '11-game-record', title: 'Game passing record only', edits: {recordChanges: [{period: 'GAME', stat: 'PASSING_YARDS', value: '777'}]}, record: ['GAME', '626', '777'], check: 'School Records → single-game passing yards should change 626 → 777. Holder stays Siaki Deng, year 2010. Season passing remains 5,345 and career passing remains 15,110. Check all other records match 00, then save/reload.'},
  {id: '12-season-record', title: 'Season passing record only', edits: {recordChanges: [{period: 'SEASON', stat: 'PASSING_YARDS', value: '6000'}]}, record: ['SEASON', '5345', '6000'], check: 'School Records → season passing yards should change 5,345 → 6,000. Holder stays Siaki Deng, year 2010. Game passing remains 626 and career passing remains 15,110. Save/reload.'},
  {id: '13-career-record', title: 'Career passing record only', edits: {recordChanges: [{period: 'CAREER', stat: 'PASSING_YARDS', value: '16000'}]}, record: ['CAREER', '15110', '16000'], check: 'School Records → career passing yards should change 15,110 → 16,000. Holder stays George Hart, year 2024. Game passing remains 626 and season passing remains 5,345. Save/reload.'},
];
for (const c of cases.filter(c => c.record)) {
  const value = recordText(...c.record);
  c.team = {RECORD_DETAILS: value}; c.meta = {teamRecords: value}; c.header = {records: value};
}
function verifyOnlyExpectedChanges(c, actual) {
  // Independent comparison: no editor mutation helpers or generic acceptance of
  // changed fields. Every map pair, binary subtree, header byte and type is checked.
  const expectedTeam = parsed.document.value.TDAT.TINF.map(([key, value]) => [key, c.team?.[key] ?? value]);
  const expectedMeta = parsed.document.value.TMDA.map(([key, value]) => [key, c.meta?.[key] ?? value]);
  assert.deepEqual(actual.document.value.TDAT.TINF, expectedTeam);
  assert.deepEqual(actual.document.value.TMDA, expectedMeta);
  assert.deepEqual(actual.document.value, {...parsed.document.value,
    TDAT: {...parsed.document.value.TDAT, TINF: expectedTeam}, TMDA: expectedMeta});
  const allowedHeader = new Set();
  for (const [key, value] of Object.entries(c.header ?? {})) {
    assert.equal(headerText(actual.bytes, key), value);
    const [start, length] = HEADER_FIELDS[key]; for (let at = start; at < start + length; at++) allowedHeader.add(at);
  }
  for (const [offset, value] of Object.entries(c.integers ?? {})) {
    assert.equal(actual.bytes.readUInt32LE(Number(offset)), value);
    for (let at = Number(offset); at < Number(offset) + 4; at++) allowedHeader.add(at);
  }
  for (let at = 0; at < 17950; at++) if (!allowedHeader.has(at)) assert.equal(actual.bytes[at], baseline.bytes[at], `Unexpected header edit at ${at}`);
  for (const key of ['DMAP']) assert.deepEqual(actual.document.value[key], parsed.document.value[key]);
  for (const key of Object.keys(parsed.document.value.TDAT).filter(key => key !== 'TINF')) assert.deepEqual(actual.document.value.TDAT[key], parsed.document.value.TDAT[key]);
  assert.deepEqual(actual.document.types, parsed.document.types);
  assert.equal(actual.document.rootTerminated, parsed.document.rootTerminated);
  assert.equal(actual.bytes.length, baseline.bytes.length);
  assert.equal(actual.discrepancies.length, 0);
  if (c.id === '00-original-control') assert.deepEqual(actual.bytes, baseline.bytes);
  return {everyUntouchedHeaderByteExact: true, allUnrelatedTdfSubtreesExact: true,
    allMapPairsAndUnknownEntriesVerified: true, typedSerializationPreserved: true, fixedCapacity: true};
}
fs.mkdirSync(output, {recursive: false});
const pack = path.join(output, 'TeamBuilder-Controlled-Tests'); fs.mkdirSync(pack);
const manifest = {created: new Date().toISOString(), scope: 'Local research test copies; in-game acceptance pending',
  sourceHashes: originals.map(({number, hash, discrepancies}) => ({file: `TEAMBUILDER-${number}`, hash, discrepancies})), cases: []};
for (const c of cases) {
  const directory = path.join(pack, c.id); fs.mkdirSync(directory);
  const destination = path.join(directory, 'TEAMBUILDER-001'); fs.copyFileSync(baseline.file, destination, fs.constants.COPYFILE_EXCL);
  const preview = previewTeamBuilder(destination, c.edits, {forceRepack: c.forceRepack === true});
  assert.equal(fingerprint(fs.readFileSync(destination)), baseline.hash, 'Preview modified its source');
  const result = applyTeamBuilder(preview);
  if (result.backupPath) assert.equal(fingerprint(fs.readFileSync(result.backupPath)), baseline.hash);
  const actual = unpackTeamBuilder(fs.readFileSync(destination));
  const proof = verifyOnlyExpectedChanges(c, actual);
  if (result.backupPath) {
    // Keep proof backups outside the delivery pack; never remove original saves.
    const backupDirectory = path.join(output, 'verified-backups'); fs.mkdirSync(backupDirectory, {recursive: true});
    fs.renameSync(result.backupPath, path.join(backupDirectory, `${c.id}-TEAMBUILDER-001`));
    fs.rmdirSync(path.dirname(result.backupPath));
  }
  fs.writeFileSync(path.join(directory, 'WHAT-TO-CHECK.txt'), `${c.title}\n\n${c.check}\n\nUse this file alone, keeping the filename TEAMBUILDER-001. See START-HERE.txt before copying it.\n`, {flag: 'wx'});
  manifest.cases.push({id: c.id, title: c.title, edits: c.edits, forcedRepack: c.forceRepack === true,
    file: `${c.id}/TEAMBUILDER-001`, hash: result.hash, changes: preview.changes, check: c.check, verification: proof,
    previewReadOnly: true, backupExact: result.changed ? true : 'no write needed'});
  console.log(`Verified ${c.id}`);
}
for (const source of originals) assert.equal(fingerprint(fs.readFileSync(source.file)), source.hash, `Original ${source.number} changed`);
manifest.allNineOriginalsUnchanged = true;
fs.writeFileSync(path.join(pack, 'manifest.json'), JSON.stringify(manifest, null, 2), {flag: 'wx'});
const lines = ['TEAMBUILDER EDITOR — CONTROLLED TEST COPIES', '',
  'These are separate East Point test files. They are not a toolkit update and have not yet been accepted in game.',
  'Your nine original files were only read. Their hashes were checked again after every test copy was created.', '',
  'START HERE',
  '1. Fully close the game. Make your own backup of the existing TEAMBUILDER-001 before replacing anything.',
  '2. Test ONE folder at a time. Copy only its TEAMBUILDER-001 into your normal saves folder. Keep that exact filename; do not rename it to a different slot number.',
  '3. Start with 00-original-control, then 01-repacked-control. Stop and report if either fails.',
  '4. For each remaining test, replace the previous test file, reopen the game, and use a NEW disposable dynasty import. Reusing the last dynasty will not establish whether this file was imported.',
  '5. Follow that folder’s WHAT-TO-CHECK.txt. Save the disposable dynasty, fully exit, reload it, and check again. Do not overwrite a real dynasty.',
  '6. Also keep a disposable dynasty created from 00. After switching the local file to 02, load that OLD test dynasty and see whether its name changes. This separates new-import behavior from existing-dynasty behavior; either result is useful.',
  '7. If practical, keep a copy of the local TEAMBUILDER-001 after the game has saved/reloaded it, plus a screenshot of the changed screen. A dynasty save alone does not prove the local TeamBuilder file was rewritten.',
  '8. When finished, close the game and restore your original TEAMBUILDER-001.', '',
  'QUICK TEST ORDER',
  'First: 00 and 01 (container acceptance), then 02–05 (identity).',
  'Next: 06–08 (prestige vs template vs grade), then 09–10 (pipeline and rivalry).',
  'Last: 11–13 (game, season and career records). Each starts from the original; changes do not stack.', '',
  'WHAT TO REPORT',
  'Test number | local team opens? | fresh import works? | value immediately | after save/reload | after progression | visual/roster issues',
  'For 06–08, record all My School grades and stars, not just academic prestige.',
  'Do not interpret a field missing from the UI as rejection. Say not visible.', '',
  'These tests preserve roster, uniforms, textures, asset IDs, stadium, sounds, top-player summaries and unknown data.',
  'No sound IDs were changed. Readable sound names need verification before editing them.',
  'All-time W–L, draft history, earned helmet stickers, and custom audio are outside this test pack.', '',
  ...cases.flatMap(c => [c.id.toUpperCase(), c.check, ''])];
fs.writeFileSync(path.join(pack, 'START-HERE.txt'), lines.join('\r\n'), {flag: 'wx'});
console.log(`Complete: ${pack}`);
