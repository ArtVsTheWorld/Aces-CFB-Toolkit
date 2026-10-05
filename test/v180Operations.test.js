import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { enforceEquipmentCompatibility } from "../src/main/tools/equipment/core/compatibility.js";
import { canGenerateEquipment } from "../src/main/tools/equipment/core/generatedCompatibility.js";
import { applyGlobalEquipmentFixes, rollApprovedHelmet, rollFacemask, rollUnlockedMouthpiece, isBrandedMouthpiece } from "../src/main/tools/equipment/core/globalFixes.js";
import { equipmentItem, equipmentSemantics } from "../src/main/tools/equipment/catalog.js";
import { buildHelmetBalancePlan, helmetFamily } from "../src/main/tools/equipment/core/helmetBalance.js";
import { normalizeEquipmentOptions } from "../src/main/tools/equipment/runner.js";
import { patchFreshmanEquipment, mulberry32 } from "../src/main/tools/equipment/core/patcher.js";
import { patchTeamRatings } from "../src/main/tools/teamBoost/core.js";
import { planNilToggle } from "../src/main/tools/nilToggle/runner.js";
import { tools } from "../src/shared/toolRegistry.js";

const item = (slotType, itemAssetName) => ({ slotType, itemAssetName });
const field = elements => ({ loadoutType: "PlayerOnField", loadoutElements: elements });
const visual = elements => ({ isEmpty: false, RawData: JSON.stringify({ loadouts: [field(elements)] }) });
const ref = row => (10).toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
const player = (row, position = "WR", team = 1) => ({ FirstName: "Player", LastName: String(row), TeamIndex: team, Position: position, PlayerType: "Unknown", SchoolYear: "Freshman", RedshirtStatus: "Eligible", IsNIL: false, OverallRating: 70, SpeedRating: 80, AccelerationRating: 79, AgilityRating: 78, AwarenessRating: 77, ThrowPowerRating: 75, CharacterVisuals: ref(row) });
const get = (elements, slot) => elements.find(element => element.slotType === slot)?.itemAssetName;
const parsed = record => JSON.parse(record.RawData).loadouts[0].loadoutElements;
const undershirt = "GearArmSleeve_Undershirt_sleeveLongUnderarmor_normal_TeamColor", rolled = "GearArmSleeve_CompressionRolledUpShirt_TeamColor";
for (const sleeve of [undershirt, rolled]) for (const wrist of ["GearWrist_wristBandNormal_White", "GearWrist_wristTapedNormal_White", "GearWrist_wristBandCoach_White"]) test(`elbow-length sleeve compatibility: ${sleeve}/${wrist}`, () => {
  const elements = [item("LeftArmWear", sleeve), item("LeftElbowWear", "ElbowGear_elbowSweatband_White"), item("LeftWristWear", wrist), item("RightArmWear", sleeve), item("RightElbowWear", "ElbowGear_elbowSweatband_White"), item("RightWristWear", wrist)];
  const direct = structuredClone(elements); enforceEquipmentCompatibility(direct);
  const expectedWrist = sleeve === rolled && wrist.includes("Coach") ? "GearWrist_None" : wrist;
  for (const side of ["Left", "Right"]) { assert.equal(get(direct, side + "WristWear"), expectedWrist); assert.equal(get(direct, side + "ElbowWear"), "ElbowGear_None"); }
  const visuals = [visual(elements)]; applyGlobalEquipmentFixes([player(0)], visuals, 10, { sleeveCompatibilityFix: true }); assert.deepEqual(parsed(visuals[0]), direct);
  const recipients = [player(0), { ...player(1), SchoolYear: "Senior", OverallRating: 90 }], raw = [visual([]), visual(elements)];
  const result = patchFreshmanEquipment(recipients, raw, 10, { top: 1, seed: 50, apply: true, mixedChance: 0, crossMixedChance: 0 });
  assert.equal(result.changes.length, 1); assert.equal(get(parsed(raw[0]), "LeftWristWear"), expectedWrist); assert.equal(get(parsed(raw[0]), "LeftElbowWear"), "ElbowGear_None");
});
test("generation metadata blocks elbow/bicep additions but leaves the wrist free for both short sleeve styles", () => {
  for (const sleeve of [undershirt, rolled]) {
    assert.deepEqual(equipmentSemantics(sleeve).coverage, ["bicep", "elbow"]);
    const loadouts = [field([item("LeftArmWear", sleeve), item("InnerShirt", "Undershirt_None"), item("OuterShirt", "Gear_JerseyStyle_Normal")])];
    assert.equal(canGenerateEquipment(loadouts, equipmentItem("ElbowGear_RubberBands1"), ["LeftElbowWear"], "WR"), true);
    assert.equal(canGenerateEquipment(loadouts, equipmentItem("ElbowGear_elbowSweatband_White"), ["LeftElbowWear"], "WR"), false);
  }
});
for (const mode of ["distribution", "accessory"]) test(`tape colors follow ${mode} independently and deterministically`, () => {
  const visuals = [visual([item("LeftArmWear", "GearArmSleeve_Undershirt_armTape_normal_OffWhite"), item("LeftWristWear", "GearWrist_wristTapedNormal_White"), item("LeftSpat", "GearShoeSpats_White")])];
  const initial = structuredClone(visuals), options = { unlockedRecolorFix: true, unlockedColorTheme: "primary", tapeColorMode: mode, teamNames: new Map([[1, "Test Team"]]), teamTapeColors: { "test team": { white: 0, black: 100, primary: 0, secondary: 0 } }, seed: 121 };
  const result = applyGlobalEquipmentFixes([player(0)], visuals, 10, options), repeat = structuredClone(initial);
  applyGlobalEquipmentFixes([player(0)], repeat, 10, options); assert.deepEqual(visuals, repeat);
  assert.equal(result.unlockedRecolorChanges[0].tapeColor, mode === "accessory" ? "primary" : "black");
  assert.equal(get(parsed(visuals[0]), "LeftArmWear"), mode === "accessory" ? "GearArmSleeve_Undershirt_armTape_normal_TeamColor" : "GearArmSleeve_Undershirt_armTape_normal_Black");
});
for (const frequency of [0, 25, 75, 100]) test(`added and rerolled mouthpieces use the same ${frequency}% brand policy`, () => {
  for (const group of ["skill", "line"]) for (const colorful of [false, true]) {
    const rng = mulberry32(304), draws = Array.from({ length: 2000 }, () => rollUnlockedMouthpiece(group, rng, colorful, frequency));
    const count = draws.filter(draw => isBrandedMouthpiece(draw.item)).length;
    assert.ok(Math.abs(count / draws.length * 100 - frequency) < 4);
    if (!colorful) assert.ok(draws.every(draw => !/Pink|Purple|Light Blue|Neon/.test(draw.item.displayName)));
    const oldItem = frequency === 100 ? "GearMouthpiece_Mouthguard1_White" : "GearMouthpiece_PacifierDualHanging_White2";
    const players = [player(0), player(1, "LT"), player(2, "QB")], visuals = players.map(() => visual([item("MouthWear", oldItem)]));
    const beforeQB = visuals[2].RawData;
    const result = applyGlobalEquipmentFixes(players, visuals, 10, { unlockedMouthpieceFix: true, rerollExistingMouthpieces: true, brandedMouthpieceFrequency: frequency, allowRandomMouthpieceColors: colorful, seed: 123 });
    assert.equal(visuals[2].RawData, beforeQB); assert.equal(result.unlockedMouthpiecePlayersChanged, 0);
    for (const entry of result.existingMouthpieceColorChanges) { const actual = equipmentItem(entry.newItem); assert.ok(actual); if ([0, 100].includes(frequency)) assert.equal(isBrandedMouthpiece(actual), frequency === 100); }
    const additions = Array.from({ length: 60 }, (_, row) => player(row)), emptyVisuals = additions.map(() => visual([item("MouthWear", "GearMouthpiece_None")]));
    const added = applyGlobalEquipmentFixes(additions, emptyVisuals, 10, { unlockedMouthpieceFix: true, brandedMouthpieceFrequency: frequency, seed: 17 });
    assert.ok(added.unlockedMouthpieceChanges.length); assert.ok(added.unlockedMouthpieceChanges.length <= 51);
    if ([0, 100].includes(frequency)) assert.ok(added.unlockedMouthpieceChanges.every(change => isBrandedMouthpiece(equipmentItem(change.newItem)) === (frequency === 100)));
  }
});
test("mouthpiece rerolls preserve mask restrictions, NIL and player scope", () => {
  const players = [player(0), { ...player(1), IsNIL: true }, player(2)], visuals = players.map(() => visual([item("FaceWear", "FaceGear_BalaclavaOverNose_White"), item("MouthWear", "GearMouthpiece_Mouthguard1_White")])), before = structuredClone(visuals);
  const result = applyGlobalEquipmentFixes(players, visuals, 10, { unlockedMouthpieceFix: true, rerollExistingMouthpieces: true, brandedMouthpieceFrequency: 0, eligiblePlayer: record => record !== players[2] });
  assert.equal(result.existingMouthpieceColorsChanged, 1); assert.match(get(parsed(visuals[0]), "MouthWear"), /PacifierDualHanging/); assert.deepEqual(visuals.slice(1), before.slice(1));
});
test("Vicis opt-in preserves original draw boundaries when off and uses only standard Zero 2 when on", () => {
  assert.equal(rollApprovedHelmet(() => 0.69), "GearHelmet_Speed_Flex"); assert.equal(rollApprovedHelmet(() => 0.79), "GearHelmet_Axiom"); assert.equal(rollApprovedHelmet(() => 0.89), "GearHelmet_SchuttF7"); assert.equal(rollApprovedHelmet(() => 0.99), "GearHelmet_SchuttF7Pro");
  const counts = {}; for (let index = 0; index < 10000; index++) { const helmet = rollApprovedHelmet(() => (index + .5) / 10000, true, "QB"); counts[helmet] = (counts[helmet] ?? 0) + 1; for (const position of ["QB", "WR", "MLB"]) assert.ok(equipmentItem(rollFacemask(helmet, position, () => .5))); }
  assert.deepEqual(counts, { GearHelmet_Speed_Flex: 6800, GearHelmet_SchuttF7: 750, GearHelmet_SchuttF7Pro: 750, GearHelmet_Axiom: 1400, GearHelmet_VicisZero2: 300 });
});
for (const allowVicis of [false, true]) test(`helmet balancing is minimal, spread across teams and FCS-separated (Vicis ${allowVicis})`, () => {
  const entries = Array.from({ length: 200 }, (_, row) => ({ visualsRow: row, team: `Team ${row % 10}`, cohort: row < 100 ? "fbs" : "fcs", position: "QB", helmet: "GearHelmet_Speed_Flex" }));
  const { plans, diagnostics } = buildHelmetBalancePlan(entries, { allowVicis, seed: 18 });
  assert.deepEqual(buildHelmetBalancePlan(entries, { allowVicis, seed: 18 }), { plans, diagnostics });
  for (const cohort of [diagnostics.fbs, diagnostics.fcs]) {
    assert.equal(cohort.changes, allowVicis ? 32 : 30); assert.equal(Object.keys(cohort.changesByTeam).length, 10);
    assert.ok(Math.max(...Object.values(cohort.changesByTeam)) - Math.min(...Object.values(cohort.changesByTeam)) <= 1);
    for (const family of cohort.families) assert.equal(family.after, family.targetCount);
  }
  const balanced = entries.map(entry => ({ ...entry, helmet: plans.get(entry.visualsRow) ?? entry.helmet }));
  assert.equal(buildHelmetBalancePlan(balanced, { allowVicis, seed: 18 }).plans.size, 0);
  for (const count of [0, 1, 2, 7, 19]) {
    const small = entries.slice(0, count).map(entry => ({ ...entry, helmet: "Invalid" })), result = buildHelmetBalancePlan(small, { allowVicis });
    assert.equal(result.plans.size, count); assert.equal(result.diagnostics.fbs.families.reduce((sum, family) => sum + family.after, 0), count);
  }
});
test("helmet balancing integrates with the Patcher, masks, scope, OL protection and before/after diagnostics", () => {
  const players = Array.from({ length: 102 }, (_, row) => player(row, row === 100 ? "LT" : row % 5 === 0 ? "QB" : "WR", row % 10 + 1)); players[101].IsNIL = true;
  const original = players.map(() => visual([item("HeadWear", "GearHelmet_Speed_Flex"), item("FaceMask", "GearFaceMask_SpeedflexRobot")]));
  const unchanged = structuredClone(original), noBalance = applyGlobalEquipmentFixes(players, unchanged, 10, { helmetFix: true }); assert.equal(noBalance.helmetPlayersChanged, 0);
  for (const allowVicisZero2 of [false, true]) {
    const visuals = structuredClone(original), result = applyGlobalEquipmentFixes(players, visuals, 10, { helmetFix: true, balanceExistingHelmets: true, allowVicisZero2, seed: 5 });
    assert.equal(result.helmetBalance.fbs.eligiblePlayers, 100); assert.equal(result.helmetPlayersChanged, allowVicisZero2 ? 32 : 30); assert.deepEqual(visuals.slice(100), original.slice(100));
    for (const change of result.helmetChanges) assert.ok(equipmentItem(change.newFacemask));
  }
});
test("helmet balancing spreads FCS swaps by actual roster team even when TeamIndex is shared", () => {
  const players = Array.from({ length: 100 }, (_, row) => player(row, "WR", 255));
  const visuals = players.map(() => visual([item("HeadWear", "GearHelmet_Speed_Flex"), item("FaceMask", "GearFaceMask_SpeedflexRobot")]));
  const result = applyGlobalEquipmentFixes(players, visuals, 10, { helmetFix: true, balanceExistingHelmets: true, allowVicisZero2: true, fcsTeamIndexes: new Set([255]), teamNames: new Map([[255, "FCS West"]]), recolorTeamNames: new Map(players.map((_, row) => [row, `Roster ${row % 5}`])), seed: 12 });
  assert.equal(result.helmetBalance.fbs.eligiblePlayers, 0);
  assert.deepEqual(Object.values(result.helmetBalance.fcs.changesByTeam).sort(), [6, 6, 6, 6, 6]);
});
test("new equipment settings validate and migrate the former mouthpiece-color option", () => {
  const defaults = normalizeEquipmentOptions({}, false); assert.equal(defaults.allowVicisZero2, false); assert.equal(defaults.balanceExistingHelmets, false); assert.equal(defaults.tapeColorMode, "accessory"); assert.equal(defaults.brandedMouthpieceFrequency, 75); assert.equal(defaults.skipNilPlayers, true);
  assert.equal(normalizeEquipmentOptions({ unlockedMouthpieceFix: true, randomizeExistingMouthpieceColors: true }, false).rerollExistingMouthpieces, true);
  for (const value of [-1, 101, 1.5, ""]) assert.throws(() => normalizeEquipmentOptions({ brandedMouthpieceFrequency: value }, false), /whole percentage/);
  assert.throws(() => normalizeEquipmentOptions({ tapeColorMode: "unknown" }, false), /tape/);
});
test("NIL Toggle composes player/team/position/class/redshirt filters and includes unchanged matches", () => {
  const records = [player(0, "QB"), { ...player(1, "QB"), OverallRating: 80, IsNIL: true }, { ...player(2, "WR"), SchoolYear: "Sophomore", RedshirtStatus: "Previous" }, player(3, "WR", 2)], initial = structuredClone(records), teamNames = new Map([[1, "Alabama"], [2, "East Point"]]);
  const run = options => planNilToggle(records, { targetValue: true, ...options }, { teamNames });
  assert.equal(run({}).length, 4); assert.equal(run({}).filter(row => row.changed).length, 3);
  assert.deepEqual(run({ teams: ["Alabama"], positions: ["QB"] }).map(row => row.row), [0, 1]);
  assert.deepEqual(run({ classes: ["Sophomore"], redshirtStatuses: ["Previous"] }).map(row => row.row), [2]);
  assert.deepEqual(run({ positions: ["WR"] }).map(row => row.row), [2, 3]); assert.deepEqual(run({ playerRows: [1] }).map(row => row.row), [1]);
  assert.equal(run({ teams: ["Alabama"], playerRows: [3] }).length, 0); assert.deepEqual(records, initial);
  assert.throws(() => run({ targetValue: "false" }), /NIL =/); assert.throws(() => run({ positions: ["Invented"] }), /valid positions/);
});
for (const scope of ["all", "below-average", "above-average"]) test(`Team Boost ${scope} composes position subsets and specific attributes`, () => {
  const records = [player(0, "QB"), { ...player(1, "QB"), OverallRating: 90 }, player(2, "WR"), { ...player(3, "WR"), OverallRating: 90 }, player(4, "TE"), player(5, "CB", 2)];
  const initial = structuredClone(records), result = patchTeamRatings(records, { teamIndex: 1, playerScope: scope, positions: ["QB", "WR"], mode: "specific", attributes: ["SpeedRating", "AccelerationRating", "AgilityRating"], minimum: 2, maximum: 2, apply: true });
  const expected = scope === "all" ? [0, 1, 2, 3] : scope === "below-average" ? [0, 2] : [1, 3];
  assert.deepEqual(result.players.map(player => player.row), expected); assert.equal(result.ratingChanges.length, expected.length * 3);
  for (const [row, record] of records.entries()) for (const field of Object.keys(record)) if (!["SpeedRating", "AccelerationRating", "AgilityRating"].includes(field) || !expected.includes(row)) assert.equal(record[field], initial[row][field]);
  assert.ok(result.players.every(player => player.roomAverage === 80));
});
test("Team Boost specific attributes reject empty/unknown fields and retain rating bounds and no-write previews", () => {
  const records = [player(0)], initial = structuredClone(records);
  for (const attributes of [[], ["InventedRating"]]) assert.throws(() => patchTeamRatings(records, { teamIndex: 1, mode: "specific", attributes }), /supported attribute/);
  const result = patchTeamRatings(records, { teamIndex: 1, mode: "specific", attributes: ["SpeedRating", "SpeedRating"], minimum: 99, maximum: 99 });
  assert.equal(result.ratingChanges.length, 1); assert.equal(result.ratingChanges[0].newRating, 99); assert.deepEqual(records, initial);
});
test("release versions match the requested increments", () => {
  assert.equal(JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url))).version, "19.0.0");
  assert.equal(tools.find(tool => tool.id === "freshman-equipment").version, "5.1"); assert.equal(tools.find(tool => tool.id === "equipment-patcher").version, "5.5"); assert.equal(tools.find(tool => tool.id === "team-boost").version, "2.0");
});
