import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { tools } from "../src/shared/toolRegistry.js";
import { normalizeEquipmentOptions } from "../src/main/tools/equipment/runner.js";
import { equipmentPreviewChanges } from "../src/main/tools/equipment/preview.js";

const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");

test("Randomizer gear details show readable, escaped before/after values in both Cards and Table", () => {
  const context = vm.createContext({ escapeHtml: value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]) });
  const declaration = renderer.split(/\r?\n/).find(line => line.startsWith("function randomizerGearDetails("));
  vm.runInContext(declaration, context);
  assert.equal(context.randomizerGearDetails([]), "");
  const html = context.randomizerGearDetails([{ type: "Mouthpiece", currentValue: "None", proposedValue: "Nike Hanging Mouthpiece Primary / White" }, { type: "Neckwear", currentValue: "<test>", proposedValue: "Battle Turtleneck White / Primary Logo" }]);
  assert.match(html, /<details class="randomizer-gear-details"><summary>Equipment Changes \(2\)/);
  assert.match(html, /None → Nike Hanging Mouthpiece Primary \/ White/);
  assert.match(html, /&lt;test&gt;/);
  assert.doesNotMatch(html, /<test>/);
  assert.equal((renderer.match(/randomizerGearDetails\(corrections\)/g) ?? []).length, 2);
});

test("presentation deduplicates matching loadout changes without dropping distinct changed slots", () => {
  const field = elements => ({ loadoutType: "PlayerOnField", loadoutElements: elements });
  const a = [{ slotType: "FaceWear", itemAssetName: "FaceGear_None" }, { slotType: "MouthWear", itemAssetName: "GearMouthpiece_None" }];
  const b = [{ slotType: "FaceWear", itemAssetName: "FaceGear_BalaclavaOverNose_White" }, { slotType: "MouthWear", itemAssetName: "GearMouthpiece_PacifierDualHanging_TeamColor9" }];
  const before = JSON.stringify({ loadouts: [field(a), field(a)] }), after = JSON.stringify({ loadouts: [field(b), field(b)] });
  const changes = equipmentPreviewChanges(before, after);
  assert.equal(changes.length, 2);
  assert.deepEqual(changes.map(change => change.type), ["Face Covering", "Mouthpiece"]);
  assert.equal(changes[0].proposedValue, "White Balaclava");
  assert.match(changes[1].proposedValue, /Nike.*Secondary \/ Black/);
  assert.equal(equipmentPreviewChanges(JSON.stringify({ loadouts: [field([])] }), JSON.stringify({ loadouts: [field([{ slotType: "LeftCalfWear", itemAssetName: "CalfGear_None" }])] }))[0].proposedValue, "None");
  const css = fs.readFileSync(new URL("../src/renderer/redesign.css", import.meta.url), "utf8");
  assert.match(css, /\.equipment-card-list \{ display: grid; align-items: start;/, "Opening one player's details must not stretch the neighboring player's content");
});

test("release versions, normal defaults, and professional control labels are consistent", () => {
  assert.equal(JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).version, "18.3.0");
  for (const id of ["freshman-equipment", "equipment-patcher"]) assert.equal(tools.find(tool => tool.id === id).version, "5.0");
  for (const id of ["jersey-renumber", "automatic-force-win"]) assert.equal(tools.find(tool => tool.id === id).version, "4.0");
  const randomizer = normalizeEquipmentOptions({}, true), patcher = normalizeEquipmentOptions({}, false);
  assert.equal(randomizer.usingUnlockedMod, false);
  assert.equal(randomizer.usingRawAccessoriesMod, false);
  assert.equal(patcher.unlockedRecolorFix, false);
  assert.equal(patcher.unlockedMouthpieceFix, false);
  for (const label of ["Improve Non-OL Helmets and Facemasks", "Above-Knee Pants", "Mid-Sock Replacement", "Add Mouthpieces", "Recolor Accessories", "Add Tattoos"]) assert.ok(renderer.includes(label), label);
  assert.match(renderer, /Reset to Defaults/);
  assert.match(renderer, /Requires CFB 27 Unlocked/);
});
