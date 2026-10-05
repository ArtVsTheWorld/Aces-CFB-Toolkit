import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { loadEquipmentTables, snapshotVisualRawData } from "../src/main/tools/equipment/shared.js";
import { snapshotVisualsForVerification, saveEquipmentCandidate } from "../src/main/tools/equipment/visualsSafety.js";
import { isVisualOverflowStorage } from "../src/main/tools/equipment/visualStorage.js";
import { parseRef } from "../src/main/tools/equipment/openSave.js";

const fixture = path.resolve("../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN"), schema = path.resolve("resources/engine-data/C27_486_6.gz");
for (const overflow of [false, true]) test(`exact case aliases survive production write/reopen (${overflow ? "overflow" : "inline"})`, { timeout: 60000 }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "v184-encoding-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const savePath = path.join(directory, "DYNASTY-TEST"); fs.copyFileSync(fixture, savePath);
  const loaded = await loadEquipmentTables(savePath, schema), before = snapshotVisualsForVerification(loaded.visuals, snapshotVisualRawData(loaded.visuals.records));
  const record = loaded.visuals.records.find(row => !row.isEmpty && !isVisualOverflowStorage(row) && typeof row.RawData === "string");
  const payload = JSON.parse(record.RawData), field = record.getFieldByKey("RawData").thirdTableField;
  payload.loadouts[0].loadoutElements.push({ slotType: "LegBase", itemAssetName: "GearLegsBase_leftsleeve" }, { slotType: "LegBase", itemAssetName: "GearLegsBase_rightsleeve" });
  if (overflow) payload.encodingRegressionMarker = Array.from({ length: 10 }, (_, i) => createHash("sha256").update(`v184:${i}`).digest("hex")).join("");
  const expected = JSON.stringify(payload), legacyEncoded = field.strategy.setUnformattedValueFromFormatted(expected, field.unformattedValue, field.maxLength, field.strategyContext);
  const legacyDecoded = JSON.parse(field.strategy.getFormattedValueFromUnformatted(legacyEncoded, field.strategyContext));
  assert.notDeepEqual(legacyDecoded, payload, "Reproduce upstream data loss without any save-specific row ID");
  assert.equal(legacyDecoded.loadouts[0].loadoutElements.at(-2).itemAssetName, "GearLegsBase_LeftSleeve");
  record.RawData = expected;
  assert.equal(Boolean(parseRef(record.Overflow)), overflow);
  const assignments = [{ table: "visuals", row: record.index, newValue: expected }];
  await saveEquipmentCandidate(loaded, schema, before, assignments);
  const reopened = await loadEquipmentTables(savePath, schema);
  assert.deepEqual(JSON.parse(reopened.visuals.records[record.index].RawData), payload);
  assert.equal(fs.statSync(savePath).size, fs.statSync(fixture).size, "Preserve the packed container capacity");
  // A second application keeps the exact spellings and the same planned values.
  const secondBefore = snapshotVisualsForVerification(reopened.visuals, snapshotVisualRawData(reopened.visuals.records));
  reopened.visuals.records[record.index].RawData = expected;
  await saveEquipmentCandidate(reopened, schema, secondBefore, assignments);
  const twice = await loadEquipmentTables(savePath, schema);
  assert.deepEqual(JSON.parse(twice.visuals.records[record.index].RawData), payload);
});
