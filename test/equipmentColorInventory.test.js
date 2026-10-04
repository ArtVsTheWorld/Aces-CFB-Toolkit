import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { equipmentItem, equipmentOrigin, EQUIPMENT_ITEMS, UNLOCKED_POOLS, RAW_ACCESSORIES_POOLS, recolorEquipmentItem, isToolMouthpieceColor, brandedEquipmentItems } from "../src/main/tools/equipment/catalog.js";
import { applyUnlockedRandomizerEquipment, applyRawRandomizerEquipment, applyNoDripEquipment, patchFreshmanEquipment, mulberry32 } from "../src/main/tools/equipment/core/patcher.js";
import { isBrandCompatibleItem } from "../src/main/tools/equipment/core/brandCompatibility.js";
import { isArmTape, recolorPlayerAccessories } from "../src/main/tools/equipment/core/recolor.js";
import { DEFAULT_UNLOCKED_TATTOO_SELECTION, UNLOCKED_TATTOO_POOL, applyUnlockedTattooPlan, rollUnlockedTattoo } from "../src/main/tools/equipment/core/tattoos.js";
import { rollUnlockedMouthpiece } from "../src/main/tools/equipment/core/globalFixes.js";

const colors = ["white", "black", "primary", "secondary"];
const field = elements => ({ loadoutType: "PlayerOnField", loadoutElements: elements });
const family = (base, primary = "Primary", secondary = "Secondary", white = "White", suffix = "") => ({
  white: `${base}_${white}${suffix}`, black: `${base}_Black${suffix}`, primary: primary ? `${base}_${primary}${suffix}` : base, secondary: `${base}_${secondary}${suffix}`
});
const verifyFamily = (variants, slots) => {
  for (const from of Object.values(variants)) for (const color of colors) {
    assert.equal(recolorEquipmentItem(from, color), variants[color], `${from}/${color}`);
    for (const slot of slots) assert.ok(equipmentItem(variants[color])?.slots.includes(slot));
  }
};

test("all four turtleneck colors preserve the exact style and mod classification", () => {
  for (const [base, origin] of [["NeckWear_Turtleneck_Tight", "unlocked"], ["NeckWear_Turtleneck_Scrunched", "unlocked"], ["NeckWear_Raw_Turtleneck", "raw"]]) {
    const variants = family(base, "");
    verifyFamily(variants, ["NeckWear"]);
    for (const [color, name] of Object.entries(variants)) {
      assert.equal(equipmentOrigin(name), origin);
      assert.match(equipmentItem(name).displayName.toLowerCase(), new RegExp(color));
    }
  }
});

test("four additional live glove families recolor on both hands and retain receiver-brand validation", () => {
  for (const [base, brand] of [["GearHand_glove_Adizero11", "Adidas"], ["GearHand_glove_UnderArmourF6", "UnderArmour"], ["GearHand_glove_UnderArmourSpotlight2019", "UnderArmour"], ["GearHand_glove_UnderArmourBlur2", "UnderArmour"]]) {
    const variants = family(base, "TeamColor", "SecondaryColor");
    verifyFamily(variants, ["LeftHandWear", "RightHandWear"]);
    for (const name of Object.values(variants)) for (const slot of ["LeftHandWear", "RightHandWear"]) {
      assert.ok(isBrandCompatibleItem(slot, name, brand));
      assert.equal(isBrandCompatibleItem(slot, name, "Nike"), false);
      assert.equal(equipmentOrigin(name), "unverified", "do not call absence from a mod manifest proof of vanilla provenance");
      assert.ok(!brandedEquipmentItems("Gloves", brand).some(item => item.itemName === name), "uncertain-origin aliases support existing gear but are not generated");
    }
  }
});

test("compression and one-leg layers retain four colors; existing NFL undersocks can recolor but are not generated", () => {
  for (const variants of [family("GearLegBase_Socks_Under_Both"), family("GearLegBase_Socks_Under_Both", "Primary", "Secondary", "White", "2"), family("GearLegBase_Socks_Under_NFL"), family("GearLegsBase_LeftSleeve"), family("GearLegsBase_RightSleeve")]) {
    verifyFamily(variants, ["InnerPants"]);
    for (const name of Object.values(variants)) assert.equal(UNLOCKED_POOLS.legSleeves.some(item => item.itemName === name), !name.includes("_NFL_"));
  }
});

test("elbow sleeves support four accessory colors, while two-tone double sleeves never invent a white item", () => {
  const variants = family("GearArmSleeve_Elbow_armTape_normal", "TeamColor", "SecondaryColor", "OffWhite");
  verifyFamily(variants, ["LeftArmWear", "RightArmWear"]);
  for (const name of Object.values(variants)) assert.equal(isArmTape(name, "LeftArmWear"), false);
  const double = ["GearArmSleeve_NikeProDriFitSleeve2_Black", "GearArmSleeve_NikeProDriFitSleeve2a_Black", "GearArmSleeve_NikeProDriFitSleeve2_TeamColor", "GearArmSleeve_NikeProDriFitSleeve2_SecondaryColor"];
  for (const name of double) {
    assert.equal(recolorEquipmentItem(name, "white"), name);
    assert.equal(recolorEquipmentItem(name, "primary"), double[2]);
    assert.equal(recolorEquipmentItem(name, "secondary"), double[3]);
  }
  assert.equal(recolorEquipmentItem("GearNeckpad_VintageNeckRoll", "white"), "GearNeckpad_VintageSingleNeckRoll");
  assert.equal(recolorEquipmentItem("GearNeckpad_VintageSingleNeckRoll", "black"), "GearNeckpad_VintageNeckRoll");
  assert.equal(recolorEquipmentItem("Unverified_Custom_Black", "primary"), "Unverified_Custom_Black");
});

test("Raw and Unlocked pool membership stays separate and unclassified masks are never generated", () => {
  const unlocked = Object.values(UNLOCKED_POOLS).flat(), raw = Object.values(RAW_ACCESSORIES_POOLS).flat();
  const rawNames = new Set(raw.map(item => item.itemName));
  assert.ok(unlocked.every(item => !rawNames.has(item.itemName) && equipmentOrigin(item.itemName) !== "raw"));
  assert.ok(raw.every(item => equipmentOrigin(item.itemName) === "raw"));
  assert.ok(UNLOCKED_POOLS.neckwear.filter(item => item.category === "Neckwear").every(item => equipmentOrigin(item.itemName) === "unlocked"));
  const inventory = JSON.parse(fs.readFileSync(new URL("../src/main/tools/equipment/equipmentColorInventory.json", import.meta.url), "utf8"));
  for (const name of inventory.unclassifiedNeckwear) assert.ok(![...unlocked, ...raw].some(item => item.itemName === name), name);
  assert.ok([...unlocked, ...raw].every(item => !/remove.*balaclava|under.?lip/i.test(item.displayName)));
  assert.equal(new Set(EQUIPMENT_ITEMS.map(item => item.itemName)).size, EQUIPMENT_ITEMS.length);
});

test("every added arm and leg style is reachable, baggy sleeves remain paired, and Raw caps use only GuardianCap", () => {
  const arms = new Set(), legs = new Set(), caps = new Set();
  for (let seed = 0; seed < 500; seed++) {
    const unlocked = [field([])];
    applyUnlockedRandomizerEquipment(unlocked, { position: "WR", branding: "Nike" }, mulberry32(seed), 1);
    const elements = unlocked[0].loadoutElements, left = elements.find(item => item.slotType === "LeftArmWear"), right = elements.find(item => item.slotType === "RightArmWear");
    [left, right].forEach(item => arms.add(item.itemAssetName));
    if ([left, right].some(item => /Baggy_/.test(item.itemAssetName))) assert.equal(left.itemAssetName, right.itemAssetName);
    legs.add(elements.find(item => item.slotType === "InnerPants").itemAssetName);
    const raw = [field([{ slotType: "HeadWear", itemAssetName: "KeepHelmet" }, { slotType: "InnerSocks", itemAssetName: "KeepSocks" }])];
    const before = structuredClone(raw), a = applyRawRandomizerEquipment(raw, mulberry32(seed), 1), replay = structuredClone(before);
    assert.deepEqual(applyRawRandomizerEquipment(replay, mulberry32(seed), 1), a); assert.deepEqual(raw, replay);
    const cap = raw[0].loadoutElements.find(item => item.slotType === "GuardianCap");
    caps.add(cap.itemAssetName);
    assert.deepEqual(raw[0].loadoutElements.slice(0, 2), before[0].loadoutElements);
    assert.ok(equipmentItem(cap.itemAssetName).slots.length === 1 && equipmentItem(cap.itemAssetName).slots[0] === "GuardianCap");
  }
  assert.deepEqual([...arms].sort(), UNLOCKED_POOLS.armSleeves.map(item => item.itemName).sort());
  assert.deepEqual([...legs].sort(), UNLOCKED_POOLS.legSleeves.map(item => item.itemName).sort());
  assert.deepEqual([...caps].sort(), RAW_ACCESSORIES_POOLS.skullcaps.map(item => item.itemName).sort());
});

test("No Drip removes all new lower-body layers without touching sock choices, helmets, cleats or tattoos", () => {
  for (const item of UNLOCKED_POOLS.legSleeves) {
    const loadouts = [field([{ slotType: "InnerPants", itemAssetName: item.itemName }, { slotType: "HeadWear", itemAssetName: "Helmet" }, { slotType: "LeftShoe", itemAssetName: "Cleats" }, { slotType: "InnerSocks", itemAssetName: "Gear_Socks_Low" }])];
    const kept = structuredClone(loadouts[0].loadoutElements.slice(1));
    applyNoDripEquipment(loadouts, "WR");
    assert.deepEqual(loadouts[0].loadoutElements, kept);
  }
});

test("new graphics with White in their IDs are random-color-only, with pink graphics still rare", () => {
  const graphics = UNLOCKED_POOLS.colorfulHangingMouthpieces.filter(item => /_White\d+$/.test(item.itemName));
  assert.equal(graphics.length, 9);
  assert.ok(!UNLOCKED_POOLS.unlockedMouthpieces.some(item => item.itemName === "GearMouthpiece_PacifierDualHanging_Black4"));
  for (const item of graphics) assert.equal(isToolMouthpieceColor(item.itemName), false);
  const seen = new Set(), count = new Map();
  const rng = mulberry32(77);
  for (let index = 0; index < 70000; index++) {
    const item = rollUnlockedMouthpiece("skill", rng, true).item; seen.add(item.itemName); count.set(item.itemName, (count.get(item.itemName) ?? 0) + 1);
  }
  for (const item of graphics) assert.ok(seen.has(item.itemName), item.itemName);
  assert.ok(count.get("GearMouthpiece_PacifierDualHanging_White8") > count.get("GearMouthpiece_PacifierDualHanging_White5") * 4);
  for (let index = 0; index < 500; index++) assert.ok(!graphics.some(item => item.itemName === rollUnlockedMouthpiece("skill", rng).item.itemName));
});

test("new Japanese floating tattoos stay off by default and write only the safe Base layer", () => {
  for (const name of ["ArmTattoo_Tattoos_Japanese_09_ArmFloating_v02", "ArmTattoo_Tattoos_Japanese_10_ArmFloating_v01", "ArmTattoo_Tattoos_Japanese_ArmFloating_v01"]) {
    assert.ok(UNLOCKED_TATTOO_POOL.some(item => item.value === name && !item.defaultSelected));
    assert.ok(!DEFAULT_UNLOCKED_TATTOO_SELECTION.includes(name));
    const gear = field([{ slotType: "LeftArmWear", itemAssetName: "KeepSleeve" }, { slotType: "HeadWear", itemAssetName: "KeepHelmet" }]);
    const parsed = { loadouts: [structuredClone(gear)] };
    applyUnlockedTattooPlan(parsed, rollUnlockedTattoo(mulberry32(17), parsed, [name]));
    assert.deepEqual(parsed.loadouts.find(item => item.loadoutType === "PlayerOnField"), gear);
    assert.equal(parsed.loadouts[0].loadoutCategory, "Base");
    assert.ok(parsed.loadouts[0].loadoutElements.some(item => item.itemAssetName === name));
  }
});

test("new equipment remains outside vanilla generation and cap copying works through every donor mode", () => {
  const ref = row => "000000000001010" + row.toString(2).padStart(17, "0");
  const player = (row, position, year) => ({ isEmpty: false, FirstName: "Test", LastName: String(row), Position: position, SchoolYear: year, RedshirtStatus: year === "Freshman" ? "Eligible" : "Previous", CharacterBodyType: "Thin", CharacterVisuals: ref(row), IsNIL: false, TeamIndex: 1, OverallRating: 90 });
  const players = [player(0, "WR", "Freshman"), player(1, "WR", "Senior"), player(2, "CB", "Senior")];
  const visuals = players.map(() => ({ isEmpty: false, RawData: JSON.stringify({ loadouts: [field([{ slotType: "GuardianCap", itemAssetName: "GuardianCap_None" }])] }) }));
  const before = structuredClone(visuals);
  for (let seed = 0; seed < 25; seed++) {
    const result = patchFreshmanEquipment(players, visuals, 10, { seed, top: 2 });
    assert.equal(result.changes[0].unlockedChanges, undefined); assert.equal(result.changes[0].rawChanges, undefined);
    const assets = JSON.parse(result.changes[0].newRawData).loadouts.flatMap(item => item.loadoutElements).map(item => item.itemAssetName);
    assert.ok(!assets.some(name => /NeckWear_|GuardianCap_Raw|GearLegBase_Socks/.test(name)));
  }
  visuals[1].RawData = JSON.stringify({ loadouts: [field([{ slotType: "GuardianCap", itemAssetName: "GuardianCap_RawBattleSkullCap" }])] });
  visuals[2].RawData = visuals[1].RawData;
  for (const mode of ["full", "mixed", "cross", "selected"]) {
    const result = patchFreshmanEquipment(players, visuals, 10, { seed: 5, top: 2, mixedChance: mode === "mixed" ? 1 : 0, crossMixedChance: 0, forceCrossPosition: mode === "cross", ...(mode === "selected" ? { donorRows: [1, 2] } : {}) });
    assert.ok(JSON.parse(result.changes[0].newRawData).loadouts[0].loadoutElements.some(item => item.slotType === "GuardianCap" && item.itemAssetName === "GuardianCap_RawBattleSkullCap"), mode);
  }
  assert.deepEqual(visuals[0], before[0], "preview never changes recipient records");
});
