import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { brandedEquipmentItems, equipmentDisplayName, equipmentDisplayValue, isToolMouthpieceColor, recolorEquipmentItem, UNLOCKED_POOLS } from "../src/main/tools/equipment/catalog.js";
import { applyAsymmetricElbowGear, applyNoDripEquipment, applyUnlockedRandomizerEquipment, noDripChanceForPosition, unlockedElbowPoolForPosition } from "../src/main/tools/equipment/core/patcher.js";
import { applyGlobalEquipmentFixes, mouthpiecePopulationGroup, rollUnlockedMouthpiece } from "../src/main/tools/equipment/core/globalFixes.js";
import { normalizeEquipmentOptions } from "../src/main/tools/equipment/runner.js";
import { tools } from "../src/shared/toolRegistry.js";

const ref = (table, row) => table.toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
const loadout = elements => ({ loadoutType: "PlayerOnField", loadoutElements: structuredClone(elements) });
const visual = elements => ({ isEmpty: false, RawData: JSON.stringify({ loadouts: [loadout(elements)] }) });
const player = (row, position = "WR") => ({ isEmpty: false, FirstName: `Player${row}`, LastName: "Catalog", Position: position, SchoolYear: "Senior", RedshirtStatus: "Previous", CharacterBodyType: "Thin", CharacterVisuals: ref(10, row), IsNIL: false, TeamIndex: 1, OverallRating: 80, JerseyNum: row });
const sequence = values => { let index = 0; return () => values[Math.min(index++, values.length - 1)]; };

test("workbook catalog supplies display names and complete color-family recoloring", () => {
  assert.equal(equipmentDisplayName("GearArmSleeve_Baggy_Black"), "Baggy Arm Sleeve Black");
  assert.equal(equipmentDisplayValue("GearHelmet_Axiom / GearFaceMask_Axiom2barsingle"), "Riddell Axiom / Axiom 2 Bar Single");
  assert.equal(recolorEquipmentItem("GearArmSleeve_Baggy_Black", "primary"), "GearArmSleeve_Baggy_TeamColor");
  assert.equal(recolorEquipmentItem("GearArmSleeve_Baggy_Black", "secondary"), "GearArmSleeve_Baggy_SecondaryColor");
  assert.equal(recolorEquipmentItem("GearArmSleeve_Baggy_Black", "white"), "GearArmSleeve_Baggy_White");
  assert.equal(recolorEquipmentItem("GearNeckpad_QCollar", "primary"), "GearNeckpad_QCollar");
  assert.equal(recolorEquipmentItem("G_CompressionT_Crew_LongSleeve_NikeHQ_B_GLD", "black"), "G_CompressionT_Crew_LongSleeve_NikeHQ_B_NAV");
  assert.equal(recolorEquipmentItem("Undershirt_Untucked", "secondary"), "G_CompressionT_Crew_LongSleeve_99Club_B_WHI");
  assert.equal(recolorEquipmentItem("Gear_Undershirt_HoodieSleeveless", "primary"), "Gear_Undershirt_HoodieSleeveless");
});

test("unlocked pools enforce team brand and position-specific elbow eligibility", () => {
  assert.ok(brandedEquipmentItems("Cleats", "Nike").every(item => /^GearFootwear_/i.test(item.itemName) && item.tags.includes("Nike")));
  assert.ok(brandedEquipmentItems("Gloves", "JordanBrand").every(item => item.tags.includes("JordanBrand")));
  assert.deepEqual(unlockedElbowPoolForPosition("QB"), []);
  assert.equal(unlockedElbowPoolForPosition("WR").some(item => /elbowpad|Brace|Stabilizer/i.test(item.itemName)), false);
  assert.equal(unlockedElbowPoolForPosition("LT").some(item => /elbowpad|Brace/i.test(item.itemName)), true);
  assert.equal(unlockedElbowPoolForPosition("CB").some(item => /ShoulderStabilizer/i.test(item.itemName)), true);
  assert.ok(UNLOCKED_POOLS.unlockedMouthpieces.every(item => /^(Battle|NXTRND|Nike|Shock)\b/.test(item.displayName)));
  assert.ok(UNLOCKED_POOLS.unlockedMouthpieces.every(item => isToolMouthpieceColor(item.itemName)));
});

test("the expanded randomizer uses an exact 10% roll and prefers branded team-color gloves", () => {
  const loadouts = [loadout([])];
  const changes = applyUnlockedRandomizerEquipment(loadouts, { position: "DT", branding: "nike" }, () => 0, 0.10);
  const slots = new Map(loadouts[0].loadoutElements.map(element => [element.slotType, element.itemAssetName]));
  assert.equal(changes.length, 10);
  assert.equal(slots.get("FaceWear"), undefined, "the generated turtleneck excludes a second neck/head layer");
  assert.ok(slots.has("NeckWear"));
  assert.match(slots.get("LeftThighWear"), /^ThighPad_/);
  assert.equal(slots.get("LeftThighWear"), slots.get("RightThighWear"));
  assert.equal(slots.get("Towel"), "Towel2_South");
  assert.equal(slots.get("LeftArmWear"), slots.get("RightArmWear"));
  assert.equal(slots.get("LeftShoe"), slots.get("RightShoe"));
  assert.equal(slots.get("LeftHandWear"), slots.get("RightHandWear"));
  assert.match(slots.get("LeftShoe"), /^GearFootwear_/);
  assert.match(slots.get("LeftHandWear"), /_(?:TeamColor|SecondaryColor)$/i);
  assert.match(slots.get("MouthWear"), /^GearMouthpiece_/);
});

test("expanded elbow gear may be asymmetric and shoulder stabilizers remain one-sided", () => {
  const asymmetric = [loadout([])], changes = [];
  const distinctStyles = UNLOCKED_POOLS.elbowSweatbands.filter(item => ["ElbowGear_elbowSweatbandFull_Black", "ElbowGear_elbowSweatbandMedium_White"].includes(item.itemName));
  applyAsymmetricElbowGear(asymmetric, distinctStyles, sequence([0, 0.99]), changes);
  const elbowSlots = new Map(asymmetric[0].loadoutElements.map(element => [element.slotType, element.itemAssetName]));
  assert.notEqual(elbowSlots.get("LeftElbowWear"), elbowSlots.get("RightElbowWear"));
  const shoulder = UNLOCKED_POOLS.shoulderStabilizers[0], shoulderLoadouts = [loadout([])];
  applyAsymmetricElbowGear(shoulderLoadouts, [shoulder], () => 0, []);
  const shoulderSlots = new Map(shoulderLoadouts[0].loadoutElements.map(element => [element.slotType, element.itemAssetName]));
  assert.equal(shoulderSlots.get("LeftElbowWear"), shoulder.itemName);
  assert.equal(shoulderSlots.get("RightElbowWear"), undefined, "do not clear existing equipment on an ineligible side");
});

test("No Drip rates and equipment result match the agreed position groups", () => {
  for (const position of ["CB", "FS", "SS", "WR"]) assert.equal(noDripChanceForPosition(position), 0.01);
  for (const position of ["HB", "TE", "QB", "LOLB", "MLB", "ROLB"]) assert.equal(noDripChanceForPosition(position), 0.03);
  for (const position of ["LT", "LG", "C", "RG", "RT", "K", "P", "FB", "LE", "RE", "DT"]) assert.equal(noDripChanceForPosition(position), 0.06);
  const elements = [{ slotType: "LeftArmWear", itemAssetName: "GearArmSleeve_Baggy_Black" }, { slotType: "RightArmWear", itemAssetName: "GearArmSleeve_Baggy_Black" }, { slotType: "LeftElbowWear", itemAssetName: "ElbowGear_elbowpad_Black" }, { slotType: "RightElbowWear", itemAssetName: "ElbowGear_elbowpad_Black" }, { slotType: "LeftHandWear", itemAssetName: "GearHand_tapedHandFinger_Black" }, { slotType: "RightHandWear", itemAssetName: "GearHand_glove_NikeVaporJet8_Black" }, { slotType: "InnerPants", itemAssetName: "GearLegsBase_LeftSleeve_Black" }, { slotType: "Towel", itemAssetName: "Towel_Standard" }, { slotType: "Neckpad", itemAssetName: "GearNeckpad_SkiBlack" }, { slotType: "InnerSocks", itemAssetName: "Gear_Socks_Mid" }, { slotType: "LeftShoe", itemAssetName: "GearFootwear_shoe_low_NikeVaporEdge" }, { slotType: "RightShoe", itemAssetName: "GearFootwear_shoe_low_NikeVaporEdge" }, { slotType: "MouthWear", itemAssetName: "GearMouthpiece_PacifierDualHanging_Black2" }];
  const loadouts = [loadout(elements)]; applyNoDripEquipment(loadouts, "DT"); const slots = new Map(loadouts[0].loadoutElements.map(element => [element.slotType, element.itemAssetName]));
  assert.equal(slots.get("LeftHandWear"), "GearHand_tapedHandFinger_Black"); assert.equal(slots.get("RightHandWear"), "GearHand_None");
  assert.equal(slots.has("InnerPants"), false); assert.equal(slots.get("InnerSocks"), "Gear_Socks_Low");
  assert.equal(slots.get("LeftShoe"), "GearFootwear_shoe_low_NikeVaporEdge"); assert.equal(slots.get("MouthWear"), "GearMouthpiece_PacifierDualHanging_Black2");
});

test("mouthpiece groups, distributions, and 85% non-destructive ceiling are exact", () => {
  assert.equal(mouthpiecePopulationGroup("QB"), null); assert.equal(mouthpiecePopulationGroup("K"), null); assert.equal(mouthpiecePopulationGroup("P"), null);
  assert.equal(mouthpiecePopulationGroup("WR"), "skill"); assert.equal(mouthpiecePopulationGroup("LT"), "line");
  assert.equal(rollUnlockedMouthpiece("skill", sequence([0, 0])).type, "hanging");
  assert.equal(rollUnlockedMouthpiece("skill", sequence([0.75, 0])).type, "pacifier");
  assert.equal(rollUnlockedMouthpiece("skill", sequence([0.95, 0])).type, "mouthguard");
  assert.equal(rollUnlockedMouthpiece("line", sequence([0, 0])).type, "pacifier");
  assert.equal(rollUnlockedMouthpiece("line", sequence([0.60, 0])).type, "mouthguard");
  assert.equal(rollUnlockedMouthpiece("line", sequence([0.85, 0])).type, "hanging");
  const players = [], visuals = [];
  for (let row = 0; row < 10; row++) { players.push(player(row, "WR")); visuals.push(visual([{ slotType: "MouthWear", itemAssetName: row < 8 ? "GearMouthpiece_PacifierDual_White" : "GearMouthpiece_None" }])); }
  const before = visuals.map(item => item.RawData); const result = applyGlobalEquipmentFixes(players, visuals, 10, { unlockedMouthpieceFix: true, seed: 1, teamNames: new Map([[1, "Test"]]) });
  assert.deepEqual(visuals.map(item => item.RawData), before); assert.equal(result.unlockedMouthpiecePlayersChanged, 0); assert.equal(result.populationSafeguards.mouthpieces.skill.equipped, 8); assert.equal(result.populationSafeguards.mouthpieces.skill.limited, true);
});

test("Unlocked Equipment Pool and No Drip options are separate and disabled by default", () => {
  assert.equal(normalizeEquipmentOptions({}, true).usingUnlockedMod, false);
  assert.equal(normalizeEquipmentOptions({}, true).noDripProfile, false);
  assert.equal(normalizeEquipmentOptions({}, false).unlockedMouthpieceFix, false);
  assert.equal(normalizeEquipmentOptions({}, false).unlockedRecolorFix, false);
  assert.throws(() => normalizeEquipmentOptions({ unlockedColorTheme: "neon" }, false), /Unknown unlocked accessory color theme/);
  const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
  assert.match(renderer, /optionalPass\("equipment-no-drip", "No Drip Profile", "Gives some players a simpler look by removing selected accessories\."/);
  assert.match(renderer, /optionalPass\("equipment-unlocked", "Unlocked Equipment Pool"/);
  assert.match(renderer, /Adds extra accessories, rubber bands, double\/elbow sleeves, compression-leg layers, branded turtlenecks and mouthpieces, normal balaclavas, thigh pads, a string towel, and 13 custom facepaint styles from CFB27 Unlocked/);
  assert.match(renderer, /optionalPass\("fix-unlocked-mouthpieces"/); assert.match(renderer, /optionalPass\("fix-unlocked-recolor"/);
  assert.equal(tools.find(tool => tool.id === "freshman-equipment").version, "5.1"); assert.equal(tools.find(tool => tool.id === "equipment-patcher").version, "5.5");
});
