import { normalizePlayerScope, playerScopeCatalog } from "../playerScope.js";
import path from "node:path";
import {loadEquipmentTables,snapshotVisualRawData} from '../equipment/shared.js';
import {snapshotVisualsForVerification,saveEquipmentCandidate} from '../equipment/visualsSafety.js';
import {snapshotProtectedPlayers,verifyProtectedPlayers} from '../rosterGenerator/safety.js';
import { createBackup } from "../../services/files.js";
import { openCfb27Save, readTables, PLAYER_TABLE_UID, TEAM_TABLE_UID } from "../../services/save.js";
import { displayPosition } from "../../../shared/localization.js";
import { completePlan, saveFingerprint, storePlan, takePlan } from "../jersey/planStore.js";
import { ALLOWED_DEALBREAKERS, DEFAULT_DISTRIBUTION, DEALBREAKER_FIELD, normalizeDistribution, patchDealbreakers } from "./core.js";

const TOOL_ID = "dealbreaker-fixer", TOOL_NAME = "Dealbreaker Fixer", MAX_PREVIEW_ROWS = 1000;
const read = (record, field) => { try { return record?.[field]; } catch { return undefined; } };
const label = value => ({ Invalid: "None", PlayingTime: "Playing Time", ProPotential: "Pro Potential", PlayingStyle: "Playing Style", ChampionshipContender: "Championship Contender", BrandExposure: "Brand Exposure", ProximityToHome: "Proximity To Home", CoachPrestige: "Coach Prestige", ConferencePrestige: "Conference Prestige" }[value] ?? value);
const classLabel = record => { const year = read(record, "SchoolYear") ?? "Unknown", redshirt = read(record, "RedshirtStatus"); return redshirt === "Previous" ? `RS ${year}` : redshirt === "Current" ? `${year} (redshirting)` : String(year); };

async function load(savePath, schemaPath) {
  const opened=await loadEquipmentTables(savePath,schemaPath,true,false),tables={players:opened.players,teams:opened.teams};
  const sample = tables.players.records.find(record => record && !record.isEmpty);
  for (const field of ["FirstName", "LastName", "Position", "SchoolYear", "RedshirtStatus", "Age", "OverallRating", "TeamIndex", DEALBREAKER_FIELD, "IdealRecruitingPitch"]) if (read(sample, field) === undefined) throw new Error(`Player table does not expose required Dealbreaker Fixer field ${field}.`);
  const teamNames = new Map(); tables.teams.records.forEach((record, row) => { if (!record || record.isEmpty) return; const name = String(read(record, "DisplayName") || read(record, "LongName") || read(record, "ShortName") || `Team ${row}`); const index = Number(read(record, "TeamIndex")); if (Number.isInteger(index)) teamNames.set(index, name); if (!teamNames.has(row)) teamNames.set(row, name); });
  return { ...opened, ...tables, teamNames };
}

function normalize(options = {}) {
  const seed = Math.floor(Math.random() * 0x100000000), distribution = normalizeDistribution(options.distribution ?? DEFAULT_DISTRIBUTION);

  const protectedRows = normalizePlayerScope({ playerRows: options.protectedRows }).playerRows;
  const protectedValues = options.protectedValues ?? [];
  if (!Array.isArray(protectedValues) || protectedValues.some(value => !ALLOWED_DEALBREAKERS.includes(value))) throw new Error("Select supported dealbreakers to preserve.");
  const restrictPlayingStylePositions = Boolean(options.restrictPlayingStylePositions);
  return { seed, distribution, protectedRows, protectedValues, restrictPlayingStylePositions, fixInvalidPlayingStyle: restrictPlayingStylePositions && Boolean(options.fixInvalidPlayingStyle) };
}

export async function prepareDealbreaker(context) { const loaded = context?.savePath ? await load(context.savePath, context.schemaPath) : null; return { ...(loaded ? playerScopeCatalog(loaded.players.records, loaded.teamNames) : {}), defaults: DEFAULT_DISTRIBUTION, values: ALLOWED_DEALBREAKERS.map(value => ({ value, label: label(value) })) }; }

async function applyPlan(context) {
  const plan = takePlan(context.options?.planId);
  if (plan.toolId !== TOOL_ID || path.resolve(plan.savePath) !== path.resolve(context.savePath)) throw new Error("The preview does not belong to Dealbreaker Fixer and this Active Save.");
  if (saveFingerprint(plan.savePath) !== plan.saveFingerprint) throw new Error("The save changed after Preview. Run Preview again before Apply.");
  const loaded = await load(context.savePath, context.schemaPath);
  for (const change of plan.assignments) { const record = loaded.players.records[change.row]; if (!record || record.isEmpty || (read(record, DEALBREAKER_FIELD) !== change.oldValue||read(record,'IdealRecruitingPitch')!==change.oldPitch)) throw new Error(`Player row ${change.row} changed after Preview. Run Preview again.`); }
  let backupPath = null;
  if(plan.assignments.length){
    const before=snapshotVisualsForVerification(loaded.visuals,snapshotVisualRawData(loaded.visuals.records)),protectedPlayers=snapshotProtectedPlayers(loaded.players,new Set(plan.assignments.map(c=>c.row)),[DEALBREAKER_FIELD,'IdealRecruitingPitch']);
    const assignments=plan.assignments.flatMap(c=>[{table:'players',row:c.row,field:DEALBREAKER_FIELD,oldValue:c.oldValue,newValue:c.newValue},...(c.newPitch!==c.oldPitch?[{table:'players',row:c.row,field:'IdealRecruitingPitch',oldValue:c.oldPitch,newValue:c.newPitch}]:[])]);
    backupPath=createBackup(loaded.savePath);for(const c of assignments)loaded.players.records[c.row][c.field]=c.newValue;
    verifyProtectedPlayers(protectedPlayers,loaded.players);
    await saveEquipmentCandidate(loaded,context.schemaPath,before,assignments,plan.saveFingerprint,async opened=>{
      const {players}=await readTables(opened.franchise,{players:PLAYER_TABLE_UID});verifyProtectedPlayers(protectedPlayers,players);
      for(const c of assignments)if(read(players.records[c.row],c.field)!==c.newValue)throw new Error(`Dealbreaker/pitch row ${c.row} did not survive save/reload. The original save was kept unchanged.`);
    });
  }
  const reportPath = context.reports.create({ ...plan.report, toolId: TOOL_ID, toolName: TOOL_NAME }); completePlan(context.options.planId);
  return { ...plan.result, status: plan.assignments.length ? "completed" : "no-changes", mode: "apply", backupPath, reportPath, planId: context.options.planId };
}

async function preview(context) {
  const fingerprint=saveFingerprint(context.savePath),options = normalize(context.options), loaded = await load(context.savePath, context.schemaPath);
  const core = patchDealbreakers(loaded.players.records, { ...options, teamNames: loaded.teamNames, apply: false });
  const rows = core.outcomes.map(outcome => { const record = outcome.record; return { row: outcome.row, team: loaded.teamNames.get(Number(read(record, "TeamIndex"))) ?? `Team ${read(record, "TeamIndex")}`, player: `${read(record, "FirstName") ?? ""} ${read(record, "LastName") ?? ""}`.trim(), position: displayPosition(read(record, "Position")), classYear: classLabel(record), overall: Number(read(record, "OverallRating")), currentValue: label(outcome.oldValue), proposedValue: label(outcome.newValue), currentStoredValue: outcome.oldValue, proposedStoredValue: outcome.newValue, context: outcome.reasons.join(" · ") || "Base distribution", scope: outcome.scope,oldPitch:outcome.oldPitch,newPitch:outcome.newPitch,currentPitch:outcome.oldPitch,proposedPitch:outcome.newPitch,pitchContext:outcome.pitchReason }; }).sort((a, b) => a.team.localeCompare(b.team) || a.player.localeCompare(b.player) || a.row - b.row);
  const changedRows = rows.filter(row => row.currentStoredValue !== row.proposedStoredValue);
  const assignments = core.changes.map(change => ({ row: change.row, oldValue: change.oldValue, newValue: change.newValue,oldPitch:change.oldPitch,newPitch:change.newPitch }));
  const report = { prefix: "dealbreaker-fixer-report", headings: ["Row", "Team", "Player", "Position", "Class", "Overall", "Scope", "CurrentDealbreaker", "ProposedDealbreaker", "Context", "Seed", "ResolvedOptionsJSON","OldIdealRecruitingPitch","NewIdealRecruitingPitch","PitchReason"], rows: rows.map((row, index) => [row.row, row.team, row.player, row.position, row.classYear, row.overall, row.scope, row.currentValue, row.proposedValue, row.context, options.seed, index === 0 ? JSON.stringify(options) : "",row.oldPitch,row.newPitch,row.pitchContext]) };
  const reportPath = context.reports.create({ ...report, toolId: TOOL_ID, toolName: TOOL_NAME });
  const percent = value => `${(value * 100).toFixed(1)}%`;
  const result = { status: "preview", mode: "preview", savePath: loaded.savePath, backupPath: null, reportPath, summary: [{ label: "Players evaluated", value: rows.length }, { label: "Changes proposed", value: assignments.length }, { label: "Starting None", value: percent(core.population.startingNonePercentage) }, { label: "Configured None minimum", value: percent(core.population.configuredFloorPercentage) }, { label: "Projected None", value: percent(core.population.projectedNonePercentage) }, { label: "None Minimum Limited Changes", value: core.population.floorLimited ? "Yes" : "No" }], historySummary: [{ label: "Players evaluated", value: rows.length }, { label: "Players changed", value: assignments.length }], resultKind: TOOL_ID, details: { restrictPlayingStylePositions: options.restrictPlayingStylePositions, fixInvalidPlayingStyle: options.fixInvalidPlayingStyle, protectedRows: options.protectedRows, protectedValues: options.protectedValues, seed: options.seed, distribution: options.distribution, population: core.population, totalPreviewRows: changedRows.length, changes: changedRows.slice(0, MAX_PREVIEW_ROWS) } };
  const planId = storePlan({ toolId: TOOL_ID, toolName: TOOL_NAME, savePath: loaded.savePath, saveFingerprint: fingerprint, assignments, previewRows: changedRows, report, result });
  if(saveFingerprint(loaded.savePath)!==fingerprint)throw new Error('The Active Save changed during Preview. Run Preview again.');
  return { ...result, planId };
}

export async function runDealbreaker(context) { if (context.mode === "apply") return applyPlan(context); if (context.mode !== "preview") throw new Error("Run mode must be preview or apply."); return preview(context); }
