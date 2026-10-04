import path from "node:path";
import { openCfb27Save, readTables, PLAYER_TABLE_UID, TEAM_TABLE_UID, availableTeams } from "../../services/save.js";
import { createBackup } from "../../services/files.js";
import { completePlan, saveFingerprint, storePlan, takePlan } from "../jersey/planStore.js";
import { buildRosterPlayerRows, buildRosterTeamNames, buildTeamNames, ROSTER_TABLE_UID, VALID_CLASSES, VALID_POSITIONS } from "../equipment/shared.js";
import { displayPosition } from "../../../shared/localization.js";

const TOOL_ID = "nil-toggle", TOOL_NAME = "NIL Toggle";
const redshirts = ["Eligible", "Current", "Previous"];
function selection(value, allowed, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(item => !allowed.includes(item))) throw new Error(`Choose valid ${label}.`);
  return [...new Set(value)];
}
export function planNilToggle(records, options = {}, { activeRows, teamNames = new Map(), playerTeamNames = new Map() } = {}) {
  if (typeof options.targetValue !== "boolean") throw new Error("Choose NIL = True or NIL = False.");
  const positions = selection(options.positions, VALID_POSITIONS, "positions"), classes = selection(options.classes, VALID_CLASSES, "class years"), statuses = selection(options.redshirtStatuses, redshirts, "redshirt statuses");
  if (options.teams !== undefined && (!Array.isArray(options.teams) || options.teams.some(team => typeof team !== "string" || ![...teamNames.values(), ...playerTeamNames.values()].includes(team)))) throw new Error("Choose teams from the Active Save.");
  if (options.playerRows !== undefined && (!Array.isArray(options.playerRows) || options.playerRows.some(row => !Number.isSafeInteger(Number(row)) || Number(row) < 0 || !records[Number(row)] || records[Number(row)].isEmpty || activeRows && !activeRows.has(Number(row))))) throw new Error("Choose players from the current active rosters.");
  const wantedPlayers = new Set((options.playerRows ?? []).map(Number)), rows = [];
  records.forEach((record, row) => {
    if (!record || record.isEmpty || activeRows && !activeRows.has(row)) return;
    if (!VALID_POSITIONS.includes(record.Position) || !record.FirstName || !record.LastName) return;
    const team = playerTeamNames.has(row) ? playerTeamNames.get(row) : teamNames.get(Number(record.TeamIndex));
    if (!team || (record.FirstName === "Omar" && record.LastName === "Omar" && record.Position === "QB")) return;
    if (wantedPlayers.size && !wantedPlayers.has(row) || options.teams?.length && !options.teams.includes(team) || positions.length && !positions.includes(record.Position) || classes.length && !classes.includes(record.SchoolYear) || statuses.length && !statuses.includes(record.RedshirtStatus)) return;
    if (typeof record.IsNIL !== "boolean") throw new Error(`Player row ${row} has an invalid NIL flag.`);
    rows.push({ row, team, player: `${record.FirstName} ${record.LastName}`.trim(), position: displayPosition(record.Position), classYear: record.SchoolYear, redshirtStatus: record.RedshirtStatus, overall: record.OverallRating, currentValue: record.IsNIL, proposedValue: options.targetValue, changed: record.IsNIL !== options.targetValue });
  });
  return rows.sort((a, b) => a.team.localeCompare(b.team) || a.player.localeCompare(b.player) || a.row - b.row);
}
async function load(savePath, schemaPath) {
  const opened = await openCfb27Save(savePath, schemaPath), tables = await readTables(opened.franchise, { players: PLAYER_TABLE_UID, teams: TEAM_TABLE_UID, rosters: ROSTER_TABLE_UID });
  const activeRows = buildRosterPlayerRows(tables.players, tables.teams, tables.rosters), playerTeamNames = buildRosterTeamNames(tables.players, tables.teams, tables.rosters), teamNames = buildTeamNames(tables.teams.records);
  if (!activeRows.size) throw new Error("This save does not expose active player rosters for NIL Toggle.");
  return { ...opened, ...tables, activeRows, playerTeamNames, teamNames };
}
export async function prepareNilToggle({ savePath, schemaPath }) {
  const loaded = await load(savePath, schemaPath), rows = planNilToggle(loaded.players.records, { targetValue: false }, loaded);
  return { teams: availableTeams(loaded.teams.records), positions: VALID_POSITIONS, classes: VALID_CLASSES, redshirtStatuses: redshirts, players: rows.map(player => ({ value: String(player.row), label: `${player.player} · ${player.team} · ${player.position} · ${player.redshirtStatus === "Previous" ? "RS " : ""}${player.classYear} · ${player.overall} OVR` })) };
}
export async function runNilToggle(context) {
  if (context.mode === "apply") {
    const plan = takePlan(context.options?.planId);
    if (plan.toolId !== TOOL_ID || path.resolve(plan.savePath) !== path.resolve(context.savePath)) throw new Error("This preview does not belong to NIL Toggle and the Active Save.");
    if (saveFingerprint(plan.savePath) !== plan.saveFingerprint) throw new Error("The save changed after Preview. Run Preview again before Apply.");
    const loaded = await load(context.savePath, context.schemaPath);
    for (const change of plan.assignments) if (!loaded.activeRows.has(change.row) || loaded.players.records[change.row]?.IsNIL !== change.oldValue) throw new Error("A player's NIL flag changed after Preview. Run Preview again.");
    let backupPath = null;
    if (plan.assignments.length) { backupPath = createBackup(loaded.savePath); for (const change of plan.assignments) loaded.players.records[change.row].IsNIL = change.newValue; await loaded.franchise.save(); }
    const reportPath = context.reports.create({ ...plan.report, toolId: TOOL_ID, toolName: TOOL_NAME });
    completePlan(context.options.planId);
    return { ...plan.result, mode: "apply", status: plan.assignments.length ? "completed" : "no-changes", backupPath, reportPath, planId: context.options.planId };
  }
  if (context.mode !== "preview") throw new Error("Run mode must be preview or apply.");
  const loaded = await load(context.savePath, context.schemaPath), rows = planNilToggle(loaded.players.records, context.options, loaded), changes = rows.filter(row => row.changed);
  const report = { prefix: "nil-toggle-report", headings: ["Row", "Team", "Player", "Position", "ClassYear", "RedshirtStatus", "CurrentIsNIL", "NewIsNIL", "Changed"], rows: rows.map(row => [row.row, row.team, row.player, row.position, row.classYear, row.redshirtStatus, row.currentValue, row.proposedValue, row.changed]) };
  const result = { resultKind: TOOL_ID, mode: "preview", status: "preview", savePath: loaded.savePath, backupPath: null, reportPath: context.reports.create({ ...report, toolId: TOOL_ID, toolName: TOOL_NAME }), summary: [{ label: "Players matched", value: rows.length }, { label: "NIL flags to change", value: changes.length }, { label: "Already at target", value: rows.length - changes.length }], historySummary: [{ label: "NIL flags changed", value: changes.length }], details: { targetValue: context.options.targetValue, totalPreviewRows: rows.length, changes: rows.slice(0, 1000) } };
  return { ...result, planId: storePlan({ toolId: TOOL_ID, toolName: TOOL_NAME, savePath: loaded.savePath, saveFingerprint: saveFingerprint(loaded.savePath), assignments: changes.map(row => ({ row: row.row, field: "IsNIL", oldValue: row.currentValue, newValue: row.proposedValue })), previewRows: rows, report, result }) };
}
