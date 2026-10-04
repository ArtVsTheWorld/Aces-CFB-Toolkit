import test from "node:test";
import assert from "node:assert/strict";
import { canUseVicis, buildHelmetBalancePlan, helmetTargets } from "../src/main/tools/equipment/core/helmetBalance.js";
import { applyGlobalEquipmentFixes, rollApprovedHelmet } from "../src/main/tools/equipment/core/globalFixes.js";
import { patchFreshmanEquipment } from "../src/main/tools/equipment/core/patcher.js";
import { equipmentItem, equipmentDisplayName, isInvalidMouthpieceAsset, mouthpieceDisplayValue } from "../src/main/tools/equipment/catalog.js";
import { equipmentPreviewChanges } from "../src/main/tools/equipment/preview.js";

const vicis = "GearHelmet_VicisZero2", cleat = "GearFootwear_shoe_high_AdidasFreakUltra23", mouthpiece = "GearMouthpiece_Mouthguard1_White";
const item = (slotType, itemAssetName) => ({ slotType, itemAssetName });
const visual = elements => ({ isEmpty: false, RawData: JSON.stringify({ loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: elements }] }) });
const player = (row, position = "WR") => ({ FirstName: "Player", LastName: String(row), Position: position, TeamIndex: 1, SchoolYear: "Freshman", CharacterBodyType: "Standard", OverallRating: 70, RedshirtStatus: "Eligible", IsNIL: false, CharacterVisuals: (10).toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0") });
const get = (record, slot) => JSON.parse(record.RawData).loadouts[0].loadoutElements.find(element => element.slotType === slot)?.itemAssetName;
const allowed = ["QB", "TE", "LOLB", "MLB", "ROLB", "LE", "RE", "DT", "SAM", "MIKE", "WILL", "LEDG", "REDG", "LB", "DL", "EDGE", "DE"];
const excluded = ["HB", "FB", "WR", "LT", "LG", "C", "RG", "RT", "CB", "FS", "SS", "K", "P", "", "Unknown"];
test("Vicis enabled targets are 68/15/14/3 and every supported position obeys eligibility", () => {
  assert.deepEqual(helmetTargets(true), { SpeedFlex: 68, "F7 / F7 Pro": 15, Axiom: 14, "Vicis Zero 2": 3 });
  for (const position of [...allowed, ...excluded]) {
    assert.equal(canUseVicis(position), allowed.includes(position), position);
    for (const draw of [.98, .9999]) assert.equal(rollApprovedHelmet(() => draw, true, position) === vicis, allowed.includes(position), position);
  }
});
test("Vicis disabled retains the original exact 70/10/10/10 draws for every position", () => {
  for (const position of [...allowed, ...excluded]) for (const [draw, expected] of [[.6999, "GearHelmet_Speed_Flex"], [.7, "GearHelmet_Axiom"], [.8, "GearHelmet_SchuttF7"], [.9, "GearHelmet_SchuttF7Pro"]]) assert.equal(rollApprovedHelmet(() => draw, false, position), expected);
});
for (const position of ["QB", "TE", "LOLB", "MLB", "ROLB", "LE", "RE", "DT", "WR", "HB", "CB", "FS", "SS", "K", "P"]) test(`normal helmet replacements respect Vicis eligibility: ${position}`, () => {
  const players = Array.from({ length: 1000 }, (_, row) => player(row, position)), visuals = players.map(() => visual([item("HeadWear", "Invalid")]));
  const result = applyGlobalEquipmentFixes(players, visuals, 10, { helmetFix: true, allowVicisZero2: true, seed: 170 });
  assert.equal(result.helmetChanges.length, 1000);
  const vicisCount = result.helmetChanges.filter(change => change.newHelmet === vicis).length;
  if (allowed.includes(position)) assert.ok(vicisCount > 0); else assert.equal(vicisCount, 0);
  assert.ok(result.helmetChanges.every(change => equipmentItem(change.newFacemask)));
});
test("balancing caps Vicis at available recipients and never assigns unsupported positions", () => {
  for (const eligibleCount of [0, 1, 3, 10, 100]) {
    const entries = Array.from({ length: 100 }, (_, row) => ({ visualsRow: row, position: row < eligibleCount ? "QB" : "WR", helmet: "GearHelmet_Speed_Flex", cohort: "fbs", team: `Team ${row % 10}` }));
    const result = buildHelmetBalancePlan(entries, { allowVicis: true, seed: 54 });
    assert.equal([...result.plans.values()].filter(helmet => helmet === vicis).length, Math.min(3, eligibleCount));
    for (const [row, helmet] of result.plans) if (helmet === vicis) assert.ok(canUseVicis(entries[row].position));
    for (const family of result.diagnostics.fbs.families) assert.equal(family.after, family.targetCount);
    assert.equal(result.diagnostics.fbs.vicisTargetLimited, eligibleCount < 3);
    const balanced = entries.map(entry => ({ ...entry, helmet: result.plans.get(entry.visualsRow) ?? entry.helmet }));
    assert.equal(buildHelmetBalancePlan(balanced, { allowVicis: true, seed: 54 }).plans.size, 0);
  }
});
test("balancing finds eligible Vicis recipients even when they wear a below-target family", () => {
  const entries = Array.from({ length: 100 }, (_, row) => ({ visualsRow: row, position: row < 3 ? "TE" : "WR", helmet: row < 3 ? "GearHelmet_Axiom" : "GearHelmet_Speed_Flex", cohort: "fbs", team: `Team ${row % 10}` }));
  const result = buildHelmetBalancePlan(entries, { allowVicis: true, seed: 4 });
  assert.equal(result.plans.size, 32);
  for (let row = 0; row < 3; row++) assert.equal(result.plans.get(row), vicis);
  for (const family of result.diagnostics.fbs.families) assert.equal(family.after, family.targetCount);
});
test("a shared QB/WR equipment record cannot receive Vicis", () => {
  const players = [player(0, "QB"), { ...player(1), CharacterVisuals: player(0).CharacterVisuals }];
  for (let seed = 0; seed < 100; seed++) {
    const visuals = [visual([item("HeadWear", "Invalid")])];
    applyGlobalEquipmentFixes(players, visuals, 10, { helmetFix: true, allowVicisZero2: true, seed });
    assert.notEqual(get(visuals[0], "HeadWear"), vicis);
  }
});
test("known cleats in MouthWear are repaired by Add Mouthpieces, without changing shoes or other slots", () => {
  const players = [player(0, "RE"), { ...player(1), IsNIL: true }, player(2, "QB"), player(3), player(4)];
  const visuals = players.map(() => visual([item("MouthWear", cleat), item("LeftShoe", cleat), item("RightShoe", cleat), item("LeftWristWear", "GearWrist_wristBandNormal_White")]));
  const before = structuredClone(visuals);
  const result = applyGlobalEquipmentFixes(players, visuals, 10, { unlockedMouthpieceFix: true, rerollExistingMouthpieces: false, seed: 35, eligiblePlayer: record => record !== players[3] });
  assert.equal(result.existingMouthpieceColorChanges.length, 2);
  for (const row of [0, 4]) {
    assert.equal(equipmentItem(get(visuals[row], "MouthWear")).slots.includes("MouthWear"), true);
    const changes = equipmentPreviewChanges(before[row].RawData, visuals[row].RawData);
    assert.equal(changes.length, 1); assert.match(changes[0].currentValue, /Invalid Mouthpiece \(Adidas Freak Ultra 23\)/);
    assert.equal(result.existingMouthpieceColorChanges.find(change => change.row === row).repairInvalid, true);
  }
  for (const row of [1, 2, 3]) assert.equal(visuals[row].RawData, before[row].RawData);
});
test("invalid-mouthpiece detection is slot-specific and does not guess unknown custom equipment", () => {
  assert.equal(isInvalidMouthpieceAsset(cleat), true);
  assert.equal(isInvalidMouthpieceAsset(mouthpiece), false);
  assert.equal(isInvalidMouthpieceAsset("MyCustomMouthpiece"), false);
  assert.equal(equipmentDisplayName(cleat), "Adidas Freak Ultra 23");
  assert.equal(mouthpieceDisplayValue("MyCustomMouthpiece"), "MyCustomMouthpiece");
  const visuals = [visual([item("MouthWear", "MyCustomMouthpiece")])], before = visuals[0].RawData;
  applyGlobalEquipmentFixes([player(0)], visuals, 10, { unlockedMouthpieceFix: true });
  assert.equal(visuals[0].RawData, before);
});
for (const mode of ["single", "mixed", "cross", "selected"]) test(`known wrong-slot mouthpieces never propagate through ${mode} donors`, () => {
  const players = [player(0), { ...player(1), SchoolYear: "Senior", OverallRating: 90 }, { ...player(2, "CB"), SchoolYear: "Senior", OverallRating: 95 }];
  const visuals = [visual([item("MouthWear", mouthpiece)]), visual([item("MouthWear", cleat)]), visual([item("MouthWear", cleat)])], donorBefore = visuals.slice(1).map(visual => visual.RawData);
  const options = { top: 1, seed: 8, apply: true, mixedChance: mode === "mixed" ? 1 : 0, crossMixedChance: mode === "cross" ? 1 : 0, forceCrossPosition: mode === "cross", ...(mode === "selected" ? { donorRows: [1] } : {}) };
  const result = patchFreshmanEquipment(players, visuals, 10, options);
  assert.equal(result.changes.length, 1);
  assert.equal(isInvalidMouthpieceAsset(get(visuals[0], "MouthWear")), false);
  assert.deepEqual(visuals.slice(1).map(visual => visual.RawData), donorBefore);
  if (mode === "cross") assert.equal(result.changes[0].crossPositionMixed, true);
  if (mode === "mixed") assert.equal(result.changes[0].mixed, true);
});
