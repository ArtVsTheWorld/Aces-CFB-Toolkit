import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { ReportService } from "../src/main/services/reports.js";
import { parseCsv } from "../src/main/services/reportAudit.js";
import { runForceWin, TABLE_UIDS, userControlledTeamIds } from "../src/main/tools/forceWin/runner.js";
import { gameInvolvesUserTeam } from "../src/main/tools/forceWin/core/scheduleProcessor.js";
import { openCfb27Save, readTables } from "../src/main/services/save.js";
import { runEquipmentPatcher } from "../src/main/tools/equipment/runner.js";
import { HELMET_MODELS, normalizeFacemaskPools } from "../src/main/tools/equipment/core/helmets.js";
import { loadEquipmentTables, snapshotVisualRawData } from "../src/main/tools/equipment/shared.js";
import { parseRef } from "../src/main/tools/equipment/openSave.js";
import { takePlan } from "../src/main/tools/jersey/planStore.js";

const fixtures = path.resolve("../EXAMPLE SAVES VANILLA GAME"), schemaPath = path.resolve("resources/engine-data/C27_486_6.gz");
const hash = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
function copy(t, name) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cfb-v191-workflow-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const source = path.join(fixtures, name), savePath = path.join(directory, "DYNASTY-TEST"), original = hash(source);
  fs.copyFileSync(source, savePath);
  return { source, savePath, original, reports: new ReportService(path.join(directory, "reports")), schemaPath };
}

test("real user-only schedule Preview/Apply/reopen retains every CPU game and uses authoritative user teams", { timeout: 120000 }, async t => {
  const context = copy(t, "DYNASTY-LSUTESTSAVEWEEK0");
  const before = await openCfb27Save(context.savePath, schemaPath), tables = await readTables(before.franchise, { games: TABLE_UIDS.seasonGame, team: TABLE_UIDS.team });
  const users = new Set(userControlledTeamIds(tables.team.records)); assert.ok(users.size);
  const initial = tables.games.records.map(record => record && !record.isEmpty ? Object.fromEntries(record.fieldsArray.map(field => [field.name, record[field.name]])) : null);
  const options = { userScheduleOnly: true, userControlledTeamIds: ["9999"], involvement: "maximum", scope: "regular", seed: 191, skippedTeamIds: [] };
  const preview = await runForceWin({ ...context, mode: "preview", options }), plan = takePlan(preview.planId);
  const repeat = await runForceWin({ ...context, mode: "preview", options });
  assert.deepEqual(takePlan(repeat.planId).assignments, plan.assignments); assert.ok(plan.assignments.length);
  assert.equal(hash(context.savePath), context.original);
  assert.ok(plan.previewRows.every(row => gameInvolvesUserTeam(tables.games.records[row.row], tables.team, users)));
  assert.ok(initial.some(row => row && !gameInvolvesUserTeam(row, tables.team, users)), "Fixture contains CPU-vs-CPU games");
  const applied = await runForceWin({ ...context, mode: "apply", options: { planId: preview.planId } });
  assert.equal(hash(applied.backupPath), context.original);
  const reopened = await openCfb27Save(context.savePath, schemaPath), after = await readTables(reopened.franchise, { games: TABLE_UIDS.seasonGame });
  const expected = new Map(plan.assignments.map(change => [change.row, change.newValue]));
  for (const [row, record] of initial.entries()) if (record) for (const [field, value] of Object.entries(record)) assert.equal(after.games.records[row][field], field === "ForceWin" ? expected.get(row) ?? value : value, `Game ${row} / ${field}`);
  const csv = parseCsv(fs.readFileSync(applied.reportPath, "utf8"));
  assert.equal(csv[1][csv[0].indexOf("UserScheduleOnly")], "true"); assert.ok(csv[1][csv[0].indexOf("UserControlledTeams")].includes("LSU"));
  assert.equal(hash(context.source), context.original);
});

test("real position facemask overrides survive Patcher Preview/Apply/reopen and full CSV auditing", { timeout: 120000 }, async t => {
  const context = copy(t, "DYNASTY-LSUTESTSAVEPRESZN"), model = HELMET_MODELS.find(model => model.id === "GearHelmet_Speed_Flex"), [qbMask, wrMask] = model.defaultMasks;
  const pools = normalizeFacemaskPools({ global: { [model.id]: [qbMask] }, positions: { QB: { [model.id]: [qbMask] }, WR: { [model.id]: [wrMask] } } });
  const mix = Object.fromEntries(HELMET_MODELS.map(helmet => [helmet.id, helmet.id === model.id ? 100 : 0]));
  const options = { includedTeams: ["LSU"], positions: ["QB", "WR"], skipNilPlayers: false, helmetFix: true, helmetDistribution: { mode: "custom", global: mix, positions: {} }, facemaskPools: pools };
  const before = await loadEquipmentTables(context.savePath, schemaPath), originalRows = snapshotVisualRawData(before.visuals.records);
  const preview = await runEquipmentPatcher({ ...context, mode: "preview", options }), plan = takePlan(preview.planId);
  assert.ok(plan.assignments.length); assert.equal(hash(context.savePath), context.original);
  const expected = new Map(plan.assignments.map(change => [change.row, change.newValue])), seen = new Set();
  for (const player of before.players.records) {
    if (!player || player.isEmpty || !["QB", "WR"].includes(player.Position)) continue;
    const reference = parseRef(player.CharacterVisuals), raw = expected.get(reference?.row); if (!raw) continue;
    const elements = JSON.parse(raw).loadouts.find(loadout => loadout.loadoutType === "PlayerOnField").loadoutElements;
    assert.equal(elements.find(item => item.slotType === "FaceMask").itemAssetName, player.Position === "QB" ? qbMask : wrMask);
    seen.add(player.Position);
  }
  assert.deepEqual([...seen].sort(), ["QB", "WR"]);
  const applied = await runEquipmentPatcher({ ...context, mode: "apply", options: { planId: preview.planId } });
  assert.equal(hash(applied.backupPath), context.original);
  const reopened = await loadEquipmentTables(context.savePath, schemaPath), rows = snapshotVisualRawData(reopened.visuals.records);
  for (const [row, raw] of originalRows) if (typeof raw === "string") assert.deepEqual(JSON.parse(rows.get(row)), JSON.parse(expected.get(row) ?? raw), `Exact equipment row ${row}`);
  const csv = parseCsv(fs.readFileSync(applied.reportPath, "utf8")), headers = csv[0];
  assert.deepEqual(JSON.parse(csv[1][headers.indexOf("ResolvedOptionsJSON")]).facemaskPools, pools);
  assert.ok(plan.result.details.changes.some(player => player.changes?.some(change => change.currentValue?.includes(" / "))), "Preview includes old helmet and mask");
  assert.equal(hash(context.source), context.original); assert.equal(fs.statSync(context.savePath).size, fs.statSync(context.source).size);
});
