import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import FORCE_WIN_CONFIG from "../src/main/tools/forceWin/core/config.js";
import {
  OPTION_A_DEFAULTS,
  STARTER_COUNTS,
  computeTeamRaw,
  computeTeamFinal,
  buildRosterRatings,
  plainAverage
} from "../src/main/tools/forceWin/core/rosterRatings.js";
import { decideForceWin } from "../src/main/tools/forceWin/core/probabilityEngine.js";
import { availableTeamOptions, resolveTeamRowIds } from "../src/main/tools/forceWin/core/userTeams.js";
import { calculateCoachingScore } from "../src/main/tools/forceWin/core/contextualFactors.js";
import { americanMoneyline, calculateBettingLines } from "../src/main/tools/forceWin/core/bettingLines.js";
import { ReportService } from "../src/main/services/reports.js";
import { runForceWin } from "../src/main/tools/forceWin/runner.js";

// Independent reference translation of Balla's attached Option A v0.1.
const OFF = { QB: 3, HB: 1.5, FB: .5, WR: 2, TE: 1, LT: 1.5, LG: 1, C: 1, RG: 1, RT: 1.5 };
const DEF = { DT: 1.5, LE: 1.5, RE: 1.5, MLB: 1.5, LOLB: 1, ROLB: 1, CB: 1.5, FS: 1, SS: 1 };
const ST = { K: 1, P: 1 };
const GROUP = { QB: "qb", HB: "rb", FB: "rb", WR: "wr", TE: "te", LT: "ol", LG: "ol", C: "ol", RG: "ol", RT: "ol", DT: "dl", LE: "dl", RE: "dl", MLB: "lb", LOLB: "lb", ROLB: "lb", CB: "db", FS: "db", SS: "db" };
function referenceRaw(players) {
  const by = {};
  for (const player of players) (by[player.Position] ??= []).push(player.OverallRating);
  const scores = {};
  for (const [position, values] of Object.entries(by)) {
    const sorted = [...values].sort((a, b) => b - a), starter = plainAverage(sorted.slice(0, STARTER_COUNTS[position] || 1)), depth = plainAverage(sorted);
    let blended = .72 * starter + .28 * depth;
    if (starter - depth > 16) blended = Math.min(blended, depth + 16);
    scores[position] = { blended };
  }
  const roll = weights => { let sum = 0, total = 0; for (const [position, weight] of Object.entries(weights)) if (scores[position]) { sum += scores[position].blended * weight; total += weight; } return total ? sum / total : null; };
  return { groupScores: scores, off: roll(OFF), def: roll(DEF), st: roll(ST) };
}
function referenceFinal(raw, averages) {
  const gain = (value, average) => Math.max(0, Math.min(99, average + (value - average) * (value >= average ? 2.25 : 2.75)));
  const offRaw = gain(raw.off, averages.off), defRaw = gain(raw.def, averages.def), ratio = ((offRaw / raw.off) + (defRaw / raw.def)) / 2;
  const offense = Math.round(offRaw), defense = Math.round(defRaw), special = Math.round(Math.max(0, Math.min(99, raw.st * ratio)));
  const buckets = {};
  for (const [position, score] of Object.entries(raw.groupScores)) if (GROUP[position]) (buckets[GROUP[position]] ??= []).push(Math.round(score.blended));
  return { overall: Math.round(offense * .45 + defense * .45 + special * .10), offense, defense, finalSpecialTeams: special, units: Object.fromEntries(Object.entries(buckets).map(([key, values]) => [key, Math.round(plainAverage(values))])) };
}

const completeRoster = offset => Object.entries(STARTER_COUNTS).flatMap(([position, count], positionIndex) =>
  Array.from({ length: count + 2 }, (_, index) => ({ Position: position, OverallRating: 62 + offset + positionIndex % 8 - index * 3 }))
);

test("roster ratings match Balla Option A including independent gain, FB mapping, and raw units", () => {
  const first = completeRoster(8), second = completeRoster(-4);
  const raw = [first, second].map(players => computeTeamRaw(players, OPTION_A_DEFAULTS));
  const reference = [first, second].map(referenceRaw);
  const averages = { off: plainAverage(raw.map(item => item.off)), def: plainAverage(raw.map(item => item.def)) };
  const referenceAverages = { off: plainAverage(reference.map(item => item.off)), def: plainAverage(reference.map(item => item.def)) };
  assert.deepEqual(computeTeamFinal(raw[0], averages), referenceFinal(reference[0], referenceAverages));
  assert.deepEqual(computeTeamFinal(raw[1], averages), referenceFinal(reference[1], referenceAverages));
  assert.ok(Number.isFinite(computeTeamFinal(raw[0], averages).units.rb));
  assert.notEqual(computeTeamFinal(raw[0], averages).offense - Math.round(raw[0].off), computeTeamFinal(raw[0], averages).defense - Math.round(raw[0].def));
});

test("built-in FCS placeholders are excluded from the Option A FBS league averages", () => {
  const teamRecord = (name, teamIndex) => ({ DisplayName: name, TeamIndex: teamIndex, TEAM_TYPE: teamIndex === 255 ? "ProBowl" : "College" });
  const teams = { records: [teamRecord("Alpha", 1), teamRecord("Beta", 2), teamRecord("FCS East", 255)] };
  const records = [];
  for (const [teamIndex, offset, name] of [[1, 8, "A"], [2, -4, "B"], [255, 30, "F"]]) {
    completeRoster(offset).forEach((player, index) => records.push({ ...player, TeamIndex: teamIndex, FirstName: name, LastName: String(index) }));
  }
  const result = buildRosterRatings({ teamTable: teams, playerTable: { records } });
  assert.equal(result.has(2), false);
  assert.equal(result.get(0).leagueAverages.off, plainAverage([computeTeamRaw(completeRoster(8)).off, computeTeamRaw(completeRoster(-4)).off]));
});

test("Protect Favorites keeps eligibility separate from probability and protects away rivalry favorites", () => {
  assert.deepEqual(decideForceWin(2, () => 0, FORCE_WIN_CONFIG, "protect", { rivalry: false, favoriteSide: "home" }).reason, "Close matchup — not eligible");
  const medium = decideForceWin(6, () => .99, FORCE_WIN_CONFIG, "protect", { rivalry: false, favoriteSide: "home" });
  assert.equal(medium.selected, true); assert.equal(medium.automatic, false); assert.equal(medium.forced, false); assert.equal(medium.reason, "Probability roll failed");
  const high = decideForceWin(12, () => .99, FORCE_WIN_CONFIG, "protect", { rivalry: false, favoriteSide: "home" });
  assert.equal(high.forced, true); assert.equal(high.automatic, true); assert.equal(high.reason, "Favorite protected — force win assigned");
  const awayRivalry = decideForceWin(24, () => 0, FORCE_WIN_CONFIG, "protect", { rivalry: true, favoriteSide: "away" });
  assert.equal(awayRivalry.selected, false); assert.equal(awayRivalry.reason, "Away rivalry — protected from force win");
});

test("team choices retain full overlapping names and resolve only stable row identifiers", () => {
  const teamTable = { records: ["Michigan", "Michigan State", "Central Michigan", "Eastern Michigan", "Western Michigan"].map((DisplayName, TeamIndex) => ({ DisplayName, TeamIndex })) };
  const options = availableTeamOptions(teamTable);
  assert.deepEqual(options.map(option => option.label).sort(), ["Central Michigan", "Eastern Michigan", "Michigan", "Michigan State", "Western Michigan"]);
  assert.deepEqual([...resolveTeamRowIds(["0"], teamTable)], ["0"]);
  assert.throws(() => resolveTeamRowIds(["Michigan"], teamTable), /row Michigan was not found/);
});

test("coach continuity is neutral in year one, head-coach weighted, and capped", () => {
  const profile = seasons => ({ available: true, staff: {
    headCoach: { level: 0, archetype: "Invalid_", seasonsWithTeam: seasons[0] },
    offensiveCoordinator: { level: 0, archetype: "Invalid_", seasonsWithTeam: seasons[1] },
    defensiveCoordinator: { level: 0, archetype: "Invalid_", seasonsWithTeam: seasons[2] }
  } });
  assert.equal(calculateCoachingScore(profile([1, 1, 1])).continuityScore, 0);
  assert.ok(calculateCoachingScore(profile([3, 1, 1])).continuityScore > calculateCoachingScore(profile([1, 3, 1])).continuityScore);
  assert.ok(calculateCoachingScore(profile([99, 99, 99])).continuityScore <= FORCE_WIN_CONFIG.coaching.continuity.maximumBonus);
});

test("projected spread produces paired American moneylines and an over/under", () => {
  const team = (offense, defense) => ({ ratings: { offense, defense } });
  const lines = calculateBettingLines({
    homeTeam: team(84, 80),
    awayTeam: team(75, 72),
    favoriteSide: "home",
    disparity: 8
  });
  assert.equal(lines.favoriteSpread, -10);
  assert.ok(lines.total >= FORCE_WIN_CONFIG.bettingLines.minimumTotal);
  assert.ok(lines.favoriteMoneyline < -100);
  assert.ok(lines.underdogMoneyline > 100);
  assert.equal(lines.favoriteMoneyline, americanMoneyline(lines.favoriteWinProbability));
});

test("Force Win Apply uses the exact cached Preview plan without rerolling", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "force-option-a-"));
  const source = path.resolve("../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEWEEK0");
  const savePath = path.join(directory, "DYNASTY-FORCE-PLAN");
  fs.copyFileSync(source, savePath);
  const reports = new ReportService(path.join(directory, "reports"));
  const schemaPath = path.resolve("resources/engine-data/C27_486_6.gz");
  const preview = await runForceWin({
    savePath,
    schemaPath,
    reports,
    mode: "preview",
    options: { scope: "next", involvement: "protect", modelProfile: "balanced", seed: "cached-plan", skippedTeamIds: [] }
  });
  const applied = await runForceWin({ savePath, schemaPath, reports, mode: "apply", options: { planId: preview.planId } });
  assert.deepEqual(applied.details.changes, preview.details.changes);
  assert.deepEqual(applied.summary, preview.summary);
  assert.ok(fs.existsSync(applied.backupPath));
});
