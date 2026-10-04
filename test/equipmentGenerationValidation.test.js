import test from "node:test";
import assert from "node:assert/strict";
import { EQUIPMENT_ITEMS, RAW_ACCESSORIES_POOLS, UNLOCKED_POOLS, brandedEquipmentItems, canGenerateItem, equipmentDisplayName, equipmentItem, equipmentSemantics, isToolMouthpieceColor, mouthpieceColorVariants, recolorMouthpieceItem } from "../src/main/tools/equipment/catalog.js";
import { applyAsymmetricElbowGear, applyRawRandomizerEquipment, applyUnlockedRandomizerEquipment, mulberry32, normalizeMouthpieceColor, patchFreshmanEquipment } from "../src/main/tools/equipment/core/patcher.js";
import { canGenerateEquipment, createGeneratedEquipmentState, enforceGeneratedEquipmentCompatibility, finalGeneratedChanges, generatedItemConflict, recordGeneratedEquipment } from "../src/main/tools/equipment/core/generatedCompatibility.js";
import { rollUnlockedMouthpiece } from "../src/main/tools/equipment/core/globalFixes.js";
import { isBrandCompatibleItem } from "../src/main/tools/equipment/core/brandCompatibility.js";

const element = (slotType, itemAssetName) => ({ slotType, itemAssetName });
const field = elements => ({ loadoutType: "PlayerOnField", loadoutElements: elements });
const gear = (sleeve = "ArmSleeve_None", shirt = "G_CompressionT_Crew_ShortSleeve_Basic_PRI") => [field([element("OuterShirt", "Gear_JerseyStyle_SleeveTight"), element("InnerShirt", shirt), element("LeftArmWear", sleeve), element("RightArmWear", sleeve)])];
const get = (loadouts, slot) => loadouts[0].loadoutElements.find(item => item.slotType === slot)?.itemAssetName;
const bluePink = "GearMouthpiece_PacifierDualHanging_Black4";

test("repurposed cleats use verified current names instead of the older exported names", () => {
  assert.equal(equipmentDisplayName("GearFootwear_shoe_mid_NikeAlphaMenacePro299Club"), "Nike Vapor Edge Pro 360 2 Spat");
  assert.equal(equipmentDisplayName("GearFootwear_shoe_mid_NikeAlphaMenacePro"), "Nike Vapor Edge Pro 360 VC");
  assert.equal(equipmentDisplayName("GearFootwear_shoeLowVintage_nike"), "Nike Foamposite Pro - School PE");
  assert.equal(equipmentDisplayName("GearFootwear_shoe_Low_NikeVaporUntouchable2"), "Jordan 4 Alpha Menace");
});

test("generated cleats require positive football-model eligibility, not shoe-slot or Player-role assumptions", () => {
  for (const brand of ["Nike", "Adidas", "UnderArmour", "Jordan", "NewBalance"]) {
    const pool = brandedEquipmentItems("Cleats", brand).filter(canGenerateItem);
    assert.ok(pool.length);
    for (const item of pool) { assert.equal(item.semantic.actualType, "football-cleat"); assert.ok(isBrandCompatibleItem("LeftShoe", item.itemName, brand)); }
  }
  for (const name of ["GearFootwear_shoe_low_NikeAirMax90PlayLikeMad", "GearFootwear_shoe_low_Jordan5_99Club2", "GearFootwear_shoe_mid_AirJordanRetro199", "GearFootwear_shoe_low_AdidasUltraBoostMono", "GoodellRoger_SuitShoe"]) assert.equal(canGenerateItem(equipmentItem(name)), false, name);
  assert.equal(isBrandCompatibleItem("LeftShoe", "GearFootwear_shoe_low_Jordan5_99Club2", "Nike"), true, "donor-copy compatibility is separate from generated pool eligibility");
});

test("legacy invisible neckpad masks and NFL undersocks are excluded from generation, not existing gear recoloring", () => {
  const pools = Object.values(UNLOCKED_POOLS).flat();
  assert.ok(pools.every(item => !/GearNeckpad_Vintage|GearLegBase_Socks_Under_NFL_/.test(item.itemName)));
  for (const name of ["GearNeckpad_VintageSingleNeckRoll", "GearNeckpad_VintageNeckRoll", "GearLegBase_Socks_Under_NFL_White"]) assert.equal(equipmentSemantics(name).poolEligible, false);
  assert.equal(UNLOCKED_POOLS.balaclavas.length, 4);
  for (const item of UNLOCKED_POOLS.balaclavas) assert.deepEqual(item.slots, ["FaceWear"]);
});

test("blue/pink Nike mouthpiece is shared random-color-only artwork, never a black or safe-color target", () => {
  assert.equal(equipmentItem(bluePink).menuDisplayName, "Nike Hanging Mouthpiece Pacifier Black");
  assert.match(equipmentDisplayName(bluePink), /Light Blue \/ Pink/);
  assert.equal(isToolMouthpieceColor(bluePink), false);
  assert.ok(UNLOCKED_POOLS.colorfulHangingMouthpieces.some(item => item.itemName === bluePink));
  assert.ok(!UNLOCKED_POOLS.unlockedMouthpieces.some(item => item.itemName === bluePink));
  assert.ok(!mouthpieceColorVariants(bluePink, false).some(item => item.itemName === bluePink));
  assert.ok(mouthpieceColorVariants(bluePink, true).some(item => item.itemName === bluePink));
  for (const item of EQUIPMENT_ITEMS.filter(item => item.category === "Mouthpiece")) for (const theme of ["black", "white", "primary", "secondary"]) assert.notEqual(recolorMouthpieceItem(item.itemName, theme), bluePink);
  for (const theme of ["Black", "White", "Primary", "Secondary"]) assert.ok(isToolMouthpieceColor(normalizeMouthpieceColor(bluePink, theme)));
  const rng = mulberry32(771); let found = false;
  for (let index = 0; index < 20000; index++) { assert.notEqual(rollUnlockedMouthpiece("skill", rng, false).item.itemName, bluePink); found ||= rollUnlockedMouthpiece("skill", rng, true).item.itemName === bluePink; }
  assert.ok(found);
});

test("bicep bands permit exposed/short sleeves and reject coverage on the actual arm or undershirt", () => {
  const band = equipmentItem("GearBicepBand_Black");
  for (const sleeve of ["ArmSleeve_None", "GearArmSleeve_Elbow_armTape_normal_Black", "GearArmSleeve_Quarter_armTape_normal_Black"]) assert.ok(canGenerateEquipment(gear(sleeve), band, ["LeftElbowWear"]), sleeve);
  for (const sleeve of ["GearArmSleeve_Full_sleeveLongUnderarmor_normal_Black", "GearArmSleeve_Half_sleeveLongUnderarmor_normal_Black", "GearArmSleeve_Baggy_Black", "GearArmSleeve_NikeProDriFitSleeve2_Black", "Unknown_Custom_Sleeve"]) assert.equal(canGenerateEquipment(gear(sleeve), band, ["LeftElbowWear"]), false, sleeve);
  assert.equal(canGenerateEquipment(gear("ArmSleeve_None", "G_CompressionT_Crew_LongSleeve_NikeHQ_B_GLD"), band, ["LeftElbowWear"]), false);
  assert.equal(canGenerateEquipment([...gear(), ...gear("GearArmSleeve_Baggy_Black")], band, ["LeftElbowWear"]), false, "all on-field outfits must fit");
});

test("generated bicep/sweatbands coordinate colors while retaining asymmetrical styles", () => {
  for (let seed = 0; seed < 100; seed++) {
    const loadouts = gear(), changes = [];
    applyAsymmetricElbowGear(loadouts, UNLOCKED_POOLS.bicepBands, mulberry32(seed), changes);
    assert.equal(equipmentSemantics(get(loadouts, "LeftElbowWear")).colors[0], equipmentSemantics(get(loadouts, "RightElbowWear")).colors[0]);
    const sweats = UNLOCKED_POOLS.elbowSweatbands.filter(item => item.semantic.actualType === "sweatband"), second = gear();
    applyAsymmetricElbowGear(second, sweats, mulberry32(seed), []);
    assert.equal(equipmentSemantics(get(second, "LeftElbowWear")).colors[0], equipmentSemantics(get(second, "RightElbowWear")).colors[0]);
  }
});

test("rubber bands use wrist-region compatibility despite storage in elbow slots", () => {
  for (const item of UNLOCKED_POOLS.elbowSweatbands.filter(item => /RubberBands/.test(item.itemName))) {
    assert.equal(item.semantic.bodyRegion, "wrist"); assert.ok(canGenerateEquipment(gear(), item, ["LeftElbowWear"]));
    for (const sleeve of ["GearArmSleeve_Undershirt_armTape_normal_Black", "GearArmSleeve_Quarter_armTape_normal_Black", "GearArmSleeve_Full_sleeveLongUnderarmor_normal_Black", "GearArmSleeve_Baggy_White"]) assert.equal(canGenerateEquipment(gear(sleeve), item, ["LeftElbowWear"]), false);
    for (const wrist of ["GearWrist_wristBandNormal_White", "GearWrist_wristTapeNormal_Black", "Unknown_Custom_WristGear"]) {
      const loadouts = gear(); loadouts[0].loadoutElements.push(element("LeftWristWear", wrist));
      assert.equal(canGenerateEquipment(loadouts, item, ["LeftElbowWear"]), false);
      assert.ok(canGenerateEquipment(loadouts, item, ["RightElbowWear"]), "compatibility is side-specific");
      const before = structuredClone(loadouts); applyAsymmetricElbowGear(loadouts, [item], () => 0, []);
      assert.equal(get(loadouts, "LeftElbowWear"), undefined); assert.equal(get(loadouts, "LeftWristWear"), get(before, "LeftWristWear"));
    }
  }
});

test("combined Unlocked/Raw generation checks one shared loadout and never stacks neckwear or cap with balaclava", () => {
  let balaclavas = 0;
  for (const position of ["QB", "WR", "TE", "RG", "RE", "SS"]) for (let seed = 0; seed < 350; seed++) {
    const loadouts = gear(), state = createGeneratedEquipmentState(loadouts), rng = mulberry32(seed);
    const a = applyUnlockedRandomizerEquipment(loadouts, { position, branding: "Nike" }, rng, 0.65, state);
    const b = applyRawRandomizerEquipment(loadouts, rng, 0.65, state, position);
    assert.deepEqual(enforceGeneratedEquipmentCompatibility(loadouts, state, position), []);
    for (const group of ["neckwear", "head-underlayer", "shoulder-stabilizer"]) assert.ok(loadouts[0].loadoutElements.filter(item => equipmentSemantics(item.itemAssetName)?.groups.includes(group)).length <= 1, `${position}/${seed}/${group}`);
    const mask = get(loadouts, "FaceWear"); if (mask) { balaclavas++; assert.notEqual(position, "QB"); }
    for (const change of [...finalGeneratedChanges(loadouts, a), ...finalGeneratedChanges(loadouts, b)]) for (const name of change.newItem.split(" + ")) assert.ok(loadouts[0].loadoutElements.some(item => change.slots.includes(item.slotType) && item.itemAssetName === name));
  }
  assert.ok(balaclavas > 0, "mutual exclusion must not make balaclavas unreachable");
});

test("QBs can still donor-copy a balaclava and donor sneakers/undersocks are not globally removed", () => {
  const ref = row => (10).toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
  const player = (row, year) => ({ FirstName: "Test", LastName: `${row}`, Position: "QB", SchoolYear: year, RedshirtStatus: "Eligible", OverallRating: 80, CharacterVisuals: ref(row), TeamIndex: 1, IsNIL: false });
  const elements = [element("FaceWear", "FaceGear_BalaclavaOverNose_White"), element("InnerPants", "GearLegBase_Socks_Under_NFL_White"), element("LeftShoe", "GearFootwear_shoe_low_NikeAirMax90PlayLikeMad"), element("RightShoe", "GearFootwear_shoe_low_NikeAirMax90PlayLikeMad")];
  const visuals = [{ RawData: JSON.stringify({ loadouts: gear() }) }, { RawData: JSON.stringify({ loadouts: [field(elements)] }) }];
  const result = patchFreshmanEquipment([player(0, "Freshman"), player(1, "Senior")], visuals, 10, { top: 1, seed: 20, apply: true, teamApparel: new Map([[1, "Nike"]]), mixedChance: 0, crossMixedChance: 0 });
  assert.equal(result.changes.length, 1);
  const copied = JSON.parse(visuals[0].RawData).loadouts;
  for (const item of elements) assert.equal(get(copied, item.slotType), item.itemAssetName);
});

test("final compatibility restores only invalid generated additions and retains donor gear", () => {
  const loadouts = gear(), state = createGeneratedEquipmentState(loadouts);
  loadouts[0].loadoutElements.push(element("LeftElbowWear", "ElbowGear_RubberBands1")); recordGeneratedEquipment(state, ["LeftElbowWear"], "ElbowGear_RubberBands1");
  loadouts[0].loadoutElements.push(element("LeftWristWear", "Donor_Custom_Tape"));
  const corrected = enforceGeneratedEquipmentCompatibility(loadouts, state, "WR");
  assert.equal(corrected.length, 1); assert.equal(get(loadouts, "LeftElbowWear"), undefined); assert.equal(get(loadouts, "LeftWristWear"), "Donor_Custom_Tape");
  const donorOnly = [field([element("NeckWear", RAW_ACCESSORIES_POOLS.neckwear[0].itemName), element("FaceWear", UNLOCKED_POOLS.balaclavas[0].itemName)])];
  const unchanged = structuredClone(donorOnly);
  assert.deepEqual(enforceGeneratedEquipmentCompatibility(donorOnly, createGeneratedEquipmentState(donorOnly), "QB"), []); assert.deepEqual(donorOnly, unchanged);
});
