import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import vm from "node:vm";
import { UNLOCKED_TATTOO_POOL, DEFAULT_UNLOCKED_TATTOO_SELECTION, normalizeTattooSelection, rollUnlockedTattoo, applyUnlockedTattooPlan } from "../src/main/tools/equipment/core/tattoos.js";
import { normalizeEquipmentOptions } from "../src/main/tools/equipment/runner.js";

const random = () => { let seed = 123456; return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; };
const outfit = () => ({ loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: [
  { slotType: "HeadWear", itemAssetName: "Helmet_Riddell_SpeedFlex" },
  { slotType: "LeftArmWear", itemAssetName: "LeftArm_None" },
  { slotType: "RightArmWear", itemAssetName: "GearArmSleeve_Quarter_White" },
  { slotType: "GearFootwear", itemAssetName: "Nike_Cleats" }
] }] });

test("Japanese and Polynesian catalog styles are individually selectable but never default-selected", () => {
  assert.equal(UNLOCKED_TATTOO_POOL.filter(item => item.value.includes("Japanese")).length, 14);
  assert.equal(UNLOCKED_TATTOO_POOL.filter(item => item.value.includes("Polynesian")).length, 11);
  assert.equal(new Set(UNLOCKED_TATTOO_POOL.map(item => item.value)).size, 51);
  for (const item of UNLOCKED_TATTOO_POOL) {
    assert.equal(item.defaultSelected, !/Japanese|Polynesian/.test(item.value));
    assert.deepEqual(normalizeTattooSelection([item.value, item.value]), [item.value]);
  }
  assert.deepEqual(normalizeEquipmentOptions({ unlockedTattooFix: true }, false).unlockedTattooSelection, [...DEFAULT_UNLOCKED_TATTOO_SELECTION]);
  const oldPreset = ["CujoMatty_ArmTats_35", "LegTattoo_Four"];
  assert.deepEqual(normalizeEquipmentOptions({ unlockedTattooFix: true, unlockedTattooSelection: oldPreset }, false).unlockedTattooSelection, oldPreset);
});

test("the unchanged default pool reproduces the pre-expansion seeded asset and side choices", () => {
  const rng = random();
  const assignments = Array.from({ length: 500 }, () => {
    const plan = rollUnlockedTattoo(rng);
    return { kind: plan.kind, arms: Object.fromEntries(Object.entries(plan.arms).map(([side, item]) => [side, item.asset])), legs: plan.legs?.asset ?? null };
  });
  // Captured before the optional styles or labels were changed.
  assert.equal(crypto.createHash("sha256").update(JSON.stringify(assignments)).digest("hex"), "d5af357939a2553708c21cf4cda6e053cdfc5c201bb284831f1d4a082e7c7378");
  assert.ok(assignments.every(plan => [...Object.values(plan.arms), plan.legs].filter(Boolean).every(asset => !/Japanese|Polynesian/.test(asset))));
});

test("every optional arm style writes only the selected tattoo to the safe Base layer and preserves equipment", () => {
  for (const item of UNLOCKED_TATTOO_POOL.filter(item => !item.defaultSelected)) {
    const parsed = outfit(), gearBefore = structuredClone(parsed.loadouts[0]);
    const plan = rollUnlockedTattoo(random(), parsed, [item.value]);
    assert.ok(Object.values(plan.arms).every(tattoo => tattoo.asset === item.value));
    assert.equal(plan.legs, null);
    const report = applyUnlockedTattooPlan(parsed, plan);
    assert.ok(report.newItem.includes(item.label)); assert.ok(report.tattooAsset.includes(item.value));
    assert.deepEqual(parsed.loadouts.find(loadout => loadout.loadoutType === "PlayerOnField"), gearBefore);
    assert.equal(parsed.loadouts[0].loadoutCategory, "Base"); assert.equal(parsed.loadouts[0].loadoutType, undefined);
  }
});

test("tattoo labels describe verified style and coverage and keep stable asset IDs", () => {
  const find = value => UNLOCKED_TATTOO_POOL.find(item => item.value === value);
  assert.equal(find("ArmTattoo_Tattoos_Polynesian_Hawaiian_Arm").label, "Polynesian Hawaiian I");
  assert.equal(find("ArmTattoo_Tattoos_Polynesian_Maori_Arm_A").label, "Polynesian Māori I");
  assert.match(find("ArmTattoo_Tattoos_Japanese_03_ForearmHalfSleeve2").label, /Japanese forearm half-sleeve.*alternate/);
  assert.match(find("CujoMatty_ArmTats_35").label, /CujoMatty custom arm design 35/);
  assert.equal(find("LegTattoo_Four").label, "Custom leg design 4");
});

test("tattoo checkbox pool has style headings, explicit opt-in defaults, and searchable asset identifiers", () => {
  const context = vm.createContext({ localizedPosition: value => value, positionCompare: () => 0, escapeHtml: value => String(value), multiSelectEmptyMeaning: () => "None" });
  vm.runInContext(fs.readFileSync(new URL("../src/renderer/selectors.js", import.meta.url), "utf8"), context);
  const html = context.checkboxPicker("unlocked-tattoo-pool", "Tattoo pool", UNLOCKED_TATTOO_POOL, "Choose designs", DEFAULT_UNLOCKED_TATTOO_SELECTION);
  assert.equal((html.match(/data-option-section=/g) ?? []).length, 4);
  assert.equal((html.match(/data-option-choice[^>]+checked/g) ?? []).length, 26);
  assert.equal((html.match(/<option[^>]+selected/g) ?? []).length, 26);
  assert.match(html, /Polynesian arm designs \(off by default\)/);
  assert.match(html, /data-search="polynesian maori i armtattoo_tattoos_polynesian_maori_arm_a"/);
  const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
  assert.match(renderer, /prepared.tattooPool \?\? \[\]\)\.filter\(item => item.defaultSelected !== false\)/);
});
