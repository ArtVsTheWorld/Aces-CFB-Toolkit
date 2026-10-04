import { openCfb27Save, readTables, PLAYER_TABLE_UID, TEAM_TABLE_UID, availableTeams } from "../../services/save.js";
import { isBuiltInFcsTeam } from "./core/teamEligibility.js";

export const FRANCHISE_USER_TABLE_UID = 3429237668;
export const OFFENSE = new Set(["QB", "HB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT"]);
export const DEFENSE = new Set(["LE", "RE", "DT", "LOLB", "MLB", "ROLB", "EDGE", "CB", "FS", "SS"]);
export const SPECIALISTS = new Set(["K", "P"]);

export async function loadJerseyTables(savePath, schemaPath, { franchiseUsers = false } = {}) { const opened = await openCfb27Save(savePath, schemaPath); const ids = { players: PLAYER_TABLE_UID, teams: TEAM_TABLE_UID, ...(franchiseUsers ? { franchiseUsers: FRANCHISE_USER_TABLE_UID } : {}) }; return { ...opened, ...(await readTables(opened.franchise, ids)) }; }
export function jerseyTeams(records) { return availableTeams(records.filter(team => team && !team.isEmpty && !isBuiltInFcsTeam(team))); }
export function teamNames(records) { const names = new Map(); for (const team of records) if (team && !team.isEmpty && !isBuiltInFcsTeam(team)) names.set(Number(team.TeamIndex), String(team.DisplayName)); return names; }
export function parseRef(binary) { if (typeof binary !== "string" || binary.length < 32 || !/[1-9]/.test(binary)) return null; return { tableId: parseInt(binary.slice(0, 15), 2), row: parseInt(binary.slice(15), 2) }; }
export function userControlledTeams(teamTable, franchiseUserTable, playerTable) { const set = new Set(); const validTeams = new Set(teamTable.records.filter(team => team && !team.isEmpty).map(team => Number(team.TeamIndex)).filter(index => Number.isInteger(index) && index >= 0 && index !== 255)); const playerTableId = playerTable.header?.tableId ?? playerTable.tableId; for (const user of franchiseUserTable.records) { if (!user || user.isEmpty) continue; const ref = parseRef(user.UserEntity); if (!ref || ref.tableId !== playerTableId) continue; const controlled = playerTable.records[ref.row], teamIndex = Number(controlled?.TeamIndex); if (controlled && !controlled.isEmpty && validTeams.has(teamIndex)) set.add(teamIndex); } return set; }
export function playerRowMap(records) { return new Map(records.map((record, row) => [record, row])); }
