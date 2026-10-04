import { openCfb27Save, readTables, PLAYER_TABLE_UID, TEAM_TABLE_UID, availableTeams } from "./save.js";
import { FRANCHISE_USER_TABLE_UID, userControlledTeams } from "../tools/jersey/shared.js";

const SEASON_INFO_TABLE_UID = 3123991521;

export function homeSeason(record) {
  if (!record || record.isEmpty) return null;
  const season = record.CurrentSeasonYear == null ? NaN : Number(record.CurrentSeasonYear);
  const week = record.CurrentWeek == null ? NaN : Number(record.CurrentWeek);
  return {
    season: Number.isInteger(season) && season >= 2000 && season <= 2200 ? season : null,
    week: Number.isInteger(week) && week >= 0 && week <= 30 ? week : null,
    weekType: typeof record.CurrentWeekType === "string" ? record.CurrentWeekType : null
  };
}

export async function readHomeContext(savePath, schemaPath) {
  const opened = await openCfb27Save(savePath, schemaPath);
  const { teams, players, franchiseUsers, seasonInfo } = await readTables(opened.franchise, {
    teams: TEAM_TABLE_UID,
    players: PLAYER_TABLE_UID,
    franchiseUsers: FRANCHISE_USER_TABLE_UID,
    seasonInfo: SEASON_INFO_TABLE_UID
  });
  const available = availableTeams(teams.records).map(team => {
    const record = teams.records.find(candidate => candidate && !candidate.isEmpty && Number(candidate.TeamIndex) === team.teamIndex && String(candidate.DisplayName ?? candidate.LongName ?? candidate.ShortName ?? "").trim() === team.name);
    const nickname = String(record?.NickName ?? "").trim();
    return { ...team, nickname: nickname && nickname.toLowerCase() !== team.name.toLowerCase() ? nickname : null };
  });
  const controlledIndexes = userControlledTeams(teams, franchiseUsers, players);
  // Existing tools support both FranchiseUser and Team.UserCharacter ownership.
  for (const team of teams.records) {
    if (!team || team.isEmpty || typeof team.UserCharacter !== "string" || !/[1-9]/.test(team.UserCharacter)) continue;
    const index = Number(team.TeamIndex);
    if (Number.isInteger(index) && index >= 0 && index !== 255) controlledIndexes.add(index);
  }
  return {
    teams: available,
    controlledTeams: available.filter(team => controlledIndexes.has(team.teamIndex)),
    season: homeSeason(seasonInfo.records.find(record => record && !record.isEmpty))
  };
}
