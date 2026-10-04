import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { openCfb27Save, readTables, PLAYER_TABLE_UID, TEAM_TABLE_UID } from "../../src/main/services/save.js";
import { ReportService } from "../../src/main/services/reports.js";
import { takePlan } from "../../src/main/tools/jersey/planStore.js";
import { VISUALS_TABLE_UID, ROSTER_TABLE_UID, buildRosterPlayerRows, buildRosterTeamNames, buildTeamNames, buildFcsTeamIndexes } from "../../src/main/tools/equipment/shared.js";
import { parseRef } from "../../src/main/tools/equipment/openSave.js";
import { helmetFamily } from "../../src/main/tools/equipment/core/helmetBalance.js";
import { runNilToggle, planNilToggle } from "../../src/main/tools/nilToggle/runner.js";
import { runTeamBoost } from "../../src/main/tools/teamBoost/runner.js";
import { positionRoomAverages } from "../../src/main/tools/teamBoost/core.js";

export const hashFile = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
export async function saveTables(savePath, schemaPath) {
  const opened = await openCfb27Save(savePath, schemaPath);
  return readTables(opened.franchise, { players: PLAYER_TABLE_UID, teams: TEAM_TABLE_UID, rosters: ROSTER_TABLE_UID, visuals: VISUALS_TABLE_UID });
}
function recordHashes(table, assignments = []) {
  const overrides = new Map();
  for (const change of assignments) { const fields = overrides.get(change.row) ?? new Map(); fields.set(change.field, change.newValue); overrides.set(change.row, fields); }
  return table.records.map((record, row) => record.isEmpty ? "empty" : crypto.createHash("sha256").update(JSON.stringify(Object.keys(record._fields).map(field => [field, overrides.get(row)?.has(field) ? overrides.get(row).get(field) : record[field]]))).digest("hex"));
}
function rawRows(table) { return table.records.map(record => record.isEmpty ? undefined : record.RawData); }
async function previewApply(run, savePath, schemaPath, options, validate) {
  const reports = new ReportService(path.join(path.dirname(savePath), "reports")), original = hashFile(savePath), backupDirectory = path.join(path.dirname(savePath), "Ace's CFB Toolkit Backups");
  const backupsBefore = fs.existsSync(backupDirectory) ? fs.readdirSync(backupDirectory) : [];
  const preview = await run({ savePath, schemaPath, reports, mode: "preview", options });
  assert.equal(hashFile(savePath), original, "Preview must never write the save");
  assert.equal(preview.backupPath, null);
  assert.deepEqual(fs.existsSync(backupDirectory) ? fs.readdirSync(backupDirectory) : [], backupsBefore, "Preview must not create a backup");
  const plan = takePlan(preview.planId);
  assert.ok(plan.assignments.length > 0, "This scenario must exercise real writes");
  validate?.(preview, plan);
  const applied = await run({ savePath, schemaPath, reports, mode: "apply", options: { planId: preview.planId } });
  assert.equal(applied.status, "completed");
  assert.deepEqual(applied.details, preview.details, "Apply must preserve the exact reviewed result");
  assert.equal(hashFile(applied.backupPath), original, "Backup must capture the untouched input");
  assert.notEqual(hashFile(savePath), original);
  assert.ok(fs.statSync(applied.reportPath).size > 0);
  await assert.rejects(run({ savePath, schemaPath, reports, mode: "apply", options: { planId: preview.planId } }), /already been applied/);
  return { preview, applied, assignments: plan.assignments };
}
export async function validateNilSave(savePath, schemaPath) {
  const before = await saveTables(savePath, schemaPath), context = { activeRows: buildRosterPlayerRows(before.players, before.teams, before.rosters), playerTeamNames: buildRosterTeamNames(before.players, before.teams, before.rosters), teamNames: buildTeamNames(before.teams.records) };
  const eligible = planNilToggle(before.players.records, { targetValue: false }, context), player = eligible.find(row => row.team === "East Point") ?? eligible[0];
  assert.ok(player);
  const targetValue = !player.currentValue, options = { targetValue, playerRows: [String(player.row)], teams: [player.team], positions: [before.players.records[player.row].Position], classes: [player.classYear], redshirtStatuses: [player.redshirtStatus] };
  const reports = new ReportService(path.join(path.dirname(savePath), "reports")), original = hashFile(savePath);
  const dynasty = await runNilToggle({ savePath, schemaPath, reports, mode: "preview", options: { targetValue } });
  assert.equal(takePlan(dynasty.planId).previewRows.length, eligible.length);
  const qbs = await runNilToggle({ savePath, schemaPath, reports, mode: "preview", options: { targetValue, teams: [player.team], positions: ["QB"] } });
  assert.ok(takePlan(qbs.planId).previewRows.every(row => row.team === player.team && row.position === "QB"));
  assert.equal(hashFile(savePath), original);
  const result = await previewApply(runNilToggle, savePath, schemaPath, options, (preview, plan) => { assert.equal(preview.details.totalPreviewRows, 1); assert.equal(plan.assignments.length, 1); assert.equal(plan.assignments[0].field, "IsNIL"); });
  const after = await saveTables(savePath, schemaPath);
  assert.deepEqual(recordHashes(after.players), recordHashes(before.players, result.assignments), "Only the chosen IsNIL value may change in the entire Player table");
  assert.deepEqual(recordHashes(after.teams), recordHashes(before.teams));
  assert.deepEqual(recordHashes(after.rosters), recordHashes(before.rosters));
  assert.deepEqual(rawRows(after.visuals), rawRows(before.visuals));
  return { player: player.player, team: player.team, targetValue, dynastyPlayers: eligible.length, changes: result.assignments.length, backupPath: result.applied.backupPath };
}
export async function validateBoostSave(savePath, schemaPath) {
  const before = await saveTables(savePath, schemaPath), team = before.teams.records.find(record => !record.isEmpty && record.DisplayName === "Alabama") ?? before.teams.records.find(record => !record.isEmpty && record.DisplayName === "LSU");
  assert.ok(team);
  const positions = ["QB", "WR", "TE"], attributes = ["SpeedRating", "AccelerationRating", "AgilityRating"], averages = positionRoomAverages(before.players.records, new Set([Number(team.TeamIndex)]));
  const result = await previewApply(runTeamBoost, savePath, schemaPath, { teams: [team.DisplayName], playerScope: "below-average", positions, ratingMode: "specific", attributes, minimum: 2, maximum: 2 }, (_preview, plan) => {
    for (const change of plan.assignments) { const record = before.players.records[change.row]; assert.ok(positions.includes(record.Position)); assert.equal(record.TeamIndex, team.TeamIndex); assert.ok(record.OverallRating < averages.get(`${record.TeamIndex}|${record.Position}`)); assert.ok(attributes.includes(change.field)); assert.equal(change.newValue, Math.min(99, change.oldValue + 2)); }
  });
  const after = await saveTables(savePath, schemaPath);
  assert.deepEqual(recordHashes(after.players), recordHashes(before.players, result.assignments), "Only selected players and selected attributes may change");
  assert.deepEqual(recordHashes(after.teams), recordHashes(before.teams));
  assert.deepEqual(rawRows(after.visuals), rawRows(before.visuals));
  return { team: team.DisplayName, players: new Set(result.assignments.map(change => change.row)).size, ratingChanges: result.assignments.length, backupPath: result.applied.backupPath };
}
export async function validateEquipmentSave(run, savePath, schemaPath, options) {
  const before = await saveTables(savePath, schemaPath), result = await previewApply(run, savePath, schemaPath, options), after = await saveTables(savePath, schemaPath);
  for (const change of result.assignments) assert.equal(after.visuals.records[change.row][change.field], change.newValue, "Every persisted equipment assignment must exactly match Preview");
  assert.deepEqual(recordHashes(after.players), recordHashes(before.players), "Equipment changes must not modify Player fields");
  assert.deepEqual(recordHashes(after.teams), recordHashes(before.teams));
  const diagnostics = result.preview.details.helmetBalance;
  if (diagnostics) {
    const activeRows = buildRosterPlayerRows(before.players, before.teams, before.rosters), fcs = buildFcsTeamIndexes(before.teams.records), teamNames = buildTeamNames(before.teams.records), owners = new Map();
    before.players.records.forEach((record, row) => { if (record.isEmpty) return; const ref = parseRef(record.CharacterVisuals); if (ref?.tableId !== before.visuals.header.tableId) return; const rows = owners.get(ref.row) ?? []; rows.push(row); owners.set(ref.row, rows); });
    const observed = { fbs: new Map(), fcs: new Map() };
    for (const [visualRow, rows] of owners) {
      if (rows.length !== 1 || !activeRows.has(rows[0])) continue;
      const record = before.players.records[rows[0]];
      if (["LT", "LG", "C", "RG", "RT"].includes(record.Position) || options.skipNilPlayers !== false && record.IsNIL) continue;
      if (!record.FirstName || !record.LastName || !record.Position || record.TeamIndex === 255 && !fcs.has(255) || !teamNames.has(record.TeamIndex) && !fcs.has(record.TeamIndex) || record.FirstName === "Omar" && record.LastName === "Omar" && record.Position === "QB") continue;
      let raw; try { raw = JSON.parse(after.visuals.records[visualRow].RawData); } catch { continue; }
      const helmets = (raw.loadouts ?? []).filter(loadout => loadout.loadoutType === "PlayerOnField" && Array.isArray(loadout.loadoutElements)).map(loadout => loadout.loadoutElements.find(element => element.slotType === "HeadWear")?.itemAssetName);
      if (!helmets.length) continue;
      const family = new Set(helmets.map(helmet => helmetFamily(helmet, options.allowVicisZero2))).size === 1 ? helmetFamily(helmets[0], options.allowVicisZero2) : "Other / mixed";
      const cohort = observed[fcs.has(Number(record.TeamIndex)) ? "fcs" : "fbs"];
      cohort.set(family, (cohort.get(family) ?? 0) + 1);
    }
    for (const name of ["fbs", "fcs"]) for (const family of diagnostics[name].families) assert.equal(observed[name].get(family.family) ?? 0, family.after, `Actual persisted ${name} ${family.family} count matches the balancing preview`);
    for (const cohort of [diagnostics.fbs, diagnostics.fcs]) for (const family of cohort.families) assert.equal(family.after, family.targetCount);
  }
  return { tool: result.preview.resultKind, equipmentRecordsChanged: result.assignments.length, backupPath: result.applied.backupPath, helmetBalance: diagnostics ?? null };
}
