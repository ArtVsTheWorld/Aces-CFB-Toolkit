import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import FORCE_WIN_CONFIG from "../src/main/tools/forceWin/core/config.js";
import { applyGlobalEquipmentFixes, visorPopulationGroup } from "../src/main/tools/equipment/core/globalFixes.js";
import { normalizeEquipmentOptions } from "../src/main/tools/equipment/runner.js";
import { DEFAULT_DISTRIBUTION, patchDealbreakers } from "../src/main/tools/dealbreaker/core.js";
import { isDirectionalFcsTeam } from "../src/main/services/save.js";
import { patchTeamRatings, positionRoomAverages, weightsForPlayer } from "../src/main/tools/teamBoost/core.js";
import { completePlan, searchPlanRows, storePlan, takePlan } from "../src/main/tools/jersey/planStore.js";

const ref = (table, row) => table.toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
const raw = elements => JSON.stringify({ loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: elements }] });
const visual = elements => ({ isEmpty: false, RawData: raw(elements) });
const equipmentPlayer = (position, row, extra = {}) => ({ isEmpty: false, FirstName: `P${row}`, LastName: "Cap", Position: position, SchoolYear: "Sophomore", RedshirtStatus: "Eligible", CharacterBodyType: "Thin", CharacterVisuals: ref(10, row), IsNIL: false, TeamIndex: 1, OverallRating: 80, ...extra });
const hasVisor = record => !/GearVisor_None/.test(record.RawData);
const makeVisorPopulation = (position, total, equipped) => ({
  players: Array.from({ length: total }, (_, row) => equipmentPlayer(position, row)),
  visuals: Array.from({ length: total }, (_, row) => visual([{ slotType: "Visor", itemAssetName: row < equipped ? "GearVisor_visorDarkLight" : "GearVisor_None" }]))
});

function visorRun(position, total, equipped, seed) {
  const fixture = makeVisorPopulation(position, total, equipped);
  const result = applyGlobalEquipmentFixes(fixture.players, fixture.visuals, 10, { visorFix: true, seed, teamNames: new Map([[1, "Test"]]) });
  return { ...fixture, result, count: fixture.visuals.filter(hasVisor).length };
}

function seedThatAddsOne(position, total, equipped) {
  for (let seed = 0; seed < 10000; seed++) if (visorRun(position, total, equipped, seed).count > equipped) return seed;
  throw new Error("No deterministic visor-assignment seed found.");
}

const dealbreakerPlayer = (index, extra = {}) => ({ isEmpty: false, FirstName: `D${index}`, LastName: "Floor", TeamIndex: 1, Position: "WR", SchoolYear: "Sophomore", RedshirtStatus: "Eligible", Age: 20, OverallRating: 80, RecruitingDealbreaker: "ChampionshipContender", ...extra });
const distribution = none => ({ ...DEFAULT_DISTRIBUTION, Invalid: none, PlayingTime: DEFAULT_DISTRIBUTION.PlayingTime + DEFAULT_DISTRIBUTION.Invalid - none });

test("redshirt groups expose only True, Redshirt, and All Players semantics", () => {
  assert.deepEqual(normalizeEquipmentOptions({ seed: 1, redshirtGroup: "true" }, false).redshirtStatuses, ["Eligible", "Current"]);
  assert.deepEqual(normalizeEquipmentOptions({ seed: 1, redshirtGroup: "redshirt" }, false).redshirtStatuses, ["Previous"]);
  assert.deepEqual(normalizeEquipmentOptions({ seed: 1, redshirtGroup: "all" }, false).redshirtStatuses, []);
  assert.deepEqual(normalizeEquipmentOptions({ seed: 1 }, true).redshirtStatuses, ["Eligible", "Current"]);
  assert.deepEqual(normalizeEquipmentOptions({ seed: 1 }, false).redshirtStatuses, []);
});

test("Team Boost identifies directional FCS metadata and excludes its players and room averages", () => {
  assert.equal(isDirectionalFcsTeam({ TeamIndex: 255, AssetName: "FCSSE", DisplayName: "Renamed Generic" }), true);
  assert.equal(isDirectionalFcsTeam({ TeamIndex: 1, AssetName: "BAMA", DisplayName: "Alabama" }), false);
  const fbs = { TeamIndex: 1, Position: "QB", PlayerType: "QB_StrongArm", OverallRating: 80, FirstName: "FBS", LastName: "QB" };
  const fcs = { ...fbs, TeamIndex: 255, OverallRating: 99, FirstName: "FCS" };
  for (const record of [fbs, fcs]) for (const field of Object.keys(weightsForPlayer(record))) record[field] = 70;
  const averages = positionRoomAverages([fbs, fcs], new Set([1, 255]), new Set([255]));
  assert.equal(averages.has("255|QB"), false); assert.equal(averages.get("1|QB"), 80);
  const result = patchTeamRatings([fbs, fcs], { teamIndexes: [1, 255], excludedTeamIndexes: new Set([255]), minimum: 1, maximum: 1, mode: "all", seed: 2 });
  assert.deepEqual(new Set(result.players.map(item => item.record.TeamIndex)), new Set([1]));
});

test("QB visor cap handles below, exact, and above 20 percent without overshoot", () => {
  const seed = seedThatAddsOne("QB", 10, 1), below = visorRun("QB", 10, 1, seed);
  assert.equal(below.count, 2); assert.equal(below.result.populationSafeguards.visors.QB.ceilingCount, 2);
  const exact = visorRun("QB", 10, 2, seed), above = visorRun("QB", 10, 3, seed);
  assert.equal(exact.count, 2); assert.equal(above.count, 3); assert.equal(exact.result.visorPlayersChanged, 0); assert.equal(above.result.visorPlayersChanged, 0);
  assert.match(exact.visuals[0].RawData, /visorDarkLight/);
});

test("40 percent visor groups use localized position families, preserve gear, and remain seeded", () => {
  assert.equal(visorPopulationGroup("HB"), "HB"); assert.equal(visorPopulationGroup("FS"), "FS"); assert.equal(visorPopulationGroup("MLB"), "LB"); assert.equal(visorPopulationGroup("DT"), "DT");
  const seed = seedThatAddsOne("TE", 10, 3), first = visorRun("TE", 10, 3, seed), repeat = visorRun("TE", 10, 3, seed);
  assert.equal(first.count, 4); assert.deepEqual(first.visuals, repeat.visuals);
  assert.equal(visorRun("TE", 10, 4, seed).count, 4); assert.equal(visorRun("TE", 10, 5, seed).count, 5);
  assert.match(first.visuals[0].RawData, /visorDarkLight/);
});

function undershirtRun(total, noneCount) {
  const players = Array.from({ length: total }, (_, row) => equipmentPlayer("WR", row, { CharacterBodyType: "Standard" }));
  const visuals = Array.from({ length: total }, (_, row) => visual([{ slotType: "OuterShirt", itemAssetName: "Gear_JerseyStyle_RolledLow" }, { slotType: "InnerShirt", itemAssetName: row < noneCount ? "Undershirt_None" : "Gear_Undershirt_CompressionTCrewSleeveless" }]));
  const result = applyGlobalEquipmentFixes(players, visuals, 10, { rolledJerseyFix: true, undershirtColor: "white", seed: 9, teamNames: new Map([[1, "Test"]]) });
  return { result, none: visuals.filter(item => /Undershirt_None/.test(item.RawData)).length, visuals };
}

test("muscular and standard undershirt assignments retain a 5 percent None floor", () => {
  const above = undershirtRun(20, 2); assert.equal(above.none, 1); assert.equal(above.result.rolledJerseyPlayersChanged, 1); assert.equal(above.result.populationSafeguards.undershirts.limited, true);
  const exact = undershirtRun(20, 1); assert.equal(exact.none, 1); assert.equal(exact.result.rolledJerseyPlayersChanged, 0);
  const below = undershirtRun(100, 4); assert.equal(below.none, 4); assert.equal(below.result.rolledJerseyPlayersChanged, 0);
  assert.match(exact.visuals[1].RawData, /CompressionTCrew/);
});

test("Dealbreaker None floor handles above, equal, and below populations without touching valid values", () => {
  const run = noneCount => { const records = Array.from({ length: 20 }, (_, index) => dealbreakerPlayer(index, index < noneCount ? { RecruitingDealbreaker: "Invalid" } : {})); const result = patchDealbreakers(records, { teamNames: new Map([[1, "Test"]]), distribution: distribution(15), random: () => 0.99, apply: true }); return { records, result }; };
  const above = run(4); assert.equal(above.result.population.projectedNone, 3); assert.equal(above.result.changes.length, 1); assert.equal(above.result.population.floorLimited, true);
  const exact = run(3); assert.equal(exact.result.changes.length, 0); assert.equal(exact.result.population.projectedNone, 3);
  const below = run(2); assert.equal(below.result.changes.length, 0); assert.equal(below.result.population.projectedNone, 2);
  assert.equal(above.records[10].RecruitingDealbreaker, "ChampionshipContender");
});

test("Dealbreaker population excludes placeholders and invalid Playing Style cleanup may increase None", () => {
  const records = Array.from({ length: 20 }, (_, index) => dealbreakerPlayer(index, index < 3 ? { RecruitingDealbreaker: "Invalid" } : {}));
  records.unshift(dealbreakerPlayer("style", { Position: "QB", RecruitingDealbreaker: "PlayingStyle" }));
  records.push({ ...dealbreakerPlayer("omar", { FirstName: "Omar", LastName: "Omar", Position: "QB", RecruitingDealbreaker: "Invalid" }) });
  let call = 0; const random = () => call++ === 0 ? 0 : 0.99;
  const result = patchDealbreakers(records, { teamNames: new Map([[1, "Test"]]), distribution: distribution(15), fixInvalidPlayingStyle: true, random, apply: true });
  assert.equal(result.population.total, 21); assert.equal(records[0].RecruitingDealbreaker, "Invalid"); assert.ok(result.population.projectedNone >= result.population.noneFloorCount);
  assert.equal(records.at(-1).RecruitingDealbreaker, "Invalid");
});

test("completed plans remain searchable but cannot be applied twice", () => {
  const rows = Array.from({ length: 1501 }, (_, index) => ({ team: index === 1400 ? "Ohio State" : `Team ${index}`, player: `P${index}` }));
  const planId = storePlan({ previewRows: rows, result: { details: { changes: rows.slice(0, 1000) } } });
  completePlan(planId);
  assert.equal(searchPlanRows(planId, "Ohio State").changes[0].team, "Ohio State");
  assert.equal(searchPlanRows(planId, "").changes.length, 1000);
  assert.throws(() => takePlan(planId), /already been applied/);
});

test("v0.9.1 UI labels and full-result search controls are wired", () => {
  const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
  assert.match(renderer, />True<\/option>/); assert.match(renderer, />Redshirt<\/option>/); assert.match(renderer, />All Players<\/option>/);
  assert.doesNotMatch(renderer, /equipment-redshirts/); assert.match(renderer, /Playing Style \(RB, WR, TE only\)/);
  assert.match(renderer, /#force-result-filter,#long-snap-result-filter/); assert.equal(FORCE_WIN_CONFIG.fcs.disparityMultiplier, 2.5);
});
