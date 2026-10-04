import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { enforceEquipmentCompatibility, isWristElbowIncompatibleArmSleeve, LONG_SLEEVE_UNDERSHIRTS } from "../src/main/tools/equipment/core/compatibility.js";
import { recolorEquipmentItem } from "../src/main/tools/equipment/catalog.js";
import { applyGlobalEquipmentFixes } from "../src/main/tools/equipment/core/globalFixes.js";

const slots = elements => new Map(elements.map(element => [element.slotType, element.itemAssetName]));
const ref = (table, row) => table.toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");

test("arm compatibility covers full families while preserving quarter sleeves and arm tape", () => {
  assert.equal(isWristElbowIncompatibleArmSleeve("GearArmSleeve_Baggy_Black"), true);
  assert.equal(isWristElbowIncompatibleArmSleeve("GearArmSleeve_CompressionRolledUpShirt_White"), false);
  assert.equal(isWristElbowIncompatibleArmSleeve("GearArmSleeve_Undershirt_sleeveLongUnderarmor_normal_TeamColor"), false);
  assert.equal(isWristElbowIncompatibleArmSleeve("GearArmSleeve_Quarter_armTape_normal_Black"), false);
  const elements = [{ slotType: "LeftArmWear", itemAssetName: "GearArmSleeve_Baggy_Black" }, { slotType: "LeftWristWear", itemAssetName: "GearWrist_Tape" }, { slotType: "LeftElbowWear", itemAssetName: "ElbowGear_Pad" }, { slotType: "RightArmWear", itemAssetName: "GearArmSleeve_Quarter_armTape_normal_Black" }, { slotType: "RightWristWear", itemAssetName: "GearWrist_Tape" }, { slotType: "RightElbowWear", itemAssetName: "ElbowGear_Pad" }];
  enforceEquipmentCompatibility(elements); const result = slots(elements);
  assert.equal(result.get("LeftWristWear"), "GearWrist_None"); assert.equal(result.get("LeftElbowWear"), "ElbowGear_None");
  assert.equal(result.get("RightWristWear"), "GearWrist_Tape"); assert.equal(result.get("RightElbowWear"), "ElbowGear_Pad");
});

test("only the verified long-sleeve torso undershirt family conflicts with wrist and elbow gear", () => {
  assert.deepEqual([...LONG_SLEEVE_UNDERSHIRTS], ["G_CompressionT_Crew_LongSleeve_NikeHQ_B_GLD", "G_CompressionT_Crew_LongSleeve_NikeHQ_B_GRE", "G_CompressionT_Crew_LongSleeve_NikeHQ_B_BEI", "G_CompressionT_Crew_LongSleeve_NikeHQ_B_NAV"]);
  const short = [{ slotType: "InnerShirt", itemAssetName: "G_CompressionT_Crew_ShortSleeve_Basic_PRI" }, { slotType: "LeftWristWear", itemAssetName: "GearWrist_Tape" }, { slotType: "LeftElbowWear", itemAssetName: "ElbowGear_Pad" }];
  assert.equal(enforceEquipmentCompatibility(short).length, 0);
  const long = [{ slotType: "InnerShirt", itemAssetName: "G_CompressionT_Crew_LongSleeve_NikeHQ_B_GRE" }, { slotType: "LeftWristWear", itemAssetName: "GearWrist_Tape" }, { slotType: "LeftElbowWear", itemAssetName: "ElbowGear_Pad" }];
  assert.equal(enforceEquipmentCompatibility(long).length, 1); assert.equal(slots(long).get("LeftWristWear"), "GearWrist_None");
});

test("ski masks and balaclavas retain only hanging mouthpieces", () => {
  const incompatible = [{ slotType: "Neckpad", itemAssetName: "GearNeckpad_SkiBlack" }, { slotType: "MouthWear", itemAssetName: "GearMouthpiece_PacifierDual_Black" }];
  assert.equal(enforceEquipmentCompatibility(incompatible)[0].kind, "mask-mouthpiece"); assert.equal(slots(incompatible).get("MouthWear"), "GearMouthpiece_None");
  const valid = [{ slotType: "Neckpad", itemAssetName: "GearNeckpad_Balaclava_White" }, { slotType: "MouthWear", itemAssetName: "GearMouthpiece_PacifierDualHanging_TeamColor2" }];
  assert.equal(enforceEquipmentCompatibility(valid).length, 0); assert.match(slots(valid).get("MouthWear"), /Hanging/);
});

test("Patcher mouthpiece assignment never creates a mask plus non-hanging mouthpiece", () => {
  const players = [], visuals = [];
  for (let row = 0; row < 10; row++) {
    players.push({ isEmpty: false, FirstName: `M${row}`, LastName: "Masked", Position: "WR", SchoolYear: "Senior", RedshirtStatus: "Previous", CharacterBodyType: "Thin", CharacterVisuals: ref(10, row), IsNIL: false, TeamIndex: 1, OverallRating: 80, JerseyNum: row });
    visuals.push({ isEmpty: false, RawData: JSON.stringify({ loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: [{ slotType: "Neckpad", itemAssetName: "GearNeckpad_SkiBlack" }, { slotType: "MouthWear", itemAssetName: "GearMouthpiece_None" }] }] }) });
  }
  const result = applyGlobalEquipmentFixes(players, visuals, 10, { unlockedMouthpieceFix: true, seed: 3, teamNames: new Map([[1, "Test"]]) });
  assert.ok(result.unlockedMouthpiecePlayersChanged > 0);
  assert.ok(result.unlockedMouthpieceChanges.every(change => /PacifierDualHanging/.test(change.newItem)));
});

test("all verified CFB 27 Unlocked undershirt color families recolor exactly", () => {
  assert.equal(recolorEquipmentItem("G_CompressionT_Crew_ShortSleeve_Basic_WHI", "primary"), "G_CompressionT_Crew_ShortSleeve_Basic_PRI");
  assert.equal(recolorEquipmentItem("G_CompressionT_Crew_LongSleeve_99Club_B_GOL", "black"), "G_CompressionT_Crew_ShortSleeve_99Club_B_WHI");
  assert.equal(recolorEquipmentItem("G_CompressionT_Crew_LongSleeve_NikeHQ_B_NAV", "white"), "G_CompressionT_Crew_LongSleeve_NikeHQ_B_GLD");
  assert.equal(recolorEquipmentItem("Gear_Undershirt_CompressionTCrewSleeveless_Black", "secondary"), "Gear_Undershirt_CompressionTCrewSleeveless_Secondary");
});

test("visor correction applies independent FBS and directional-FCS ceilings", () => {
  const players = [], visuals = [];
  for (let row = 0; row < 20; row++) {
    const isFcs = row >= 10, equipped = !isFcs && row < 6;
    players.push({ isEmpty: false, FirstName: `P${row}`, LastName: "Population", Position: "WR", SchoolYear: "Senior", RedshirtStatus: "Previous", CharacterBodyType: "Thin", CharacterVisuals: ref(10, row), IsNIL: false, TeamIndex: isFcs ? 200 : 1, OverallRating: 80, JerseyNum: row });
    visuals.push({ isEmpty: false, RawData: JSON.stringify({ loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: [{ slotType: "Visor", itemAssetName: equipped ? "GearVisor_visorDarkLight" : "GearVisor_None" }] }] }) });
  }
  const result = applyGlobalEquipmentFixes(players, visuals, 10, { visorFix: true, seed: 9, teamNames: new Map([[1, "FBS"], [200, "FCS Southeast"]]), fcsTeamIndexes: new Set([200]) });
  assert.equal(result.populationSafeguards.fbs.visors.WR.equipped, 6);
  assert.ok(result.populationSafeguards.fcs.visors.WR.equipped > 0);
  assert.ok(result.populationSafeguards.fcs.visors.WR.equipped <= 6);
});

test("app starts without a persisted active save and displays the app version top-center", () => {
  const main = fs.readFileSync(new URL("../src/main/main.js", import.meta.url), "utf8");
  const index = fs.readFileSync(new URL("../src/renderer/index.html", import.meta.url), "utf8");
  const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
  assert.match(main, /let sessionActiveSave = null/); assert.match(main, /activeSave: saveInfo\(sessionActiveSave\)/); assert.match(main, /settings\.update\(\{ activeSave: null \}\)/);
  assert.match(index, /id="app-version" class="app-version"/); assert.match(renderer, /#app-version/);
});
