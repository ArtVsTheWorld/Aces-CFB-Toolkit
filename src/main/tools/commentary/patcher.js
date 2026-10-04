import { createCommentaryMatcher } from "./matcher.js";

export function patchPlayerCommentary(records, commentaryMap, {
  apply = false,
  teamNames = new Map(),
  allowPhonetic = false,
  allowFirstName = true,
  preserveUnmatched = false,
  freshmenOnly = false
} = {}) {
  const matchPlayer = createCommentaryMatcher(commentaryMap, { allowPhonetic, allowFirstName });
  const result = { changes: [], players: [], summary: { scanned: 0, skippedNil: 0, skippedNoTeam: 0, skippedPlaceholder: 0, skippedFreshmanFilter: 0, preservedUnmatched: 0, correct: 0, exact: 0, suffix: 0, phonetic: 0, first: 0, unmatched: 0 } };
  records.forEach((record, row) => {
    if (!record || record.isEmpty) return;
    if (record.IsNIL === true || String(record.IsNIL).toLowerCase() === "true") {
      result.summary.skippedNil += 1;
      return;
    }
    if (freshmenOnly) {
      const schoolYear = String(record.SchoolYear ?? "").trim().toLowerCase();
      const redshirtStatus = String(record.RedshirtStatus ?? "").trim().toLowerCase();
      if (schoolYear !== "freshman" || !["eligible", "current"].includes(redshirtStatus)) {
        result.summary.skippedFreshmanFilter += 1;
        return;
      }
    }
    const firstName = String(record.FirstName ?? "").trim();
    const lastName = String(record.LastName ?? "").trim();
    const teamIndex = Number(record.TeamIndex);
    if (teamIndex === 255) { result.summary.skippedNoTeam += 1; return; }
    if (normalizePlayerName(firstName) === "omar" && normalizePlayerName(lastName) === "omar" && String(record.Position) === "QB") {
      result.summary.skippedPlaceholder += 1;
      return;
    }
    const teamName = teamNames.get(teamIndex) || `Unknown Team (${teamIndex})`;
    const oldId = Number(record.PLYR_COMMENT) || 0;
    const match = matchPlayer(firstName, lastName);
    const preserved = preserveUnmatched && match.method === "none";
    const item = { record, row, firstName, lastName, teamIndex, teamName, oldId, newId: preserved ? oldId : match.id, match, preserved };
    result.players.push(item); result.summary.scanned += 1;
    if (match.source === "first") result.summary.first += 1;
    else if (match.method === "none") result.summary.unmatched += 1;
    else result.summary[match.method] += 1;
    if (preserved) result.summary.preservedUnmatched += 1;
    else if (oldId === match.id) result.summary.correct += 1;
    else { result.changes.push(item); if (apply) record.PLYR_COMMENT = match.id; }
  });
  const byTeamAndPlayer = (a, b) => a.teamIndex - b.teamIndex ||
    a.teamName.localeCompare(b.teamName) || a.lastName.localeCompare(b.lastName) ||
    a.firstName.localeCompare(b.firstName) || a.row - b.row;
  result.players.sort(byTeamAndPlayer);
  result.changes.sort(byTeamAndPlayer);
  return result;
}

const normalizePlayerName = value => String(value ?? "").trim().toLowerCase();


