// Optional local integration: all writes are to fresh copies under outputs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadEquipmentTables, buildRosterTeamNames, snapshotVisualRawData } from '../src/main/tools/equipment/shared.js';
import { sf, parseRef } from '../src/main/tools/equipment/openSave.js';
import { runEquipmentPatcher, runFreshmanEquipment } from '../src/main/tools/equipment/runner.js';
import { takePlan } from '../src/main/tools/jersey/planStore.js';
import { normalizeModPools } from '../src/main/tools/equipment/core/modPools.js';
import { EQUIPMENT_TRUCK_POOLS, equipmentItem, recolorEquipmentItem } from '../src/main/tools/equipment/catalog.js';
import { ReportService } from '../src/main/services/reports.js';

const root = fileURLToPath(new URL('../', import.meta.url));
if (!process.argv[2]) throw new Error('Supply the path to the equipped GEARTRUCK sample. Only fresh output copies will be modified.');
const source = path.resolve(process.argv[2]);
const schemaPath = path.join(root, 'resources/engine-data/C27_486_6.gz');
const directory = fs.mkdtempSync(path.join(root, 'outputs/v215-truck-verified-'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hashFile = file => hash(fs.readFileSync(file));
const sourceHash = hashFile(source), results = [];
const sampleNames = ['Jeremiah Smith', 'Brandon Inniss', 'Chris Henry Jr.', 'Devin McCuin', 'Kyle Parker', 'Sedrick Pittman-Jean'];
const sourceTables = await loadEquipmentTables(source, schemaPath, true, false);
const teams = buildRosterTeamNames(sourceTables.players, sourceTables.teams, sourceTables.rosters);
const samples = sourceTables.players.records.filter(player => player && !player.isEmpty && teams.get(player.index) === 'Ohio State' && sampleNames.includes(sf(player, 'FirstName') + ' ' + sf(player, 'LastName'))).map(player => {
  const ref = parseRef(sf(player, 'CharacterVisuals'));
  const raw = JSON.parse(sf(sourceTables.visuals.records[ref.row], 'RawData'));
  return { name: sf(player, 'FirstName') + ' ' + sf(player, 'LastName'), row: player.index, visualRow: ref.row, gear: raw.loadouts.flatMap(loadout => loadout.loadoutElements ?? []).filter(element => ['LeftArmWear', 'RightArmWear', 'Visor'].includes(element.slotType)) };
});
assert.equal(samples.length, 6, 'All supplied sample players found through active roster links');
const observed = new Set(samples.flatMap(sample => sample.gear.map(element => element.itemAssetName)));
for (const item of [...EQUIPMENT_TRUCK_POOLS.armSleeves, ...EQUIPMENT_TRUCK_POOLS.visors]) assert.ok(observed.has(item.itemName), 'Every catalog ID is equipped in the sample: ' + item.itemName);

async function scenario(name, run, options, verify) {
  const folder = path.join(directory, name); fs.mkdirSync(folder);
  const savePath = path.join(folder, 'DYNASTY-TRUCK-' + name.toUpperCase()); fs.copyFileSync(source, savePath);
  const reports = new ReportService(path.join(folder, 'reports'));
  const context = { savePath, schemaPath, reports, mode: 'preview', options };
  const loaded = await loadEquipmentTables(savePath, schemaPath);
  const baseline = snapshotVisualRawData(loaded.visuals.records);
  const otherTables = new Map(loaded.franchise.tables.filter(table => table !== loaded.visuals).map(table => [table.header.tableId, hash(table.data)]));
  const random = Math.random;
  let preview, repeat;
  try { Math.random = () => 0.4215; preview = await run(context); repeat = await run(context); } finally { Math.random = random; }
  assert.equal(hashFile(savePath), sourceHash, 'Preview is read-only');
  const plan = takePlan(preview.planId);
  assert.ok(plan.assignments.length, 'Scenario changes gear');
  assert.deepEqual(takePlan(repeat.planId).assignments, plan.assignments, 'Same seeded preview is deterministic');
  const applied = await run({ ...context, mode: 'apply', options: { planId: preview.planId } });
  assert.equal(applied.status, 'completed'); assert.equal(hashFile(applied.backupPath), sourceHash, 'Exact backup');
  const reopened = await loadEquipmentTables(savePath, schemaPath), after = snapshotVisualRawData(reopened.visuals.records);
  const expected = new Map(plan.assignments.map(change => [change.row, change.newValue]));
  for (const [row, raw] of baseline) if (typeof raw === 'string') assert.deepEqual(JSON.parse(after.get(row)), JSON.parse(expected.get(row) ?? raw), 'Exact expected visual row ' + row);
  for (const table of reopened.franchise.tables) if (otherTables.has(table.header.tableId)) assert.equal(hash(table.data), otherTables.get(table.header.tableId), table.name + ' unchanged');
  verify(after, preview);
  const csv = fs.readFileSync(applied.reportPath, 'utf8');
  assert.ok(csv.includes('ResolvedOptionsJSON')); assert.ok(csv.includes('Team Brand') || csv.includes('Brand x Team'));
  results.push({ name, savePath, changedRows: plan.assignments.length, report: applied.reportPath, backup: applied.backupPath, exactReopen: true, deterministic: true, otherTablesUnchanged: true });
  console.log(JSON.stringify(results.at(-1)));
}

try {
  for (const theme of ['white', 'black', 'primary', 'secondary']) await scenario('recolor-' + theme, runEquipmentPatcher, { includedTeams: ['Ohio State'], positions: ['WR'], skipNilPlayers: false, unlockedRecolorFix: true, unlockedColorTheme: theme, tapeColorMode: 'accessory' }, after => {
    for (const sample of samples) {
      const elements = JSON.parse(after.get(sample.visualRow)).loadouts.flatMap(loadout => loadout.loadoutElements ?? []);
      for (const old of sample.gear) assert.equal(elements.find(element => element.slotType === old.slotType)?.itemAssetName, old.slotType === 'Visor' ? old.itemAssetName : recolorEquipmentItem(old.itemAssetName, theme), sample.name + ' ' + old.slotType);
    }
  });
  const donor = path.join(directory, 'DYNASTY-READONLY-DONOR'); fs.copyFileSync(source, donor);
  await scenario('randomizer', runFreshmanEquipment, { includedTeams: ['Ohio State'], positions: ['WR'], classes: [], redshirtGroup: 'all', skipNilPlayers: false, donorSave: donor, top: 20, crossPositionPercent: 0, multipleDonorPercent: 0, usingEquipmentTruckMod: true, modPools: normalizeModPools({ eljax: { armSleeves: { chance: 100 }, visors: { chance: 100 } } }) }, (after, preview) => {
    assert.equal(preview.details.usingEquipmentTruckMod, true); assert.ok(preview.details.equipmentTruckPlayersChanged > 0);
    for (const sample of samples) {
      const elements = JSON.parse(after.get(sample.visualRow)).loadouts.flatMap(loadout => loadout.loadoutElements ?? []);
      for (const slot of ['LeftArmWear', 'RightArmWear', 'Visor']) assert.equal(equipmentItem(elements.find(element => element.slotType === slot)?.itemAssetName)?.origin, 'eljax', sample.name + ' ' + slot);
    }
    assert.equal(hashFile(donor), sourceHash, 'External donor untouched');
  });
} finally {
  assert.equal(hashFile(source), sourceHash, 'Original user save untouched');
  fs.writeFileSync(path.join(directory, 'results.json'), JSON.stringify({ source, sourceHash, samples, results }, null, 2));
}
console.log('PASS: ' + results.length + ' copied-save Preview/Apply/reopen scenarios; artifacts: ' + directory);
