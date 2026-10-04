import { parseRef, sf } from "../openSave.js";
import { FORCE_WIN_SCHEMA } from "./schema.js";

const ratingKeys = Object.freeze([
  "overall", "offense", "defense", "qb", "wr", "te", "rb", "ol", "dl", "lb", "db", "st"
]);

// A schedule reference must target the runtime table selected by the configured team Unique ID.
export function teamTableId(teamTable) {
  const value = Number(teamTable?.header?.tableId ?? teamTable?.tableId);
  if (!Number.isInteger(value)) throw new Error("The selected team table does not expose a valid table ID.");
  return value;
}

export function normalizeTeam(record, row) {
  const f = FORCE_WIN_SCHEMA.team;
  const ratings = Object.fromEntries(ratingKeys.map(key => [key, Number(sf(record, f[key]))]));
  const missing = ratingKeys
    .filter(key => !Number.isFinite(ratings[key]) || ratings[key] <= 0 || ratings[key] > 99)
    .map(key => f[key]);
  const name = f.nameCandidates.map(field => sf(record, field)).find(Boolean) || `Team row ${row}`;
  const teamType = sf(record, f.teamType);
  const teamIndex = sf(record, f.teamIndex);
  const isBuiltInFcs = String(name).startsWith("FCS ") ||
    (teamType === "ProBowl" && Number(teamIndex) === 255);
  return {
    row,
    id: row,
    teamIndex,
    teamType,
    isTeamBuilder: [true, "true", 1, "1"].includes(sf(record, f.isTeamBuilder)),
    isBuiltInFcs,
    name: String(name),
    coachReferences: {
      headCoach: sf(record, f.headCoach),
      offensiveCoordinator: sf(record, f.offensiveCoordinator),
      defensiveCoordinator: sf(record, f.defensiveCoordinator)
    },
    stadiumAtmosphereGrade: String(sf(record, f.stadiumAtmosphereGrade) ?? ""),
    mediaPollRank: Number(sf(record, f.mediaPollRank)),
    ratings,
    missing
  };
}

// Resolve the binary reference and reject missing or incomplete rating data.
export function resolveTeamReference(reference, teamTable, calculatedRatings = null) {
  const parsed = parseRef(reference);
  if (!parsed) return { error: "team reference is null or malformed" };
  const expectedTableId = teamTableId(teamTable);
  if (parsed.tableId !== expectedTableId) {
    return { error: `team reference targets table ID ${parsed.tableId}, expected ${expectedTableId}` };
  }
  const record = teamTable.records[parsed.row];
  if (!record || record.isEmpty) return { error: `team row ${parsed.row} is missing or empty` };
  const team = normalizeTeam(record, parsed.row);
  if (calculatedRatings?.has(parsed.row)) {
    const calculated = calculatedRatings.get(parsed.row);
    team.ratings = { ...team.ratings, ...calculated.ratings };
    team.starters = calculated.starters;
    team.depthWarnings = calculated.warnings;
    team.ratingSource = calculated.source;
    team.rosterCount = calculated.rosterCount;
    team.rosterAverage = calculated.rosterAverage;
    team.leagueAverages = calculated.leagueAverages;
  } else if (calculatedRatings) {
    team.starters = {};
    team.depthWarnings = ["roster rating is incomplete; aggregate team ratings are being used"];
    team.ratingSource = "save aggregate fallback";
  }
  team.missing = ratingKeys
    .filter(key => !Number.isFinite(team.ratings[key]) || team.ratings[key] <= 0 || team.ratings[key] > 99)
    .map(key => FORCE_WIN_SCHEMA.team[key]);
  if (team.missing.length) {
    return { error: `${team.name} is missing valid ratings: ${team.missing.join(", ")}`, team };
  }
  return { team };
}
