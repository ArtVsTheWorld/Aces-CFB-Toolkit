import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { runEquipmentPatcher, runFreshmanEquipment } from "../src/main/tools/equipment/runner.js";
import { loadEquipmentTables, snapshotVisualRawData } from "../src/main/tools/equipment/shared.js";
import { takePlan } from "../src/main/tools/jersey/planStore.js";
import { ReportService } from "../src/main/services/reports.js";
import { hashFile } from "../test/helpers/v180SaveValidation.js";
const root = fileURLToPath(new URL("../", import.meta.url)), schemaPath = path.join(root, "resources/engine-data/C27_486_6.gz"), sources = ["D:/Downloads/DYNASTY-UWDYNTEST", "D:/Downloads/DYNASTY-CHEE"], originalHashes = sources.map(hashFile), directory = fs.mkdtempSync(path.join(root, "outputs/v182-validated-saves-"));
const scenarios = [
  { name: "astro-mouthpiece-release", source: sources[0], run: runEquipmentPatcher, seed: 30, options: { unlockedMouthpieceFix: true, rerollExistingMouthpieces: true } },
  { name: "astro-all-passes", source: sources[0], run: runEquipmentPatcher, seed: 41, options: { pantsFix: true, helmetFix: true, rolledJerseyFix: true, sockFix: true, sleeveCompatibilityFix: true, nikeThighPads: true, visorFix: true, oakleyVisorFix: true, unlockedMouthpieceFix: true, rerollExistingMouthpieces: true, unlockedRecolorFix: true, unlockedTattooFix: true } },
  { name: "cash-randomizer", source: sources[1], run: runFreshmanEquipment, seed: 47, options: { classes: [], redshirtGroup: "all", skipNilPlayers: false, usingUnlockedMod: true, usingRawAccessoriesMod: true, top: 50 } }
], results = [];
try {
  for (const scenario of scenarios.filter(scenario => !process.argv[2] || scenario.name === process.argv[2])) {
    const folder = path.join(directory, scenario.name); fs.mkdirSync(folder);
    const log = message => console.log(`${new Date().toISOString()} ${scenario.name}: ${message}`);
    const savePath = path.join(folder, "DYNASTY-TEST"); fs.copyFileSync(scenario.source, savePath);
    const original = hashFile(savePath), reports = new ReportService(path.join(folder, "reports"));
    const random = Math.random; Math.random = () => scenario.seed / 0x100000000;
    let preview;
    log("Starting Preview");
    try { preview = await scenario.run({ savePath, schemaPath, mode: "preview", reports, options: scenario.options }); } finally { Math.random = random; }
    assert.equal(hashFile(savePath), original); assert.equal(preview.backupPath, null); assert.equal(fs.existsSync(path.join(folder, "Ace's CFB Toolkit Backups")), false);
    const plan = takePlan(preview.planId); assert.ok(plan.assignments.length);
    log(`Preview completed (${plan.assignments.length} assignments)`);
    // Repeating the same seeded analysis must produce byte-identical assignments.
    Math.random = () => scenario.seed / 0x100000000;
    let repeat;
    try { repeat = await scenario.run({ savePath, schemaPath, mode: "preview", reports, options: scenario.options }); } finally { Math.random = random; }
    assert.deepEqual(takePlan(repeat.planId).assignments, plan.assignments);
    log("Seeded repeat matches");
    const baseline = await loadEquipmentTables(savePath, schemaPath), before = snapshotVisualRawData(baseline.visuals.records), expected = new Map(plan.assignments.map(change => [change.row, change.newValue]));
    const prototype = Object.getPrototypeOf(baseline.visuals.records[0].getFieldByKey("RawData")), descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (process.argv.includes("--trace")) Object.defineProperty(prototype, "value", { ...descriptor, set(value) {
      if (this.key === "RawData") fs.appendFileSync(path.join(folder, "apply-trace.txt"), `Start ${this.parent.index}\n`);
      descriptor.set.call(this, value);
      if (this.key === "RawData") fs.appendFileSync(path.join(folder, "apply-trace.txt"), `End ${this.parent.index}\n`);
    } });
    log("Starting Apply");
    let applied;
    try { applied = await scenario.run({ savePath, schemaPath, mode: "apply", reports, options: { planId: preview.planId } }); }
    finally { Object.defineProperty(prototype, "value", descriptor); }
    log("Apply completed; checking saved copy");
    assert.equal(applied.status, "completed"); assert.equal(hashFile(applied.backupPath), original); assert.deepEqual(applied.details, preview.details);
    const saved = await loadEquipmentTables(savePath, schemaPath), after = snapshotVisualRawData(saved.visuals.records);
    for (const [row, raw] of before) if (typeof raw === "string") assert.ok(isDeepStrictEqual(JSON.parse(after.get(row)), JSON.parse(expected.get(row) ?? raw)), `Expected complete equipment row ${row}`);
    assert.deepEqual(baseline.players.data, saved.players.data, "No Player fields are changed"); assert.deepEqual(baseline.teams.data, saved.teams.data, "No Team fields are changed");
    log("Saved copy matches; starting follow-up Preview");
    const rePreview = await scenario.run({ savePath, schemaPath, mode: "preview", reports, options: scenario.options }); assert.ok(rePreview.planId);
    assert.equal(fs.readdirSync(folder).some(file => file.startsWith(".ace-equipment-")), false);
    const result = { scenario: scenario.name, assignments: plan.assignments.length, deterministicReplay: true, previewReadOnly: true, exactReopenedOutput: true, backupHashMatches: true, report: applied.reportPath, backup: applied.backupPath };
    results.push(result); console.log(JSON.stringify(result));
  }
} finally {
  assert.deepEqual(sources.map(hashFile), originalHashes, "Both supplied originals remain byte-identical");
  fs.writeFileSync(path.join(directory, "results.json"), JSON.stringify({ sources: sources.map((file, index) => ({ file, sha256: originalHashes[index] })), results }, null, 2));
}
console.log(`All save-copy checks passed. Artifacts: ${directory}`);
