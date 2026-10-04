import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openCfb27Save, readTables } from "../src/main/services/save.js";
import { VISUALS_TABLE_UID, snapshotVisualRawData } from "../src/main/tools/equipment/shared.js";
import { validateVisualStorageLayout } from "../src/main/tools/equipment/visualStorage.js";
import { installVisualsWriteSafety, snapshotVisualsForVerification, saveEquipmentCandidate, verifyVisualSnapshot } from "../src/main/tools/equipment/visualsSafety.js";
import { parseRef, sf } from "../src/main/tools/equipment/openSave.js";

function layoutTable() {
  const capacity = 32, count = 6, start = 64;
  const table = { data: Buffer.alloc(start + count * capacity), offsetTable: [{ type: "binaryblob", maxLength: capacity - 2 }], header: { recordCapacity: count, data1RecordCount: count, table3StartIndex: start, table3Length: count * capacity, tableTotalLength: start + count * capacity, nextRecordToUse: 2 } };
  table.records = Array.from({ length: count }, (_, index) => { const field = { maxLength: capacity - 2, index: index * capacity }, data = Buffer.alloc(8); data.writeUInt32BE(index >= 2 ? index + 1 : 0); return { index, isEmpty: index >= 2, data, RawData: "{}", getFieldByKey: () => ({ thirdTableField: field }) }; });
  return table;
}
test("a parser-readable expanded blob pool is rejected even when its length and pointer metadata agree", () => {
  const table = layoutTable(); assert.doesNotThrow(() => validateVisualStorageLayout(table));
  table.data = Buffer.concat([table.data, Buffer.alloc(32)]); table.header.table3Length += 32; table.header.tableTotalLength += 32;
  table.records[0].getFieldByKey("RawData").thirdTableField.index = 6 * 32;
  assert.equal(table.records[0].RawData, "{}", "A logical self-read alone does not prove game-valid capacity");
  assert.throws(() => validateVisualStorageLayout(table), /game's fixed capacity/);
  assert.throws(() => verifyVisualSnapshot(new Map([[0, "{}"]]), table, []), /game's fixed capacity/);
});
test("offsets must remain inside the pool even when the table byte count was not expanded", () => {
  const table = layoutTable(); table.records[0].getFieldByKey("RawData").thirdTableField.index = table.header.table3Length;
  assert.throws(() => validateVisualStorageLayout(table), /points outside/);
});
test("fixed header metadata, free-list cycles and unreachable free rows fail closed", () => {
  const table = layoutTable(), baseline = validateVisualStorageLayout(table);
  table.header.tableTotalLength++; assert.throws(() => validateVisualStorageLayout(table, baseline), /metadata changed/); table.header.tableTotalLength--;
  table.records[3].data.writeUInt32BE(2); assert.throws(() => validateVisualStorageLayout(table), /cyclic/);
  table.records[3].data.writeUInt32BE(6); assert.throws(() => validateVisualStorageLayout(table), /unreachable/);
});

test("copy-on-write finds another in-pool block when the preferred canonical block belongs to an unrelated row", { timeout: 60000 }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "v183-fixed-pool-")); t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, "DYNASTY-TEST"), schema = path.resolve("resources/engine-data/C27_486_6.gz");
  fs.copyFileSync(path.resolve("../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN"), file);
  const field = record => record.getFieldByKey("RawData").thirdTableField;
  async function read(safe = true) { const opened = await openCfb27Save(file, schema), tables = await readTables(opened.franchise, { visuals: VISUALS_TABLE_UID }); if (safe) installVisualsWriteSafety(tables.visuals); return { ...opened, ...tables }; }
  let loaded = await read(false), table = loaded.visuals;
  const [owner, alias, third] = table.records.filter(record => !record.isEmpty && !parseRef(sf(record, "Overflow")) && field(record).index > 0 && typeof sf(record, "RawData") === "string").slice(0, 3);
  const originalAliasOffset = field(alias).index;
  field(third).offset = originalAliasOffset; third.Overflow = "0".repeat(32);
  field(alias).offset = field(owner).index; alias.Overflow = "0".repeat(32);
  await loaded.franchise.save();
  loaded = await read(); table = loaded.visuals;
  const before = snapshotVisualsForVerification(table, snapshotVisualRawData(table.records)), expected = JSON.parse(before.get(alias.index)); expected.skinTone = ((Number(expected.skinTone) || 0) + 1) % 8;
  table.records[alias.index].RawData = JSON.stringify(expected);
  assert.notEqual(field(table.records[alias.index]).index, originalAliasOffset);
  assert.notEqual(field(table.records[alias.index]).index, field(table.records[owner.index]).index);
  await saveEquipmentCandidate(loaded, schema, before, [{ table: "visuals", row: alias.index, newValue: JSON.stringify(expected) }]);
  loaded = await read(); table = loaded.visuals;
  assert.deepEqual(JSON.parse(table.records[alias.index].RawData), expected);
  assert.deepEqual(JSON.parse(table.records[owner.index].RawData), JSON.parse(before.get(owner.index)));
  assert.deepEqual(JSON.parse(table.records[third.index].RawData), JSON.parse(before.get(third.index)));
  assert.deepEqual(validateVisualStorageLayout(table), before.storageLayout);
});
