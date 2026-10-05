import test from "node:test";
import assert from "node:assert/strict";
import { buildFacePaintPool, facePaintOptionsForPosition, rollFacePaint, VANILLA_FACE_PAINT_OPTIONS } from "../src/main/tools/equipment/core/facepaint.js";
import { patchFreshmanEquipment, getCrossDonorPositions, applyUnlockedRandomizerEquipment, applyRawRandomizerEquipment, applyNoDripEquipment, mulberry32 } from "../src/main/tools/equipment/core/patcher.js";
import { applyGlobalEquipmentFixes } from "../src/main/tools/equipment/core/globalFixes.js";
import { isArmTape, recolorTapeItem, recolorPlayerAccessories } from "../src/main/tools/equipment/core/recolor.js";
import { equipmentItem, EQUIPMENT_ITEMS, UNLOCKED_POOLS, RAW_ACCESSORIES_POOLS } from "../src/main/tools/equipment/catalog.js";
import { enforceEquipmentCompatibility } from "../src/main/tools/equipment/core/compatibility.js";
import fs from "node:fs";
import { VALID_POSITIONS } from "../src/main/tools/equipment/shared.js";

const flags = { usingUnlockedMod: true, usingRawAccessoriesMod: true };
const receiving = "FaceMarks_RawNoseTape_imfnopen", hitter = "FaceMarks_RawNoseTape_1hitta";
const defense = new Set(["LE", "RE", "DT", "LOLB", "MLB", "ROLB", "CB", "FS", "SS", "LEDG", "REDG", "SAM", "MIKE", "WILL", "EDGE", "LB", "SAFETY"]);
const colors = { white: "OffWhite", black: "Black", primary: "TeamColor", secondary: "SecondaryColor" };
const tape = (length, color) => `GearArmSleeve_${length}_armTape_normal_${colors[color]}`;
const ref = row => "000000000001010" + row.toString(2).padStart(17, "0");
const player = (row, position, year = "Freshman") => ({ isEmpty: false, FirstName: "Test", LastName: String(row), Position: position, SchoolYear: year, RedshirtStatus: year === "Freshman" ? "Eligible" : "Previous", CharacterBodyType: "Thin", CharacterVisuals: ref(row), IsNIL: false, TeamIndex: 1, OverallRating: 90 - row });
const field = elements => ({ loadoutType: "PlayerOnField", loadoutElements: elements });
const visual = elements => ({ isEmpty: false, RawData: JSON.stringify({ loadouts: [field(elements)] }) });

test("all game positions and localization aliases receive only sensible slogan facepaints", () => {
  const { options } = buildFacePaintPool([], flags);
  for (const position of [...VALID_POSITIONS, "LEDG", "REDG", "SAM", "MIKE", "WILL", "LB", "EDGE", "SAFETY", "Unknown"]) {
    const allowed = facePaintOptionsForPosition(options, position);
    assert.equal(allowed.includes(receiving), ["WR", "TE"].includes(position), position);
    assert.equal(allowed.includes(hitter), defense.has(position), position);
    for (const name of ["FaceMarks_RawNoseTape_dontblink", "FaceMarks_RawNoseTape_fearnone", "FaceMarks_RawNoseTape_nolove", "FaceMarks_RawNoseTape_john316", "FaceMarks_RawNoseTape_540baby"]) assert.ok(allowed.includes(name), name);
    for (const [index, asset] of allowed.entries()) { const draws = [0.6, (index + 0.5) / allowed.length]; assert.equal(rollFacePaint(() => draws.shift(), options, position), asset); }
    assert.deepEqual(facePaintOptionsForPosition([...VANILLA_FACE_PAINT_OPTIONS], position), [...VANILLA_FACE_PAINT_OPTIONS]);
    assert.equal(rollFacePaint(() => 0.59, options, position), "FaceMarks_None");
  }
});

test("facepaint restrictions use the recipient position through full, mixed, cross-position, and selected-donor paths", () => {
  const { options: pool } = buildFacePaintPool([], flags);
  for (const position of VALID_POSITIONS) for (const mode of ["full", "mixed", "cross", "selected"]) {
    const cross = getCrossDonorPositions(position)[0] ?? position;
    const players = [player(0, position), player(1, position, "Senior"), player(2, cross, "Senior")];
    const visuals = players.map(() => visual([{ slotType: "FacePaint", itemAssetName: receiving }, { slotType: "OuterPants", itemAssetName: "GearPants_Standard" }]));
    const before = structuredClone(visuals), allowed = new Set(facePaintOptionsForPosition(pool, position));
    for (let seed = 0; seed < 75; seed++) {
      const result = patchFreshmanEquipment(players, visuals, 10, { ...flags, seed, top: 2, unlockedItemChance: 0, mixedChance: mode === "mixed" ? 1 : 0, crossMixedChance: 0, forceCrossPosition: mode === "cross", ...(mode === "selected" ? { donorRows: [1, 2] } : {}), apply: false });
      assert.equal(result.changes.length, 1, `${position}/${mode}`);
      const asset = result.changes[0].facePaint[0].asset;
      assert.ok(asset === "FaceMarks_None" || allowed.has(asset), `${position}/${mode}/${asset}`);
      assert.deepEqual(visuals, before, "Preview and protected donor gear remain untouched");
    }
  }
});

test("long and short arm tape support every verified color without changing length or side", () => {
  for (const length of ["Undershirt", "Quarter"]) for (const oldColor of Object.keys(colors)) for (const [color, token] of Object.entries(colors)) for (const slot of ["LeftArmWear", "RightArmWear"]) {
    const asset = tape(length, oldColor), expected = tape(length, color);
    assert.ok(isArmTape(asset, slot)); assert.ok(equipmentItem(expected)?.slots.includes(slot));
    assert.equal(recolorTapeItem(asset, color, slot), expected);
    assert.ok(expected.endsWith(token));
  }
  for (const asset of ["GearArmSleeve_Bands_armTape_normal_OffWhite", "GearArmSleeve_Elbow_armTape_normal_Black", "GearArmSleeve_Baggy_Black", "Custom_ArmTape_Black"]) {
    assert.equal(isArmTape(asset, "LeftArmWear"), false);
    assert.equal(recolorTapeItem(asset, "primary", "LeftArmWear"), asset);
  }
  assert.equal(isArmTape(tape("Undershirt", "black"), "LeftElbowWear"), false);
  assert.equal(recolorTapeItem("GearWrist_gloveTapedNormal_White", "primary", "LeftWristWear"), "GearWrist_gloveTapedNormal_White", "unavailable glove-tape variants must not be synthesized");
});

test("arm tape follows Tape Color, while ordinary sleeves and bands keep the accessory color", () => {
  const loadouts = [field([
    { slotType: "LeftArmWear", itemAssetName: tape("Undershirt", "primary") },
    { slotType: "RightArmWear", itemAssetName: tape("Quarter", "secondary") },
    { slotType: "LeftWristWear", itemAssetName: "GearWrist_wristTapedNormal_Black" },
    { slotType: "RightWristWear", itemAssetName: "GearWrist_wristBandNormal_Black" },
    { slotType: "LeftSpat", itemAssetName: "GearSpats_spatThin_Black" },
    { slotType: "MouthWear", itemAssetName: "GearMouthpiece_PacifierDualHanging_Black" }
  ]), field([{ slotType: "LeftArmWear", itemAssetName: "GearArmSleeve_Baggy_Black" }])];
  recolorPlayerAccessories(loadouts, "secondary", "white");
  const slots = new Map(loadouts[0].loadoutElements.map(item => [item.slotType, item.itemAssetName]));
  assert.equal(slots.get("LeftArmWear"), tape("Undershirt", "white")); assert.equal(slots.get("RightArmWear"), tape("Quarter", "white"));
  assert.equal(slots.get("LeftWristWear"), "GearWrist_wristTapedNormal_White"); assert.equal(slots.get("LeftSpat"), "GearSpats_spatThin_White");
  assert.equal(slots.get("RightWristWear"), "GearWrist_wristBandNormal_SecondaryColor"); assert.equal(slots.get("MouthWear"), "GearMouthpiece_PacifierDualHanging_Black");
  assert.equal(loadouts[1].loadoutElements[0].itemAssetName, "GearArmSleeve_Baggy_SecondaryColor");
});

test("seeded team tape rolls remain shared across long/short arms, wrists, spats, and field loadouts", () => {
  const players = Array.from({ length: 120 }, (_, row) => player(row, "WR"));
  const records = players.map(() => ({ isEmpty: false, RawData: JSON.stringify({ loadouts: [field([
    { slotType: "LeftArmWear", itemAssetName: tape("Undershirt", "white") },
    { slotType: "RightArmWear", itemAssetName: tape("Quarter", "white") },
    { slotType: "LeftWristWear", itemAssetName: "GearWrist_wristTapedLite_White" },
    { slotType: "LeftSpat", itemAssetName: "GearSpats_spatThin_White" }
  ]), field([{ slotType: "RightArmWear", itemAssetName: tape("Undershirt", "white") }]), { loadoutCategory: "Base", loadoutElements: [{ slotType: "LeftArmTattoo", itemAssetName: "Keep" }] }] }) }));
  const a = structuredClone(records), b = structuredClone(records), options = { seed: 99, unlockedRecolorFix: true, tapeColorMode: "distribution", unlockedColorTheme: "black", teamNames: new Map([[1, "Team"]]), teamTapeColors: { team: { white: 25, black: 25, primary: 25, secondary: 25 } } };
  applyGlobalEquipmentFixes(players, a, 10, options); applyGlobalEquipmentFixes(players, b, 10, options); assert.deepEqual(a, b);
  const seen = new Set();
  for (const record of a) {
    const raw = JSON.parse(record.RawData), elements = raw.loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField").flatMap(loadout => loadout.loadoutElements);
    const color = elements[0].itemAssetName.split("_").at(-1); seen.add(color);
    assert.ok(elements.every(item => item.itemAssetName.endsWith(color === "OffWhite" && /Spat|Wrist/.test(item.slotType) ? "White" : color)));
    assert.equal(raw.loadouts[2].loadoutElements[0].itemAssetName, "Keep");
  }
  assert.equal(seen.size, 4);
});

test("new mod accessories have explicit slot mappings and candidate-only assets stay out of pools", () => {
  const inventory = JSON.parse(fs.readFileSync(new URL("../src/main/tools/equipment/equipmentModInventory.json", import.meta.url), "utf8"));
  const additions = Object.values(inventory.mods).flatMap(mod => mod.equipmentItems ?? []);
  assert.equal(additions.length, 12);
  assert.equal(new Set(EQUIPMENT_ITEMS.map(item => item.itemName)).size, EQUIPMENT_ITEMS.length);
  for (const item of additions) {
    assert.deepEqual(item.slots, [item.itemName.startsWith("NeckWear_") ? "NeckWear" : "Neckpad"]);
    assert.equal(equipmentItem(item.itemName).displayName, item.displayName);
    assert.ok(!item.displayName.includes("undefined"));
  }
  const activeItems = new Set([...UNLOCKED_POOLS.neckwear, ...RAW_ACCESSORIES_POOLS.neckwear].map(item => item.itemName));
  for (const item of inventory.equipmentVerification.candidateOnlyItemNames) assert.ok(!activeItems.has(item));
  assert.equal(inventory.equipmentVerification.slotEvidence[0].slot, "NeckWear");
});

test("every Raw turtleneck, necklace, and skullcap is reachable in its own slot without replacing unrelated gear", () => {
  const original = [field([{ slotType: "HeadWear", itemAssetName: "KeepHelmet" }, { slotType: "LeftShoe", itemAssetName: "KeepCleat" }, { slotType: "FacePaint", itemAssetName: "KeepPaint" }]), field([{ slotType: "Visor", itemAssetName: "KeepVisor" }])];
  const seen = new Set();
  for (let seed = 0; seed < 100; seed++) {
    const a = structuredClone(original), b = structuredClone(original);
    const changes = applyRawRandomizerEquipment(a, mulberry32(seed), 1);
    assert.deepEqual(applyRawRandomizerEquipment(b, mulberry32(seed), 1), changes); assert.deepEqual(a, b);
    assert.equal(changes.length, 2); changes.forEach(change => seen.add(change.newItem));
    const items = changes.map(change => equipmentItem(change.newItem));
    const changedSlots = new Set(items.flatMap(item => item.slots));
    for (const [index, loadout] of a.entries()) {
      assert.deepEqual(loadout.loadoutElements.filter(element => !changedSlots.has(element.slotType)), original[index].loadoutElements);
      for (const item of items) assert.equal(loadout.loadoutElements.find(element => element.slotType === item.slots[0]).itemAssetName, item.itemName);
      assert.equal(loadout.loadoutType, "PlayerOnField"); assert.equal(loadout.loadoutCategory, undefined);
    }
  }
  assert.deepEqual([...seen].sort(), [...RAW_ACCESSORIES_POOLS.neckwear, ...RAW_ACCESSORIES_POOLS.skullcaps].map(item => item.itemName).sort());
  const disabled = structuredClone(original);
  assert.deepEqual(applyRawRandomizerEquipment(disabled, mulberry32(12), 0), []); assert.deepEqual(disabled, original);
});

test("Unlocked fitted turtlenecks use NeckWear, while legacy neckwear still uses Neckpad", () => {
  const seen = new Set();
  for (let seed = 0; seed < 250; seed++) {
    const loadouts = [field([])];
    const change = applyUnlockedRandomizerEquipment(loadouts, { position: "WR", branding: "Nike" }, mulberry32(seed), 1).find(item => item.category === "Neckwear");
    assert.ok(change); seen.add(change.newItem);
    const selected = equipmentItem(change.newItem);
    assert.equal(loadouts[0].loadoutElements.find(element => element.slotType === selected.slots[0]).itemAssetName, selected.itemName);
    if (change.newItem.startsWith("NeckWear_")) assert.ok(!loadouts[0].loadoutElements.some(element => element.slotType === "Neckpad"));
  }
  assert.deepEqual([...seen].sort(), UNLOCKED_POOLS.neckwear.map(item => item.itemName).sort());
});

test("No Drip removes new neckwear and necklaces without changing helmets, mouthpieces, or shoes", () => {
  const loadouts = [field([{ slotType: "NeckWear", itemAssetName: "NeckWear_Raw_Turtleneck_Black" }, { slotType: "Neckpad", itemAssetName: "GearNeckpad_Raw_GoldCrossNecklace" }, { slotType: "HeadWear", itemAssetName: "KeepHelmet" }, { slotType: "MouthWear", itemAssetName: "KeepMouthpiece" }, { slotType: "LeftShoe", itemAssetName: "KeepCleat" }])];
  const kept = loadouts[0].loadoutElements.slice(2);
  applyNoDripEquipment(loadouts, "WR");
  assert.equal(loadouts[0].loadoutElements[0].itemAssetName, "NeckWear_None"); assert.equal(loadouts[0].loadoutElements[1].itemAssetName, "GearNeckpad_None");
  assert.deepEqual(loadouts[0].loadoutElements.slice(2), kept);
});

test("repurposed balaclavas keep the hanging-only mouthpiece safeguard without treating turtlenecks as masks", () => {
  for (const mask of ["GearNeckpad_VintageNeckRoll", "GearNeckpad_VintageSingleNeckRoll"]) {
    const ordinary = [{ slotType: "Neckpad", itemAssetName: mask }, { slotType: "MouthWear", itemAssetName: "GearMouthpiece_PacifierDual_White" }];
    assert.deepEqual(enforceEquipmentCompatibility(ordinary), [], "without Unlocked, vintage neck rolls are not masks");
    assert.equal(enforceEquipmentCompatibility(ordinary, { usingUnlockedMod: true })[0].kind, "mask-mouthpiece"); assert.equal(ordinary[1].itemAssetName, "GearMouthpiece_None");
    const hanging = [{ slotType: "Neckpad", itemAssetName: mask }, { slotType: "MouthWear", itemAssetName: "GearMouthpiece_PacifierDualHanging_White" }];
    assert.deepEqual(enforceEquipmentCompatibility(hanging, { usingUnlockedMod: true }), []);
  }
  const turtleneck = [{ slotType: "NeckWear", itemAssetName: "NeckWear_Turtleneck_Tight2" }, { slotType: "MouthWear", itemAssetName: "GearMouthpiece_PacifierDual_White" }];
  assert.deepEqual(enforceEquipmentCompatibility(turtleneck), []);
});

test("both pool controls share the extra-gear chance and explain neckwear plus the arm-tape scope", () => {
  const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
  assert.match(renderer, /equipment-raw-accessories"\)\?\.addEventListener\("change", updateExtraGearChance/);
  assert.match(renderer, /Raw turtlenecks, gold\/silver cross necklaces/);
  assert.match(renderer, /spats, wrist tape, and long\/short arm tape/);
});

test("the separate NeckWear field is donor-copied in full, mixed, cross-position, and selected modes", () => {
  const players = [player(0, "WR"), player(1, "WR", "Senior"), player(2, "CB", "Senior")];
  const visuals = [visual([{ slotType: "NeckWear", itemAssetName: "NeckWear_None" }]), visual([{ slotType: "NeckWear", itemAssetName: "NeckWear_Raw_Turtleneck_Black" }]), visual([{ slotType: "NeckWear", itemAssetName: "NeckWear_Raw_Turtleneck_White" }])];
  const before = structuredClone(visuals);
  for (const mode of ["full", "mixed", "cross", "selected"]) for (let seed = 0; seed < 15; seed++) {
    const result = patchFreshmanEquipment(players, visuals, 10, { top: 2, seed, mixedChance: mode === "mixed" ? 1 : 0, crossMixedChance: 0, forceCrossPosition: mode === "cross", ...(mode === "selected" ? { donorRows: [1, 2] } : {}) });
    const elements = JSON.parse(result.changes[0].newRawData).loadouts[0].loadoutElements;
    assert.ok(["NeckWear_Raw_Turtleneck_Black", "NeckWear_Raw_Turtleneck_White"].includes(elements.find(item => item.slotType === "NeckWear")?.itemAssetName), mode);
    assert.deepEqual(visuals, before);
  }
});
