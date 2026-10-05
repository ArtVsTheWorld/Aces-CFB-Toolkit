import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { HELMET_MODELS, HELMET_POSITIONS, DEFAULT_HELMET_WEIGHTS, helmetAllowedInMix, facemaskFitsHelmet } from "../src/main/tools/equipment/core/helmets.js";
import { APPROVED_SKILL_HELMETS, applyGlobalEquipmentFixes } from "../src/main/tools/equipment/core/globalFixes.js";

const source = fs.readFileSync(new URL("../src/renderer/helmets.js", import.meta.url), "utf8");
const prepared = { helmetModels: HELMET_MODELS, defaultRepairHelmetIds: APPROVED_SKILL_HELMETS };
function ui(settings = {}) {
  const controls = { "fix-helmet": { checked: settings.helmetFix !== false }, "helmet-balance": { checked: Boolean(settings.balanceExistingHelmets) }, "helmet-allow-vicis": { checked: Boolean(settings.allowVicisZero2) }, "helmet-distribution-json": { value: JSON.stringify(settings.helmetDistribution ?? null) } };
  const context = vm.createContext({ document: { getElementById: id => controls[id] }, readJsonControl: (id, fallback) => controls[id]?.value ? JSON.parse(controls[id].value) ?? fallback : fallback, localizedPosition: value => value, escapeHtml: value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;") });
  vm.runInContext(source, context);
  return { context, controls };
}
const custom = { mode: "custom", global: { ...DEFAULT_HELMET_WEIGHTS, GearHelmet_SchuttF7: 0, GearHelmet_SchuttF7Pro: 20 }, positions: {} };

test("v19.0 integrates the two helmet actions without changing tool versions or saved control IDs", () => {
  assert.equal(JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url))).version, "19.0.0");
  const { context } = ui();
  const markup = context.helmetEditorControls();
  for (const id of ["helmet-distribution-json", "helmet-balance", "helmet-allow-vicis"]) assert.ok(markup.includes(`id="${id}"`));
  assert.match(markup, /<div hidden>/);
  assert.match(markup, /Configure Helmets &amp; Facemasks/);
  assert.match(source, /data-helmet-action/); assert.doesNotMatch(source, /data-helmet-vicis/); assert.match(source, /data-mask-choice/);
  assert.match(source, /Normalize to 100%/); assert.doesNotMatch(source, />Balance to 100%</);
});

test("Repair Only is the default and explains the unchanged Toolkit Defaults", () => {
  const { context } = ui();
  const settings = context.currentHelmetSettings();
  assert.equal(settings.balanceExistingHelmets, false);
  assert.equal(context.helmetActionLabel(settings), "Repair Only — Keep Allowed Helmets");
  assert.match(context.helmetZeroExplanation(settings), /Toolkit Defaults keep SpeedFlex.*Custom Percentages to exclude models with 0%/);
  assert.match(context.helmetDistributionSummary(prepared), /Toolkit Defaults:.*70%.*10%/);
});

test("Apply My Mix explains zero targets, position override priority and protected-player exclusions", () => {
  const { context } = ui({ balanceExistingHelmets: true, helmetDistribution: custom });
  assert.match(context.helmetActionLabel(context.currentHelmetSettings()), /Apply My Mix.*Balance Existing Helmets/);
  assert.match(context.helmetZeroExplanation(context.currentHelmetSettings()), /0% replaces existing.*Position overrides take priority.*Protected players/);
  assert.match(context.helmetDistributionSummary(prepared), /Custom:.*F7 Pro 20%/);
});

test("Toolkit Defaults explain their actual approved list, with optional restricted Vicis", () => {
  const { context } = ui();
  const defaults = context.helmetRepairExplanation(prepared, context.currentHelmetSettings());
  assert.match(defaults, /Helmets allowed by Toolkit Defaults: Riddell SpeedFlex, Riddell Axiom, Schutt F7, Schutt F7 Pro\./);
  assert.match(defaults, /Toolkit Defaults keep an existing allowed helmet and facemask as they are/);
  const { context: vicis } = ui({ allowVicisZero2: true });
  assert.match(vicis.helmetRepairExplanation(prepared, vicis.currentHelmetSettings()), /Schutt F7 Pro, Vicis Zero 2\./);
  assert.match(vicis.helmetDistributionSummary(prepared), /68%.*15%.*14%.*3%/);
});

test("Custom repair rules list only positive-weight models and explicitly exclude 0%", () => {
  const { context } = ui({ helmetDistribution: custom });
  const explanation = context.helmetRepairExplanation(prepared, context.currentHelmetSettings());
  assert.match(explanation, /Helmets allowed by the All Positions Mix: Riddell SpeedFlex, Riddell Axiom, Schutt F7 Pro\./);
  assert.match(explanation, /0% means excluded/);
  assert.match(explanation, /facemask.*corrected without replacing that helmet/);
  assert.match(context.helmetZeroExplanation(context.currentHelmetSettings()), /0% excludes a helmet.*does not balance/s);
});

test("Review shows the action, mix and zero meaning; disabled passes do not imply active settings", () => {
  for (const balanceExistingHelmets of [false, true]) {
    const { context } = ui({ balanceExistingHelmets, helmetDistribution: custom });
    const rows = context.helmetReviewRows(prepared);
    assert.equal(rows.length, 5);
    assert.equal(rows[4][0], "Facemask Pools");
    assert.equal(rows[1][0], "Helmet Action");
    assert.match(rows[1][1], balanceExistingHelmets ? /Apply My Mix/ : /Repair Only/);
    assert.equal(rows[3][0], "What 0% Means");
  }
  const { context } = ui({ helmetFix: false, balanceExistingHelmets: true, helmetDistribution: custom });
  assert.equal(JSON.stringify(context.helmetReviewRows(prepared)), JSON.stringify([["Improve Helmets and Facemasks", "Disabled"]]));
});

test("Preview uses its saved run settings rather than current form settings; old previews remain readable", () => {
  const { context } = ui({ balanceExistingHelmets: false });
  assert.match(context.helmetPassPreview({ helmetFix: true, balanceExistingHelmets: true }), /Apply My Mix.*0% replaces existing/s);
  assert.match(context.helmetPassPreview({ helmetFix: true, balanceExistingHelmets: false, helmetDistribution: custom, helmetMixExcludesZero: true }), /Repair Only.*0% excludes a helmet/s);
  assert.match(context.helmetPassPreview({ helmetFix: true, balanceExistingHelmets: false, helmetDistribution: custom }), /earlier Repair Only rules.*Run a new preview/s);
  assert.equal(context.helmetPassPreview({}), ""); assert.equal(context.helmetPassPreview({ helmetFix: false }), "");
});

test("Position-specific mixes are clearly identified separately from the shared mix", () => {
  const { context } = ui({ helmetDistribution: { ...custom, positions: { WR: DEFAULT_HELMET_WEIGHTS, QB: DEFAULT_HELMET_WEIGHTS } } });
  assert.match(context.helmetDistributionSummary(prepared), /Position-specific mixes: WR, QB/);
  assert.match(source, /mixes override the All Positions Mix, including 0% settings/);
});

test("An existing F7 at 0% is replaced in both custom repairs and population balancing", () => {
  const ref = (10).toString(2).padStart(15, "0") + (0).toString(2).padStart(17, "0");
  const players = [{ FirstName: "Existing", LastName: "F7", Position: "WR", TeamIndex: 1, SchoolYear: "Freshman", RedshirtStatus: "Eligible", IsNIL: false, CharacterVisuals: ref }];
  const raw = JSON.stringify({ loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: [{ slotType: "HeadWear", itemAssetName: "GearHelmet_SchuttF7" }, { slotType: "FaceMask", itemAssetName: "GearFaceMask_F7Pro2Bar" }] }] });
  const mix = { mode: "custom", global: Object.fromEntries(HELMET_MODELS.map(model => [model.id, model.id === "GearHelmet_Speed_Flex" ? 100 : 0])), positions: {} };
  for (const balancing of [false, true]) {
    const visuals = [{ isEmpty: false, RawData: raw }];
    applyGlobalEquipmentFixes(players, visuals, 10, { helmetFix: true, helmetDistribution: mix, balanceExistingHelmets: balancing, seed: 190 });
    const gear = JSON.parse(visuals[0].RawData).loadouts[0].loadoutElements;
    assert.equal(gear.find(item => item.slotType === "HeadWear").itemAssetName, "GearHelmet_Speed_Flex");
    assert.notEqual(gear.find(item => item.slotType === "FaceMask").itemAssetName, "GearFaceMask_F7Pro2Bar");
  }
});

const allWeight = id => ({ mode: "custom", global: Object.fromEntries(HELMET_MODELS.map(model => [model.id, model.id === id ? 100 : 0])), positions: {} });
const playerRecord = (row, position = "WR", extra = {}) => ({ FirstName: "Test", LastName: `Player${row}`, Position: position, SchoolYear: "Freshman", TeamIndex: 1, IsNIL: false, CharacterVisuals: (10).toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0"), ...extra });
const loadout = (helmet = "GearHelmet_SchuttF7", mask = "GearFaceMask_F72Bar") => ({ isEmpty: false, RawData: JSON.stringify({ metadata: "preserve", loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: [{ slotType: "HeadWear", itemAssetName: helmet }, { slotType: "FaceMask", itemAssetName: mask }, { slotType: "LeftShoe", itemAssetName: "KeepOriginalShoe" }] }] }) });
const head = row => JSON.parse(row.RawData).loadouts[0].loadoutElements.find(item => item.slotType === "HeadWear").itemAssetName;

test("custom zero-weight exclusion covers every verified helmet and every allowed position", () => {
  for (const model of HELMET_MODELS) for (const position of model.positions) {
    const replacement = model.id === "GearHelmet_Speed_Flex" ? "GearHelmet_SchuttF7Pro" : "GearHelmet_Speed_Flex";
    const configuration = allWeight(replacement), visuals = [loadout(model.id, model.masks[0])];
    assert.equal(helmetAllowedInMix(configuration, model.id, position), false);
    const result = applyGlobalEquipmentFixes([playerRecord(0, position)], visuals, 10, { helmetFix: true, helmetDistribution: configuration, seed: 190 });
    assert.equal(head(visuals[0]), replacement, `${position}: ${model.label} at 0%`);
    assert.equal(result.helmetChanges.length, 1);
    const gear = JSON.parse(visuals[0].RawData).loadouts[0].loadoutElements;
    assert.ok(facemaskFitsHelmet(gear.find(item => item.slotType === "FaceMask").itemAssetName, replacement));
    assert.equal(gear.find(item => item.slotType === "LeftShoe").itemAssetName, "KeepOriginalShoe");
  }
});

test("positive-weight models are kept by custom Repair Only at every allowed position", () => {
  for (const model of HELMET_MODELS) for (const position of model.positions) {
    const configuration = allWeight(model.id), visuals = [loadout(model.id, model.masks[0])], before = structuredClone(visuals);
    assert.equal(helmetAllowedInMix(configuration, model.id, position), true);
    const result = applyGlobalEquipmentFixes([playerRecord(0, position)], visuals, 10, { helmetFix: true, helmetDistribution: configuration });
    assert.deepEqual(visuals, before); assert.equal(result.helmetChanges.length, 0);
  }
});

test("position overrides supersede global exclusions in both directions and honor position aliases", () => {
  const configuration = { ...allWeight("GearHelmet_Speed_Flex"), positions: { QB: allWeight("GearHelmet_SchuttF7").global } };
  const visuals = [loadout(), loadout()], players = [playerRecord(0, "QB"), playerRecord(1, "WR")];
  applyGlobalEquipmentFixes(players, visuals, 10, { helmetFix: true, helmetDistribution: configuration });
  assert.equal(head(visuals[0]), "GearHelmet_SchuttF7"); assert.equal(head(visuals[1]), "GearHelmet_Speed_Flex");
  const reverse = { ...allWeight("GearHelmet_SchuttF7"), positions: { WR: allWeight("GearHelmet_Speed_Flex").global } };
  assert.equal(helmetAllowedInMix(reverse, "GearHelmet_SchuttF7", "WR"), false);
  assert.equal(helmetAllowedInMix(reverse, "GearHelmet_SchuttF7", "QB"), true);
  for (const position of ["LEDG", "REDG", "SAM", "MIKE", "WILL", "RB"]) assert.equal(helmetAllowedInMix(configuration, "GearHelmet_Speed_Flex", position), true);
  const { context } = ui({ helmetDistribution: configuration });
  assert.match(context.helmetRepairExplanation(prepared, context.currentHelmetSettings(), "QB"), /the QB mix: Schutt F7\./);
  assert.match(context.helmetRepairExplanation(prepared, context.currentHelmetSettings(), "WR"), /the WR mix: Riddell SpeedFlex\./);
});

test("Repair Only does not rebalance positive models, while balancing still counts excluded models accurately", () => {
  const players = Array.from({ length: 20 }, (_, row) => playerRecord(row)), original = players.map(() => loadout());
  const mixture = { ...allWeight("GearHelmet_Speed_Flex"), global: { ...allWeight("GearHelmet_Speed_Flex").global, GearHelmet_Speed_Flex: 90, GearHelmet_SchuttF7: 10 } };
  const repairs = structuredClone(original);
  applyGlobalEquipmentFixes(players, repairs, 10, { helmetFix: true, helmetDistribution: mixture });
  assert.deepEqual(repairs, original, "All existing F7s have positive weight, so repairs alone keep them");
  const balanced = structuredClone(original), result = applyGlobalEquipmentFixes(players, balanced, 10, { helmetFix: true, helmetDistribution: allWeight("GearHelmet_Speed_Flex"), balanceExistingHelmets: true });
  const f7 = result.helmetBalance.fbs.families.find(family => family.id === "GearHelmet_SchuttF7");
  assert.equal(f7.before, 20); assert.equal(f7.after, 0); assert.equal(f7.targetCount, 0);
  assert.equal(result.helmetBalance.fbs.families.find(family => family.id === "other").before, 0);
});

test("zero-weight repairs preserve NIL, OL, team/player scope and partially selected shared-row safeguards", () => {
  const players = [playerRecord(0), playerRecord(1, "WR", { IsNIL: true }), playerRecord(2, "LT"), playerRecord(3, "WR", { TeamIndex: 2 }), playerRecord(4), playerRecord(5), playerRecord(6, "WR", { CharacterVisuals: playerRecord(5).CharacterVisuals })];
  const visuals = players.map(() => loadout()), before = structuredClone(visuals);
  applyGlobalEquipmentFixes(players, visuals, 10, { helmetFix: true, helmetDistribution: allWeight("GearHelmet_Speed_Flex"), excludedTeamIndexes: new Set([2]), eligiblePlayer: record => !["Player4", "Player6"].includes(record.LastName) });
  assert.equal(head(visuals[0]), "GearHelmet_Speed_Flex"); assert.equal(head(visuals[2]), "GearHelmet_Speed_Flex");
  for (const row of [1, 3, 4, 5, 6]) assert.deepEqual(visuals[row], before[row]);
});

test("shared-row repairs require a positive-weight intersection for every linked position", () => {
  const players = [playerRecord(0, "QB"), playerRecord(1, "WR", { CharacterVisuals: playerRecord(0).CharacterVisuals })];
  const configuration = { ...allWeight("GearHelmet_SchuttF7Pro"), positions: { WR: { ...allWeight("GearHelmet_SchuttF7Pro").global, GearHelmet_SchuttF7: 50, GearHelmet_SchuttF7Pro: 50 } } };
  const visuals = [loadout()];
  applyGlobalEquipmentFixes(players, visuals, 10, { helmetFix: true, helmetDistribution: configuration });
  assert.equal(head(visuals[0]), "GearHelmet_SchuttF7Pro");
  const conflict = { ...configuration, positions: { WR: allWeight("GearHelmet_SchuttF7").global } }, unsafe = [loadout()], before = structuredClone(unsafe);
  assert.throws(() => applyGlobalEquipmentFixes(players, unsafe, 10, { helmetFix: true, helmetDistribution: conflict }), /shared equipment.*no helmet allowed/i);
  assert.deepEqual(unsafe, before);
});

test("custom repairs are deterministic, honor pass-off, and leave Toolkit Defaults unchanged", () => {
  const players = [playerRecord(0), playerRecord(1)], original = [loadout(), loadout()];
  const configuration = { ...allWeight("GearHelmet_Speed_Flex"), global: { ...allWeight("GearHelmet_Speed_Flex").global, GearHelmet_Speed_Flex: 60, GearHelmet_SchuttF7Pro: 40 } }, saved = JSON.stringify(configuration);
  const first = structuredClone(original), second = structuredClone(original);
  for (const visuals of [first, second]) applyGlobalEquipmentFixes(players, visuals, 10, { helmetFix: true, helmetDistribution: configuration, seed: 190 });
  assert.deepEqual(first, second); assert.equal(JSON.stringify(configuration), saved);
  for (const options of [{ helmetFix: false, helmetDistribution: configuration }, { helmetFix: true }]) {
    const visuals = structuredClone(original); applyGlobalEquipmentFixes(players, visuals, 10, options); assert.deepEqual(visuals, original);
  }
});
