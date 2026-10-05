import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { HELMET_MODELS, HELMET_POSITIONS, DEFAULT_HELMET_WEIGHTS, normalizeHelmetDistribution, effectiveHelmetWeights, helmetAllowed, facemaskFitsHelmet, rollCustomHelmet, rollCompatibleFacemask } from "../src/main/tools/equipment/core/helmets.js";
import { buildHelmetBalancePlan } from "../src/main/tools/equipment/core/helmetBalance.js";
import { applyGlobalEquipmentFixes } from "../src/main/tools/equipment/core/globalFixes.js";
import { correctBearsPadsSleeves, bearsPadsIncompatibleSleeve, removeHandwarmers } from "../src/main/tools/equipment/core/targetedCorrections.js";
import { EQUIPMENT_ITEMS, equipmentItem, recolorEquipmentItem } from "../src/main/tools/equipment/catalog.js";
import { mulberry32 } from "../src/main/tools/equipment/core/patcher.js";
import { normalizeEquipmentOptions } from "../src/main/tools/equipment/runner.js";
import { loadCommentaryMap } from "../src/main/tools/commentary/map.js";
import { tools } from "../src/shared/toolRegistry.js";

const weights = (id, percent = 100) => ({ ...Object.fromEntries(HELMET_MODELS.map(model => [model.id, 0])), [id]: percent });
const config = (global = DEFAULT_HELMET_WEIGHTS, positions = {}) => normalizeHelmetDistribution({ mode: "custom", global, positions });
const item = (slotType, itemAssetName) => ({ slotType, itemAssetName, untouchedMetadata: "keep" });
const field = elements => ({ loadoutType: "PlayerOnField", loadoutElements: elements });
const visual = elements => ({ isEmpty: false, RawData: JSON.stringify({ metadata: "preserve", loadouts: [field(elements)] }) });
const ref = row => (10).toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
const player = (row, position = "WR") => ({ FirstName: "Player", LastName: String(row), Position: position, SchoolYear: "Freshman", TeamIndex: 1, IsNIL: false, CharacterBodyType: "Standard", CharacterVisuals: ref(row), RedshirtStatus: "Eligible", OverallRating: 70 });
const elementsOf = record => JSON.parse(record.RawData).loadouts[0].loadoutElements;

test("helmet editor normalizes whole percentages, rejects invalid totals/models, and preserves legacy settings", () => {
  assert.equal(normalizeHelmetDistribution(undefined), null); assert.equal(normalizeHelmetDistribution({ mode: "default" }), null);
  assert.equal(normalizeEquipmentOptions({}, false).helmetDistribution, null);
  assert.deepEqual(config().global, DEFAULT_HELMET_WEIGHTS);
  for (const value of [-1, 1.5, 101, "", null]) assert.throws(() => config({ ...DEFAULT_HELMET_WEIGHTS, GearHelmet_Axiom: value }), /whole|total/);
  assert.throws(() => config({ ...DEFAULT_HELMET_WEIGHTS, UnknownHelmet: 1 }), /unknown/);
  assert.deepEqual(config(DEFAULT_HELMET_WEIGHTS, { LT: DEFAULT_HELMET_WEIGHTS }).positions.OL, DEFAULT_HELMET_WEIGHTS);
  assert.equal(config(DEFAULT_HELMET_WEIGHTS, { WR: weights("GearHelmet_VicisZero2") }).positions.WR.GearHelmet_VicisZero2, 100);
});
for (const model of HELMET_MODELS) test(`custom helmet + compatible facemask: ${model.label}`, () => {
  const position = model.positions[0], settings = config(weights(model.id));
  for (const p of model.positions) for (const draw of [0, .4, .9999]) {
    assert.equal(rollCustomHelmet(settings, [p], () => draw), model.id);
    const mask = rollCompatibleFacemask(model.id, p, () => draw);
    assert.ok(equipmentItem(mask)); assert.ok(facemaskFitsHelmet(mask, model.id));
  }
  const records = [player(0, position)], visuals = [visual([item("HeadWear", "Unsupported"), item("FaceMask", "Wrong"), item("WaistWear", "Waist_PlaycallSheet_White")])];
  const result = applyGlobalEquipmentFixes(records, visuals, 10, { helmetFix: true, helmetDistribution: settings });
  const elements = elementsOf(visuals[0]);
  assert.equal(elements.find(e => e.slotType === "HeadWear").itemAssetName, model.id);
  assert.ok(facemaskFitsHelmet(elements.find(e => e.slotType === "FaceMask").itemAssetName, model.id));
  assert.equal(elements.find(e => e.slotType === "WaistWear").itemAssetName, "Waist_PlaycallSheet_White");
  assert.equal(result.helmetChanges.length, 1);
});
test("every position uses its effective mix; restrictions and overrides never silently fall back", () => {
  const settings = config({ ...weights("GearHelmet_Speed_Flex", 50), GearHelmet_VicisZero2: 50 }, { WR: weights("GearHelmet_SchuttF7Pro") });
  for (const position of HELMET_POSITIONS) {
    const mix = effectiveHelmetWeights(settings, position);
    assert.ok(Math.abs(Object.values(mix).reduce((a, b) => a + b, 0) - 100) < 1e-8);
    for (let seed = 0; seed < 50; seed++) assert.ok(helmetAllowed(rollCustomHelmet(settings, [position], mulberry32(seed)), position));
  }
  assert.equal(rollCustomHelmet(settings, ["WR"], () => .99), "GearHelmet_SchuttF7Pro");
  assert.equal(rollCustomHelmet(settings, ["CB"], () => .99), "GearHelmet_VicisZero2");
  assert.equal(effectiveHelmetWeights(config(weights("GearHelmet_VicisZero2")), "WR").GearHelmet_VicisZero2, 100);
  assert.throws(() => rollCustomHelmet(config(DEFAULT_HELMET_WEIGHTS, { QB: weights("GearHelmet_Axiom"), WR: weights("GearHelmet_SchuttF7") }), ["QB", "WR"], () => .5), /shared equipment/);
});
test("balancing custom position/cohort targets uses minimal swaps, deterministic team spread, and zero weights", () => {
  const settings = config({ ...weights("GearHelmet_Speed_Flex", 60), GearHelmet_SchuttF7Pro: 40 }, { QB: weights("GearHelmet_LightGladiator") });
  const entries = Array.from({ length: 240 }, (_, row) => ({ visualsRow: row, helmet: "GearHelmet_Speed_Flex", position: row < 200 ? "WR" : "QB", cohort: row < 100 || row >= 200 && row < 220 ? "fbs" : "fcs", team: `Team ${row % 10}` }));
  const result = buildHelmetBalancePlan(entries, { distribution: settings, seed: 185 });
  assert.deepEqual([...result.plans], [...buildHelmetBalancePlan(entries, { distribution: settings, seed: 185 }).plans]);
  assert.equal(result.plans.size, 120);
  for (const cohort of [result.diagnostics.fbs, result.diagnostics.fcs]) {
    assert.equal(Object.keys(cohort.changesByTeam).length, 10);
    for (const position of cohort.positions) for (const family of position.families) assert.equal(family.after, family.targetCount);
  }
  const after = entries.map(entry => ({ ...entry, helmet: result.plans.get(entry.visualsRow) ?? entry.helmet }));
  assert.equal(buildHelmetBalancePlan(after, { distribution: settings }).plans.size, 0);
  for (const count of [1, 2, 3, 7]) {
    const small = buildHelmetBalancePlan(entries.slice(0, count), { distribution: settings });
    assert.equal(small.diagnostics.fbs.families.reduce((sum, family) => sum + family.targetCount, 0), count);
  }
});
test("custom repair-only replaces zero-weight helmets without balancing; OL and protected players stay unchanged", () => {
  const records = [player(0), player(1), player(2, "LT"), { ...player(3), IsNIL: true }];
  const gear = [item("HeadWear", "GearHelmet_SchuttF7"), item("FaceMask", "GearFaceMask_F72Bar")];
  const before = records.map(() => visual(gear)), ordinary = structuredClone(before), balanced = structuredClone(before);
  const settings = config(weights("GearHelmet_SchuttF7Pro"));
  applyGlobalEquipmentFixes(records, ordinary, 10, { helmetFix: true, helmetDistribution: settings });
  applyGlobalEquipmentFixes(records, balanced, 10, { helmetFix: true, helmetDistribution: settings, balanceExistingHelmets: true });
  for (const row of [0, 1, 2]) for (const output of [ordinary, balanced]) assert.equal(elementsOf(output[row])[0].itemAssetName, "GearHelmet_SchuttF7Pro");
  for (const row of [3]) for (const output of [ordinary, balanced]) assert.deepEqual(output[row], before[row]);
});
test("new helmet families repair mask/cap/hanging-mouthpiece incompatibility without modifying other slots", () => {
  const visuals = [visual([item("HeadWear", "Wrong"), item("FaceMask", "Wrong"), item("GuardianCap", "GuardianCap_GuardianXT1"), item("MouthWear", "GearMouthpiece_PacifierDualHanging_White"), item("LeftShoe", "KeepShoe")])];
  const result = applyGlobalEquipmentFixes([player(0)], visuals, 10, { helmetFix: true, helmetDistribution: config(weights("GearHelmet_Standard")) });
  assert.equal(result.helmetAccessoryChanges.length, 2); assert.equal(elementsOf(visuals[0]).at(-1).itemAssetName, "KeepShoe");
  for (const model of HELMET_MODELS) for (const mask of model.masks) assert.ok(equipmentItem(mask)?.slots.includes("FaceMask"));
  assert.ok(!facemaskFitsHelmet("GearFaceMask_F7Pro2Bar", "GearHelmet_SchuttF7"));
  assert.ok(!facemaskFitsHelmet("GearFaceMask_VicisZero2Trench", "GearHelmet_VicisZero2"));
  const skullcap = [visual([item("HeadWear", "Wrong"), item("FaceMask", "Wrong"), item("GuardianCap", "Raw_SkullCap_White")])];
  applyGlobalEquipmentFixes([player(0)], skullcap, 10, { helmetFix: true, helmetDistribution: config(weights("GearHelmet_Standard")) });
  assert.equal(elementsOf(skullcap[0]).find(element => element.slotType === "GuardianCap").itemAssetName, "Raw_SkullCap_White", "Unknown or modded skullcaps are not mistaken for incompatible Guardian XT caps");
});
for (const style of ["shooter", "none", "mixed"]) test(`Bear’s Pads targeted correction (${style}) covers all affected colors/families and preserves other gear`, () => {
  const affected = EQUIPMENT_ITEMS.filter(item => bearsPadsIncompatibleSleeve(item.itemName)); assert.equal(affected.length, 20);
  const loadouts = affected.map(i => field([item("LeftArmWear", i.itemName), item("RightArmWear", "GearArmSleeve_Baggy_White"), item("LeftWristWear", "KeepWrist"), item("LeftElbowWear", "KeepElbow"), item("HeadWear", "KeepHelmet")]));
  const before = structuredClone(loadouts), result = correctBearsPadsSleeves(loadouts, ["Standard"], style, mulberry32(185));
  assert.equal(result.length, affected.length);
  const repeat = structuredClone(before); correctBearsPadsSleeves(repeat, ["Standard"], style, mulberry32(185)); assert.deepEqual(loadouts, repeat);
  loadouts.forEach((loadout, index) => {
    assert.deepEqual(loadout.loadoutElements.slice(1), before[index].loadoutElements.slice(1));
    assert.equal(loadout.loadoutElements[0].untouchedMetadata, "keep");
    if (style === "none") assert.equal(loadout.loadoutElements[0].itemAssetName, "ArmSleeve_None");
    if (style === "shooter") assert.equal(loadout.loadoutElements[0].itemAssetName.split("_").at(-1), affected[index].itemName.split("_").at(-1));
  });
  for (const body of ["Freshman", "Lean", "Muscular", "Thin", "Heavy", "standard"]) { const skipped = structuredClone(before); assert.equal(correctBearsPadsSleeves(skipped, [body], style, mulberry32(1)).length, 0); assert.deepEqual(skipped, before); }
  assert.equal(correctBearsPadsSleeves(structuredClone(before), ["Standard", "Thin"], style, mulberry32(1)).length, 0);
});
test("targeted passes respect scope/NIL/shared-row protection and do not affect presentation loadouts", () => {
  const records = [player(0), { ...player(1), IsNIL: true }, player(2), { ...player(3), CharacterVisuals: ref(2) }];
  const visuals = records.map(() => visual([item("LeftArmWear", "GearArmSleeve_NikeProDriFitSleeve_Black"), item("WaistWear", "Handwarmer_Standard"), item("HeadWear", "Keep")]));
  const withPresentation = JSON.parse(visuals[0].RawData);
  withPresentation.loadouts.push({ loadoutType: "PlayerPresentation", loadoutElements: [item("LeftArmWear", "GearArmSleeve_NikeProDriFitSleeve_Black"), item("WaistWear", "Handwarmer_Standard")] });
  visuals[0].RawData = JSON.stringify(withPresentation);
  const before = structuredClone(visuals);
  const result = applyGlobalEquipmentFixes(records, visuals, 10, { bearsPadsSleeveFix: true, removeHandwarmers: true, eligiblePlayer: record => record !== records[3] });
  assert.equal(result.bearsPadsChanges.length, 1); assert.equal(result.handwarmerChanges.length, 1);
  assert.equal(elementsOf(visuals[0]).at(-1).itemAssetName, "Keep");
  assert.deepEqual(JSON.parse(visuals[0].RawData).loadouts[1], JSON.parse(before[0].RawData).loadouts[1]);
  for (const row of [1, 2, 3]) assert.deepEqual(visuals[row], before[row]);
  assert.equal(normalizeEquipmentOptions({}, false).bearsPadsSleeveFix, false); assert.equal(normalizeEquipmentOptions({}, false).removeHandwarmers, false);
});
test("handwarmer removal targets both known models only; every verified playcall color recolors", () => {
  const assets = ["Handwarmer_Standard", "Handwarmer_Standard_Logo", "Handwarmer_None", "UnknownHandwarmer", "Waist_PlaycallSheet_Black", "Waist_PlaycallSheet_White", "Waist_PlaycallSheet_TeamColor"];
  const loadouts = assets.map(asset => field([item("WaistWear", asset), item("OtherSlot", "Handwarmer_Standard")]));
  assert.equal(removeHandwarmers(loadouts).length, 2);
  assets.forEach((asset, i) => { assert.equal(loadouts[i].loadoutElements[0].itemAssetName, i < 2 ? "Handwarmer_None" : asset); assert.equal(loadouts[i].loadoutElements[1].itemAssetName, "Handwarmer_Standard"); });
  for (const source of assets.slice(4)) for (const [color, target] of [["black", "Black"], ["white", "White"], ["primary", "TeamColor"]]) assert.equal(recolorEquipmentItem(source, color), `Waist_PlaycallSheet_${target}`);
  assert.equal(recolorEquipmentItem(assets[4], "secondary"), assets[4], "No nonexistent Secondary value is fabricated");
});
test("release versions, new map pairs, checkbox defaults, and compact helmet editor are wired", () => {
  assert.equal(tools.find(t => t.id === "freshman-equipment").version, "5.1"); assert.equal(tools.find(t => t.id === "equipment-patcher").version, "5.5"); assert.equal(tools.find(t => t.id === "commentary-id").version, "2.0");
  const map = loadCommentaryMap(new URL("../resources/commentary-data/PlayerCommentaryidMap.txt", import.meta.url));
  assert.equal(map.size, 7032); assert.equal(map.get("Moseley"), 7008); assert.equal(map.get("Chadwick Jr."), 7598); assert.equal(map.get("Williamson Jr."), 5347);
  const observed = JSON.parse(fs.readFileSync(new URL("../src/main/tools/equipment/equipmentVanillaObservation.json", import.meta.url), "utf8"));
  assert.ok(observed.items.length >= 231);
  for (const model of HELMET_MODELS) assert.ok(observed.items.some(item => item.itemName === model.id), `${model.label} has verified ItemInfo evidence`);
  assert.match(observed.scope, /not proof of menu availability/);
  assert.doesNotMatch(JSON.stringify(observed.items), /Address|0x[0-9a-f]{8}/i);
  const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8"), editor = fs.readFileSync(new URL("../src/renderer/helmets.js", import.meta.url), "utf8");
  assert.match(renderer, /ruleToggle\("fix-oakley-visors"[^\n]*tint\.", false\)/); assert.match(renderer, /Requires Bear’s Pads/);
  assert.match(editor, /createConfigurationDialog/); assert.match(editor, /step="1"/); assert.match(editor, /helmet-distribution-json/);
  assert.doesNotMatch(renderer, /custom-tool-icon.*src="assets\/(?:force-win-referee|dealbreaker-handshake)/);
});
