import { sf } from "../openSave.js";
import { normalizeTeam } from "./teamRatings.js";

// Adapted from Balla's CFB27 Team Overall Calculation Tool, Option A (v0.1).
// Force Win computes this directly from the current save and never reads ratings
// written by the standalone tool.
export const OPTION_A_DEFAULTS = Object.freeze({
  blendStarterWeight: 0.72,
  spreadCap: 16,
  gainAbove: 2.25,
  gainBelow: 2.75
});

export const STARTER_COUNTS = Object.freeze({
  QB: 1, HB: 2, FB: 1, WR: 3, TE: 1,
  LT: 1, LG: 1, C: 1, RG: 1, RT: 1,
  DT: 2, LE: 1, RE: 1,
  MLB: 1, LOLB: 1, ROLB: 1,
  CB: 2, FS: 1, SS: 1,
  K: 1, P: 1
});

export const OFF_POSITION_WEIGHTS = Object.freeze({
  QB: 3, HB: 1.5, FB: 0.5, WR: 2, TE: 1,
  LT: 1.5, LG: 1, C: 1, RG: 1, RT: 1.5
});
export const DEF_POSITION_WEIGHTS = Object.freeze({
  DT: 1.5, LE: 1.5, RE: 1.5,
  MLB: 1.5, LOLB: 1, ROLB: 1,
  CB: 1.5, FS: 1, SS: 1
});
export const ST_POSITION_WEIGHTS = Object.freeze({ K: 1, P: 1 });
export const OVR_WEIGHTS = Object.freeze({ OFF: 0.45, DEF: 0.45, ST: 0.10 });

const GROUP_TO_FIELD = Object.freeze({
  QB: "qb", HB: "rb", FB: "rb", WR: "wr", TE: "te",
  LT: "ol", LG: "ol", C: "ol", RG: "ol", RT: "ol",
  DT: "dl", LE: "dl", RE: "dl",
  MLB: "lb", LOLB: "lb", ROLB: "lb",
  CB: "db", FS: "db", SS: "db"
});
const REQUIRED_UNITS = Object.freeze(["qb", "rb", "wr", "te", "ol", "dl", "lb", "db"]);

export function plainAverage(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function computePositionScores(byPosition, settings = OPTION_A_DEFAULTS) {
  const scores = {};
  for (const [position, ratings] of Object.entries(byPosition)) {
    const sorted = [...ratings].sort((left, right) => right - left);
    const starterRatings = sorted.slice(0, STARTER_COUNTS[position] || 1);
    const starterScore = plainAverage(starterRatings);
    const depthScore = plainAverage(sorted);
    if (starterScore === null || depthScore === null) continue;
    let blended = settings.blendStarterWeight * starterScore +
      (1 - settings.blendStarterWeight) * depthScore;
    if (starterScore - depthScore > settings.spreadCap) {
      blended = Math.min(blended, depthScore + settings.spreadCap);
    }
    scores[position] = { starterScore, depthScore, blended, count: ratings.length };
  }
  return scores;
}

function rollup(scores, weights) {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const [position, weight] of Object.entries(weights)) {
    if (!scores[position]) continue;
    weightedSum += scores[position].blended * weight;
    weightTotal += weight;
  }
  return weightTotal ? weightedSum / weightTotal : null;
}

export function computeTeamRaw(players, settings = OPTION_A_DEFAULTS) {
  if (!players?.length) return null;
  const byPosition = {};
  const unknownPositions = new Set();
  for (const player of players) {
    const position = String(player.Position || "?");
    if (!STARTER_COUNTS[position]) unknownPositions.add(position);
    (byPosition[position] ??= []).push(player.OverallRating);
  }
  const groupScores = computePositionScores(byPosition, settings);
  const off = rollup(groupScores, OFF_POSITION_WEIGHTS);
  const def = rollup(groupScores, DEF_POSITION_WEIGHTS);
  const st = rollup(groupScores, ST_POSITION_WEIGHTS);
  const components = [["OFF", off], ["DEF", def], ["ST", st]].filter(([, value]) => value !== null);
  const totalWeight = components.reduce((sum, [key]) => sum + OVR_WEIGHTS[key], 0);
  const ovr = totalWeight
    ? components.reduce((sum, [key, value]) => sum + value * OVR_WEIGHTS[key], 0) / totalWeight
    : null;
  return {
    players,
    groupScores,
    off,
    def,
    st,
    ovr,
    unknownPositions,
    rosterAvgOvr: plainAverage(players.map(player => player.OverallRating))
  };
}

export function applyOptionAGain(rawValue, leagueAverage, settings = OPTION_A_DEFAULTS) {
  if (rawValue === null || leagueAverage === null) return rawValue;
  const difference = rawValue - leagueAverage;
  const gained = difference >= 0
    ? leagueAverage + difference * settings.gainAbove
    : leagueAverage + difference * settings.gainBelow;
  return Math.max(0, Math.min(99, gained));
}

export function computeTeamFinal(raw, leagueAverages, settings = OPTION_A_DEFAULTS) {
  const clamp = value => Math.max(0, Math.min(99, value));
  const gainedOff = applyOptionAGain(raw.off, leagueAverages.off, settings);
  const gainedDef = applyOptionAGain(raw.def, leagueAverages.def, settings);
  const offRatio = raw.off > 0 ? gainedOff / raw.off : 1;
  const defRatio = raw.def > 0 ? gainedDef / raw.def : 1;
  const finalOff = Math.round(clamp(gainedOff));
  const finalDef = Math.round(clamp(gainedDef));
  const finalSt = Math.round(clamp(raw.st * ((offRatio + defRatio) / 2)));
  const finalOvr = Math.round(clamp(
    finalOff * OVR_WEIGHTS.OFF + finalDef * OVR_WEIGHTS.DEF + finalSt * OVR_WEIGHTS.ST
  ));
  const buckets = {};
  for (const [position, score] of Object.entries(raw.groupScores)) {
    const bucket = GROUP_TO_FIELD[position];
    if (!bucket) continue;
    (buckets[bucket] ??= []).push(Math.round(score.blended));
  }
  const units = Object.fromEntries(
    Object.entries(buckets).map(([bucket, values]) => [bucket, Math.round(plainAverage(values))])
  );
  return { overall: finalOvr, offense: finalOff, defense: finalDef, finalSpecialTeams: finalSt, units };
}

function validRosterPlayer(record) {
  const overall = Number(sf(record, "OverallRating"));
  const teamIndex = Number(sf(record, "TeamIndex"));
  return record && !record.isEmpty && Number.isFinite(overall) && Number.isFinite(teamIndex) &&
    teamIndex !== 255 && String(sf(record, "FirstName") ?? "").trim() !== "" &&
    String(sf(record, "LastName") ?? "").trim() !== "";
}

// Produces team-row keyed ratings. Invalid/incomplete teams are omitted so the
// caller can explicitly fall back to the save's aggregate TEAM_RATING fields.
export function buildRosterRatings({ teamTable, playerTable, settings = OPTION_A_DEFAULTS }) {
  const rostersByTeamIndex = new Map();
  for (const record of playerTable.records) {
    if (!validRosterPlayer(record)) continue;
    const teamIndex = Number(sf(record, "TeamIndex"));
    const player = {
      Position: String(sf(record, "Position") ?? ""),
      OverallRating: Number(sf(record, "OverallRating"))
    };
    if (!Number.isFinite(player.OverallRating)) continue;
    const roster = rostersByTeamIndex.get(teamIndex) ?? [];
    roster.push(player);
    rostersByTeamIndex.set(teamIndex, roster);
  }

  const rawByTeamRow = new Map();
  for (let row = 0; row < teamTable.records.length; row += 1) {
    const record = teamTable.records[row];
    if (!record || record.isEmpty) continue;
    const team = normalizeTeam(record, row);
    if (team.isBuiltInFcs || Number(team.teamIndex) === 255) continue;
    const raw = computeTeamRaw(rostersByTeamIndex.get(Number(team.teamIndex)) ?? [], settings);
    if (raw?.off !== null && raw?.def !== null && raw?.st !== null) rawByTeamRow.set(row, { team, raw });
  }

  // Each valid FBS team contributes once to its corresponding league average.
  const rawTeams = [...rawByTeamRow.values()];
  const leagueAverages = {
    off: plainAverage(rawTeams.map(item => item.raw.off)),
    def: plainAverage(rawTeams.map(item => item.raw.def))
  };
  const ratingsByTeamRow = new Map();
  for (const [row, { raw }] of rawByTeamRow) {
    const final = computeTeamFinal(raw, leagueAverages, settings);
    const missingUnits = REQUIRED_UNITS.filter(unit => !Number.isFinite(final.units[unit]));
    if (missingUnits.length) continue;
    ratingsByTeamRow.set(row, {
      ratings: {
        overall: final.overall,
        offense: final.offense,
        defense: final.defense,
        ...final.units,
        st: Math.round(raw.st),
        rawOffense: raw.off,
        rawDefense: raw.def,
        rawComposite: raw.ovr,
        finalSpecialTeams: final.finalSpecialTeams
      },
      starters: {},
      warnings: raw.unknownPositions.size
        ? [`ignored unsupported positions: ${[...raw.unknownPositions].sort().join(", ")}`]
        : [],
      source: "Balla Option A roster calculation",
      rosterCount: raw.players.length,
      rosterAverage: raw.rosterAvgOvr,
      leagueAverages
    });
  }
  return ratingsByTeamRow;
}
