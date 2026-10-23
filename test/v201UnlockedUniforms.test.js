import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DEFAULT_LOWER_JERSEY_CAPS, DEFAULT_CUTOFF_PANTS_CAPS, normalizeUniformCaps, buildUniformStylePlan } from "../src/main/tools/equipment/core/unlockedUniforms.js";
import { cutoffPantsConflict, CUTOFF_JERSEYS, CUTOFF_PANTS } from "../src/main/tools/equipment/core/uniformCompatibility.js";
import { applyGlobalEquipmentFixes } from "../src/main/tools/equipment/core/globalFixes.js";
import { enforceEquipmentCompatibility } from "../src/main/tools/equipment/core/compatibility.js";
import { generatedItemConflict } from "../src/main/tools/equipment/core/generatedCompatibility.js";
import { normalizeEquipmentOptions } from "../src/main/tools/equipment/runner.js";
import { EQUIPMENT_ITEMS, equipmentItem, equipmentDisplayName, canGenerateItem } from "../src/main/tools/equipment/catalog.js";
import { modPoolDefinitions } from "../src/main/tools/equipment/core/modPools.js";
import { mulberry32 } from "../src/main/tools/equipment/core/patcher.js";

const e = (slotType, itemAssetName) => ({ slotType, itemAssetName, preserve: "metadata" });
const outfit = (jersey = "Gear_JerseyStyle_RolledLow", pants = "GearPants_AboveKnee", base = "BottomBase_None", shirt = "Gear_Undershirt_CompressionTCrewSleeveless") => [e("OuterShirt", jersey), e("OuterPants", pants), e("InnerPants", base), e("InnerShirt", shirt), e("LeftShoe", "KeepMe"), e("LeftArmTattoo", "KeepTattoo")];
const raw = elements => JSON.stringify({ preserved: true, loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: elements }, { loadoutType: "Base", loadoutElements: [e("RightArmTattoo", "KeepTattoo")] }] });
const ref = row => (10).toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
const player = (row, position = "WR", team = 1) => ({ FirstName: "Player", LastName: String(row), Position: position, SchoolYear: "Freshman", TeamIndex: team, IsNIL: false, CharacterBodyType: "Standard", CharacterVisuals: ref(row), RedshirtStatus: "Eligible", OverallRating: 70 });
const get = (record, slot) => JSON.parse(record.RawData).loadouts[0].loadoutElements.find(element => element.slotType === slot)?.itemAssetName;
const visual = elements => ({ isEmpty: false, RawData: raw(elements) });
function run(players, visuals, options = {}) { return applyGlobalEquipmentFixes(players, visuals, 10, { seed: 201, ...options }); }
const caps = value => Object.fromEntries(Object.keys(DEFAULT_LOWER_JERSEY_CAPS).map(group => [group, value]));

test("v20.1 defaults are opt-in, retain old configs, and use the requested position caps", () => {
  const value = normalizeEquipmentOptions({}, false);
  assert.equal(value.lowerRolledJerseyFix, false); assert.equal(value.cutoffPantsFix, false); assert.equal(value.replaceStandardWithCutoff, false);
  assert.equal(value.lowerJerseyCaps.OL, 0); assert.equal(value.lowerJerseyCaps.EDGE, 100); assert.equal(value.lowerJerseyCaps.DT, 0);
  assert.equal(value.lowerJerseyCaps.QB, 100); assert.equal(value.lowerJerseyCaps.WR, 100); assert.equal(value.lowerJerseyCaps.LB, 100);
  assert.equal(value.cutoffPantsCaps.WR, 5); assert.equal(value.cutoffPantsCaps.CB, 5); assert.equal(value.cutoffPantsCaps.QB, 0); assert.equal(value.cutoffPantsCaps.FS, 5); assert.equal(value.cutoffPantsCaps.SS, 5);
  assert.equal(normalizeEquipmentOptions({ lowerRolledJerseyFix: true, cutoffPantsFix: true }, true).lowerRolledJerseyFix, false);
  assert.deepEqual(normalizeEquipmentOptions(JSON.parse(JSON.stringify(value)), false).cutoffPantsCaps, value.cutoffPantsCaps);
  for (const number of [-1, 101, 1.5, "5", "", null]) assert.throws(() => normalizeUniformCaps({ WR: number }, DEFAULT_CUTOFF_PANTS_CAPS, "Cutoff"), /whole/);
  assert.throws(() => normalizeUniformCaps({ INVALID: 5 }, DEFAULT_CUTOFF_PANTS_CAPS, "Cutoff"), /unknown/);
});
test("lower jersey replaces exactly the two requested styles and only OuterShirt", () => {
  const players = [player(0), player(1), player(2)], visuals = [visual(outfit("Gear_Low_TuckedUndershirt")), visual(outfit()), visual(outfit("Gear_JerseyStyle_Rolled"))];
  const before = structuredClone(visuals), result = run(players, visuals, { lowerRolledJerseyFix: true });
  assert.equal(get(visuals[0], "OuterShirt"), "Gear_JerseyStyle_RolledLowest"); assert.equal(get(visuals[1], "OuterShirt"), "Gear_JerseyStyle_RolledLowest_Untucked");
  assert.equal(visuals[2].RawData, before[2].RawData); assert.equal(result.lowerJerseyChanges.length, 2);
  for (const index of [0, 1]) { const expected = JSON.parse(before[index].RawData); expected.loadouts[0].loadoutElements[0].itemAssetName = get(visuals[index], "OuterShirt"); assert.deepEqual(JSON.parse(visuals[index].RawData), expected); }
});

test("rolled undershirts precede lower jerseys, then cutoff pants, then recolor",()=>{
  const players=[{...player(0),CharacterBodyType:'Thin'}],visuals=[visual(outfit('Gear_JerseyStyle_RolledLow','GearPants_AboveKnee','BottomBase_None','Undershirt_None'))];
  const result=run(players,visuals,{rolledJerseyFix:true,undershirtColor:'black',lowerRolledJerseyFix:true,cutoffPantsFix:true,cutoffPantsCaps:caps(100),unlockedRecolorFix:true,unlockedColorTheme:'white',teamNames:new Map([[1,'San Jose State']])});
  assert.equal(get(visuals[0],'OuterShirt'),'Gear_JerseyStyle_RolledLowest_Untucked');assert.equal(get(visuals[0],'OuterPants'),CUTOFF_PANTS);assert.equal(get(visuals[0],'InnerShirt'),'Gear_Undershirt_CompressionTCrewSleeveless_White');assert.equal(result.rolledJerseyChanges.length,1);assert.equal(result.lowerJerseyChanges.length,1);assert.equal(result.cutoffPantsChanges.length,1);assert.ok(result.unlockedRecolorChanges.length);
  const source=fs.readFileSync(new URL('../src/main/tools/equipment/core/globalFixes.js',import.meta.url),'utf8');assert.ok(source.indexOf('if (rolledJerseyFix)')<source.indexOf('const uniformChanges ='));assert.ok(source.indexOf('const uniformChanges =')<source.indexOf('const recolorTeams ='));assert.ok(source.indexOf('const recolorTeams =')<source.indexOf('// Tattoos are the last correction'));
});
test("caps count existing items, protect players, separate cohorts, and select deterministically", () => {
  const entries = Array.from({ length: 200 }, (_, index) => ({ visualsRow: index, position: index % 2 ? "WR" : "CB", cohort: index < 100 ? "fbs" : "fcs", editable: index % 9 !== 0, raw: raw(outfit(index % 10 === 1 ? "Gear_JerseyStyle_RolledLowest_Untucked" : "Gear_JerseyStyle_RolledLow")) }));
  const options = { lowerRolledJerseyFix: true, lowerJerseyCaps: caps(30), cutoffPantsFix: true, cutoffPantsCaps: caps(10) };
  const a = buildUniformStylePlan(entries, options, mulberry32(201)), b = buildUniformStylePlan(entries, options, mulberry32(201));
  assert.deepEqual([...a.lower], [...b.lower]); assert.deepEqual([...a.pants], [...b.pants]); assert.equal(a.stats.length, 4);
  for (const row of a.stats) { assert.equal(row.total, 50); assert.ok(row.existingLower + row.lowerSelected <= row.lowerTarget); assert.equal(row.cutoffSelected, 5); }
  for (const entry of entries.filter(entry => !entry.editable)) { assert.ok(!a.lower.has(entry.visualsRow)); assert.ok(!a.pants.has(entry.visualsRow)); }
});
test("all four cutoff jersey choices require an undershirt and no base layer", () => {
  for (const jersey of CUTOFF_JERSEYS) {
    assert.equal(cutoffPantsConflict(outfit(jersey)), null);
    assert.match(cutoffPantsConflict(outfit(jersey, undefined, "GearLegsBase_LeftSleeve_White")), /base layer/);
    assert.match(cutoffPantsConflict(outfit(jersey, undefined, undefined, "Undershirt_None")), /undershirt/);
  }
  for (const jersey of ["Gear_JerseyStyle_SleeveTight", "Gear_Low_TuckedUndershirt", "Gear_JerseyStyle_RolledLowest", "UnknownJersey"]) assert.match(cutoffPantsConflict(outfit(jersey)), /jersey/);
});
test("both passes interact safely: lowest untucked qualifies but lowest tucked never does", () => {
  const visuals = [visual(outfit("Gear_Low_TuckedUndershirt")), visual(outfit())];
  const result = run([player(0), player(1)], visuals, { lowerRolledJerseyFix: true, cutoffPantsFix: true, cutoffPantsCaps: caps(100) });
  assert.equal(get(visuals[0], "OuterShirt"), "Gear_JerseyStyle_RolledLowest"); assert.equal(get(visuals[0], "OuterPants"), "GearPants_AboveKnee");
  assert.equal(get(visuals[1], "OuterPants"), CUTOFF_PANTS); assert.equal(result.cutoffPantsChanges.length, 1);
});
test("cutoff cap defaults permit exactly 5% WR/CB, not other positions, and repeated runs do not add more", () => {
  const positions = ["WR", "CB", "QB"], players = Array.from({ length: 60 }, (_, row) => player(row, positions[Math.floor(row / 20)])), visuals = players.map(() => visual(outfit()));
  const result = run(players, visuals, { cutoffPantsFix: true });
  assert.equal(result.cutoffPantsChanges.length, 2); assert.equal(visuals.slice(40).filter(row => get(row, "OuterPants") === CUTOFF_PANTS).length, 0);
  assert.equal(run(players, visuals, { cutoffPantsFix: true }).cutoffPantsChanges.length, 0);
  assert.equal(result.uniformPopulation.find(row => row.group === "WR").cutoffAfter, 1);
});
test("Standard Pants override is off by default, explicit, uncapped, and never bypasses fit", () => {
  const players = [player(0), player(1), player(2)], initial = [visual(outfit(undefined, "GearPants_Standard")), visual(outfit(undefined, "GearPants_Standard", "UnknownTights")), visual(outfit())];
  const off = structuredClone(initial); run(players, off, { pantsFix: true, cutoffPantsFix: true, cutoffPantsCaps: caps(100) });
  assert.equal(get(off[0], "OuterPants"), "GearPants_AboveKnee", "Above Knee does not silently opt Standard Pants into cutoff conversion");
  const on = structuredClone(initial), result = run(players, on, { pantsFix: true, cutoffPantsFix: true, cutoffPantsCaps: caps(0), replaceStandardWithCutoff: true });
  assert.equal(get(on[0], "OuterPants"), CUTOFF_PANTS); assert.equal(get(on[1], "OuterPants"), "GearPants_AboveKnee"); assert.equal(get(on[2], "OuterPants"), "GearPants_AboveKnee");
  assert.equal(get(on[1], "InnerPants"), "UnknownTights"); assert.equal(result.uniformPopulation[0].standardReplacements, 1);
});
test("shared visuals, excluded scope, and NIL stay protected from the new passes", () => {
  const players = [player(0), player(1), player(2), player(3)]; players[1].CharacterVisuals = ref(0); Object.assign(players[2],{IsNIL:true,PLYR_ASSETNAME:'SmithJeremiah_8726'});
  const visuals = players.map(() => visual(outfit())), before = structuredClone(visuals);
  run(players, visuals, { lowerRolledJerseyFix: true, cutoffPantsFix: true, cutoffPantsCaps: caps(100), eligiblePlayer: row => row.LastName !== "3" });
  assert.deepEqual(visuals, before);
});
test("shared compatibility fixes unsafe copied cutoff pants without removing other gear", () => {
  for (const elements of [outfit("Gear_JerseyStyle_SleeveTight", CUTOFF_PANTS), outfit(undefined, CUTOFF_PANTS, "Tights"), outfit(undefined, CUTOFF_PANTS, undefined, "Undershirt_None")]) {
    const expected = structuredClone(elements); expected[1].itemAssetName = "GearPants_AboveKnee";
    const changes = enforceEquipmentCompatibility(elements); assert.ok(changes.some(change => change.kind === "cutoff-pants")); assert.deepEqual(elements, expected);
  }
  const safe = outfit(undefined, CUTOFF_PANTS), before = structuredClone(safe); assert.deepEqual(enforceEquipmentCompatibility(safe), []); assert.deepEqual(safe, before);
});
test("optional mod additions cannot put leg sleeves back under cutoff pants", () => {
  const base = EQUIPMENT_ITEMS.find(item => item.slots.includes("InnerPants") && canGenerateItem(item) && !/(?:^|_)None$/i.test(item.itemName)); assert.ok(base);
  assert.match(generatedItemConflict(outfit(undefined, CUTOFF_PANTS), base, ["InnerPants"], "WR"), /base layer/);
});
test("v0.97 labels and existing verified cleats remain readable and brand-scoped; soccer exclusions survive", () => {
  assert.equal(equipmentDisplayName("GearPants_Cutoff"), "Pants Cutoff"); assert.equal(equipmentItem("GearPants_Cutoff").origin, "unlocked");
  assert.equal(equipmentDisplayName("Gear_JerseyStyle_RolledLowest_Untucked"), "Jersey Rolled Lowest Untucked");
  const pool = modPoolDefinitions().unlocked.find(category => category.id === "cleats");
  for (const id of ["GearFootwear_shoe_low_NikeVaporEdge_zebra", "GearFootwear_shoe_low_NikeVaporEdgePro3602", "GearFootwear_shoe_low_NikeVaporUntouchablePro_v3"]) assert.ok(pool.items.some(item => item.itemName === id));
  assert.ok(!pool.items.some(item => item.itemName === "GearFootwear_shoe_low_Jordan5_99Club2"));
});
test("new modal settings are compact, conditional, saved through canonical controls, and visible in Review", () => {
  const ui = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8"), editor = fs.readFileSync(new URL("../src/renderer/unlocked-uniforms.js", import.meta.url), "utf8");
  assert.match(ui, /fix-unlocked-lower-jersey/); assert.match(ui, /fix-unlocked-cutoff-pants/); assert.match(ui, /uniformCapSummary\("cutoff"\)/);
  assert.match(editor, /condenseConfiguration/); assert.match(editor, /cutoff-replace-standard/); assert.match(editor, /not independent chances/);
  assert.doesNotMatch(ui, /Latest version recommended: 0\.96/);
});
