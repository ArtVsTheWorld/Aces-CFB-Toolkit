import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { EQUIPMENT_ITEMS, UNLOCKED_POOLS, RAW_ACCESSORIES_POOLS, equipmentItem, equipmentDisplayName, equipmentDisplayValue, isToolMouthpieceColor, recolorEquipmentItem, recolorMouthpieceItem } from "../src/main/tools/equipment/catalog.js";
import { applyUnlockedRandomizerEquipment, applyNoDripEquipment, normalizeMouthpieceColor, mulberry32, unlockedElbowPoolForPosition } from "../src/main/tools/equipment/core/patcher.js";
import { enforceEquipmentCompatibility, isMaskOrBalaclava } from "../src/main/tools/equipment/core/compatibility.js";
import { applyGlobalEquipmentFixes, rollUnlockedMouthpiece } from "../src/main/tools/equipment/core/globalFixes.js";
import { equipmentPreviewChanges, summarizeVisualChanges } from "../src/main/tools/equipment/preview.js";
import { buildFacePaintPool } from "../src/main/tools/equipment/core/facepaint.js";

const source = JSON.parse(fs.readFileSync(new URL("../src/main/tools/equipment/equipmentSourcedInventory.json", import.meta.url), "utf8"));
const evidence = JSON.parse(fs.readFileSync(new URL("./fixtures/equipmentDisplayNameEvidence.json", import.meta.url), "utf8"));
const verified = new Set(evidence.verified.map(item => item.itemName));
const item = (slotType, itemAssetName) => ({ slotType, itemAssetName });
const field = elements => ({ loadoutType: "PlayerOnField", loadoutElements: elements });
const raw = elements => JSON.stringify({ loadouts: [field(elements)], metadata: "preserve" });
const ref = row => (10).toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
const player = row => ({ isEmpty: false, CharacterVisuals: ref(row), FirstName: "Test", LastName: String(row), Position: "WR", SchoolYear: "Freshman", TeamIndex: 1, IsNIL: false });

test("all newly catalogued items have exact live or exported ItemName evidence and readable names", () => {
  for (const entry of source.items) {
    assert.ok(verified.has(entry.itemName) || (entry.itemName === "LegTattoo_TEST" && entry.labelSource?.sheet === "ItemInfo" && entry.labelSource?.row === 708), entry.itemName);
    assert.notEqual(equipmentDisplayName(entry.itemName), entry.itemName);
    assert.ok(entry.slots.length > 0);
  }
  assert.equal(new Set(EQUIPMENT_ITEMS.map(item => item.itemName)).size, EQUIPMENT_ITEMS.length);
});

test("six sourced branded turtlenecks join only Unlocked neckwear with verified cloth/logo descriptions", () => {
  for (let style = 2; style <= 7; style++) {
    const asset = `NeckWear_Turtleneck_Tight${style}`;
    assert.ok(UNLOCKED_POOLS.neckwear.some(item => item.itemName === asset));
    assert.ok(!Object.values(RAW_ACCESSORIES_POOLS).flat().some(item => item.itemName === asset));
    assert.match(equipmentDisplayName(asset), /(?:Battle|NXTRND) Turtleneck (?:Primary|White) \/ (?:White|Black|Primary) Logo/);
  }
  assert.equal(recolorEquipmentItem("NeckWear_Turtleneck_Tight2", "white"), "NeckWear_Turtleneck_Tight6");
  assert.equal(recolorEquipmentItem("NeckWear_Turtleneck_Tight7", "primary"), "NeckWear_Turtleneck_Tight4");
  for (const asset of ["NeckWear_Turtleneck_Tight2", "NeckWear_Turtleneck_Tight3", "NeckWear_Turtleneck_Tight5"]) {
    for (const theme of ["black", "secondary"]) assert.equal(recolorEquipmentItem(asset, theme), asset);
  }
  assert.equal(recolorEquipmentItem("NeckWear_Turtleneck_Tight3", "white"), "NeckWear_Turtleneck_Tight3", "no invented white cloth / black logo variant");
});

test("eight two-color branded mouthpieces are available without allowing arbitrary colors", () => {
  const assets = source.items.filter(item => item.category === "Mouthpiece").map(item => item.itemName);
  assert.equal(assets.length, 8);
  for (const asset of assets) {
    assert.ok(isToolMouthpieceColor(asset));
    assert.ok(UNLOCKED_POOLS.unlockedMouthpieces.some(item => item.itemName === asset));
    assert.ok(UNLOCKED_POOLS.hangingMouthpieces.some(item => item.itemName === asset));
    for (const theme of ["White", "Black", "Primary", "Secondary"]) {
      const output = normalizeMouthpieceColor(asset, theme);
      assert.ok(equipmentItem(output), `${asset}/${theme}`);
      assert.ok(isToolMouthpieceColor(output));
    }
  }
  assert.equal(recolorMouthpieceItem("GearMouthpiece_PacifierDualHanging_Black4", "primary"), "GearMouthpiece_PacifierDualHanging_TeamColor5", "numbered IDs must not mix Nike and Battle families");
  const rng = mulberry32(87), seen = new Set();
  for (let i = 0; i < 15000; i++) {
    const chosen = rollUnlockedMouthpiece("skill", rng).item;
    assert.ok(isToolMouthpieceColor(chosen.itemName)); seen.add(chosen.itemName);
  }
  for (const asset of assets) assert.ok(seen.has(asset));
});

test("rubber bands retain elbow position restrictions and new pads/towel use the correct existing slots", () => {
  for (const position of ["QB", "K", "P"]) assert.deepEqual(unlockedElbowPoolForPosition(position), []);
  for (const position of ["WR", "LT", "DT", "CB"]) {
    const names = unlockedElbowPoolForPosition(position).map(item => item.itemName);
    for (let style = 1; style <= 3; style++) assert.ok(names.includes(`ElbowGear_RubberBands${style}`));
  }
  assert.equal(UNLOCKED_POOLS.thighPads.length, 6); assert.equal(UNLOCKED_POOLS.towels.length, 1);
  for (const pad of UNLOCKED_POOLS.thighPads) assert.deepEqual(pad.slots, ["LeftThighWear", "RightThighWear"]);
  assert.deepEqual(UNLOCKED_POOLS.towels[0].slots, ["Towel"]);
  assert.equal(recolorEquipmentItem("ElbowGear_RubberBands1", "white"), "ElbowGear_RubberBands1", "no invented band colors");
});

test("normal masks recolor to all four colors in FaceWear; under-lip, removal and no-tattoo entries are never generated", () => {
  const names = { white: "FaceGear_BalaclavaOverNose_White", black: "FaceGear_BalaclavaOverNose", primary: "FaceGear_BalaclavaOverNose_Primary", secondary: "FaceGear_BalaclavaOverNose_Secondary" };
  for (const asset of Object.values(names)) for (const [theme, target] of Object.entries(names)) assert.equal(recolorEquipmentItem(asset, theme), target);
  assert.equal(UNLOCKED_POOLS.balaclavas.length, 4);
  const pools = [...Object.values(UNLOCKED_POOLS), ...Object.values(RAW_ACCESSORIES_POOLS)].flat();
  assert.ok(pools.every(item => !item.displayOnly && !/Under Lip|Remove Balaclava|No Tattoo/.test(item.displayName)));
  for (const entry of source.items.filter(item => item.displayOnly)) assert.equal(recolorEquipmentItem(entry.itemName, "primary"), entry.itemName);
  assert.equal(isMaskOrBalaclava("FaceGear_BalaclavaNone", true), false);
});

test("new optional categories are reachable, deterministic, brand-safe and removable by No Drip", () => {
  const seen = new Set();
  for (let seed = 0; seed < 800; seed++) {
    const loadouts = [field([])], replay = [field([])];
    const changes = applyUnlockedRandomizerEquipment(loadouts, { position: "WR", branding: "Nike" }, mulberry32(seed), 0.7);
    assert.deepEqual(applyUnlockedRandomizerEquipment(replay, { position: "WR", branding: "Nike" }, mulberry32(seed), 0.7), changes);
    assert.deepEqual(loadouts, replay);
    for (const entry of loadouts[0].loadoutElements) {
      seen.add(entry.itemAssetName);
      assert.ok(equipmentItem(entry.itemAssetName)?.slots.includes(entry.slotType), `${entry.slotType}/${entry.itemAssetName}`);
    }
    applyNoDripEquipment(loadouts, "WR");
    assert.ok(!loadouts[0].loadoutElements.some(item => item.slotType === "Towel" && item.itemAssetName === "Towel2_South"));
    assert.ok(!loadouts[0].loadoutElements.some(item => /BalaclavaOverNose/.test(item.itemAssetName)));
  }
  for (const entry of source.items.filter(item => item.origin === "unlocked" && !item.displayOnly)) assert.ok(seen.has(entry.itemName), entry.itemName);
  for (const asset of Object.keys(source.displayNames).filter(name => name.startsWith("NeckWear_"))) assert.ok(seen.has(asset));
  const unchanged = [field([item("HeadWear", "Original")])], before = structuredClone(unchanged);
  assert.deepEqual(applyUnlockedRandomizerEquipment(unchanged, { position: "WR" }, () => 0, 0), []);
  assert.deepEqual(unchanged, before);
});

test("new FaceWear masks share existing hanging-mouthpiece compatibility and preserve unrelated gear", () => {
  for (const asset of UNLOCKED_POOLS.balaclavas.map(item => item.itemName)) {
    const elements = [item("HeadWear", "Original Helmet"), item("FaceWear", asset), item("MouthWear", "GearMouthpiece_Mouthguard_White")];
    const corrections = enforceEquipmentCompatibility(elements, { usingUnlockedMod: true });
    assert.equal(corrections.length, 1);
    assert.equal(elements[0].itemAssetName, "Original Helmet"); assert.equal(elements[1].itemAssetName, asset);
    assert.equal(elements[2].itemAssetName, "GearMouthpiece_None");
  }
  const players = Array.from({ length: 20 }, (_, row) => player(row));
  const visuals = players.map(() => ({ isEmpty: false, RawData: raw([item("FaceWear", "FaceGear_BalaclavaOverNose"), item("HeadWear", "Original Helmet")]) }));
  applyGlobalEquipmentFixes(players, visuals, 10, { unlockedMouthpieceFix: true, seed: 33 });
  let equipped = 0;
  for (const visual of visuals) {
    const gear = JSON.parse(visual.RawData).loadouts[0].loadoutElements, mouth = gear.find(item => item.slotType === "MouthWear");
    if (mouth) { equipped++; assert.match(mouth.itemAssetName, /PacifierDualHanging/); }
    assert.equal(gear.find(item => item.slotType === "HeadWear").itemAssetName, "Original Helmet");
  }
  assert.ok(equipped > 0 && equipped <= 17);
});

test("readable preview gear changes stay separate from exact CSV item IDs and do not modify RawData", () => {
  const before = raw([item("MouthWear", "GearMouthpiece_None"), item("NeckWear", "NeckWear_Turtleneck_Tight2")]);
  const after = raw([item("MouthWear", "GearMouthpiece_PacifierDualHanging_TeamColor9"), item("NeckWear", "NeckWear_Turtleneck_Tight6")]);
  const changes = equipmentPreviewChanges(before, after);
  assert.equal(changes.length, 2);
  assert.match(changes[0].proposedValue, /Nike.*Secondary \/ Black/); assert.match(changes[1].proposedValue, /Battle.*White \/ Primary Logo/);
  assert.doesNotMatch(JSON.stringify(changes), /GearMouthpiece_|NeckWear_/);
  assert.match(summarizeVisualChanges(before, after), /GearMouthpiece_PacifierDualHanging_TeamColor9/);
  assert.match(equipmentDisplayValue("Mask FaceGear_BalaclavaOverNose_White + ElbowGear_RubberBands3"), /Mask White Balaclava \+ Rubber Bands 3/);
  assert.deepEqual(equipmentPreviewChanges(before, before), []);
  assert.equal(before, raw([item("MouthWear", "GearMouthpiece_None"), item("NeckWear", "NeckWear_Turtleneck_Tight2")]));
});

test("all independent vanilla and mod facepaint values have readable labels without changing pools", () => {
  for (const options of [{}, { usingUnlockedMod: true }, { usingRawAccessoriesMod: true }, { usingUnlockedMod: true, usingRawAccessoriesMod: true }]) {
    for (const asset of buildFacePaintPool([], options).options) assert.notEqual(equipmentDisplayName(asset), asset, asset);
  }
  assert.equal(equipmentDisplayName("FaceMarks_RawNoseTape_dontblink"), "Nose and Eye Tape — Don't Blink");
  assert.equal(equipmentDisplayName("Unknown_Mod_Item"), "Unknown_Mod_Item", "unknown labels must not be guessed");
});
