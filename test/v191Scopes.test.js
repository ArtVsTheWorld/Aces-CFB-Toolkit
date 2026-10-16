import test from "node:test";
import assert from "node:assert/strict";
import { processSchedule, gameInvolvesUserTeam, applyAssignments } from "../src/main/tools/forceWin/core/scheduleProcessor.js";
import { userControlledTeamIds } from "../src/main/tools/forceWin/runner.js";
import { FORCE_WIN_SCHEMA } from "../src/main/tools/forceWin/core/schema.js";
import { buildCsvReport } from "../src/main/tools/forceWin/core/logger.js";
import { createRandom } from "../src/main/tools/forceWin/core/probabilityEngine.js";
import { customModelPresets } from "../src/main/tools/forceWin/core/modelProfiles.js";
import { parseCsv } from "../src/main/services/reportAudit.js";
import { HELMET_MODELS, DEFAULT_HELMET_WEIGHTS, normalizeFacemaskPools, facemaskPoolForPosition, facemaskAllowedForPositions, rollCompatibleFacemask } from "../src/main/tools/equipment/core/helmets.js";
import { applyGlobalEquipmentFixes } from "../src/main/tools/equipment/core/globalFixes.js";
import { normalizeEquipmentOptions } from "../src/main/tools/equipment/runner.js";

const ref = (row, table = 20) => table.toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
const ratingKeys = ["overall", "offense", "defense", "qb", "wr", "te", "rb", "ol", "dl", "lb", "db", "st"];
const team = (rating, row, user = false) => ({ DisplayName: "Team " + row, TeamIndex: 100 + row, TEAM_TYPE: "College", UserCharacter: user ? ref(row + 1, 21) : "0".repeat(32), ...Object.fromEntries(ratingKeys.map(key => [FORCE_WIN_SCHEMA.team[key], rating])) });
const teams = () => ({ header: { tableId: 20 }, records: [team(95, 0, true), team(75, 1), team(65, 2), team(55, 3, true)] });
const game = (week, home = 0, away = 1, extra = {}) => ({ SeasonYear: 0, SeasonWeek: week, SeasonWeekType: "RegularSeason", GameStatus: "Unplayed", HomeScore: 0, AwayScore: 0, ForceWin: "None", HomeTeam: ref(home), AwayTeam: ref(away), BowlGame: false, ...extra });
const context = { currentSeasonRecord: 0, currentWeek: 1, conferenceChampionshipWeek: 15 };
const evaluate = (records, extra = {}) => processSchedule({ records, teamTable: teams(), context, userScheduleOnly: true, userControlledTeamIds: ["0"], involvement: "maximum", random: () => 0, ...extra });

test("user schedule evaluates both sides, ignores opponent CPU games, and only applies ForceWin", () => {
  const records = [game(2), game(2, 1, 2), game(3, 2, 0), game(3, 1, 3), game(1), game(0), game(15)];
  const before = structuredClone(records), result = evaluate(records);
  assert.deepEqual(result.results.map(row => row.index), [0, 2]);
  assert.equal(result.summary.gamesFound, 2); assert.equal(result.summary.cpuGamesIgnored, 2);
  assert.equal(result.changes.length, 2); assert.deepEqual(records, before);
  applyAssignments(result.changes);
  records.forEach((record, index) => {
    for (const field of Object.keys(record).filter(field => field !== "ForceWin")) assert.equal(record[field], before[index][field]);
    if (![0, 2].includes(index)) assert.equal(record.ForceWin, before[index].ForceWin);
  });
});
test("multiple user teams and user-vs-user games are included once using runtime rows, not TeamIndex", () => {
  const table = teams(), ids = userControlledTeamIds(table.records);
  assert.deepEqual(ids, ["0", "3"]);
  const records = [game(2), game(2, 2, 3), game(2, 0, 3), game(2, 1, 2)];
  assert.deepEqual(evaluate(records, { userControlledTeamIds: ids }).results.map(row => row.index), [0, 1, 2]);
  assert.equal(gameInvolvesUserTeam(game(2, 1, 2, { HomeTeam: ref(0, 22) }), table, new Set(["0"])), false);
  assert.equal(gameInvolvesUserTeam(game(2, 1, 2, { HomeTeam: "x".repeat(32) }), table, new Set(["0"])), false);
});
test("next user-schedule week skips byes and completed games; specific weeks do not fall back", () => {
  const records = [game(2, 1, 2), game(2, 0, 1, { GameStatus: "Played" }), game(3, 2, 0), game(4)];
  const next = evaluate(records, { scope: "next" });
  assert.equal(next.actionableWeek, 3); assert.deepEqual(next.results.map(row => row.index), [2]);
  assert.equal(evaluate(records, { scope: "week", specificWeek: 2 }).changes.length, 0);
  assert.equal(evaluate([game(2, 1, 2)], { scope: "next" }).actionableWeek, null);
  assert.equal(evaluate(records, { scope: "week", specificWeek: 1 }).results.length, 0);
});
test("user-only scope preserves existing assignments and explicit exclusions, including FCS override", () => {
  const records = [game(2, 0, 1, { ForceWin: "Away" }), game(2, 0, 2), game(2, 1, 3)];
  const result = evaluate(records, { forceAllFcs: true, skippedTeamIds: new Set(["2"]) });
  assert.equal(result.changes.length, 0); assert.equal(result.results.length, 2);
  assert.match(result.results[0].reason, /Already forced/); assert.match(result.results[1].reason, /user-selected/);
  assert.equal(evaluate([game(2)], { skippedTeamIds: new Set(["0"]) }).changes.length, 0);
  assert.equal(evaluate([game(2)], { skippedTeamNames: new Set(["Team 1"]) }).changes.length, 0);
});
test("user-only mode rejects missing user teams and ignores CPU games without consuming seeded draws", () => {
  assert.throws(() => evaluate([game(2)], { userControlledTeamIds: [] }), /user-controlled team/);
  assert.throws(() => evaluate([game(2)], { userControlledTeamIds: [9999] }), /user-controlled team/);
  const records = [game(2, 1, 2), game(2), game(3, 1, 2), game(3, 2, 0)];
  let rolls = 0;
  evaluate(records, { involvement: "high", random: () => { rolls++; return .1; } });
  assert.equal(rolls, 2);
  const a = evaluate(records, { involvement: "high", random: createRandom(191) });
  const b = evaluate(records.filter(row => gameInvolvesUserTeam(row, teams(), new Set(["0"]))), { involvement: "high", random: createRandom(191) });
  assert.deepEqual(a.results.map(row => row.decision), b.results.map(row => row.decision));
  const old = processSchedule({ records, teamTable: teams(), context, random: () => 0, involvement: "maximum" });
  assert.equal(old.results.length, 4);
});
test("custom weekly cap and CSV diagnostics are scoped to the user schedule", () => {
  const customModel = customModelPresets().balanced; customModel.maxForceWinsPerWeek = 1;
  const result = evaluate([game(2, 1, 2), game(2), game(2, 2, 0)], { modelProfile: "custom", customModel });
  assert.equal(result.changes.length, 1); assert.equal(result.summary.gamesFound, 2);
  const csv = parseCsv(buildCsvReport(result, { userControlledTeams: ["Team 0"], customModel }));
  assert.equal(csv[1][csv[0].indexOf("UserScheduleOnly")], "true");
  assert.equal(csv[1][csv[0].indexOf("UserControlledTeams")], "Team 0");
  const ignored = csv.find(row => row[csv[0].indexOf("SummaryMetric")] === "cpuGamesIgnored");
  assert.equal(ignored[csv[0].indexOf("SummaryValue")], "1");
});

const model = HELMET_MODELS.find(model => model.id === "GearHelmet_Speed_Flex"), [maskA, maskB] = model.defaultMasks;
const custom = { mode: "custom", global: { ...DEFAULT_HELMET_WEIGHTS, GearHelmet_Speed_Flex: 100, GearHelmet_Axiom: 0, GearHelmet_SchuttF7: 0, GearHelmet_SchuttF7Pro: 0 }, positions: {} };
const player = (row, position, visualRow = row) => ({ FirstName: "Test", LastName: String(row), Position: position, TeamIndex: 1, IsNIL: false, CharacterVisuals: ref(visualRow, 10), SchoolYear: "Freshman", CharacterBodyType: "Standard" });
const visual = mask => ({ isEmpty: false, RawData: JSON.stringify({ loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: [{ slotType: "HeadWear", itemAssetName: model.id }, { slotType: "FaceMask", itemAssetName: mask }, { slotType: "LeftShoe", itemAssetName: "UntouchedShoe" }] }] }) });
const maskOf = row => JSON.parse(row.RawData).loadouts[0].loadoutElements.find(element => element.slotType === "FaceMask").itemAssetName;

test("position facemask pools inherit per helmet and preserve legacy global pools", () => {
  const old = normalizeFacemaskPools({ [model.id]: [maskA] });
  assert.equal(old.global, undefined); assert.deepEqual(facemaskPoolForPosition(model.id, "WR", old), [maskA]);
  const pools = normalizeFacemaskPools({ global: old, positions: { QB: { [model.id]: [maskB] }, SAM: { [model.id]: [maskB] } } });
  assert.deepEqual(facemaskPoolForPosition(model.id, "QB", pools), [maskB]);
  assert.deepEqual(facemaskPoolForPosition(model.id, "WILL", pools), [maskB]);
  assert.deepEqual(facemaskPoolForPosition(model.id, "WR", pools), [maskA]);
  const axiom = HELMET_MODELS.find(model => model.id === "GearHelmet_Axiom");
  assert.deepEqual(facemaskPoolForPosition(axiom.id, "QB", pools), axiom.defaultMasks);
  assert.deepEqual(normalizeFacemaskPools(pools), pools);
  assert.deepEqual(normalizeEquipmentOptions({ helmetFix: true, facemaskPools: pools }, false).facemaskPools, pools);
});
test("position facemask validation rejects empty, incompatible, unknown, and ambiguous settings", () => {
  for (const positions of [{ QB: { [model.id]: [] } }, { QB: { [model.id]: ["not-a-mask"] } }, { Unknown: {} }, { LB: { UnknownHelmet: [maskA] } }, { SAM: { [model.id]: [maskA] }, WILL: { [model.id]: [maskB] } }]) assert.throws(() => normalizeFacemaskPools({ global: {}, positions }));
  assert.throws(() => normalizeFacemaskPools({ global: {}, positions: [] }), /position settings/);
  assert.throws(() => normalizeFacemaskPools({ global: [], positions: {} }), /Invalid/);
  const optional = model.masks.find(mask => !model.defaultMasks.includes(mask));
  assert.ok(optional);
  assert.equal(rollCompatibleFacemask(model.id, "QB", () => 0, normalizeFacemaskPools({ global: {}, positions: { QB: { [model.id]: [optional] } } })), optional);
});
test("Repair Only changes excluded masks by position without replacing an allowed helmet or other gear", () => {
  const records = [player(0, "QB"), player(1, "WR"), player(2, "SAM"), player(3, "WILL")];
  const pools = { global: { [model.id]: [maskA] }, positions: { QB: { [model.id]: [maskB] }, LB: { [model.id]: [maskB] } } };
  const run = () => { const rows = records.map(() => visual(maskA)); const result = applyGlobalEquipmentFixes(records, rows, 10, { helmetFix: true, helmetDistribution: custom, facemaskPools: pools, seed: 191 }); return { rows, result }; };
  const { rows, result } = run();
  assert.deepEqual(rows.map(maskOf), [maskB, maskA, maskB, maskB]);
  assert.deepEqual(result.helmetChanges.map(row => row.row), [0, 2, 3]);
  assert.ok(result.helmetChanges.every(row => row.oldFacemask === maskA && row.newHelmet === model.id));
  assert.ok(rows.every(row => row.RawData.includes("UntouchedShoe")));
  assert.deepEqual(run(), run());
  const balancedRows = records.map(() => visual(maskA));
  applyGlobalEquipmentFixes(records, balancedRows, 10, { helmetFix: true, helmetDistribution: custom, facemaskPools: pools, balanceExistingHelmets: true, seed: 191 });
  assert.deepEqual(balancedRows.map(maskOf), rows.map(maskOf));
});
test("shared equipment chooses mask intersection across groups and rejects incompatible shared pools before write", () => {
  const pools = normalizeFacemaskPools({ global: {}, positions: { QB: { [model.id]: [maskA, maskB] }, WR: { [model.id]: [maskB] } } });
  assert.equal(rollCompatibleFacemask(model.id, ["QB", "WR"], () => 0, pools), maskB);
  assert.equal(facemaskAllowedForPositions(maskA, model.id, ["QB", "WR"], pools), false);
  const rows = [visual(maskA)], players = [player(0, "QB", 0), player(1, "WR", 0)];
  applyGlobalEquipmentFixes(players, rows, 10, { helmetFix: true, helmetDistribution: custom, facemaskPools: pools });
  assert.equal(maskOf(rows[0]), maskB);
  const disjoint = { global: {}, positions: { QB: { [model.id]: [maskA] }, WR: { [model.id]: [maskB] } } };
  const original = [visual(maskA)], before = structuredClone(original);
  assert.throws(() => applyGlobalEquipmentFixes(players, original, 10, { helmetFix: true, helmetDistribution: custom, facemaskPools: disjoint }), /every linked player's position group/);
  assert.deepEqual(original, before);
});
