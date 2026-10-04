import fs from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { openCfb27Save, readTables } from "../../services/save.js";
import { parseRef, sf } from "./openSave.js";
import { installVisualStorage, overflowOwners, validateVisualStorageLayout } from "./visualStorage.js";
import { writeFixedSaveCandidate, validateSaveContainer } from "../../services/saveContainer.js";

const hash = data => createHash("sha256").update(data).digest("hex");
const installed = Symbol("visualsWriteSafety");

// The library silently truncates an oversized blob if no overflow row is free.
// Validate its actual encoded output before allowing any record setter to run.
export function installVisualsWriteSafety(table, logicalRows = new Set()) {
  if (!table || table[installed]) return;
  table[installed] = true;
  if (table.data && table.records[0]?.parent === table) { installVisualStorage(table, logicalRows); return; }
  const owners = new Map();
  for (const record of table.records) {
    if (!record || record.isEmpty) continue;
    const ref = parseRef(sf(record, "Overflow"));
    if (ref?.tableId === table.header.tableId) {
      const rows = owners.get(ref.row) ?? []; rows.push(record.index); owners.set(ref.row, rows);
    }
  }
  for (const record of table.records) {
    const field = record?.getFieldByKey?.("RawData")?.thirdTableField;
    if (!field?.strategy) continue;
    const original = field.strategy;
    field.strategy = {
      ...original,
      setUnformattedValueFromFormatted(value, old, maxLength, context) {
        const encoded = original.setUnformattedValueFromFormatted(value, old, maxLength, context);
        let decoded;
        try { decoded = original.getFormattedValueFromUnformatted(encoded, context); }
        catch (error) { throw new Error(`Equipment row ${record.index} could not be encoded safely: ${error.message}`); }
        if (!isDeepStrictEqual(JSON.parse(decoded), JSON.parse(value))) throw new Error(`Equipment row ${record.index} lost data during encoding. The save has not been written.`);
        const ref = parseRef(sf(record, "Overflow"));
        if (ref && (ref.tableId !== table.header.tableId || ref.row === record.index || !table.records[ref.row] || table.records[ref.row].isEmpty || (owners.get(ref.row)?.length ?? 0) > 1)) throw new Error(`Equipment row ${record.index} has an unsafe shared or invalid overflow reference.`);
        if (encoded.length > maxLength + 2) {
          const spill = ref ? table.records[ref.row] : table.records[table.header.nextRecordToUse];
          if (!spill || (!ref && !spill.isEmpty)) throw new Error("The CharacterVisuals table has no free overflow storage. The save has not been written.");
          const spillLimit = spill.getFieldByKey("RawData").thirdTableField.maxLength;
          if (encoded.length - (maxLength + 2) > spillLimit) throw new Error(`Equipment row ${record.index} exceeds safe CharacterVisuals storage. The save has not been written.`);
        }
        return encoded;
      }
    };
  }
}

export function verifyVisualSnapshot(before, table, assignments) {
  validateVisualStorageLayout(table, before.storageLayout);
  const expected = new Map(assignments.filter(change => change.table === "visuals").map(change => [change.row, change.newValue]));
  for (const [row, opaque] of before.opaqueRows ?? []) {
    const record = table.records[row], field = record?.getFieldByKey?.("RawData")?.thirdTableField;
    const bytes = field && table.data?.subarray(table.header.table3StartIndex + field.index, table.header.table3StartIndex + field.index + field.maxLength + 2);
    if (!record || record.isEmpty || sf(record, "Overflow") !== opaque.overflow || !bytes?.equals(opaque.bytes)) throw new Error(`Unplanned change to unreadable equipment row ${row}. The original save was kept unchanged.`);
  }
  for (const [row, oldRaw] of before) {
    if (before.overflowOwners?.has(row) && expected.has(before.overflowOwners.get(row))) continue;
    if (typeof oldRaw !== "string") continue;
    const actual = sf(table.records[row], "RawData"), wanted = expected.get(row) ?? oldRaw;
    if (typeof actual !== "string" || !isDeepStrictEqual(JSON.parse(actual), JSON.parse(wanted))) throw new Error(`Saved equipment row ${row} does not match the validated preview. The original save was kept unchanged.`);
  }
  const claimed = new Map();
  for (const record of table.records) {
    if (!record || record.isEmpty) continue;
    const ref = parseRef(sf(record, "Overflow")); if (!ref) continue;
    if (ref.tableId !== table.header.tableId || ref.row === record.index || !table.records[ref.row] || table.records[ref.row].isEmpty || parseRef(sf(table.records[ref.row], "Overflow"))) throw new Error("Saved CharacterVisuals overflow storage is invalid. The original save was kept unchanged.");
    const rows = claimed.get(ref.row) ?? new Set(); rows.add(record.index); claimed.set(ref.row, rows);
  }
  for (const [row, owners] of claimed) if (owners.size > 1 && [...owners].some(owner => !before.originalOverflowOwners?.get(row)?.has(owner))) throw new Error("Saved CharacterVisuals introduced shared overflow storage. The original save was kept unchanged.");
}

export function snapshotVisualsForVerification(table, snapshot) {
  snapshot.storageLayout = validateVisualStorageLayout(table);
  snapshot.originalOverflowOwners = overflowOwners(table);
  snapshot.opaqueRows = new Map();
  for (const record of table.records) {
    if (!record || record.isEmpty || snapshot.originalOverflowOwners.has(record.index) || typeof snapshot.get(record.index) === "string") continue;
    const field = record.getFieldByKey?.("RawData")?.thirdTableField;
    if (field && table.data) snapshot.opaqueRows.set(record.index, { overflow: sf(record, "Overflow"), bytes: Buffer.from(table.data.subarray(table.header.table3StartIndex + field.index, table.header.table3StartIndex + field.index + field.maxLength + 2)) });
  }
  snapshot.overflowOwners = new Map();
  for (const record of table.records) {
    if (!record || record.isEmpty) continue;
    const ref = parseRef(sf(record, "Overflow"));
    if (ref?.tableId === table.header.tableId) snapshot.overflowOwners.set(ref.row, record.index);
  }
  return snapshot;
}

// Save/reopen a temporary candidate before replacing the user's file. Backups
// are still made by Apply before mutations; a failed validation never publishes.
export async function saveEquipmentCandidate(loaded, schemaPath, before, assignments, expectedSaveHash) {
  const temporary = path.join(path.dirname(loaded.savePath), `.ace-equipment-${randomUUID()}.tmp`);
  const originalHash = hash(fs.readFileSync(loaded.savePath));
  if (expectedSaveHash && originalHash !== expectedSaveHash) throw new Error("The Active Save changed during Apply. The original save was not overwritten.");
  const otherTables = new Map(loaded.franchise.tables.filter(table => table.header.tableId !== loaded.visuals.header.tableId).map(table => [table.header.tableId, hash(table.data)]));
  try {
    validateVisualStorageLayout(loaded.visuals, before.storageLayout);
    const containerLength = loaded.franchise.strategy?.file?.postPackFile ? validateSaveContainer(fs.readFileSync(loaded.savePath)).fileLength : null;
    await writeFixedSaveCandidate(loaded.franchise, temporary);
    if (containerLength !== null) validateSaveContainer(fs.readFileSync(temporary), containerLength);
    const opened = await openCfb27Save(temporary, schemaPath);
    const { visuals } = await readTables(opened.franchise, { visuals: loaded.visuals.header.uniqueId });
    verifyVisualSnapshot(before, visuals, assignments);
    for (const table of opened.franchise.tables) if (otherTables.has(table.header.tableId) && hash(table.data) !== otherTables.get(table.header.tableId)) throw new Error(`Unexpected change to ${table.name}. The original save was kept unchanged.`);
    if (hash(fs.readFileSync(loaded.savePath)) !== originalHash) throw new Error("The Active Save changed during Apply. The verified candidate was not published.");
    fs.renameSync(temporary, loaded.savePath);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
