import { isDirectionalFcsTeam } from "../../services/save.js";
import { parseRef, sf } from "./openSave.js";

// Reporting only. Neither eligibility nor the shared-visuals safeguard changes.
// Expanded FCS rosters use the game's non-FBS TeamIndex sentinel. Resolve the
// actual roster membership, not Player.TeamIndex or a team's displayed name.
export function modAddedFcsPlayerRows(players, teams, rosters) {
  const memberships = new Map(), nonFbsTeams = (teams?.records ?? []).filter(team => team && !team.isEmpty && Number(sf(team, "TeamIndex")) === 255);
  // A normal save has five directional FCS rosters. With no expanded structure,
  // don't infer a mod merely because one of those schools has been renamed.
  if (nonFbsTeams.length <= 5) return new Set();
  const playerId = players?.header?.tableId, rosterId = rosters?.header?.tableId;
  if (!Number.isInteger(playerId) || !Number.isInteger(rosterId)) return new Set();
  for (const team of teams.records) {
    if (!team || team.isEmpty) continue;
    const ref = parseRef(sf(team, "Roster"));
    if (ref?.tableId !== rosterId) continue;
    const roster = rosters.records[ref.row]; if (!roster || roster.isEmpty) continue;
    const modFcs = Number(sf(team, "TeamIndex")) === 255 && !isDirectionalFcsTeam(team);
    const size = Number.isInteger(Number(roster.arraySize)) ? Number(roster.arraySize) : Object.keys(roster._fields ?? {}).length;
    for (let index = 0; index < size; index++) {
      const playerRef = parseRef(sf(roster, `Player${index}`));
      if (playerRef?.tableId !== playerId || players.records[playerRef.row]?.isEmpty !== false) continue;
      // An ambiguous player on any FBS/directional roster stays in the warning.
      memberships.set(playerRef.row, (memberships.get(playerRef.row) ?? true) && modFcs);
    }
  }
  return new Set([...memberships].filter(([, modFcs]) => modFcs).map(([row]) => row));
}
const reasons = rows => {
  const counts = {};
  for (const player of rows) counts[player.reason] = (counts[player.reason] ?? 0) + 1;
  return counts;
};
export function equipmentSkipReporting(skipped, modFcsRows) {
  const normal = skipped.filter(player => !modFcsRows.has(player.row)), mod = skipped.filter(player => modFcsRows.has(player.row));
  return {
    skipped: skipped.length, skippedReasons: reasons(skipped),
    reportedSkipped: normal.length, reportedSkippedReasons: reasons(normal),
    modFcsSkipped: mod.length, modFcsSkippedReasons: reasons(mod),
    skippedPlayers: skipped.map(({ row, firstName, lastName, position, reason }) => ({ row, player: `${firstName} ${lastName}`, position, reason, modAddedFcs: modFcsRows.has(row) }))
  };
}
