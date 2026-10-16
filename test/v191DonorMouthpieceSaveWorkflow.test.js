import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ReportService } from '../src/main/services/reports.js';
import { parseCsv } from '../src/main/services/reportAudit.js';
import { prepareEquipmentDonors, loadEquipmentDonorSource } from '../src/main/tools/equipment/donorSource.js';
import { runFreshmanEquipment, runEquipmentPatcher } from '../src/main/tools/equipment/runner.js';
import { loadEquipmentTables } from '../src/main/tools/equipment/shared.js';
import { saveFingerprint } from '../src/main/tools/jersey/planStore.js';
import { normalizeCrossDonorGroups } from '../src/main/tools/equipment/core/donorGroups.js';
import { normalizeMouthpiecePositions } from '../src/main/tools/equipment/core/mouthpieceSettings.js';
const fixture = path.resolve('../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN'), schemaPath = path.resolve('resources/engine-data/C27_486_6.gz');
const roster = 'C:/Users/Art/Documents/EA SPORTS College Football 27/saves/ROSTER-Official';
const olderRoster = 'D:/Downloads/ROSTER-RealRatingsSc1';
function copy(t) { const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cfb-v191-donors-')), savePath = path.join(directory, 'DYNASTY-TEST'); t.after(() => fs.rmSync(directory, { recursive: true, force: true })); fs.copyFileSync(fixture, savePath); return { directory, savePath, schemaPath, reports: new ReportService(path.join(directory, 'reports')) }; }
test('real roster donors retain exact slot values, class/position labels, and normalized player identities', { skip: !fs.existsSync(roster) }, async () => {
  const before = saveFingerprint(roster), source = await loadEquipmentDonorSource(roster, schemaPath), prepared = await prepareEquipmentDonors({ savePath: roster, schemaPath });
  assert.equal(source.donorKind, 'roster'); assert.equal(source.warnings.length, 0); assert.ok(prepared.donorPlayers.length > 8000);
  assert.ok(prepared.donorPlayers.some(player => player.label.includes('RJ Jackson Jr.')));
  assert.ok(source.visuals.records.some(record => JSON.parse(record.RawData).loadouts[0].loadoutElements.some(element => element.slotType === 'OuterPants')));
  const elements = source.visuals.records.flatMap(record => JSON.parse(record.RawData).loadouts[0].loadoutElements);
  assert.equal(elements.filter(element => element.blends).length, 8399); // Playable rosters only; unassigned players are not donors.
  assert.equal(elements.filter(element => element.paletteMods).length, 129);
  assert.ok(elements.some(element => element.paletteMods?.some(palette => palette.paletteType === 'Preset' && palette.paletteValue === 'SolidSecondary_ColorPreset')));
  assert.equal(saveFingerprint(roster), before);
});
for (const mode of ['roster-top', 'roster-top-old', 'roster-specific-cross', 'dynasty-specific', 'mouthpiece-positions']) test(`${mode}: exact Preview/Apply/reopen with full CSV configuration and read-only donors`, { timeout: 60000, skip: mode.startsWith('roster') && !fs.existsSync(mode === 'roster-top-old' ? olderRoster : roster) }, async t => {
  const context = copy(t), before = saveFingerprint(context.savePath), donorPath = mode === 'roster-top-old' ? olderRoster : mode.startsWith('roster') ? roster : fixture, donorHash = saveFingerprint(donorPath);
  let options = { includedTeams: ['LSU'], skipNilPlayers: false, positions: ['WR', 'TE'], crossPositionPercent: 0, multipleDonorPercent: 40 };
  if (mode.startsWith('roster-top')) options = { ...options, donorSave: donorPath };
  if (mode.includes('specific')) {
    const catalog = await prepareEquipmentDonors({ savePath: donorPath, schemaPath });
    const donors = catalog.donorPlayers.filter(player => ['WR', 'TE'].includes(player.position)).slice(0, 15);
    assert.ok(donors.some(player => player.position === 'TE'));
    options = { ...options, donorMode: 'selected', donorSave: donorPath, donorFingerprint: catalog.donorFingerprint, donorRows: donors.map(player => player.value) };
    if (mode === 'roster-specific-cross') options = { ...options, crossPositionPercent: 100, multipleDonorPercent: 0, crossDonorGroups: normalizeCrossDonorGroups({ WR: ['TE'], TE: ['WR'] }) };
  }
  if (mode === 'mouthpiece-positions') options = { includedTeams: ['LSU'], skipNilPlayers: false, unlockedMouthpieceFix: true, rerollExistingMouthpieces: true, brandedMouthpieceFrequency: 100, mouthpiecePositions: normalizeMouthpiecePositions({ QB: { enabled: true, standard: 0, pacifier: 0, hanging: 100 }, WR: { enabled: false, standard: 5, pacifier: 20, hanging: 75 }, TE: { enabled: true, standard: 100, pacifier: 0, hanging: 0 } }) };
  const run = mode === 'mouthpiece-positions' ? runEquipmentPatcher : runFreshmanEquipment;
  const preview = await run({ ...context, mode: 'preview', options }); assert.ok(preview.details.totalPreviewRows > 0); assert.equal(saveFingerprint(context.savePath), before);
  const applied = await run({ ...context, mode: 'apply', options: { planId: preview.planId } }); assert.equal(applied.status, 'completed'); assert.equal(saveFingerprint(applied.backupPath), before); assert.equal(saveFingerprint(donorPath), donorHash);
  const reopened = await loadEquipmentTables(context.savePath, schemaPath), [headings, ...rows] = parseCsv(fs.readFileSync(applied.reportPath, 'utf8'));
  const records = rows.map(row => Object.fromEntries(headings.map((heading, index) => [heading, row[index]])));
  assert.ok(records.length); const resolved = JSON.parse(records[0].ResolvedOptionsJSON);
  if (mode === 'mouthpiece-positions') { assert.equal(resolved.mouthpiecePositions.QB.hanging, 100); assert.equal(resolved.mouthpiecePositions.WR.enabled, false); assert.ok(applied.details.changes.every(row => row.position !== 'WR')); }
  else { assert.equal(resolved.donorSave, donorPath); assert.equal(resolved.donorFingerprint, donorHash); assert.equal(JSON.parse(records[0].DonorSourceAuditJSON).fingerprint, donorHash); }
  for (const record of records) assert.equal(reopened.visuals.records[Number(record.CharacterVisualsRow)].RawData, record.AfterRawData);
});
test('older CFB 27 release-tag rosters retain usable donors and diagnostic exclusions without modifying source files', { timeout: 30000, skip: !fs.existsSync(olderRoster) }, async () => {
  for (const donorPath of [olderRoster, 'D:/Downloads/ROSTER-UNLOCKEDROSTERTAG724', 'D:/Downloads/ROSTER-Week1'].filter(fs.existsSync)) {
    const before = saveFingerprint(donorPath), catalog = await prepareEquipmentDonors({ savePath: donorPath, schemaPath });
    assert.equal(catalog.donorKind, 'roster'); assert.ok(catalog.donorPlayers.length > 8000); assert.ok(catalog.warnings.length > 0);
    assert.ok(catalog.warnings.every(warning => Number.isSafeInteger(warning.playerId) && warning.reason)); assert.equal(saveFingerprint(donorPath), before);
  }
});
test('a changed donor source aborts Apply before any recipient write or backup', { timeout: 60000 }, async t => {
  const context = copy(t), donorPath = path.join(context.directory, 'DONOR'); fs.copyFileSync(fixture, donorPath);
  const before = saveFingerprint(context.savePath), preview = await runFreshmanEquipment({ ...context, mode: 'preview', options: { includedTeams: ['LSU'], positions: ['WR'], skipNilPlayers: false, donorSave: donorPath } });
  fs.appendFileSync(donorPath, Buffer.from([0]));
  await assert.rejects(runFreshmanEquipment({ ...context, mode: 'apply', options: { planId: preview.planId } }), /donor file changed/);
  assert.equal(saveFingerprint(context.savePath), before); assert.equal(fs.existsSync(path.join(context.directory, "Ace's CFB Toolkit Backups")), false);
});

test('browsing to the active file still preserves selected donors when upperclassmen are recipients', { timeout: 60000 }, async t => {
  const context = copy(t), catalog = await prepareEquipmentDonors({ savePath: context.savePath, schemaPath });
  const donors = catalog.donorPlayers.filter(player => player.position === 'WR' && player.label.includes(' · LSU · ')).slice(0, 2);
  assert.equal(donors.length, 2);
  const original = await loadEquipmentTables(context.savePath, schemaPath), rows = donors.map(player => Number(player.value));
  const options = { includedTeams: ['LSU'], positions: ['WR'], classes: ['Freshman', 'Sophomore', 'Junior', 'Senior'], redshirtGroup: 'all', skipNilPlayers: false, donorMode: 'selected', donorSave: context.savePath, donorFingerprint: catalog.donorFingerprint, donorRows: rows };
  const preview = await runFreshmanEquipment({ ...context, mode: 'preview', options });
  assert.equal(preview.details.donorKind, 'active'); assert.ok(preview.details.totalPreviewRows > 0);
  assert.ok(preview.details.changes.some(player => player.classYear !== 'Freshman'));
  assert.ok(preview.details.changes.every(player => !rows.includes(player.row)));
  await runFreshmanEquipment({ ...context, mode: 'apply', options: { planId: preview.planId } });
  const reopened = await loadEquipmentTables(context.savePath, schemaPath);
  for (const row of rows) { const visualRow = parseInt(original.players.records[row].CharacterVisuals.slice(15), 2); assert.equal(reopened.visuals.records[visualRow].RawData, original.visuals.records[visualRow].RawData); }
});
