// Exercise the actual Preview/cached Apply pipeline only on workspace copies.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { ReportService } from "../src/main/services/reports.js";
import { runFreshmanEquipment, runEquipmentPatcher } from "../src/main/tools/equipment/runner.js";
import { loadEquipmentTables, snapshotVisualRawData } from "../src/main/tools/equipment/shared.js";
import { validateVisualStorageLayout } from "../src/main/tools/equipment/visualStorage.js";
import { takePlan } from "../src/main/tools/jersey/planStore.js";

const source = path.resolve(process.argv[2] ?? "D:/Downloads/DYNASTY-OCT04-03h21m46-AUTOSAVE"), schemaPath = path.resolve("resources/engine-data/C27_486_6.gz");
const directory = fs.mkdtempSync(path.resolve("outputs/v184-verified-")), results = [];
const hash = bytes => createHash("sha256").update(bytes).digest("hex"), hashFile = file => hash(fs.readFileSync(file)), originalHash = hashFile(source);
const broad = { classes: [], redshirtGroup: "all", skipNilPlayers: false };
const scenarios = [
  ["RANDOMIZER-DEFAULT", runFreshmanEquipment, {}, 184],
  ["RANDOMIZER-ALL-POOLS", runFreshmanEquipment, { ...broad, positions: ["WR", "TE"], usingUnlockedMod: true, usingRawAccessoriesMod: true, noDripProfile: true }, 185],
  ["RANDOMIZER-EXTERNAL", runFreshmanEquipment, { ...broad, donorSave: path.resolve("../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN"), multipleDonorPercent: 40, crossPositionPercent: 0 }, 186],
  ["PATCHER-ALL-PASSES", runEquipmentPatcher, { ...broad, pantsFix: true, helmetFix: true, rolledJerseyFix: true, sockFix: true, sleeveCompatibilityFix: true, nikeThighPads: true, visorFix: true, oakleyVisorFix: true, unlockedRecolorFix: true, unlockedMouthpieceFix: true, unlockedTattooFix: true, rerollExistingMouthpieces: true, allowVicisZero2: true, balanceExistingHelmets: true }, 187]
];
try {
  for (const [name, run, options, seed] of scenarios) {
    if (process.argv[3] && process.argv[3] !== name) continue;
    const folder = path.join(directory, name); fs.mkdirSync(folder);
    const savePath = path.join(folder, `DYNASTY-V184-${name}`); fs.copyFileSync(source, savePath);
    const reports = new ReportService(path.join(folder, "reports")), donorHash = options.donorSave ? hashFile(options.donorSave) : null;
    const preview = async () => { const random = Math.random; Math.random = () => seed / 0x100000000; try { return await run({ savePath, schemaPath, reports, mode: "preview", options }); } finally { Math.random = random; } };
    console.log(`${name}: Preview`);
    const first = await preview(), assignments = takePlan(first.planId).assignments;
    assert.ok(assignments.length); assert.equal(hashFile(savePath), originalHash);
    assert.equal(fs.existsSync(path.join(folder, "Ace's CFB Toolkit Backups")), false);
    const repeat = await preview(); assert.deepEqual(takePlan(repeat.planId).assignments, assignments, "Identical input/seed gives an identical plan");
    const loaded = await loadEquipmentTables(savePath, schemaPath), baseline = snapshotVisualRawData(loaded.visuals.records), layout = validateVisualStorageLayout(loaded.visuals);
    const others = new Map(loaded.franchise.tables.filter(table => table !== loaded.visuals).map(table => [table.header.tableId, hash(table.data)]));
    console.log(`${name}: Apply ${assignments.length} loadout changes`);
    const applied = await run({ savePath, schemaPath, reports, mode: "apply", options: { planId: first.planId } });
    assert.equal(hashFile(applied.backupPath), originalHash);
    const reopened = await loadEquipmentTables(savePath, schemaPath), after = snapshotVisualRawData(reopened.visuals.records), expected = new Map(assignments.map(change => [change.row, change.newValue]));
    for (const [row, raw] of baseline) if (typeof raw === "string") assert.deepEqual(JSON.parse(after.get(row)), JSON.parse(expected.get(row) ?? raw), `Exact planned/unplanned row ${row}`);
    for (const table of reopened.franchise.tables) if (others.has(table.header.tableId)) assert.equal(hash(table.data), others.get(table.header.tableId), `${table.name} unchanged`);
    assert.deepEqual(validateVisualStorageLayout(reopened.visuals), layout);
    assert.equal(fs.statSync(savePath).size, fs.statSync(source).size);
    if (options.donorSave) assert.equal(hashFile(options.donorSave), donorHash);
    const result = { name, seed, assignments: assignments.length, savePath, backupPath: applied.backupPath, reportPath: applied.reportPath, previewReadOnly: true, deterministicReplay: true, exactReloadedRows: true, otherTablesUnchanged: true, fixedStorageAndContainer: true, backupExact: true };
    results.push(result); console.log(JSON.stringify(result));
  }
} finally {
  assert.equal(hashFile(source), originalHash, "The supplied original must remain unchanged");
  fs.writeFileSync(path.join(directory, "results.json"), JSON.stringify({ version: "18.4.0", source, originalHash, results }, null, 2));
}
console.log(`Validation artifacts: ${directory}`);
