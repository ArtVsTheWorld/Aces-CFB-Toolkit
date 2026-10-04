import test from "node:test";
import assert from "node:assert/strict";
import { applyGlobalEquipmentFixes, isApprovedHelmetForPosition, OAKLEY_CLEAR_VISOR, visorChanceForPosition } from "../src/main/tools/equipment/core/globalFixes.js";
import { getCrossDonorPositions, MOUTHGUARD_COLOR_WEIGHTS, patchFreshmanEquipment, rollEquipmentMode } from "../src/main/tools/equipment/core/patcher.js";
import { patchTeamRatings } from "../src/main/tools/teamBoost/core.js";
import { PHYSICAL_RATING_FIELDS } from "../src/main/tools/teamBoost/ratingWeights.js";

const ref = (table, row) => table.toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
const raw = elements => JSON.stringify({ loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: elements }] });
const visual = elements => ({ isEmpty: false, RawData: raw(elements) });
const player = (Position, row, extra = {}) => ({ isEmpty: false, FirstName: `P${row}`, LastName: "Test", Position, SchoolYear: "Freshman", RedshirtStatus: "Eligible", CharacterBodyType: "Thin", CharacterVisuals: ref(10, row), IsNIL: false, TeamIndex: 1, OverallRating: 80, JerseyNum: row, ...extra });

test("non-OL helmet correction includes every requested group and excludes offensive line", () => {
  const positions = ["TE", "MLB", "DT", "QB", "HB", "WR", "CB", "LT"];
  const players = positions.map((position, row) => player(position, row));
  const visuals = positions.map(() => visual([{ slotType: "HeadWear", itemAssetName: "GearHelmet_VicisZero2" }, { slotType: "FaceMask", itemAssetName: "OldMask" }]));
  const result = applyGlobalEquipmentFixes(players, visuals, 10, { helmetFix: true, seed: 77, teamNames: new Map([[1, "Test"]]) });
  assert.deepEqual(new Set(result.helmetChanges.map(change => change.position)), new Set(positions.slice(0, -1)));
  assert.equal(JSON.parse(visuals.at(-1).RawData).loadouts[0].loadoutElements[0].itemAssetName, "GearHelmet_VicisZero2");
  assert.equal(isApprovedHelmetForPosition("GearHelmet_VicisZero2", "TE"), false);
  assert.equal(isApprovedHelmetForPosition("GearHelmet_VicisZero2", "MLB"), false);
  assert.equal(isApprovedHelmetForPosition("GearHelmet_VicisZero2", "LT"), true);
});

test("visor pass exposes exact eligibility and Oakley Clear stored value", () => {
  for (const position of ["FS", "SS", "MLB", "TE", "HB"]) assert.equal(visorChanceForPosition(position), 0.40);
  for (const position of ["WR", "CB"]) assert.equal(visorChanceForPosition(position), 0.60);
  assert.equal(visorChanceForPosition("DT"), 0.20);
  assert.equal(visorChanceForPosition("QB"), 0.20); assert.equal(visorChanceForPosition("LT"), 0); assert.equal(visorChanceForPosition("K"), 0);
  assert.equal(OAKLEY_CLEAR_VISOR, "GearVisor_visorOakley_clear");
  const players = [player("WR", 0), player("QB", 1), player("LT", 2), player("WR", 3)];
  const visuals = [visual([{ slotType: "Visor", itemAssetName: "GearVisor_None" }]), visual([{ slotType: "Visor", itemAssetName: "GearVisor_None" }]), visual([{ slotType: "Visor", itemAssetName: "GearVisor_None" }]), visual([{ slotType: "Visor", itemAssetName: "GearVisor_visorDarkLight" }])];
  const first = structuredClone(visuals), second = structuredClone(visuals);
  applyGlobalEquipmentFixes(players, first, 10, { visorFix: true, seed: 1 }); applyGlobalEquipmentFixes(players, second, 10, { visorFix: true, seed: 1 });
  assert.deepEqual(first, second); assert.match(first[3].RawData, /GearVisor_visorDarkLight/); assert.doesNotMatch(first[2].RawData, /Oakley/);
});

test("Equipment Randomizer retains full, mixed, and cross-position donor paths", () => {
  assert.equal(rollEquipmentMode(() => 0.90, true), "full"); assert.equal(rollEquipmentMode(() => 0.20, true), "mixed"); assert.equal(rollEquipmentMode(() => 0.05, true), "cross");
  assert.ok(getCrossDonorPositions("WR").includes("CB"));
  assert.deepEqual(MOUTHGUARD_COLOR_WEIGHTS, ["Black", "White", "Primary", "Secondary"]);
  const players = [player("WR", 0), player("WR", 1, { SchoolYear: "Senior", RedshirtStatus: "Previous", OverallRating: 95 }), player("CB", 2, { SchoolYear: "Senior", RedshirtStatus: "Previous", OverallRating: 94 })];
  const visuals = [visual([{ slotType: "MouthWear", itemAssetName: "GearMouthpiece_White" }]), visual([{ slotType: "MouthWear", itemAssetName: "GearMouthpiece_Black" }]), visual([{ slotType: "MouthWear", itemAssetName: "GearMouthpiece_Black" }])];
  const run = options => patchFreshmanEquipment(structuredClone(players), structuredClone(visuals), 10, { seed: 9, ...options }).changes[0];
  assert.equal(run({ mixedChance: 0, crossMixedChance: 0 }).mixed, false);
  assert.equal(run({ mixedChance: 1, crossMixedChance: 0 }).mixed, true);
  const cross = run({ mixedChance: 0, crossMixedChance: 1 }); assert.equal(cross.crossPositionMixed, true); assert.ok(cross.donorUses.some(use => use.donor.position === "CB"));
});

test("mouthguard randomization reaches black, white, verified team primary, and verified team secondary reproducibly", () => {
  const players = [player("WR", 0), player("WR", 1, { SchoolYear: "Senior", RedshirtStatus: "Previous", OverallRating: 95 })], visuals = [visual([{ slotType: "MouthWear", itemAssetName: "GearMouthpiece_White" }]), visual([{ slotType: "MouthWear", itemAssetName: "GearMouthpiece_Black" }])];
  const colors = new Set();
  for (let seed = 0; seed < 80; seed++) { const copies = structuredClone(visuals); const result = patchFreshmanEquipment(structuredClone(players), copies, 10, { seed, apply: true }); assert.equal(result.changes.length, 1); const asset = JSON.parse(copies[0].RawData).loadouts[0].loadoutElements.find(item => item.slotType === "MouthWear").itemAssetName; colors.add(asset.split("_").at(-1)); const repeat = structuredClone(visuals); patchFreshmanEquipment(structuredClone(players), repeat, 10, { seed, apply: true }); assert.deepEqual(repeat, copies); }
  assert.deepEqual(colors, new Set(["Black", "White", "TeamColor", "SecondaryColor"]));
});

test("Equipment Randomizer custom eligibility can target a non-freshman while its core default remains true freshmen", () => {
  const players = [player("WR", 0, { SchoolYear: "Junior", RedshirtStatus: "Previous" }), player("WR", 1, { SchoolYear: "Senior", RedshirtStatus: "Previous", OverallRating: 95 })];
  const visuals = [visual([{ slotType: "MouthWear", itemAssetName: "GearMouthpiece_White" }]), visual([{ slotType: "MouthWear", itemAssetName: "GearMouthpiece_Black" }])];
  assert.equal(patchFreshmanEquipment(structuredClone(players), structuredClone(visuals), 10, { seed: 3 }).changes.length, 0);
  const changed = patchFreshmanEquipment(players, visuals, 10, { seed: 3, top: 1, eligiblePlayer: record => record === players[0] }).changes;
  assert.equal(changed.length, 1);
});

const quarterback = teamIndex => ({ isEmpty: false, TeamIndex: teamIndex, Position: "QB", PlayerType: "QB_StrongArm", FirstName: `QB${teamIndex}`, LastName: "Test", OverallRating: 80, AccelerationRating: 70, AgilityRating: 70, AwarenessRating: 70, BCVisionRating: 70, BreakSackRating: 70, BreakTackleRating: 70, CarryingRating: 70, ChangeOfDirectionRating: 70, JukeMoveRating: 70, PlayActionRating: 70, SpeedRating: 70, SpinMoveRating: 70, StiffArmRating: 70, ThrowAccuracyDeepRating: 70, ThrowAccuracyMidRating: 70, ThrowAccuracyShortRating: 70, ThrowOnTheRunRating: 70, ThrowPowerRating: 70, ThrowUnderPressureRating: 70, ToughnessRating: 70, TruckingRating: 70 });

test("Team Boost supports coherent multi-team selection and treats Throw Power as physical", () => {
  assert.equal(PHYSICAL_RATING_FIELDS.has("ThrowPowerRating"), true);
  const physical = patchTeamRatings([quarterback(1), quarterback(2), quarterback(3)], { teamIndexes: [1, 2], minimum: 1, maximum: 1, mode: "physical", seed: 4 });
  assert.deepEqual(new Set(physical.players.map(item => item.record.TeamIndex)), new Set([1, 2]));
  assert.ok(physical.ratingChanges.some(change => change.field === "ThrowPowerRating"));
  const nonphysical = patchTeamRatings([quarterback(1)], { teamIndex: 1, minimum: 1, maximum: 1, mode: "nonphysical", seed: 4 });
  assert.equal(nonphysical.ratingChanges.some(change => change.field === "ThrowPowerRating"), false);
});
