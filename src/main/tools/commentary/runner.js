import crypto from "node:crypto";
import fs from "node:fs";
import { createBackup } from "../../services/files.js";
import { openCfb27Save, tableByUniqueId } from "../../services/save.js";
import { loadCommentaryMap } from "./map.js";
import { patchPlayerCommentary } from "./patcher.js";

const DEFAULT_PLAYER_TABLE_UID = 1612938518;
const DEFAULT_TEAM_TABLE_UID = 3359508968;
const sf = (record, field) => { try { return record[field]; } catch { return undefined; } };

function normalizeOptions(options, defaultMapPath) {
  const playerTableUid = Number(options?.playerTableUid ?? DEFAULT_PLAYER_TABLE_UID); const teamTableUid = Number(options?.teamTableUid ?? DEFAULT_TEAM_TABLE_UID);
  if (!Number.isSafeInteger(playerTableUid) || playerTableUid <= 0) throw new Error("Player table Unique ID must be a positive integer.");
  if (!Number.isSafeInteger(teamTableUid) || teamTableUid <= 0) throw new Error("Team table Unique ID must be a positive integer.");
  const mapPath = String(options?.mapPath || defaultMapPath); if (!fs.existsSync(mapPath) || !fs.statSync(mapPath).isFile()) throw new Error(`Cannot read commentary map ${mapPath}: file does not exist.`);
  return { phonetic: Boolean(options?.phonetic), firstName: options?.firstName !== false, preserveUnmatched: Boolean(options?.preserveUnmatched), freshmenOnly: Boolean(options?.freshmenOnly), showAll: Boolean(options?.showAll), playerTableUid, teamTableUid, mapPath };
}

async function readPlayerTable(franchise, uniqueId) {
  let table; try { table = tableByUniqueId(franchise, uniqueId); } catch { throw new Error(`Main Player table Unique ID ${uniqueId} was not found.`); }
  await table.readRecords(); const sample = table.records.find(record => record && !record.isEmpty); const values = sample && ["FirstName", "LastName", "TeamIndex", "Position", "SchoolYear", "RedshirtStatus", "IsNIL", "PLYR_COMMENT"].map(field => sf(sample, field));
  if (!sample || values.some(value => value === undefined)) throw new Error(`Unique ID ${uniqueId} is not the expected Player table (name, team, school year, redshirt status, NIL, and commentary fields required).`); return table;
}

async function readTeamTable(franchise, uniqueId) {
  let table; try { table = tableByUniqueId(franchise, uniqueId); } catch { throw new Error(`Main Team table Unique ID ${uniqueId} was not found.`); }
  await table.readRecords(); const sample = table.records.find(record => record && !record.isEmpty); const values = sample && ["TeamIndex", "DisplayName"].map(field => sf(sample, field));
  if (!sample || values.some(value => value === undefined)) throw new Error(`Unique ID ${uniqueId} is not the expected Team table (TeamIndex and DisplayName required).`); return table;
}

function buildTeamNames(records) { const names = new Map(); records.forEach((record, row) => { if (!record || record.isEmpty) return; const name = String(sf(record, "DisplayName") || sf(record, "LongName") || sf(record, "ShortName") || `Team ${row}`); const explicit = Number(sf(record, "TeamIndex")); if (Number.isInteger(explicit)) names.set(explicit, name); if (!names.has(row)) names.set(row, name); }); return names; }

async function analyze({ savePath, options, schemaPath, defaultMapPath }) {
  const normalized = normalizeOptions(options, defaultMapPath); const commentaryMap = loadCommentaryMap(normalized.mapPath); const opened = await openCfb27Save(savePath, schemaPath); const players = await readPlayerTable(opened.franchise, normalized.playerTableUid); const teams = await readTeamTable(opened.franchise, normalized.teamTableUid); const teamNames = buildTeamNames(teams.records);
  const result = patchPlayerCommentary(players.records, commentaryMap, { apply: false, teamNames, allowPhonetic: normalized.phonetic, allowFirstName: normalized.firstName, preserveUnmatched: normalized.preserveUnmatched, freshmenOnly: normalized.freshmenOnly });
  const phoneticRows = result.changes.filter(change => change.match.method === "phonetic").map(change => change.row);
  const signatureData = { savePath: opened.savePath, options: normalized, proposals: result.changes.map(change => [change.row, change.oldId, change.newId, change.match.method, change.match.source, change.match.name]) };
  const analysisSignature = crypto.createHash("sha256").update(JSON.stringify(signatureData)).digest("hex");
  return { ...opened, normalized, commentaryMapSize: commentaryMap.size, result, phoneticRows, analysisSignature };
}

const serialProposal = item => ({ row: item.row, team: item.teamName, player: `${item.firstName} ${item.lastName}`.trim(), currentId: item.oldId, proposedId: item.newId, matchedName: item.match.name, method: item.match.method, source: item.match.source, requiresDecision: item.match.method === "phonetic" });

export async function prepareCommentary(context) {
  const analysis = await analyze(context); const matched = analysis.result.players.filter(player => player.match.method !== "none").length;
  const reviewItems = analysis.result.changes.filter(item => item.match.method === "phonetic");
  return { analysisSignature: analysis.analysisSignature, commentaryMapSize: analysis.commentaryMapSize, summary: { ...analysis.result.summary, matched, coverage: analysis.result.summary.scanned ? matched / analysis.result.summary.scanned * 100 : 0, proposals: analysis.result.changes.length, reviewRequired: analysis.phoneticRows.length }, proposals: reviewItems.map(item => ({ ...serialProposal(item), isChange: true, requiresDecision: true })) };
}

export async function runCommentary(context) {
  const analysis = await analyze(context); if (context.options?.analysisSignature !== analysis.analysisSignature) throw new Error("The save or analysis settings changed. Run Analyze again before Preview or Apply.");
  const decisions = context.options?.decisions && typeof context.options.decisions === "object" ? context.options.decisions : {}; const unresolved = analysis.phoneticRows.filter(row => typeof decisions[row] !== "boolean"); if (unresolved.length) throw new Error(`${unresolved.length} phonetic match decision(s) remain unresolved. Accept or reject each one before continuing.`);
  let rejected = 0; for (const change of analysis.result.changes) if (change.match.method === "phonetic" && decisions[change.row] === false) { change.newId = change.oldId; change.preserved = true; rejected += 1; }
  const reviewRows = analysis.result.changes.map(change => ({ ...serialProposal(change), proposedId: change.preserved ? change.match.id : change.newId, decision: change.preserved ? "Rejected" : change.match.method === "phonetic" ? "Accepted" : "Automatic", changed: change.newId !== change.oldId }));
  analysis.result.changes = analysis.result.changes.filter(change => change.newId !== change.oldId); const accepted = analysis.phoneticRows.length - rejected;
  const reportItems = analysis.normalized.showAll ? analysis.result.players : analysis.result.changes;
  const reportPath = context.reports.create({ toolId: "commentary-id", toolName: "Commentary ID Patcher", prefix: "commentary-id-report", headings: ["Row", "Team", "Player", "OldID", "NewID", "Method", "Source", "MatchedName", "Approved"], rows: reportItems.map(player => [player.row, player.teamName, `${player.firstName} ${player.lastName}`, player.oldId, player.newId, player.match.method, player.match.source, player.match.name, !player.preserved]) });
  let backupPath = null; if (context.mode === "apply" && analysis.result.changes.length) { backupPath = createBackup(analysis.savePath); for (const change of analysis.result.changes) change.record.PLYR_COMMENT = change.newId; await analysis.franchise.save(); }
  const changed = analysis.result.changes.length; const status = context.mode === "preview" ? "preview" : changed ? "completed" : "no-changes";
  return { status, mode: context.mode, savePath: analysis.savePath, backupPath, reportPath, summary: [{ label: "Players scanned", value: analysis.result.summary.scanned }, { label: "Matches proposed", value: prepareProposalCount(analysis) }, { label: "Phonetic accepted", value: accepted }, { label: "Phonetic rejected", value: rejected }, { label: "Players changed", value: changed }], historySummary: [{ label: "Players changed", value: changed }, { label: "Phonetic accepted", value: accepted }, { label: "Phonetic rejected", value: rejected }], resultKind: "commentary-id", details: { commentaryMapSize: analysis.commentaryMapSize, ...analysis.result.summary, accepted, rejected, proposals: prepareProposalCount(analysis), totalPreviewRows: reviewRows.length, changes: reviewRows.slice(0, 1000) } };
}

function prepareProposalCount(analysis) { return analysis.result.players.filter(player => !player.preserved && player.oldId !== player.match.id).length + analysis.result.players.filter(player => player.preserved && player.match.method === "phonetic").length; }
