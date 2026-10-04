import path from "node:path";
import { createBackup } from "../../services/files.js";
import { openCfb27Save, readTables, PLAYER_TABLE_UID, TEAM_TABLE_UID, availableTeams } from "../../services/save.js";
import { completePlan, saveFingerprint, storePlan, takePlan } from "../jersey/planStore.js";
import { parseRef, sf } from "./openSave.js";
import { installVisualsWriteSafety, saveEquipmentCandidate, snapshotVisualsForVerification } from "./visualsSafety.js";
import { isVisualOverflowStorage } from "./visualStorage.js";

export const VISUALS_TABLE_UID = 1429178382;
export const ROSTER_TABLE_UID = 461505069;
export const SEASON_INFO_TABLE_UID = 3123991521;
export const VALID_POSITIONS = ["QB", "HB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "LE", "RE", "DT", "LOLB", "MLB", "ROLB", "CB", "FS", "SS", "K", "P"];
export const VALID_CLASSES = ["Freshman", "Sophomore", "Junior", "Senior"];
export const VALID_BODY_TYPES = ["Standard", "Lean", "Thin", "Muscular", "Heavy"];
export const REDSHIRT_FILTERS = Object.freeze({ true: ["Eligible", "Current"], redshirt: ["Previous"] });
export function validateEquipmentSeason(record) { const type=String(sf(record,"CurrentWeekType")??""),week=Number(sf(record,"CurrentWeek")),postWeeks=Number(sf(record,"PostSeasonNumWeeks")); const allowed=type==="PreSeason"&&week===0||type==="RegularSeason"&&week>=0&&week<=15||type==="PostSeason"&&week>=0&&Number.isFinite(postWeeks)&&week<postWeeks; if(!allowed)throw new Error(`Equipment tools are available from the preseason week immediately before Week 0 through National Championship week. This save is ${type||"an unknown season stage"}, week ${Number.isFinite(week)?week:"unknown"}. Advance to the supported season window and try again.`); return { currentWeekType:type,currentWeek:week,postSeasonWeeks:postWeeks }; }
export async function loadEquipmentTables(savePath, schemaPath, visuals = true, enforceSeason = true) { const opened = await openCfb27Save(savePath, schemaPath); const tables=await readTables(opened.franchise, { players: PLAYER_TABLE_UID, teams: TEAM_TABLE_UID, rosters: ROSTER_TABLE_UID, ...(enforceSeason?{seasonInfo:SEASON_INFO_TABLE_UID}:{}), ...(visuals ? { visuals: VISUALS_TABLE_UID } : {}) }); const season=enforceSeason?validateEquipmentSeason(tables.seasonInfo.records.find(record=>record&&!record.isEmpty)):null; installVisualsWriteSafety(tables.visuals, new Set(tables.players.records.filter(record => !record.isEmpty).map(record => parseRef(sf(record, "CharacterVisuals"))).filter(ref => ref?.tableId === tables.visuals?.header.tableId).map(ref => ref.row))); return { ...opened, ...tables, season }; }
export function validateTable(table, fields, label) { const sample = table.records.find(record => record && !record.isEmpty); if (!sample || fields.some(field => sf(sample, field) === undefined)) throw new Error(`${label} table does not contain the expected fields.`); }
export function buildTeamNames(records) { const names = new Map(); records.forEach((record, row) => { if (!record || record.isEmpty) return; const name = String(sf(record, "DisplayName") || sf(record, "LongName") || sf(record, "ShortName") || `Team ${row}`); const index = Number(sf(record, "TeamIndex")); if (Number.isInteger(index)) names.set(index, name); if (!names.has(row)) names.set(row, name); }); return names; }
export function buildTeamApparel(records) {
  const map = new Map();
  // Player.TeamIndex is a game index, not a Team-table row. Explicit indexes
  // must win over every row-number fallback, including rows encountered later.
  for (const record of records) {
    if (!record || record.isEmpty) continue;
    const index = Number(sf(record, "TeamIndex")), brand = String(sf(record, "TeamApparel") ?? "").trim().toLowerCase();
    if (brand && Number.isInteger(index)) map.set(index, brand);
  }
  records.forEach((record, row) => {
    if (!record || record.isEmpty || map.has(row)) return;
    const brand = String(sf(record, "TeamApparel") ?? "").trim().toLowerCase();
    if (brand) map.set(row, brand);
  });
  return map;
}
export function buildRosterPlayerApparel(players, teams, rosters) {
  const brands = new Map(), playerTableId = Number(players?.header?.tableId), rosterTableId = Number(rosters?.header?.tableId);
  if (!Number.isInteger(playerTableId) || !Number.isInteger(rosterTableId)) return brands;
  for (const team of teams?.records ?? []) {
    if (!team || team.isEmpty) continue;
    const brand = String(sf(team, "TeamApparel") ?? "").trim().toLowerCase(), rosterRef = parseRef(sf(team, "Roster"));
    if (!brand || rosterRef?.tableId !== rosterTableId) continue;
    const roster = rosters.records[rosterRef.row]; if (!roster || roster.isEmpty) continue;
    const size = Number.isInteger(Number(roster.arraySize)) ? Number(roster.arraySize) : Object.keys(roster._fields ?? {}).length;
    for (let index = 0; index < size; index++) {
      const ref = parseRef(sf(roster, `Player${index}`)); if (ref?.tableId !== playerTableId) continue;
      brands.set(ref.row, brands.has(ref.row) && brands.get(ref.row) !== brand ? null : brand);
    }
  }
  return brands;
}
export function buildFcsTeamIndexes(records) { const set = new Set(); records.forEach((record, row) => { if (!record || record.isEmpty || !/^FCS\b/i.test(String(sf(record, "DisplayName") ?? "").trim())) return; const index = Number(sf(record, "TeamIndex")); set.add(Number.isInteger(index) ? index : row); }); return set; }
export function resolveTeamIndexes(records, requested = []) { const set = new Set(), unmatched = []; for (const requestedName of requested) { const wanted = requestedName.trim().toLowerCase(); let matched = false; records.forEach((record, row) => { if (!record || record.isEmpty) return; const names = [sf(record, "DisplayName"), sf(record, "LongName"), sf(record, "ShortName")].filter(Boolean).map(value => String(value).trim().toLowerCase()); if (!names.includes(wanted)) return; matched = true; const index = Number(sf(record, "TeamIndex")); set.add(Number.isInteger(index) ? index : row); }); if (!matched) unmatched.push(requestedName); } if (unmatched.length) throw new Error(`Unknown team name(s): ${unmatched.join(", ")}. Use the exact team display name.`); return set; }
export function prepareEquipment(records) { return { teams: availableTeams(records), positions: VALID_POSITIONS, classes: VALID_CLASSES, bodyTypes: VALID_BODY_TYPES }; }
export function equipmentTeamColors(records) {
  const result = {};
  for (const record of records) {
    if (!record || record.isEmpty) continue;
    const name = String(sf(record, "DisplayName") || sf(record, "LongName") || sf(record, "ShortName") || "").trim().toLowerCase();
    const rgb = suffix => {
      const components = ["R", "G", "B"].map(channel => sf(record, `TEAM_BACKGROUNDCOLOR${channel}${suffix}`));
      return components.every(value => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 255) ? `#${components.map(value => value.toString(16).padStart(2, "0")).join("")}` : null;
    };
    if (name) result[name] = { primary: rgb(""), secondary: rgb("2") };
  }
  return result;
}
export function buildRosterPlayerRows(players, teams, rosters) { const rows = new Set(), playerTableId = Number(players?.header?.tableId), rosterTableId = Number(rosters?.header?.tableId); if (!Number.isInteger(playerTableId) || !Number.isInteger(rosterTableId)) return rows; for (const team of teams?.records ?? []) { if (!team || team.isEmpty) continue; const rosterRef = parseRef(sf(team, "Roster")); if (!rosterRef || rosterRef.tableId !== rosterTableId) continue; const roster = rosters.records[rosterRef.row]; if (!roster || roster.isEmpty) continue; const size = Number.isInteger(Number(roster.arraySize)) ? Number(roster.arraySize) : Object.keys(roster._fields ?? {}).length; for (let index = 0; index < size; index += 1) { const playerRef = parseRef(sf(roster, `Player${index}`)); if (playerRef?.tableId === playerTableId) rows.add(playerRef.row); } } return rows; }
export function buildRosterTeamNames(players, teams, rosters) {
  const names = new Map(), playerTableId = Number(players?.header?.tableId), rosterTableId = Number(rosters?.header?.tableId);
  if (!Number.isInteger(playerTableId) || !Number.isInteger(rosterTableId)) return names;
  for (const team of teams?.records ?? []) {
    if (!team || team.isEmpty) continue;
    const name = String(sf(team, "DisplayName") || sf(team, "LongName") || sf(team, "ShortName") || "").trim(), rosterRef = parseRef(sf(team, "Roster"));
    if (!name || rosterRef?.tableId !== rosterTableId) continue;
    const roster = rosters.records[rosterRef.row]; if (!roster || roster.isEmpty) continue;
    const size = Number.isInteger(Number(roster.arraySize)) ? Number(roster.arraySize) : Object.keys(roster._fields ?? {}).length;
    for (let index = 0; index < size; index++) {
      const playerRef = parseRef(sf(roster, `Player${index}`)); if (playerRef?.tableId !== playerTableId) continue;
      names.set(playerRef.row, names.has(playerRef.row) && names.get(playerRef.row) !== name ? null : name);
    }
  }
  return names;
}
export function snapshotVisualRawData(records) { return new Map(records.map((record, row) => [row, record && !record.isEmpty && !isVisualOverflowStorage(record) ? sf(record, "RawData") : undefined])); }
export function splitList(value) { return Array.isArray(value) ? value.map(String).map(v => v.trim()).filter(Boolean) : String(value ?? "").split(",").map(v => v.trim()).filter(Boolean); }
export function validateSeed(value) { const seed = Number(value); if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error("Random seed must be a whole number from 0 through 4,294,967,295."); return seed; }
export function makeEligible(options, names, includedIndexes) { const includedNames = new Set(options.includedTeams.map(value => value.toLowerCase())); const positions = new Set(options.positions.map(value => value.toUpperCase())); const classes = new Set(options.classes.map(value => value.toLowerCase())); const bodies = new Set(options.bodyTypes.map(value => value.toLowerCase())); const redshirts = new Set(options.redshirtStatuses.map(value => value.toLowerCase())); return record => { const teamIndex = Number(sf(record, "TeamIndex")), overall = Number(sf(record, "OverallRating")); if (options.skipNilPlayers && Boolean(sf(record, "IsNIL"))) return false; if (includedIndexes.size && !includedNames.has(String(names.get(teamIndex) ?? "").toLowerCase())) return false; if (positions.size && !positions.has(String(sf(record, "Position") ?? "").toUpperCase())) return false; if (classes.size && !classes.has(String(sf(record, "SchoolYear") ?? "").toLowerCase())) return false; if (bodies.size && !bodies.has(String(sf(record, "CharacterBodyType") ?? "").toLowerCase())) return false; if (redshirts.size && !redshirts.has(String(sf(record, "RedshirtStatus") ?? "").toLowerCase())) return false; if (options.minimumOverall !== null && overall < options.minimumOverall) return false; if (options.maximumOverall !== null && overall > options.maximumOverall) return false; return true; }; }
export function cacheEquipmentPlan(plan) { return storePlan({ ...plan, saveFingerprint: saveFingerprint(plan.savePath) }); }
export async function applyEquipmentPlan({ toolId, savePath, options, schemaPath, reports }) {
  const plan = takePlan(options?.planId);
  if (plan.toolId !== toolId || path.resolve(plan.savePath) !== path.resolve(savePath)) throw new Error("The preview does not belong to this tool and Active Save.");
  if (saveFingerprint(plan.savePath) !== plan.saveFingerprint) throw new Error("The save changed after Preview. Run Preview again before Apply.");
  const loaded = await loadEquipmentTables(savePath, schemaPath, plan.needsVisuals);
  for (const change of plan.assignments) {
    const table = change.table === "players" ? loaded.players : loaded.visuals, record = table.records[change.row];
    if (!record || record.isEmpty || String(record[change.field]) !== String(change.oldValue)) throw new Error(`Source row ${change.row} changed after Preview. Run Preview again.`);
  }
  const reportPath = reports.create({ ...plan.report, toolId, toolName: plan.toolName });
  let backupPath = null;
  if (plan.assignments.length) {
    const before = loaded.visuals ? snapshotVisualsForVerification(loaded.visuals, snapshotVisualRawData(loaded.visuals.records)) : null;
    backupPath = createBackup(loaded.savePath);
    for (const change of plan.assignments) (change.table === "players" ? loaded.players : loaded.visuals).records[change.row][change.field] = change.newValue;
    if (loaded.visuals) await saveEquipmentCandidate(loaded, schemaPath, before, plan.assignments, plan.saveFingerprint);
    else await loaded.franchise.save();
  }
  completePlan(options.planId);
  return { ...plan.result, status: plan.assignments.length ? "completed" : "no-changes", mode: "apply", backupPath, reportPath, planId: options.planId };
}
