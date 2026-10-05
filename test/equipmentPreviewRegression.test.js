import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { groupPatcherPreviewRows, limitEquipmentPreview, MAX_EQUIPMENT_PREVIEW_ROWS, summarizeVisualChanges } from "../src/main/tools/equipment/preview.js";
import { snapshotVisualRawData } from "../src/main/tools/equipment/shared.js";

test("equipment preview IPC detail is bounded while full plans remain in the main process", () => {
  const rows = Array.from({ length: 2500 }, (_, row) => ({ row, team: `Team ${row}`, player: `Player ${row}` }));
  const preview = limitEquipmentPreview(rows);
  assert.equal(preview.length, MAX_EQUIPMENT_PREVIEW_ROWS);
  assert.equal(preview[999].row, 999);
  assert.equal(rows.length, 2500);
  const runner = fs.readFileSync(new URL("../src/main/tools/equipment/runner.js", import.meta.url), "utf8");
  assert.doesNotMatch(runner, /donorUses:/);
  assert.match(runner, /totalPreviewRows:/);
});

test("equipment snapshot skips an undecodable CharacterVisuals frame instead of eagerly failing", () => {
  const valid = { isEmpty: false, RawData: "valid-json" };
  const invalid = { isEmpty: false, get RawData() { throw new Error("Unknown frame descriptor"); } };
  const snapshot = snapshotVisualRawData([valid, invalid, { isEmpty: true }]);
  assert.equal(snapshot.get(0), "valid-json");
  assert.equal(snapshot.get(1), undefined);
  assert.equal(snapshot.get(2), undefined);
});

test("Patcher preview groups correction passes by player without dropping any changes", () => {
  const rows = [
    { row: 3, team: "East Point", player: "Player A", position: "WR", type: "pants", currentValue: "Long", proposedValue: "Above knee" },
    { row: 4, team: "East Point", player: "Player B", position: "TE", type: "helmet", currentValue: "Old", proposedValue: "New" },
    { row: 3, team: "East Point", player: "Player A", position: "WR", type: "tattoo", currentValue: "None", proposedValue: "Arm" }
  ];
  const grouped = groupPatcherPreviewRows(rows);
  assert.equal(grouped.length, 2);
  assert.deepEqual(grouped[0].changes.map(change => change.type), ["pants", "tattoo"]);
  assert.deepEqual(grouped[1].changes.map(change => change.type), ["helmet"]);
});

test("equipment audit identifies changed gear and tattoo slots without flagging untouched gear after a new Base loadout", () => {
  const oldRaw = JSON.stringify({ loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: [{ slotType: "Helmet", itemAssetName: "SpeedFlex" }] }] });
  const newRaw = JSON.stringify({ loadouts: [
    { loadoutCategory: "Base", loadoutElements: [{ slotType: "LeftArmTattoo", itemAssetName: "CujoMatty_ArmTats_35" }] },
    { loadoutType: "PlayerOnField", loadoutElements: [{ slotType: "Helmet", itemAssetName: "SpeedFlex" }] }
  ] });
  const changes = summarizeVisualChanges(oldRaw, newRaw);
  assert.match(changes, /LeftArmTattoo/);
  assert.doesNotMatch(changes, /Helmet/);
});
// Updated defaults are covered in v190 follow-up tests.
