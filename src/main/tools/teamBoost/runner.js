import path from "node:path";
import { createBackup } from "../../services/files.js";
import { openCfb27Save, readTables, PLAYER_TABLE_UID, TEAM_TABLE_UID, availableTeams, isDirectionalFcsTeam, resolveTeam } from "../../services/save.js";
import { completePlan, saveFingerprint, storePlan, takePlan } from "../jersey/planStore.js";
import { patchTeamRatings, PLAYER_SCOPES, ratingModeLabel, RATING_MODES, validateBoostRange } from "./core.js";
import { displayPosition as positionLabel } from "../../../shared/localization.js";
import { VALID_POSITIONS } from "../equipment/shared.js";
import { RATING_LABELS } from "./ratingWeights.js";

const TOOL_ID = "team-boost", TOOL_NAME = "Team Boost";
const classYear = record => `${record.RedshirtStatus === "Previous" ? "RS" : "True"} ${record.SchoolYear ?? "Unknown"}`;

async function load(savePath, schemaPath) {
  const opened = await openCfb27Save(savePath, schemaPath); const tables = await readTables(opened.franchise, { players: PLAYER_TABLE_UID, teams: TEAM_TABLE_UID });
  const sample = tables.players.records.find(record => record && !record.isEmpty);
  if (!sample || sample.PlayerType === undefined || sample.Position === undefined || sample.TeamIndex === undefined || sample.SpeedRating === undefined) throw new Error("Player table 1612938518 does not expose the expected Team Boost fields.");
  return { ...opened, ...tables };
}

const eligibleTeams = records => availableTeams(records.filter(record => !isDirectionalFcsTeam(record)));
const directionalFcsIndexes = records => { const indexes = new Set(); records.forEach((record, row) => { if (!isDirectionalFcsTeam(record)) return; const teamIndex = Number(record.TeamIndex); indexes.add(Number.isInteger(teamIndex) ? teamIndex : row); }); return indexes; };
export async function prepareTeamBoost({ savePath, schemaPath }) { const loaded = await load(savePath, schemaPath); return { teams: eligibleTeams(loaded.teams.records), positions: VALID_POSITIONS, attributes: Object.entries(RATING_LABELS).filter(([field]) => loaded.players.records.some(record => record && !record.isEmpty && record[field] !== undefined)).map(([value, label]) => ({ value, label })) }; }

function normalized(options, teams) {
  const seed = Math.floor(Math.random() * 0x100000000), minimum = Number(options?.minimum), maximum = Number(options?.maximum), ratingMode = String(options?.ratingMode ?? "nonphysical"), playerScope = String(options?.playerScope ?? "all");

  if (!RATING_MODES.has(ratingMode)) throw new Error("Choose All Ratings, Nonphysical Ratings, Physical Ratings, or Specific Attributes.");
  if (!PLAYER_SCOPES.has(playerScope)) throw new Error("Player scope must be all, below-average, or above-average.");
  const rangeValidation = validateBoostRange(minimum, maximum); if (rangeValidation !== true) throw new Error(rangeValidation);
  const requested = Array.isArray(options?.teams) ? options.teams : options?.team ? [options.team] : [];
  if (!requested.length) throw new Error("Select at least one team.");
  const selected = [...new Map(requested.map(value => { const team = resolveTeam(value, teams); return [team.teamIndex, team]; })).values()].sort((a, b) => a.name.localeCompare(b.name));
  const positions = options?.positions ?? [], attributes = options?.attributes ?? [];
  if (!Array.isArray(positions) || positions.some(position => !VALID_POSITIONS.includes(position))) throw new Error("Choose valid player positions.");
  if (ratingMode === "specific" && (!Array.isArray(attributes) || !attributes.length || attributes.some(field => !Object.hasOwn(RATING_LABELS, field)))) throw new Error("Choose at least one supported attribute.");
  return { seed, minimum, maximum, ratingMode, playerScope, selected, positions, attributes };
}

async function apply(context) {
  const plan = takePlan(context.options?.planId);
  if (plan.toolId !== TOOL_ID || path.resolve(plan.savePath) !== path.resolve(context.savePath)) throw new Error("The preview does not belong to Team Boost and this Active Save.");
  if (saveFingerprint(plan.savePath) !== plan.saveFingerprint) throw new Error("The save changed after Preview. Run Preview again before Apply.");
  const loaded = await load(context.savePath, context.schemaPath);
  for (const change of plan.assignments) { const record = loaded.players.records[change.row]; if (!record || record.isEmpty || Number(record[change.field]) !== change.oldValue) throw new Error(`Player row ${change.row} changed after Preview. Run Preview again.`); }
  let backupPath = null;
  if (plan.assignments.length) { backupPath = createBackup(loaded.savePath); for (const change of plan.assignments) loaded.players.records[change.row][change.field] = change.newValue; await loaded.franchise.save(); }
  const reportPath = context.reports.create({ ...plan.report, toolId: TOOL_ID, toolName: TOOL_NAME }); completePlan(context.options.planId);
  return { ...plan.result, mode: "apply", status: plan.assignments.length ? "completed" : "no-changes", backupPath, reportPath, planId: context.options.planId };
}

async function preview(context) {
  const loaded = await load(context.savePath, context.schemaPath), teams = eligibleTeams(loaded.teams.records), options = normalized(context.options, teams), excludedTeamIndexes = directionalFcsIndexes(loaded.teams.records);
  const teamNames = new Map(options.selected.map(team => [Number(team.teamIndex), team.name]));
const core = patchTeamRatings(loaded.players.records, { teamIndexes: options.selected.map(team => team.teamIndex), excludedTeamIndexes, minimum: options.minimum, maximum: options.maximum, positions: options.positions, attributes: options.attributes, mode: options.ratingMode, playerScope: options.playerScope, seed: options.seed, apply: false });
  const profile = new Map(core.players.map(player => [player.row, player.profileFound]));
  const assignments = core.ratingChanges.map(change => ({ row: change.row, field: change.field, oldValue: change.oldRating, newValue: change.newRating }));
  const rows = core.ratingChanges.map(change => ({ row: change.row, team: teamNames.get(Number(change.record.TeamIndex)) ?? `Team ${change.record.TeamIndex}`, player: `${change.record.FirstName ?? ""} ${change.record.LastName ?? ""}`.trim(), position: positionLabel(change.record.Position), classYear: classYear(change.record), playerType: change.record.PlayerType, overall: change.record.OverallRating, roomAverage: change.roomAverage, qualification: options.playerScope === "below-average" ? "Below room average" : options.playerScope === "above-average" ? "Above room average" : "All players", profile: profile.get(change.row) ? "Exact archetype" : "Position average", rating: change.label, oldRating: change.oldRating, delta: change.delta, newRating: change.newRating })).sort((a, b) => a.team.localeCompare(b.team) || a.player.localeCompare(b.player) || a.rating.localeCompare(b.rating) || a.row - b.row);
  const changedPlayers = new Set(rows.map(change => change.row)).size, fallbackPlayers = core.players.filter(player => !player.profileFound).length, netPoints = core.ratingChanges.reduce((sum, change) => sum + change.delta, 0);
  const report = { prefix: "team-boost-report", headings: ["Row", "Team", "Player", "Position", "Class", "PlayerType", "Overall", "PositionRoomAverage", "ScopeQualification", "Profile", "Rating", "OldRating", "Delta", "NewRating", "Seed", "ResolvedOptionsJSON"], rows: rows.map((change, index) => [change.row, change.team, change.player, change.position, change.classYear, change.playerType, change.overall, change.roomAverage.toFixed(2), change.qualification, change.profile.toLowerCase(), change.rating, change.oldRating, change.delta, change.newRating, options.seed, index === 0 ? JSON.stringify(options) : ""]) };
  const result = { status: "preview", mode: "preview", savePath: loaded.savePath, backupPath: null, reportPath: context.reports.create({ ...report, toolId: TOOL_ID, toolName: TOOL_NAME }), summary: [{ label: "Teams selected", value: options.selected.length }, { label: "Players processed", value: core.players.length }, { label: "Players changed", value: changedPlayers }, { label: "Rating changes", value: rows.length }, { label: "Net rating points", value: `${netPoints >= 0 ? "+" : ""}${netPoints}` }, { label: "Fallback profiles", value: fallbackPlayers }], historySummary: [{ label: "Teams selected", value: options.selected.length }, { label: "Players changed", value: changedPlayers }, { label: "Rating changes", value: rows.length }], resultKind: TOOL_ID, details: { positions: options.positions, attributes: options.ratingMode === "specific" ? options.attributes : [], teams: options.selected.map(team => team.name), seed: options.seed, minimum: options.minimum, maximum: options.maximum, playerScope: options.playerScope, ratingMode: options.ratingMode, ratingModeLabel: ratingModeLabel(options.ratingMode), totalPreviewRows: rows.length, changes: rows.slice(0, 1000) } };
  const planId = storePlan({ toolId: TOOL_ID, toolName: TOOL_NAME, savePath: loaded.savePath, saveFingerprint: saveFingerprint(loaded.savePath), assignments, previewRows: rows, report, result, backupWhenEmpty: false });
  return { ...result, planId };
}

export async function runTeamBoost(context) { if (context.mode === "apply") return apply(context); if (context.mode !== "preview") throw new Error("Run mode must be preview or apply."); return preview(context); }
