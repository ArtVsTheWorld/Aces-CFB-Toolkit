import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { patchFreshmanEquipment, mulberry32 } from "../src/main/tools/equipment/core/patcher.js";
import { applyGlobalEquipmentFixes } from "../src/main/tools/equipment/core/globalFixes.js";
import { isBrandCompatibleItem, assignCompatibleBrandEquipment, guardBrandEquipment, BRAND_SLOTS } from "../src/main/tools/equipment/core/brandCompatibility.js";
import { buildFacePaintPool, rollFacePaint, VANILLA_FACE_PAINT_OPTIONS } from "../src/main/tools/equipment/core/facepaint.js";
import { buildTeamApparel, buildRosterPlayerApparel } from "../src/main/tools/equipment/shared.js";
import { normalizeEquipmentOptions } from "../src/main/tools/equipment/runner.js";
import { summarizeVisualChanges } from "../src/main/tools/equipment/preview.js";
import { brandedEquipmentItems } from "../src/main/tools/equipment/catalog.js";

const inventory = JSON.parse(fs.readFileSync(new URL("../src/main/tools/equipment/equipmentModInventory.json", import.meta.url), "utf8"));
const ref = (table, row) => table.toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
const shoes = { nike: "GearFootwear_shoe_low_NikeVaporEdge", adidas: "GearFootwear_shoe_low_AdidasAdizero_LTA58", underarmour: "GearFootwear_shoe_low_UnderArmourBlurPro2025", jordan: "GearFootwear_shoe_low_AirJordan1VaporEdge", newbalance: "GearFootwear_shoe_low_NewBalance_Prodigy" };
const item = (slotType, itemAssetName) => ({ slotType, itemAssetName });
const kit = (shoe, pants = "GearPants_Standard", paint = "FaceMarks_None") => [item("HeadWear", "DonorHelmet"), item("OuterPants", pants), item("FacePaint", paint), item("LeftShoe", shoe), item("RightShoe", shoe), item("LeftHandWear", "GearHand_None"), item("RightHandWear", "GearHand_None"), item("InnerSocks", "Gear_Socks_Low")];
const visual = elements => ({ RawData: JSON.stringify({ unrelated: "keep", loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: elements }] }), isEmpty: false });
const player = (row, position = "WR", year = "Senior", team = 1) => ({ FirstName: "Player", LastName: String(row), Position: position, SchoolYear: year, RedshirtStatus: year === "Freshman" ? "Eligible" : "Previous", CharacterBodyType: "Thin", CharacterVisuals: ref(10, row), IsNIL: false, TeamIndex: team, OverallRating: 90 - row, JerseyNum: row, isEmpty: false });
const loadouts = value => JSON.parse(value).loadouts;
const slotValue = (raw, slot) => loadouts(raw)[0].loadoutElements.find(element => element.slotType === slot)?.itemAssetName;
function fixture(brand = "underarmour") {
  const players = [player(0, "WR", "Freshman", 1), player(1), player(2, "CB"), player(3, "WR", "Senior", 2)];
  const visuals = [visual(kit(shoes[brand], "GearPants_AboveKnee")), visual(kit(shoes.nike)), visual(kit(shoes.nike)), visual(kit(shoes[brand]))];
  return { players, visuals, options: { teamNames: new Map([[1, "Team"], [2, "Other"]]), teamApparel: new Map([[1, brand], [2, brand]]), top: 10, seed: 400, apply: true } };
}

test("explicit team indexes cannot be overwritten by another team's row fallback", () => {
  const teams = Array.from({ length: 130 }, (_, row) => ({ TeamIndex: row + 200, TeamApparel: "Nike" }));
  teams[22] = { TeamIndex: 127, TeamApparel: "UnderArmour" }; teams[127] = { TeamIndex: 327, TeamApparel: "Adidas" };
  const brands = buildTeamApparel(teams); assert.equal(brands.get(127), "underarmour"); assert.equal(brands.get(327), "adidas");
});

test("actual roster membership resolves TeamBuilder brand collisions, ambiguous membership stays unknown", () => {
  const players = { header: { tableId: 2 } }, rosters = { header: { tableId: 3 }, records: [{ arraySize: 1, Player0: ref(2, 0) }, { arraySize: 1, Player0: ref(2, 1) }, { arraySize: 1, Player0: ref(2, 0) }] };
  const teams = { records: [{ TeamIndex: 1, TeamApparel: "Nike", Roster: ref(3, 0) }, { TeamIndex: 1, TeamApparel: "UnderArmour", Roster: ref(3, 1) }] };
  assert.deepEqual([...buildRosterPlayerApparel(players, teams, rosters)], [[0, "nike"], [1, "underarmour"]]);
  teams.records.push({ TeamIndex: 1, TeamApparel: "Adidas", Roster: ref(3, 2) });
  assert.equal(buildRosterPlayerApparel(players, teams, rosters).get(0), null);
});

test("shoe compatibility uses verified catalog tags, not misleading repurposed ItemNames", () => {
  assert.equal(isBrandCompatibleItem("LeftShoe", "GearFootwear_shoe_low_Jordan5_99Club2", "Nike"), true);
  assert.equal(isBrandCompatibleItem("LeftShoe", "GearFootwear_shoe_low_Jordan5_99Club2", "JordanBrand"), false);
  assert.equal(isBrandCompatibleItem("LeftShoe", "Unknown_Nike_Shoe", "Nike"), false);
  for (const [brand, shoe] of Object.entries(shoes)) { assert.ok(isBrandCompatibleItem("LeftShoe", shoe, brand)); assert.ok(isBrandCompatibleItem("LeftHandWear", "GearHand_None", brand)); }
});

for (const brand of Object.keys(shoes)) for (const [mode, options] of [
  ["single", { mixedChance: 0, crossMixedChance: 0 }], ["multiple", { mixedChance: 1, crossMixedChance: 0 }],
  ["cross", { mixedChance: 0, crossMixedChance: 1, forceCrossPosition: true }],
  ["specific donors", { donorRows: [1, 2], mixedChance: 1, crossMixedChance: 0 }],
  ["unlocked", { usingUnlockedMod: true, unlockedItemChance: 1, mixedChance: 1, crossMixedChance: 0 }]
]) test(`${brand} shoe and glove compatibility holds in ${mode} mode without restricting universal donors`, () => {
  const f = fixture(brand); const originalDonors = f.visuals.slice(1).map(value => value.RawData);
  const result = patchFreshmanEquipment(f.players, f.visuals, 10, { ...f.options, ...options });
  assert.equal(result.changes.length, 1);
  const change = result.changes[0];
  for (const element of loadouts(change.newRawData)[0].loadoutElements) if (BRAND_SLOTS.has(element.slotType)) assert.ok(isBrandCompatibleItem(element.slotType, element.itemAssetName, brand), JSON.stringify(element));
  assert.equal(slotValue(change.newRawData, "HeadWear"), "DonorHelmet");
  assert.deepEqual(f.visuals.slice(1).map(value => value.RawData), originalDonors, "donor gear stays protected");
  if (mode === "specific donors") assert.ok(change.donorUses.every(use => [1, 2].includes(use.donor.row)));
  if (mode === "cross") assert.ok(change.donorUses.every(use => use.donor.position === "CB"));
});

test("cross-brand donors with genuinely compatible shoe tags can supply that field", () => {
  const f = fixture("underarmour"); f.options.teamApparel.set(2, "nike");
  const result = patchFreshmanEquipment(f.players, f.visuals, 10, { ...f.options, donorRows: [3], mixedChance: 0, crossMixedChance: 0 });
  assert.equal(result.changes[0].donorUses.find(use => use.group === "brand-compatible cleats").donor.row, 3);
  assert.equal(slotValue(result.changes[0].newRawData, "LeftShoe"), shoes.underarmour);
});

test("branded gloves are validated per field, independently of the helmet and shoe donor", () => {
  for (const brand of ["nike", "adidas", "underarmour", "jordan"]) {
    const f = fixture(brand), matching = brandedEquipmentItems("Gloves", brand)[0].itemName;
    const wrong = brandedEquipmentItems("Gloves", brand === "nike" ? "adidas" : "nike")[0].itemName;
    for (const [index, glove] of [[0, matching], [1, wrong], [2, wrong], [3, matching]]) {
      const parsed = JSON.parse(f.visuals[index].RawData);
      for (const element of parsed.loadouts[0].loadoutElements) if (/HandWear$/.test(element.slotType)) element.itemAssetName = glove;
      f.visuals[index].RawData = JSON.stringify(parsed);
    }
    const result = patchFreshmanEquipment(f.players, f.visuals, 10, { ...f.options, donorRows: [1], mixedChance: 0, crossMixedChance: 0 });
    assert.equal(result.changes[0].donor.row, 1, "wrong glove brand does not exclude a universal helmet donor");
    assert.equal(slotValue(result.changes[0].newRawData, "LeftHandWear"), matching, "without compatible donor gloves, the recipient's valid gloves are retained");
  }
});

test("compatible item copying and restoration never retain stale source-item metadata", () => {
  const target = loadouts(visual(kit(shoes.underarmour)).RawData), original = structuredClone(target);
  target[0].loadoutElements.find(element => element.slotType === "LeftShoe").obsoleteItemMetadata = "old";
  const donor = { row: 1, visuals: { loadouts: loadouts(visual(kit(shoes.underarmour)).RawData) } };
  donor.visuals.loadouts[0].loadoutElements.find(element => element.slotType === "LeftShoe").donorItemMetadata = "new";
  assignCompatibleBrandEquipment(target, { branding: "underarmour" }, [donor], [donor], () => 0);
  assert.equal(target[0].loadoutElements.find(element => element.slotType === "LeftShoe").obsoleteItemMetadata, undefined);
  const copied = target[0].loadoutElements.find(element => element.slotType === "LeftShoe");
  assert.equal(copied.donorItemMetadata, "new"); copied.itemAssetName = shoes.nike;
  guardBrandEquipment(target, { branding: "underarmour" }, original);
  assert.deepEqual(target[0].loadoutElements.find(element => element.slotType === "LeftShoe"), original[0].loadoutElements.find(element => element.slotType === "LeftShoe"));
});

test("CSV audit explains non-item-name RawData changes and leaves byte-identical records empty", () => {
  const before = visual(kit(shoes.nike)).RawData, parsed = JSON.parse(before);
  parsed.loadouts[0].loadoutElements.reverse();
  assert.match(summarizeVisualChanges(before, JSON.stringify(parsed)), /structure, metadata, or formatting changed/);
  assert.equal(summarizeVisualChanges(before, before), "");
});

test("brand guard repairs known bad cleats and overrides, but preserves unverified original custom gear", () => {
  const original = loadouts(visual(kit(shoes.underarmour)).RawData), changed = structuredClone(original);
  changed[0].loadoutElements.push(item("LeftShoeOverride", shoes.nike)); changed[0].loadoutElements.find(element => element.slotType === "LeftShoe").itemAssetName = shoes.nike;
  const corrections = guardBrandEquipment(changed, { branding: "underarmour" }, original);
  assert.equal(changed[0].loadoutElements.find(element => element.slotType === "LeftShoe").itemAssetName, shoes.underarmour);
  assert.ok(!changed[0].loadoutElements.some(element => element.slotType === "LeftShoeOverride")); assert.equal(corrections.length, 2);
  const custom = loadouts(visual(kit("Custom_Original_Cleat")).RawData);
  assert.deepEqual(guardBrandEquipment(custom, { branding: "underarmour" }, structuredClone(custom)), []);
  assert.equal(custom[0].loadoutElements.find(element => element.slotType === "LeftShoe").itemAssetName, "Custom_Original_Cleat");
  const badOriginal = loadouts(visual(kit(shoes.nike)).RawData); guardBrandEquipment(badOriginal, { branding: "underarmour" }, structuredClone(badOriginal));
  assert.equal(badOriginal[0].loadoutElements.find(element => element.slotType === "LeftShoe").itemAssetName, shoes.underarmour);
});

test("external-save donors and recipient roster brands pass through the same compatibility stage", () => {
  const f = fixture(); const donors = [player(0), player(1, "CB")], donorVisuals = [visual(kit(shoes.nike)), visual(kit(shoes.nike))];
  const result = patchFreshmanEquipment(f.players.slice(0, 1), f.visuals, 10, { ...f.options, teamApparel: new Map([[1, "nike"]]), playerApparel: new Map([[0, "underarmour"]]), donorPlayerRecords: donors, donorVisualRecords: donorVisuals, donorPlayerApparel: new Map([[0, "nike"], [1, "nike"]]), donorTeamApparel: new Map([[1, "nike"]]), forceCrossPosition: true });
  assert.equal(result.changes[0].target.branding, "underarmour"); assert.equal(slotValue(result.changes[0].newRawData, "LeftShoe"), shoes.underarmour);
});

for (const [mode, options] of [["single", { mixedChance: 0, crossMixedChance: 0 }], ["mixed", { mixedChance: 1, crossMixedChance: 0 }], ["cross", { forceCrossPosition: true }], ["manual", { donorRows: [1], mixedChance: 0, crossMixedChance: 0 }]]) test(`below-knee donor pants survive ${mode} randomization`, () => {
  const f = fixture(); const result = patchFreshmanEquipment(f.players, f.visuals, 10, { ...f.options, ...options });
  assert.equal(slotValue(result.changes[0].newRawData, "OuterPants"), "GearPants_Standard");
});

test("a donor without a pants field preserves the recipient pants choice in full and mixed modes", () => {
  for (const mixedChance of [0, 1]) { const f = fixture(); f.visuals.forEach((entry, index) => { if (index) entry.RawData = JSON.stringify({ loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: kit(shoes.nike).filter(element => element.slotType !== "OuterPants") }] }); });
    const result = patchFreshmanEquipment(f.players, f.visuals, 10, { ...f.options, mixedChance, crossMixedChance: 0 });
    assert.equal(slotValue(result.changes[0].newRawData, "OuterPants"), "GearPants_AboveKnee");
  }
});

test("Patcher Above Knee Pants remains an intentional override, not Bears-specific behavior", () => {
  const players = [player(0, "WR", "Freshman")], visuals = [visual(kit(shoes.nike))];
  const result = applyGlobalEquipmentFixes(players, visuals, 10, { pantsFix: true }); assert.equal(result.pantsPlayersChanged, 1);
  assert.equal(slotValue(visuals[0].RawData, "OuterPants"), "GearPants_AboveKnee");
});

const observedDonor = (asset, slot = "FacePaint") => ({ visuals: { loadouts: [{ loadoutElements: [item(slot, asset)] }] } });
test("vanilla facepaint uses the exact original options, probabilities, and seeded draws", () => {
  const legacy = rng => rng() < 0.60 ? "FaceMarks_None" : VANILLA_FACE_PAINT_OPTIONS[Math.floor(rng() * VANILLA_FACE_PAINT_OPTIONS.length)];
  const a = mulberry32(507), b = mulberry32(507); for (let i = 0; i < 1000; i++) assert.equal(rollFacePaint(a), legacy(b));
  assert.deepEqual(buildFacePaintPool([observedDonor("FaceMarks_RawNoseTape_DontBlink")]).options, [...VANILLA_FACE_PAINT_OPTIONS]);
  assert.equal(normalizeEquipmentOptions({}, true).usingRawAccessoriesMod, false); assert.equal(normalizeEquipmentOptions({}, true).usingUnlockedMod, false);
});

test("catalog mod pools combine without equipped donors and cannot be polluted by donor values", () => {
  const donors = [observedDonor("FaceMarks_RawNoseTape_DontBlink"), observedDonor("FaceMarks_RawEarringsCombo_NoseTape_dontblink"), observedDonor("FaceMarks_Unknown"), observedDonor("FaceMarks_NoseTape_c1")];
  const both = buildFacePaintPool(donors, { usingUnlockedMod: true, usingRawAccessoriesMod: true });
  assert.deepEqual(both.options.slice(10), [...inventory.mods.unlocked.facepaintItemNames, ...inventory.mods.raw.facepaintItemNames]);
  assert.equal(both.options.length, 40); assert.equal(new Set(both.options).size, 40);
  assert.equal(both.diagnostics.unlocked.available, 13); assert.equal(both.diagnostics.raw.available, 17);
  assert.deepEqual(buildFacePaintPool([], { usingUnlockedMod: true, usingRawAccessoriesMod: true }), both);
  assert.equal(buildFacePaintPool([], { usingUnlockedMod: true }).options.length, 23);
  assert.deepEqual(buildFacePaintPool([], { usingRawAccessoriesMod: true }).options.slice(10), inventory.mods.raw.facepaintItemNames);
  for (const donor of donors) assert.ok(!both.options.includes(donor.visuals.loadouts[0].loadoutElements[0].itemAssetName));
});

test("every catalog ItemName matches the mod resource inventory, and save samples retain exact casing", () => {
  assert.equal(inventory.mods.unlocked.facepaintResourceKeys.length, 13); assert.equal(inventory.mods.raw.facepaintResourceKeys.length, 17);
  for (const [id, mod] of Object.entries(inventory.mods)) {
    assert.deepEqual(mod.facepaintItemNames.map(asset => asset.toLowerCase()).sort(), [...mod.facepaintResourceKeys].sort());
    const result = buildFacePaintPool([], { usingUnlockedMod: id === "unlocked", usingRawAccessoriesMod: id === "raw" });
    for (const asset of mod.facepaintItemNames) assert.ok(result.options.includes(asset));
    for (const key of mod.excludedResourceKeys) assert.ok(!result.options.some(asset => asset.toLowerCase() === key));
  }
  const both = buildFacePaintPool([], { usingUnlockedMod: true, usingRawAccessoriesMod: true });
  assert.deepEqual(inventory.saveEvidence.samples.map(item => item.itemAssetName), ["FaceMarks_NoseTape_C1", "FaceMarks_RawNoseTape_dontblink"]);
  for (const sample of inventory.saveEvidence.samples) { assert.equal(sample.slotType, "FacePaint"); assert.ok(both.options.includes(sample.itemAssetName)); }
});

test("selected vanilla donors still generate catalog mod facepaint, seeded output repeats, and preview never mutates", () => {
  const f = fixture(); const modPaint = "FaceMarks_RawNoseTape_dontblink";
  const before = structuredClone(f.visuals); let seen = false;
  for (let seed = 0; seed < 150; seed++) {
    const options = { ...f.options, apply: false, usingRawAccessoriesMod: true, donorRows: [1], mixedChance: 0, crossMixedChance: 0, seed };
    const result = patchFreshmanEquipment(f.players, f.visuals, 10, options);
    assert.deepEqual(result.facePaintPools.raw.assets, inventory.mods.raw.facepaintItemNames); assert.deepEqual(f.visuals, before);
    assert.deepEqual(result, patchFreshmanEquipment(f.players, f.visuals, 10, options));
    if (slotValue(result.changes[0].newRawData, "FacePaint") === modPaint) { seen = true; assert.equal(result.changes[0].facePaint[0].source, "RAW Accessories Equipment Pool"); }
  }
  assert.ok(seen, "verified mod style must actually be generated, not just discovered");
});

test("every enabled mod facepaint is reachable through the unchanged independent roll", () => {
  for (const flags of [{ usingUnlockedMod: true }, { usingRawAccessoriesMod: true }, { usingUnlockedMod: true, usingRawAccessoriesMod: true }]) {
    const { options } = buildFacePaintPool([], flags);
    for (const [index, asset] of options.entries()) {
      const draws = [0.6, (index + 0.5) / options.length];
      assert.equal(rollFacePaint(() => draws.shift(), options), asset);
      assert.equal(draws.length, 0);
    }
    assert.equal(rollFacePaint(() => 0.59, options), "FaceMarks_None");
  }
});

test("enabled catalogs leave NIL recipients and selected donors protected", () => {
  const f = fixture(); f.players[0].IsNIL = true;
  const before = structuredClone(f.visuals), flags = { usingUnlockedMod: true, usingRawAccessoriesMod: true };
  assert.equal(patchFreshmanEquipment(f.players, f.visuals, 10, { ...f.options, ...flags, donorRows: [1] }).changes.length, 0);
  assert.deepEqual(f.visuals, before);
  const changed = patchFreshmanEquipment(f.players, f.visuals, 10, { ...f.options, ...flags, donorRows: [1], skipNilPlayers: false });
  assert.equal(changed.changes.length, 1); assert.deepEqual(f.visuals[1], before[1]);
});

test("GUI mod toggles, warnings, help, and option serialization stay explicit and default-off", () => {
  const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
  assert.ok(!renderer.includes('"Expanded Equipment Pool"')); assert.ok(renderer.includes('"Equipment Options"'));
  assert.match(renderer, /optionalPass\("equipment-raw-accessories", "RAW Accessories Equipment Pool"/);
  assert.match(renderer, /usingRawAccessoriesMod: freshman && document.querySelector\("#equipment-raw-accessories"\).checked/);
  assert.match(renderer, /Requires RAW Accessories by Delonte RAW/); assert.match(renderer, /Custom facepaint does not need to be worn by a donor/);
  assert.ok(!renderer.includes("eligible donors must already wear it"));
});
