import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { applyWhiteHelmetFix as originalWhite } from "./legacy-reference/equipment/whiteHelmet.js";
import { applyGlobalEquipmentFixes as originalGlobal } from "./legacy-reference/equipment/globalFixes.js";
import { patchFreshmanEquipment as originalFreshman } from "./legacy-reference/equipment/patcher.js";
import { applyWhiteHelmetFix as desktopWhite } from "../src/main/tools/equipment/core/whiteHelmet.js";
import { applyGlobalEquipmentFixes as desktopGlobal } from "../src/main/tools/equipment/core/globalFixes.js";
import { patchFreshmanEquipment as desktopFreshman } from "../src/main/tools/equipment/core/patcher.js";

const here = path.dirname(fileURLToPath(import.meta.url)), original = path.resolve(here, "legacy-reference/equipment"), desktop = path.resolve(here, "../src/main/tools/equipment/core");
const ref = (table, row) => table.toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
const raw = elements => JSON.stringify({ loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: elements }] });
const visual = RawData => ({ RawData, isEmpty: false });
const equipment = () => [{ slotType: "HeadWear", itemAssetName: "GearHelmet_Old" }, { slotType: "FaceMask", itemAssetName: "GearFaceMask_Old" }, { slotType: "OuterPants", itemAssetName: "GearPants_Standard" }, { slotType: "OuterShirt", itemAssetName: "Gear_JerseyStyle_RolledLow" }, { slotType: "InnerShirt", itemAssetName: "Undershirt_None" }, { slotType: "InnerSocks", itemAssetName: "Gear_Socks_Mid" }, { slotType: "LeftSpat", itemAssetName: "Spat_None" }, { slotType: "RightSpat", itemAssetName: "Spat_None" }, { slotType: "LeftArmWear", itemAssetName: "GearArmSleeve_Baggy_Black" }, { slotType: "LeftWristWear", itemAssetName: "GearWrist_Tape" }, { slotType: "LeftElbowWear", itemAssetName: "ElbowGear_Pad" }, { slotType: "LeftThighWear", itemAssetName: "ThighPad_Default" }, { slotType: "RightThighWear", itemAssetName: "ThighPad_Default" }];
const basePlayer = (name, row, extra = {}) => ({ FirstName: name, LastName: "Parity", Position: "WR", SchoolYear: "Freshman", RedshirtStatus: "Eligible", CharacterBodyType: "Thin", CharacterVisuals: ref(10, row), IsNIL: false, TeamIndex: 1, OverallRating: 80, JerseyNum: 1, isEmpty: false, ...extra });

test("unchanged equipment cores remain v2.0-identical except explicitly migrated compatibility logic", () => { const text = file => fs.readFileSync(file, "utf8").replaceAll("\r\n", "\n").trimEnd(); for (const name of ["logger.js", "whiteHelmet.js"]) { const expected = text(path.join(original, name)).replaceAll('LE: "LEDGE"', 'LE: "LEDG"'); assert.equal(text(path.join(desktop, name)), expected, name); } });
test("White Helmet detection and mutation exactly match v2.0", () => { const recordsA = [{ TeamIndex: 1, NumPrideStickers: 33 }, { TeamIndex: 1, NumPrideStickers: 32 }, { TeamIndex: 255, NumPrideStickers: 99 }], recordsB = structuredClone(recordsA); assert.deepEqual(desktopWhite(recordsA, { apply: true }).map(x => [x.row, x.oldCount, x.newCount]), originalWhite(recordsB, { apply: true }).map(x => [x.row, x.oldCount, x.newCount])); assert.deepEqual(recordsA, recordsB); });
test("unchanged Equipment Patcher passes and safeguards retain v2.0 behavior", () => { const playersA = [basePlayer("Eligible", 0), basePlayer("ProtectedNIL", 1, { IsNIL: true })], playersB = structuredClone(playersA), visualsA = [visual(raw(equipment())), visual(raw(equipment()))], visualsB = structuredClone(visualsA), options = { pantsFix: true, helmetFix: false, rolledJerseyFix: true, sockFix: true, sleeveCompatibilityFix: true, nikeThighPads: true, seed: 42, teamNames: new Map([[1, "Test"]]) }; const a = desktopGlobal(playersA, visualsA, 10, options), b = originalGlobal(playersB, visualsB, 10, options); const stripOverall = value => structuredClone(value, { transfer: [] }).map?.(item => { delete item.overall; return item; }) ?? value; for (const key of Object.keys(b)) assert.deepEqual(Array.isArray(a[key]) ? stripOverall(a[key]) : a[key], b[key]); assert.deepEqual(visualsA, visualsB); assert.equal(visualsA[1].RawData, visualsB[1].RawData); });
test("Randomizer retains legacy donor, universal gear, and safeguard parity apart from explicit pants and brand fixes", () => {
  const players = [basePlayer("Target", 0), basePlayer("Donor", 1, { SchoolYear: "Senior", RedshirtStatus: "Previous", OverallRating: 95 })];
  const visuals = [visual(raw(equipment())), visual(raw(equipment().map(item => ({ ...item, itemAssetName: `${item.itemAssetName}_DONOR` }))))];
  const common = { teamNames: new Map([[1, "Test"]]), teamApparel: new Map([[1, "nike"]]), seed: 123, top: 125, apply: true };
  const visualsA = structuredClone(visuals), visualsB = structuredClone(visuals);
  const a = desktopFreshman(structuredClone(players), visualsA, 10, common), b = originalFreshman(structuredClone(players), visualsB, 10, common);
  const withoutPants = value => { const parsed = JSON.parse(value); for (const loadout of parsed.loadouts) loadout.loadoutElements = loadout.loadoutElements.filter(item => item.slotType !== "OuterPants"); return JSON.stringify(parsed); };
  const normalized = result => {
    const copy = structuredClone(result); delete copy.facePaintPools; delete copy.brandCorrections;
    for (const change of copy.changes) {
      delete change.brandAssignments; delete change.brandCorrections; delete change.facePaint;
      change.newRawData = withoutPants(change.newRawData);
      // Legacy appended an empty, unchecked branded donor group even when no brand items existed.
      change.donorUses = change.donorUses.filter(use => use.group !== "gloves + cleats");
    }
    return copy;
  };
  assert.deepEqual(normalized(a), normalized(b));
  assert.deepEqual(visualsA.map(item => withoutPants(item.RawData)), visualsB.map(item => withoutPants(item.RawData)));
  assert.equal(JSON.parse(visualsA[0].RawData).loadouts[0].loadoutElements.find(item => item.slotType === "OuterPants").itemAssetName, "GearPants_Standard_DONOR");
  assert.equal(JSON.parse(visualsB[0].RawData).loadouts[0].loadoutElements.find(item => item.slotType === "OuterPants").itemAssetName, "GearPants_AboveKnee");
  const repeatVisuals = structuredClone(visuals); desktopFreshman(structuredClone(players), repeatVisuals, 10, common); assert.deepEqual(repeatVisuals, visualsA);
});
