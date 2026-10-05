import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { ReportService } from "../src/main/services/reports.js";
import { runEquipmentPatcher } from "../src/main/tools/equipment/runner.js";
import { HELMET_MODELS } from "../src/main/tools/equipment/core/helmets.js";
import { loadEquipmentTables, snapshotVisualRawData } from "../src/main/tools/equipment/shared.js";
import { takePlan } from "../src/main/tools/jersey/planStore.js";
const fixture = path.resolve("../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN"), schemaPath = path.resolve("resources/engine-data/C27_486_6.gz");
const hash = buffer => createHash("sha256").update(buffer).digest("hex"), fileHash = file => hash(fs.readFileSync(file));
const global = Object.fromEntries(HELMET_MODELS.map((model, index) => [model.id, index < 2 ? 8 : 7]));
for (const [name, options] of [
  ["all verified helmet models + population balance", { helmetFix: true, balanceExistingHelmets: true, helmetDistribution: { mode: "custom", global, positions: {} } }],
  ["custom Repair Only excludes existing 0% models", { helmetFix: true, balanceExistingHelmets: false, helmetDistribution: { mode: "custom", global: Object.fromEntries(HELMET_MODELS.map(model => [model.id, model.id === "GearHelmet_Speed_Flex" ? 100 : 0])), positions: {} } }],
  ["Bears Pads mixed replacements + targeted handwarmer removal", { bearsPadsSleeveFix: true, bearsPadsReplacement: "mixed", removeHandwarmers: true }]
]) test(`v18.5 exact cached Preview/Apply/reload: ${name}`, { timeout: 90000 }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cfb-v185-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const sourceHash = fileHash(fixture), savePath = path.join(directory, "DYNASTY-TEST"); fs.copyFileSync(fixture, savePath);
  const context = { savePath, schemaPath, reports: new ReportService(path.join(directory, "reports")), mode: "preview", options: { ...options, skipNilPlayers: false } };
  const preview = async () => { const old = Math.random; Math.random = () => 185 / 0x100000000; try { return await runEquipmentPatcher(context); } finally { Math.random = old; } };
  const first = await preview(), plan = takePlan(first.planId), second = await preview();
  assert.ok(plan.assignments.length > 0); assert.deepEqual(takePlan(second.planId).assignments, plan.assignments);
  assert.equal(fileHash(savePath), sourceHash); assert.equal(fs.existsSync(path.join(directory, "Ace's CFB Toolkit Backups")), false);
  let before = await loadEquipmentTables(savePath, schemaPath);
  const rows = snapshotVisualRawData(before.visuals.records);
  const otherTables = new Map(before.franchise.tables.filter(table => table !== before.visuals).map(table => [table.header.tableId, hash(table.data)]));
  before = null; // Keep detached expectations, not a second live save parser.
  const result = await runEquipmentPatcher({ ...context, mode: "apply", options: { planId: first.planId } });
  assert.equal(fileHash(result.backupPath), sourceHash);
  const reopened = await loadEquipmentTables(savePath, schemaPath), after = snapshotVisualRawData(reopened.visuals.records), changed = new Map(plan.assignments.map(change => [change.row, change.newValue]));
  for (const [row, raw] of rows) if (typeof raw === "string") assert.deepEqual(JSON.parse(after.get(row)), JSON.parse(changed.get(row) ?? raw), `Exact planned/unplanned row ${row}`);
  for (const table of reopened.franchise.tables) if (otherTables.has(table.header.tableId)) assert.equal(hash(table.data), otherTables.get(table.header.tableId), table.name);
  assert.equal(fs.statSync(savePath).size, fs.statSync(fixture).size); assert.equal(fileHash(fixture), sourceHash);
  const report = fs.readFileSync(first.reportPath, "utf8"); assert.ok(report.includes("BeforeRawData") && report.includes("AfterRawData"));
  if (options.balanceExistingHelmets) for (const cohort of [first.details.helmetBalance.fbs, first.details.helmetBalance.fcs]) for (const family of cohort.families) assert.equal(family.after, family.targetCount);
  else if (options.helmetFix) {
    assert.equal(first.details.helmetMixExcludesZero, true); assert.equal(first.details.balanceExistingHelmets, false);
    for (const assignment of plan.assignments) for (const loadout of JSON.parse(assignment.newValue).loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField")) assert.equal(loadout.loadoutElements.find(item => item.slotType === "HeadWear").itemAssetName, "GearHelmet_Speed_Flex");
  }
  else assert.ok(first.details.bearsPadsPlayersChanged + first.details.handwarmerPlayersChanged > 0);
});
