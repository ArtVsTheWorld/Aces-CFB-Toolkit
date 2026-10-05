import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { normalizeEquipmentOptions } from "../src/main/tools/equipment/runner.js";
import { patchFreshmanEquipment, rollEquipmentMode, noDripChanceForPosition, applyUnlockedRandomizerEquipment } from "../src/main/tools/equipment/core/patcher.js";
import { applyGlobalEquipmentFixes, OAKLEY_VISOR_REPLACEMENTS } from "../src/main/tools/equipment/core/globalFixes.js";
import { equipmentDisplayName } from "../src/main/tools/equipment/catalog.js";
import { tools } from "../src/shared/toolRegistry.js";

const ref = row => (10).toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
const player = (row, position = "WR", year = "Senior") => ({ isEmpty: false, FirstName: `Player${row}`, LastName: "Checkbox", Position: position, SchoolYear: year, RedshirtStatus: "Eligible", CharacterBodyType: "Thin", CharacterVisuals: ref(row), IsNIL: false, TeamIndex: 1, OverallRating: 80 });
const field = elements => ({ loadoutType: "PlayerOnField", loadoutElements: structuredClone(elements) });
const visual = elements => ({ isEmpty: false, RawData: JSON.stringify({ loadouts: [field(elements)], metadata: "keep me" }) });
const seedGear = row => [{ slotType: "HeadWear", itemAssetName: `Helmet_${row}` }, { slotType: "InnerSocks", itemAssetName: "Gear_Socks_Mid" }, { slotType: "LeftArmWear", itemAssetName: "GearArmSleeve_Baggy_Black" }];
const runRandomizer = options => {
  const players = [player(0, "WR", "Freshman"), player(1), player(2, "CB")];
  return patchFreshmanEquipment(players, players.map((_, row) => visual(seedGear(row))), 10, { seed: 52, top: 1, eligiblePlayer: record => record === players[0], ...options });
};
const read = file => fs.readFileSync(new URL(file, import.meta.url), "utf8");

test("v19.0.0 and v5.1 Randomizer and v5.5 Patcher retain all original chance defaults", () => {
  assert.equal(JSON.parse(read("../package.json")).version, "19.0.0");
  for (const id of ["freshman-equipment", "equipment-patcher"]) assert.equal(tools.find(tool => tool.id === id).version, id === "freshman-equipment" ? "5.1" : "5.5");
  const normalized = normalizeEquipmentOptions({}, true);
  assert.equal(normalized.crossPositionPercent, 10); assert.equal(normalized.multipleDonorPercent, 30);
  assert.equal(normalized.expandedEquipmentPercent, 10);
  assert.deepEqual(normalized.noDripPercentages, { skill: 1, balanced: 3, heavy: 6 });
  assert.equal(normalized.noDripProfile, false); assert.equal(normalized.usingUnlockedMod, false);
});

test("chance inputs require whole percentages and mixing cannot exceed 100 percent", () => {
  for (const key of ["crossPositionPercent", "multipleDonorPercent", "expandedEquipmentPercent"]) {
    for (const value of [-1, 101, 0.5, "", "oops"]) assert.throws(() => normalizeEquipmentOptions({ [key]: value }, true), /whole percentage/);
  }
  for (const group of ["skill", "balanced", "heavy"]) assert.throws(() => normalizeEquipmentOptions({ noDripPercentages: { [group]: 3.5 } }, true), /whole percentage/);
  assert.throws(() => normalizeEquipmentOptions({ crossPositionPercent: 80, multipleDonorPercent: 30 }, true), /no more than 100/);
  const extreme = normalizeEquipmentOptions({ crossPositionPercent: 100, multipleDonorPercent: 0 }, true);
  assert.equal(extreme.forceCrossPosition, true); assert.equal(extreme.disableCrossPosition, false);
  assert.equal(normalizeEquipmentOptions({ crossPositionPercent: 0 }, true).disableCrossPosition, true);
});

test("older force or disable mixing options translate without changing their behavior", () => {
  const forced = normalizeEquipmentOptions({ forceCrossPosition: true }, true);
  assert.equal(forced.crossPositionPercent, 100); assert.equal(forced.multipleDonorPercent, 0);
  const disabled = normalizeEquipmentOptions({ disableCrossPosition: true }, true);
  assert.equal(disabled.crossPositionPercent, 0); assert.equal(disabled.multipleDonorPercent, 30);
});

test("cross, mixed, and single-donor shares honor exact boundaries and original fallback", () => {
  const mode = (roll, eligible = true, mixed = 0.3, cross = 0.1) => rollEquipmentMode(() => roll, eligible, mixed, cross);
  assert.equal(mode(0), "cross"); assert.equal(mode(0.09999), "cross");
  assert.equal(mode(0.1), "mixed"); assert.equal(mode(0.39999), "mixed"); assert.equal(mode(0.4), "full");
  assert.equal(mode(0.2, false), "mixed"); assert.equal(mode(0.3, false), "full");
  assert.equal(mode(0.49999, true, 0.2, 0.5), "cross"); assert.equal(mode(0.5, true, 0.2, 0.5), "mixed"); assert.equal(mode(0.7, true, 0.2, 0.5), "full");
  assert.equal(mode(0.99, true, 0, 1), "cross"); assert.equal(mode(0, true, 0, 0), "full");
});

test("explicit default chances reproduce the existing seeded randomizer output exactly", () => {
  assert.deepEqual(runRandomizer({}), runRandomizer({ mixedChance: 0.3, crossMixedChance: 0.1, unlockedItemChance: 0.1, noDripPercentages: { skill: 1, balanced: 3, heavy: 6 } }));
  const options = { mixedChance: 0.2, crossMixedChance: 0.5, usingUnlockedMod: true, unlockedItemChance: 0.4, noDripProfile: true, noDripPercentages: { skill: 50, balanced: 50, heavy: 50 } };
  assert.deepEqual(runRandomizer(options), runRandomizer(options));
});

test("No Drip uses configurable group chances at every supported position, including zero and 100", () => {
  const groups = { skill: ["WR", "CB", "FS", "SS", "SAFETY"], balanced: ["HB", "RB", "TE", "QB", "LOLB", "MLB", "ROLB", "LB"], heavy: ["LT", "LG", "C", "RG", "RT", "LE", "RE", "DT", "EDGE", "FB", "K", "P"] };
  for (const [group, positions] of Object.entries(groups)) for (const position of positions) {
    assert.equal(noDripChanceForPosition(position, { [group]: 23 }), 0.23, position);
    assert.equal(noDripChanceForPosition(position, { [group]: 0 }), 0, position);
    assert.equal(noDripChanceForPosition(position, { [group]: 100 }), 1, position);
  }
  assert.equal(runRandomizer({ noDripProfile: true, noDripPercentages: { skill: 0 } }).changes[0].noDrip, false);
  assert.equal(runRandomizer({ noDripProfile: true, noDripPercentages: { skill: 100 } }).changes[0].noDrip, true);
});

test("Expanded Equipment Pool honors configurable per-category chances including zero and 100", () => {
  const target = { position: "DT", branding: "nike" }, unchanged = [field(seedGear(0))], original = structuredClone(unchanged);
  assert.deepEqual(applyUnlockedRandomizerEquipment(unchanged, target, () => 0, 0), []); assert.deepEqual(unchanged, original);
  const full = [field([])]; assert.ok(applyUnlockedRandomizerEquipment(full, target, () => 0.99, 1).length >= 7);
  assert.equal(runRandomizer({ usingUnlockedMod: true, unlockedItemChance: 0 }).changes[0].unlockedChanges.length, 0);
  assert.ok(runRandomizer({ usingUnlockedMod: true, unlockedItemChance: 1 }).changes[0].unlockedChanges.length > 0);
});

test("Oakley conversion preserves tint, every field loadout, and all unrelated equipment", () => {
  const originals = Object.keys(OAKLEY_VISOR_REPLACEMENTS), players = originals.map((_, row) => player(row));
  const visuals = originals.map((itemAssetName, row) => ({ isEmpty: false, RawData: JSON.stringify({ metadata: "keep", loadouts: [field([...seedGear(row), { slotType: "Visor", itemAssetName }]), field([{ slotType: "Visor", itemAssetName }]), { loadoutType: "Base", loadoutElements: [{ slotType: "Visor", itemAssetName }] }] }) }));
  const before = visuals.map(record => JSON.parse(record.RawData));
  const result = applyGlobalEquipmentFixes(players, visuals, 10, { oakleyVisorFix: true });
  assert.equal(result.oakleyVisorPlayersChanged, 4); assert.equal(result.oakleyVisorChanges.length, 4);
  originals.forEach((asset, row) => {
    const expected = structuredClone(before[row]);
    for (const loadout of expected.loadouts.filter(item => item.loadoutType === "PlayerOnField")) loadout.loadoutElements.find(item => item.slotType === "Visor").itemAssetName = OAKLEY_VISOR_REPLACEMENTS[asset];
    assert.deepEqual(JSON.parse(visuals[row].RawData), expected);
    assert.equal(result.oakleyVisorChanges[row].oldItem, asset); assert.equal(result.oakleyVisorChanges[row].newItem, OAKLEY_VISOR_REPLACEMENTS[asset]);
    assert.notEqual(equipmentDisplayName(OAKLEY_VISOR_REPLACEMENTS[asset]), OAKLEY_VISOR_REPLACEMENTS[asset]);
  });
});

test("Oakley conversion leaves missing, none, existing Oakley, and unknown visors unchanged", () => {
  for (const asset of [undefined, "GearVisor_None", "GearVisor_visorOakley_clear", "CustomVisor", "toString"]) {
    const visuals = [visual(asset === undefined ? seedGear(0) : [...seedGear(0), { slotType: "Visor", itemAssetName: asset }])], before = visuals[0].RawData;
    const result = applyGlobalEquipmentFixes([player(0)], visuals, 10, { oakleyVisorFix: true });
    assert.equal(visuals[0].RawData, before); assert.equal(result.oakleyVisorPlayersChanged, 0);
  }
});

test("Oakley conversion preserves NIL, team and shared-record protection without consuming random rolls", () => {
  const gear = [{ slotType: "Visor", itemAssetName: "GearVisor_visorDark" }];
  for (const setup of [players => { players[0].IsNIL = true; return {}; }, () => ({ excludedTeamIndexes: new Set([1]) }), players => { const second = player(1); second.CharacterVisuals = ref(0); second.IsNIL = true; players.push(second); return {}; }]) {
    const players = [player(0)], visuals = [visual(gear)], before = visuals[0].RawData;
    const options = setup(players); applyGlobalEquipmentFixes(players, visuals, 10, { oakleyVisorFix: true, ...options }); assert.equal(visuals[0].RawData, before);
  }
  const a = [visual([{ slotType: "InnerPants", itemAssetName: "GearLegsBase_PantsLong" }])], b = structuredClone(a);
  const normal = applyGlobalEquipmentFixes([player(0)], a, 10, { seed: 12, pantsFix: true, visorFix: true });
  const enabled = applyGlobalEquipmentFixes([player(0)], b, 10, { seed: 12, pantsFix: true, visorFix: true, oakleyVisorFix: true });
  assert.deepEqual(b, a); assert.deepEqual(enabled.visorChanges, normal.visorChanges);
});

test("old preset exclusions become an equivalent include list, and exclude-all is blocked", () => {
  const included = { multiple: true, options: ["Alabama", "Georgia", "Michigan"].map((textContent, index) => ({ value: String(index), textContent })) };
  const context = vm.createContext({ document: { getElementById: id => id === "equipment-included" ? included : undefined }, content: { querySelectorAll: () => [] } });
  vm.runInContext(read("../src/renderer/presets.js"), context);
  const values = context.presetValues({ values: {}, teamSelections: { "equipment-included": [], "equipment-excluded": ["Georgia"] } });
  assert.deepEqual(Array.from(values["equipment-included"]), ["0", "2"]); assert.equal(values["equipment-excluded"], undefined);
  assert.throws(() => context.presetValues({ values: {}, teamSelections: { "equipment-excluded": ["Alabama", "Georgia", "Michigan"] } }), /exclude every team/);
});

test("session migration preserves old exclusions and force/disable mixing settings", () => {
  const context = vm.createContext({ document: { getElementById: () => ({ options: [{ value: "0" }, { value: "1" }, { value: "2" }] }) } });
  vm.runInContext(read("../src/renderer/selectors.js"), context);
  const forced = { "equipment-included": [], "equipment-excluded": ["1"], "equipment-force-cross": true };
  context.migrateEquipmentSessionSettings(forced);
  assert.deepEqual(Array.from(forced["equipment-included"]), ["0", "2"]); assert.equal(forced["equipment-cross-percent"], "100"); assert.equal(forced["equipment-multiple-percent"], "0"); assert.equal(forced["equipment-excluded"], undefined);
  const disabled = { "equipment-disable-cross": true }; context.migrateEquipmentSessionSettings(disabled); assert.equal(disabled["equipment-cross-percent"], "0"); assert.equal(disabled["equipment-multiple-percent"], "30");
});

test("every native multiselect is hidden behind a mouse-only checkbox picker", () => {
  const renderer = read("../src/renderer/renderer.js"), selectors = read("../src/renderer/selectors.js");
  for (const source of [renderer, selectors]) {
    assert.doesNotMatch(source, /Ctrl-click|Ctrl\+A|ctrlKey|metaKey/);
    for (const tag of source.match(/<select\b[^>]*\bmultiple\b[^>]*>/g) ?? []) assert.match(tag, /\bhidden\b/);
  }
  assert.match(renderer, /function multiSelect[^\n]+return checkboxPicker/);
  assert.match(selectors, /data-option-position/); assert.match(selectors, /Click a checkbox to select or deselect/);
  assert.doesNotMatch(renderer, /teamPicker\("equipment-excluded"|ruleToggle\("equipment-force-cross"|ruleToggle\("equipment-disable-cross"/);
});
