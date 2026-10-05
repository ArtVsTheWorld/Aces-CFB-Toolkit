import path from "node:path";
import { createBackup } from "../../services/files.js";
import { openCfb27Save, readTables, PLAYER_TABLE_UID, TEAM_TABLE_UID } from "../../services/save.js";
import { displayPosition } from "../../../shared/localization.js";
import { completePlan, saveFingerprint, storePlan, takePlan } from "../jersey/planStore.js";
import { ALLOWED_DEALBREAKERS, DEFAULT_DISTRIBUTION, DEALBREAKER_FIELD, normalizeDistribution, patchDealbreakers } from "./core.js";

const TOOL_ID = "dealbreaker-fixer", TOOL_NAME = "Dealbreaker Fixer", MAX_PREVIEW_ROWS = 1000;
const read = (record, field) => { try { return record?.[field]; } catch { return undefined; } };
const label = value => ({ Invalid: "None", PlayingTime: "Playing Time", ProPotential: "Pro Potential", PlayingStyle: "Playing Style (RB, WR, TE only)", ChampionshipContender: "Championship Contender", BrandExposure: "Brand Exposure", ProximityToHome: "Proximity To Home", CoachPrestige: "Coach Prestige", ConferencePrestige: "Conference Prestige" }[value] ?? value);
const classLabel = record => { const year = read(record, "SchoolYear") ?? "Unknown", redshirt = read(record, "RedshirtStatus"); return redshirt === "Previous" ? `RS ${year}` : redshirt === "Current" ? `${year} (redshirting)` : String(year); };

async function load(savePath, schemaPath) {
  const opened = await openCfb27Save(savePath, schemaPath); const tables = await readTables(opened.franchise, { players: PLAYER_TABLE_UID, teams: TEAM_TABLE_UID });
  const sample = tables.players.records.find(record => record && !record.isEmpty);
  for (const field of ["FirstName", "LastName", "Position", "SchoolYear", "RedshirtStatus", "Age", "OverallRating", "TeamIndex", DEALBREAKER_FIELD]) if (read(sample, field) === undefined) throw new Error(`Player table does not expose required Dealbreaker Fixer field ${field}.`);
  const teamNames = new Map(); tables.teams.records.forEach((record, row) => { if (!record || record.isEmpty) return; const name = String(read(record, "DisplayName") || read(record, "LongName") || read(record, "ShortName") || `Team ${row}`); const index = Number(read(record, "TeamIndex")); if (Number.isInteger(index)) teamNames.set(index, name); if (!teamNames.has(row)) teamNames.set(row, name); });
  return { ...opened, ...tables, teamNames };
}

function normalize(options = {}) {
  const seed = Math.floor(Math.random() * 0x100000000), distribution = normalizeDistribution(options.distribution ?? DEFAULT_DISTRIBUTION);

  return { seed, distribution, fixInvalidPlayingStyle: Boolean(options.fixInvalidPlayingStyle) };
}

export async function prepareDealbreaker() { return { defaults: DEFAULT_DISTRIBUTION, values: ALLOWED_DEALBREAKERS.map(value => ({ value, label: label(value) })) }; }

async function applyPlan(context) {
  const plan = takePlan(context.options?.planId);
  if (plan.toolId !== TOOL_ID || path.resolve(plan.savePath) !== path.resolve(context.savePath)) throw new Error("The preview does not belong to Dealbreaker Fixer and this Active Save.");
  if (saveFingerprint(plan.savePath) !== plan.saveFingerprint) throw new Error("The save changed after Preview. Run Preview again before Apply.");
  const loaded = await load(context.savePath, context.schemaPath);
  for (const change of plan.assignments) { const record = loaded.players.records[change.row]; if (!record || record.isEmpty || read(record, DEALBREAKER_FIELD) !== change.oldValue) throw new Error(`Player row ${change.row} changed after Preview. Run Preview again.`); }
  let backupPath = null;
  if (plan.assignments.length) { backupPath = createBackup(loaded.savePath); for (const change of plan.assignments) loaded.players.records[change.row][DEALBREAKER_FIELD] = change.newValue; await loaded.franchise.save(); }
  const reportPath = context.reports.create({ ...plan.report, toolId: TOOL_ID, toolName: TOOL_NAME }); completePlan(context.options.planId);
  return { ...plan.result, status: plan.assignments.length ? "completed" : "no-changes", mode: "apply", backupPath, reportPath, planId: context.options.planId };
}

async function preview(context) {
  const options = normalize(context.options), loaded = await load(context.savePath, context.schemaPath);
  const core = patchDealbreakers(loaded.players.records, { ...options, teamNames: loaded.teamNames, apply: false });
  const rows = core.outcomes.map(outcome => { const record = outcome.record; return { row: outcome.row, team: loaded.teamNames.get(Number(read(record, "TeamIndex"))) ?? `Team ${read(record, "TeamIndex")}`, player: `${read(record, "FirstName") ?? ""} ${read(record, "LastName") ?? ""}`.trim(), position: displayPosition(read(record, "Position")), classYear: classLabel(record), overall: Number(read(record, "OverallRating")), currentValue: label(outcome.oldValue), proposedValue: label(outcome.newValue), currentStoredValue: outcome.oldValue, proposedStoredValue: outcome.newValue, context: outcome.reasons.join(" · ") || "Base distribution", scope: outcome.scope }; }).sort((a, b) => a.team.localeCompare(b.team) || a.player.localeCompare(b.player) || a.row - b.row);
  const changedRows = rows.filter(row => row.currentStoredValue !== row.proposedStoredValue);
  const assignments = core.changes.map(change => ({ row: change.row, oldValue: change.oldValue, newValue: change.newValue }));
  const report = { prefix: "dealbreaker-fixer-report", headings: ["Row", "Team", "Player", "Position", "Class", "Overall", "Scope", "CurrentDealbreaker", "ProposedDealbreaker", "Context", "Seed", "ResolvedOptionsJSON"], rows: rows.map((row, index) => [row.row, row.team, row.player, row.position, row.classYear, row.overall, row.scope, row.currentValue, row.proposedValue, row.context, options.seed, index === 0 ? JSON.stringify(options) : ""]) };
  const reportPath = context.reports.create({ ...report, toolId: TOOL_ID, toolName: TOOL_NAME });
  const percent = value => `${(value * 100).toFixed(1)}%`;
  const result = { status: "preview", mode: "preview", savePath: loaded.savePath, backupPath: null, reportPath, summary: [{ label: "Players evaluated", value: rows.length }, { label: "Changes proposed", value: assignments.length }, { label: "Starting None", value: percent(core.population.startingNonePercentage) }, { label: "Configured None minimum", value: percent(core.population.configuredFloorPercentage) }, { label: "Projected None", value: percent(core.population.projectedNonePercentage) }, { label: "Minimum protected players", value: core.population.floorLimited ? "Yes" : "No" }], historySummary: [{ label: "Players evaluated", value: rows.length }, { label: "Players changed", value: assignments.length }], resultKind: TOOL_ID, details: { seed: options.seed, distribution: options.distribution, population: core.population, totalPreviewRows: changedRows.length, changes: changedRows.slice(0, MAX_PREVIEW_ROWS) } };
  const planId = storePlan({ toolId: TOOL_ID, toolName: TOOL_NAME, savePath: loaded.savePath, saveFingerprint: saveFingerprint(loaded.savePath), assignments, previewRows: changedRows, report, result });
  return { ...result, planId };
}

export async function runDealbreaker(context) { if (context.mode === "apply") return applyPlan(context); if (context.mode !== "preview") throw new Error("Run mode must be preview or apply."); return preview(context); }
