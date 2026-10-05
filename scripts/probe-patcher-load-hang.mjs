// Diagnostic isolation: identical logical equipment, one canonical physical
// block per allocated row. Originals and all other tables remain untouched.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { openCfb27Save, readTables } from "../src/main/services/save.js";
import { VISUALS_TABLE_UID } from "../src/main/tools/equipment/shared.js";
import { overflowOwners, validateVisualStorageLayout } from "../src/main/tools/equipment/visualStorage.js";
import { sf } from "../src/main/tools/equipment/openSave.js";

const source = process.argv[2], root = path.resolve("."), schema = path.join(root, "resources/engine-data/C27_486_6.gz");
const directory = fs.mkdtempSync(path.join(root, "outputs/patcher-load-probes-"));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const originalHash = hash(fs.readFileSync(source)), opened = await openCfb27Save(source, schema);
const { visuals: table } = await readTables(opened.franchise, { visuals: VISUALS_TABLE_UID });
const layout = validateVisualStorageLayout(table), field = record => record.getFieldByKey("RawData").thirdTableField;
const owners = overflowOwners(table), logical = new Map(table.records.filter(record => !record.isEmpty && !owners.has(record.index)).map(record => [record.index, sf(record, "RawData")]));
const otherHashes = new Map(opened.franchise.tables.filter(candidate => candidate !== table).map(candidate => [candidate.header.tableId, hash(candidate.data)]));
const originalPool = table.data.subarray(layout.table3StartIndex), pool = Buffer.from(originalPool), relocations = [];
for (const record of table.records) {
  if (record.isEmpty) continue;
  const from = field(record).index, to = record.index * layout.capacity;
  originalPool.subarray(from, from + layout.capacity).copy(pool, to);
  if (from !== to) { field(record).offset = to; record.isChanged = true; relocations.push({ row: record.index, from, to, overflow: owners.has(record.index) }); }
}
table.strategy = { ...table.strategy, getTable3BinaryData: () => [pool] }; table.emit("change");
const savePath = path.join(directory, "DYNASTY-PATCHER-CANONICAL-PROBE"); await opened.franchise.save(savePath);
const reloaded = await openCfb27Save(savePath, schema), { visuals } = await readTables(reloaded.franchise, { visuals: VISUALS_TABLE_UID });
assert.deepEqual(validateVisualStorageLayout(visuals), layout);
for (const [row, raw] of logical) if (typeof raw === "string") assert.deepEqual(JSON.parse(sf(visuals.records[row], "RawData")), JSON.parse(raw), `All gear retained at ${row}`);
for (const candidate of reloaded.franchise.tables) if (otherHashes.has(candidate.header.tableId)) assert.equal(hash(candidate.data), otherHashes.get(candidate.header.tableId));
assert.equal(hash(fs.readFileSync(source)), originalHash);
fs.writeFileSync(path.join(directory, "result.json"), JSON.stringify({ source, originalHash, savePath, relocations, exactGear: true, otherTablesUnchanged: true }, null, 2));
console.log(JSON.stringify({ savePath, relocated: relocations.length, spillRelocations: relocations.filter(row => row.overflow).length, exactGear: true, otherTablesUnchanged: true, originalUnchanged: true }));
