import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { openCfb27Save, readTables, PLAYER_TABLE_UID, TEAM_TABLE_UID } from "../src/main/services/save.js";
import { VISUALS_TABLE_UID } from "../src/main/tools/equipment/shared.js";
import { parseRef, sf } from "../src/main/tools/equipment/openSave.js";

const root = fileURLToPath(new URL("../", import.meta.url)), schema = path.join(root, "resources/engine-data/C27_486_6.gz"), directory = fs.mkdtempSync(path.join(root, "outputs/v183-pair-audit-"));
const pairs = process.argv[2] && process.argv[3] ? [{ name: "supplied", before: process.argv[2], after: process.argv[3] }] : [
  { name: "chee", before: "D:/Downloads/DYNASTY-CHEE-BACKUP-100326-4", after: "C:/Users/Art/Documents/EA SPORTS College Football 27/saves/DYNASTY-CHEE" },
  { name: "wk", before: "D:/Downloads/DYNASTY-WK-BACKUP-100326", after: "C:/Users/Art/Documents/EA SPORTS College Football 27/saves/DYNASTY-WK" }
];
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const field = record => record.getFieldByKey("RawData").thirdTableField;
function diffs(a, b, at = "", result = []) {
  if (isDeepStrictEqual(a, b)) return result;
  if (a && b && typeof a === "object" && typeof b === "object") for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) diffs(a[key], b[key], `${at}/${key}`, result);
  else result.push({ path: at, before: a, after: b }); return result;
}
async function snapshot(file) {
  const opened = await openCfb27Save(file, schema), tables = await readTables(opened.franchise, { visuals: VISUALS_TABLE_UID, players: PLAYER_TABLE_UID, teams: TEAM_TABLE_UID });
  const table = tables.visuals, owners = new Map(), players = new Map();
  for (const record of table.records) if (!record.isEmpty) { const ref = parseRef(sf(record, "Overflow")); if (ref?.tableId === table.header.tableId) { const list = owners.get(ref.row) ?? []; list.push(record.index); owners.set(ref.row, list); } }
  for (const record of tables.players.records) if (!record.isEmpty) { const ref = parseRef(sf(record, "CharacterVisuals")); if (ref?.tableId === table.header.tableId) { const list = players.get(ref.row) ?? []; list.push({ row: record.index, player: `${sf(record, "FirstName")} ${sf(record, "LastName")}`, position: sf(record, "Position"), team: sf(record, "TeamIndex"), year: sf(record, "SchoolYear") }); players.set(ref.row, list); } }
  const rows = table.records.map(record => {
    const f = field(record), raw = !record.isEmpty && !owners.has(record.index) ? sf(record, "RawData") : null;
    return { row: record.index, empty: record.isEmpty, offset: f.index, capacity: f.maxLength + 2, length: f.unformattedValue?.length, compressedSize: f.unformattedValue?.length >= 2 ? f.unformattedValue.readUInt16LE(0) : null, overflow: sf(record, "Overflow"), raw: typeof raw === "string" ? JSON.parse(raw) : null, owners: owners.get(record.index), players: players.get(record.index) };
  });
  const offsets = new Map(); for (const row of rows) if (!row.empty) { const list = offsets.get(row.offset) ?? []; list.push(row.row); offsets.set(row.offset, list); }
  const tableHashes = opened.franchise.tables.map(candidate => ({ id: candidate.header.tableId, name: candidate.name, length: candidate.data.length, hash: hash(candidate.data), header: candidate.header }));
  return { file, hash: hash(fs.readFileSync(file)), gameYear: opened.franchise.gameYear, expectedSchema: opened.franchise.expectedSchemaVersion, header: table.header, dataLength: table.data.length, table3Length: table.data.length - table.header.table3StartIndex, rawHeader: table.data.subarray(0, table.header.table1StartIndex).toString("hex"), tableHashes, teams: tables.teams.records.filter(record => !record.isEmpty).length, rows, aliases: [...offsets].filter(([, rows]) => rows.length > 1), beyondCanonicalCapacity: rows.filter(row => !row.empty && row.offset + row.capacity > table.header.recordCapacity * row.capacity).map(row => ({ row: row.row, offset: row.offset, owners: row.owners, players: row.players })), freeRows: table.records.filter(record => record.isEmpty).length };
}
for (const pair of pairs) {
  console.log(`Reading ${pair.name} working backup`); const before = await snapshot(pair.before);
  console.log(`Reading ${pair.name} crashing save`); const after = await snapshot(pair.after);
  const structural = [], logical = [], unchangedLogical = [];
  for (const a of before.rows) {
    const b = after.rows[a.row], metadata = diffs({ empty: a.empty, offset: a.offset, overflow: a.overflow }, { empty: b.empty, offset: b.offset, overflow: b.overflow });
    if (metadata.length) structural.push({ row: a.row, metadata, before: { ...a, raw: undefined }, after: { ...b, raw: undefined } });
    if (a.raw && !a.owners) { const differences = diffs(a.raw, b.raw); if (differences.length) logical.push({ row: a.row, players: a.players, differences }); else unchangedLogical.push(a.row); }
  }
  const changedTables = before.tableHashes.filter(table => after.tableHashes.find(other => other.id === table.id)?.hash !== table.hash).map(table => ({ id: table.id, name: table.name, beforeLength: table.length, afterLength: after.tableHashes.find(other => other.id === table.id)?.length }));
  const omitRows = snapshot => ({ ...snapshot, rows: undefined, tableHashes: undefined });
  const result = { name: pair.name, before: omitRows(before), after: omitRows(after), headerDifferences: diffs(before.header, after.header), changedTables, structural, logical, unchangedLogicalCount: unchangedLogical.length };
  fs.writeFileSync(path.join(directory, `${pair.name}-comparison.json`), JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(directory, `${pair.name}-before-rows.json`), JSON.stringify(before.rows));
  fs.writeFileSync(path.join(directory, `${pair.name}-after-rows.json`), JSON.stringify(after.rows));
  console.log(JSON.stringify({ name: pair.name, teams: before.teams, changedTables, headerDifferences: result.headerDifferences, table3Before: before.table3Length, table3After: after.table3Length, beyondCapacityBefore: before.beyondCanonicalCapacity.length, beyondCapacityAfter: after.beyondCanonicalCapacity.length, structuralRows: structural.length, logicalRows: logical.length, directory }));
}
