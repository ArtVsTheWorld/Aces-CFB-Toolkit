// Full-save regressions run only on workspace copies. Replay the actual gear
// mutations from supplied pre/post pairs, then exercise fresh external donors.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { openCfb27Save, readTables } from "../src/main/services/save.js";
import { ReportService } from "../src/main/services/reports.js";
import { runFreshmanEquipment } from "../src/main/tools/equipment/runner.js";
import { VISUALS_TABLE_UID, applyEquipmentPlan, cacheEquipmentPlan, loadEquipmentTables, snapshotVisualRawData } from "../src/main/tools/equipment/shared.js";
import { overflowOwners, validateVisualStorageLayout } from "../src/main/tools/equipment/visualStorage.js";
import { sf } from "../src/main/tools/equipment/openSave.js";
import { takePlan } from "../src/main/tools/jersey/planStore.js";

const root = fileURLToPath(new URL("../", import.meta.url)), schemaPath = path.join(root, "resources/engine-data/C27_486_6.gz");
const directory = fs.mkdtempSync(path.join(root, "outputs/v183-verified-"));
const hash = bytes => createHash("sha256").update(bytes).digest("hex"), hashFile = file => hash(fs.readFileSync(file));
const pairs = [
  { name: "chee", before: "D:/Downloads/DYNASTY-CHEE-BACKUP-100326-4", after: "C:/Users/Art/Documents/EA SPORTS College Football 27/saves/DYNASTY-CHEE", position: "WR" },
  { name: "wk", before: "D:/Downloads/DYNASTY-WK-BACKUP-100326", after: "C:/Users/Art/Documents/EA SPORTS College Football 27/saves/DYNASTY-WK", position: "TE" }
];
const vanilla = path.join(root, "../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN"), sources = [...new Set([...pairs.flatMap(pair => [pair.before, pair.after]), vanilla])], hashes = sources.map(hashFile), results = [];
const log = message => console.log(`${new Date().toISOString()} ${message}`);
const otherHashes = loaded => new Map(loaded.franchise.tables.filter(table => table !== loaded.visuals).map(table => [table.header.tableId, hash(table.data)]));
function checkOthers(loaded, expected) {
  for (const table of loaded.franchise.tables) if (expected.has(table.header.tableId)) assert.equal(hash(table.data), expected.get(table.header.tableId), `${table.name} unchanged`);
}
function logical(table) {
  const owners = overflowOwners(table), values = new Map();
  for (const record of table.records) if (!record.isEmpty && !owners.has(record.index)) { const raw = sf(record, "RawData"); if (typeof raw === "string") values.set(record.index, raw); }
  return values;
}
async function replay(pair) {
  const folder = path.join(directory, `${pair.name}-exact-replay`); fs.mkdirSync(folder);
  const savePath = path.join(folder, `DYNASTY-${pair.name.toUpperCase()}-V183`), reports = new ReportService(path.join(folder, "reports")); fs.copyFileSync(pair.before, savePath);
  log(`${pair.name}: reading exact crashing-save gear without changing either original`);
  let oldPost = await openCfb27Save(pair.after, schemaPath), postTables = await readTables(oldPost.franchise, { visuals: VISUALS_TABLE_UID });
  const target = logical(postTables.visuals);
  assert.throws(() => validateVisualStorageLayout(postTables.visuals), /game's fixed capacity/, "v0.18.2 crashing structure must be detected");
  oldPost = null; postTables = null;
  const loaded = await loadEquipmentTables(savePath, schemaPath), before = snapshotVisualRawData(loaded.visuals.records), layout = validateVisualStorageLayout(loaded.visuals), others = otherHashes(loaded), initialHash = hashFile(savePath), assignments = [];
  for (const [row, oldValue] of before) if (typeof oldValue === "string") {
    assert.ok(target.has(row), `Post save retains logical row ${row}`);
    const newValue = target.get(row); if (JSON.stringify(JSON.parse(oldValue)) !== JSON.stringify(JSON.parse(newValue))) assignments.push({ table: "visuals", row, field: "RawData", oldValue, newValue });
  }
  assert.ok(assignments.length);
  const planId = cacheEquipmentPlan({ toolId: "freshman-equipment", toolName: "Equipment Randomizer", savePath, assignments, needsVisuals: true, previewRows: [], report: { prefix: `v183-${pair.name}-replay`, headings: ["Equipment row", "Before", "After"], rows: assignments.map(change => [change.row, change.oldValue, change.newValue]) }, result: { status: "preview", mode: "preview", summary: `${assignments.length} exact historical loadout changes`, details: { replayedAssignments: assignments.length }, resultKind: "freshman-equipment" } });
  assert.equal(hashFile(savePath), initialHash); assert.equal(fs.existsSync(path.join(folder, "Ace's CFB Toolkit Backups")), false);
  log(`${pair.name}: applying ${assignments.length} exact mutations through the shared verified Apply path`);
  const applied = await applyEquipmentPlan({ toolId: "freshman-equipment", savePath, schemaPath, reports, options: { planId } });
  assert.equal(applied.status, "completed"); assert.equal(hashFile(applied.backupPath), initialHash);
  const reopened = await loadEquipmentTables(savePath, schemaPath), after = snapshotVisualRawData(reopened.visuals.records);
  for (const [row, raw] of target) assert.deepEqual(JSON.parse(after.get(row)), JSON.parse(raw), `Exact crashing-save equipment retained at row ${row}`);
  assert.deepEqual(validateVisualStorageLayout(reopened.visuals), layout); checkOthers(reopened, others);
  // A second cached Preview/Apply of the same gear is a no-op, not a rewrite.
  const finalHash = hashFile(savePath), secondId = cacheEquipmentPlan({ toolId: "freshman-equipment", toolName: "Equipment Randomizer", savePath, assignments: [], needsVisuals: true, previewRows: [], report: { prefix: `v183-${pair.name}-repeat`, headings: ["Result"], rows: [["Unchanged"]] }, result: { status: "preview", mode: "preview", details: {} } });
  const repeated = await applyEquipmentPlan({ toolId: "freshman-equipment", savePath, schemaPath, reports, options: { planId: secondId } }); assert.equal(repeated.status, "no-changes"); assert.equal(hashFile(savePath), finalHash); assert.equal(repeated.backupPath, null);
  assert.equal(fs.readdirSync(folder).some(file => file.startsWith(".ace-equipment-")), false);
  const result = { scenario: `${pair.name}-exact-replay`, savePath, historicalMutations: assignments.length, allHistoricalGearExact: true, otherTablesUnchanged: true, unchangedFixedLayout: layout, previewReadOnly: true, backupHashMatches: true, repeatedNoOpUnchanged: true, report: applied.reportPath, backup: applied.backupPath };
  results.push(result); log(JSON.stringify(result));
}
async function external(name, source, position, seed) {
  const folder = path.join(directory, name); fs.mkdirSync(folder);
  const savePath = path.join(folder, "DYNASTY-RECIPIENT"), donorSave = path.join(folder, "DYNASTY-DONOR"); fs.copyFileSync(source, savePath); fs.copyFileSync(source, donorSave);
  const initialHash = hashFile(savePath), donorHash = hashFile(donorSave), reports = new ReportService(path.join(folder, "reports")), options = { positions: [position], classes: ["Freshman", "Sophomore", "Junior"], redshirtGroup: "all", skipNilPlayers: false, donorSave, top: 85, crossPositionPercent: 0, multipleDonorPercent: 40, usingUnlockedMod: false, usingRawAccessoriesMod: false, noDripProfile: false };
  const preview = async () => { const random = Math.random; Math.random = () => seed / 0x100000000; try { return await runFreshmanEquipment({ savePath, schemaPath, reports, mode: "preview", options }); } finally { Math.random = random; } };
  log(`${name}: fresh external-donor Preview`); const first = await preview(), assignments = takePlan(first.planId).assignments;
  assert.ok(assignments.length); assert.equal(hashFile(savePath), initialHash); assert.equal(first.backupPath, null); assert.equal(fs.existsSync(path.join(folder, "Ace's CFB Toolkit Backups")), false);
  const repeated = await preview(); assert.deepEqual(takePlan(repeated.planId).assignments, assignments);
  const loaded = await loadEquipmentTables(savePath, schemaPath), baseline = snapshotVisualRawData(loaded.visuals.records), layout = validateVisualStorageLayout(loaded.visuals), others = otherHashes(loaded), expected = new Map(assignments.map(change => [change.row, change.newValue]));
  log(`${name}: Apply and complete reopened-loadout comparison`);
  const applied = await runFreshmanEquipment({ savePath, schemaPath, reports, mode: "apply", options: { planId: first.planId } });
  assert.equal(applied.status, "completed"); assert.equal(hashFile(applied.backupPath), initialHash);
  const reopened = await loadEquipmentTables(savePath, schemaPath), after = snapshotVisualRawData(reopened.visuals.records);
  for (const [row, raw] of baseline) if (typeof raw === "string") assert.deepEqual(JSON.parse(after.get(row)), JSON.parse(expected.get(row) ?? raw), `Planned and unplanned row ${row}`);
  assert.deepEqual(validateVisualStorageLayout(reopened.visuals), layout); checkOthers(reopened, others); assert.equal(hashFile(donorSave), donorHash);
  assert.equal(fs.readdirSync(folder).some(file => file.startsWith(".ace-equipment-")), false);
  const result = { scenario: name, position, savePath, assignments: assignments.length, deterministicSeedReplay: true, exactReopenedGear: true, unchangedFixedLayout: layout, otherTablesUnchanged: true, donorReadOnly: true, previewReadOnly: true, backupHashMatches: true, report: applied.reportPath, backup: applied.backupPath }; results.push(result); log(JSON.stringify(result));
}
try {
  for (const pair of pairs) if (!process.argv[2] || process.argv[2] === `${pair.name}-replay`) await replay(pair);
  const scenarios = [
    ["chee-external-wr", pairs[0].before, "WR", 63], ["wk-external-te", pairs[1].before, "TE", 67],
    ["vanilla-external-wr", vanilla, "WR", 71], ["vanilla-external-te", vanilla, "TE", 73]
  ];
  for (const scenario of scenarios) if (!process.argv[2] || process.argv[2] === scenario[0]) await external(...scenario);
} finally {
  assert.deepEqual(sources.map(hashFile), hashes, "All supplied files and the vanilla fixture remain byte-identical");
  fs.writeFileSync(path.join(directory, "results.json"), JSON.stringify({ version: JSON.parse(fs.readFileSync(path.join(root, "package.json"))).version, sources: sources.map((file, index) => ({ file, sha256: hashes[index] })), results }, null, 2));
}
log(`All requested save-copy scenarios passed. Artifacts: ${directory}`);
