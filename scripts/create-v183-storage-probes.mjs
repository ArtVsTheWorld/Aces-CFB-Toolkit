// Diagnostic isolation only: relocate the v0.18.2 out-of-pool blocks without
// changing even one equipment value. Never overwrite any supplied save.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { openCfb27Save, readTables } from "../src/main/services/save.js";
import { VISUALS_TABLE_UID } from "../src/main/tools/equipment/shared.js";
import { overflowOwners } from "../src/main/tools/equipment/visualStorage.js";
import { sf } from "../src/main/tools/equipment/openSave.js";
const root = fileURLToPath(new URL("../", import.meta.url)), schema = path.join(root, "resources/engine-data/C27_486_6.gz"), directory = fs.mkdtempSync(path.join(root, "outputs/v183-storage-probes-"));
const pairs = [
  { name: "CHEE", source: "C:/Users/Art/Documents/EA SPORTS College Football 27/saves/DYNASTY-CHEE" },
  { name: "WK", source: "C:/Users/Art/Documents/EA SPORTS College Football 27/saves/DYNASTY-WK" }
];
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
for (const pair of pairs) {
  const originalHash = hash(fs.readFileSync(pair.source)), opened = await openCfb27Save(pair.source, schema), { visuals: table } = await readTables(opened.franchise, { visuals: VISUALS_TABLE_UID });
  const field = record => record.getFieldByKey("RawData").thirdTableField, capacity = field(table.records[0]).maxLength + 2, length = table.header.recordCapacity * capacity;
  const base = Buffer.from(table.data.subarray(table.header.table3StartIndex, table.header.table3StartIndex + length)), occupied = new Set(table.records.filter(record => !record.isEmpty && field(record).index < length).map(record => field(record).index));
  const owners = overflowOwners(table), expected = table.records.map(record => record.isEmpty || owners.has(record.index) ? null : sf(record, "RawData"));
  const otherTables = new Map(opened.franchise.tables.filter(candidate => candidate !== table).map(candidate => [candidate.header.tableId, hash(candidate.data)]));
  const relocated = [];
  for (const record of table.records) {
    if (record.isEmpty || field(record).index + capacity <= length) continue;
    const from = field(record).index; let to = record.index * capacity;
    if (occupied.has(to)) { to = 0; while (occupied.has(to) && to < length) to += capacity; }
    assert.ok(to + capacity <= length, "There must be a free physical block inside the original pool");
    table.data.subarray(table.header.table3StartIndex + from, table.header.table3StartIndex + from + capacity).copy(base, to);
    field(record).offset = to; record.isChanged = true; occupied.add(to); relocated.push({ row: record.index, from, to });
  }
  assert.ok(relocated.length); table.strategy = { ...table.strategy, getTable3BinaryData: () => [base] }; table.emit("change");
  const file = path.join(directory, `DYNASTY-${pair.name}-STORAGEONLY`); await opened.franchise.save(file);
  const reloaded = await openCfb27Save(file, schema), { visuals } = await readTables(reloaded.franchise, { visuals: VISUALS_TABLE_UID });
  assert.equal(visuals.header.table3Length, length); assert.equal(visuals.data.length - visuals.header.table3StartIndex, length);
  for (const [row, raw] of expected.entries()) if (typeof raw === "string") assert.deepEqual(JSON.parse(sf(visuals.records[row], "RawData")), JSON.parse(raw), `No gear change at logical row ${row}`);
  for (const candidate of reloaded.franchise.tables) if (otherTables.has(candidate.header.tableId)) assert.equal(hash(candidate.data), otherTables.get(candidate.header.tableId));
  for (const record of visuals.records) if (!record.isEmpty) assert.ok(field(record).index + capacity <= length);
  assert.equal(hash(fs.readFileSync(pair.source)), originalHash);
  fs.writeFileSync(path.join(directory, `${pair.name}-relocations.json`), JSON.stringify(relocated, null, 2));
  console.log(JSON.stringify({ file, relocated: relocated.length, logicalGearUnchanged: true, otherTablesUnchanged: true, originalUnchanged: true, fixedPoolLength: length }));
}
