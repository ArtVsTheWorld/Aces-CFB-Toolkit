import { isDeepStrictEqual } from "node:util";
import { parseRef, sf } from "./openSave.js";
import { encodeVisualData } from "./visualEncoding.js";

const EMPTY = "0".repeat(32), states = new WeakMap();
const rawField = record => record?.getFieldByKey?.("RawData")?.thirdTableField;
const reference = (table, row) => table.toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
export function overflowOwners(table) {
  const owners = new Map();
  for (const record of table.records) {
    if (!record || record.isEmpty) continue;
    const ref = parseRef(sf(record, "Overflow"));
    if (ref?.tableId !== table.header.tableId) continue;
    const rows = owners.get(ref.row) ?? new Set(); rows.add(record.index); owners.set(ref.row, rows);
  }
  return owners;
}
export const isVisualOverflowStorage = record => states.get(record?.parent)?.owners.has(record.index) ?? false;

// CFB's SPBF/BSFT blob pool is preallocated: one fixed-capacity block per
// record. Updating the declared byte length is not a supported pool expansion.
// A general-purpose parser follows pointers past this limit; the game doesn't.
export function validateVisualStorageLayout(table, expected = null) {
  const field = rawField(table?.records?.[0]);
  if (!table?.data || !field) return null;
  const capacity = field.maxLength + 2, records = table.header.recordCapacity, poolLength = capacity * records;
  const blobFields = table.offsetTable.filter(offset => offset.type === "binaryblob");
  if (blobFields.length !== 1 || !Number.isSafeInteger(poolLength) || poolLength <= 0 || table.header.data1RecordCount !== records) throw new Error("CharacterVisuals has unsupported fixed-storage metadata. The save has not been written.");
  const actualLength = table.data.length - table.header.table3StartIndex;
  if (actualLength !== poolLength || table.header.table3Length !== poolLength) throw new Error(`CharacterVisuals equipment storage exceeds or differs from the game's fixed capacity (${actualLength} bytes; expected ${poolLength} for ${records} blocks). Restore the pre-equipment backup and try again. The save has not been written.`);
  const layout = { capacity, records, poolLength, table3StartIndex: table.header.table3StartIndex, tableTotalLength: table.header.tableTotalLength };
  if (expected && !isDeepStrictEqual(layout, expected)) throw new Error("CharacterVisuals fixed-storage metadata changed during Apply. The original save was kept unchanged.");
  for (const record of table.records) {
    if (!record || record.isEmpty) continue;
    const offset = rawField(record)?.index;
    if (!Number.isInteger(offset) || offset < 0 || offset + capacity > poolLength) throw new Error(`Equipment row ${record.index} points outside the game's fixed storage pool (${offset}). The save has not been written.`);
  }
  const visited = new Set(); let row = table.header.nextRecordToUse;
  while (row !== records) {
    const record = table.records[row];
    if (!Number.isInteger(row) || row < 0 || row >= records || visited.has(row) || !record?.isEmpty) throw new Error("CharacterVisuals free-storage links are invalid or cyclic. The save has not been written.");
    visited.add(row); row = record.data.readUInt32BE(0);
  }
  if (visited.size !== table.records.filter(record => record?.isEmpty).length) throw new Error("CharacterVisuals has unreachable free-storage rows. The save has not been written.");
  return layout;
}

// CharacterVisuals pointers need not equal row * block size: game saves can
// alias a complete blob, and overflow rows contain raw continuation bytes, not
// another JSON loadout. The dependency's variable-length table3 compactor cannot
// preserve those layouts. Keep fixed-size physical blocks WITHIN the existing
// pool, detaching aliases into unclaimed blocks rather than growing the pool.
// Continue using its verified ISON/Zstd codec and record/free-list APIs.
export function installVisualStorage(table, logicalRows = new Set()) {
  if (states.has(table)) return;
  const layout = validateVisualStorageLayout(table), base = Buffer.from(table.data.subarray(table.header.table3StartIndex)), occupancy = new Map(), partial = new Set(), blockClaims = new Map(), available = new Set();
  const owners = overflowOwners(table), state = { owners }; states.set(table, state);
  const claim = (record, remove = false) => {
    const offset = rawField(record).index, rows = occupancy.get(offset) ?? new Set();
    if (remove) rows.delete(record.index); else rows.add(record.index);
    occupancy.set(offset, rows);
    for (let block = Math.floor(offset / layout.capacity); block <= Math.floor((offset + layout.capacity - 1) / layout.capacity); block++) {
      const claims = blockClaims.get(block) ?? new Set();
      if (remove) claims.delete(record.index); else claims.add(record.index);
      blockClaims.set(block, claims);
      if (claims.size) available.delete(block * layout.capacity); else available.add(block * layout.capacity);
    }
  };
  const ranges = [];
  for (const record of table.records) if (record && !record.isEmpty && rawField(record)) {
    claim(record); const field = rawField(record); ranges.push({ offset: field.index, end: field.index + field.maxLength + 2 });
  }
  ranges.sort((a, b) => a.offset - b.offset);
  for (let index = 1; index < ranges.length; index++) if (ranges[index].offset !== ranges[index - 1].offset && ranges[index].offset < ranges[index - 1].end) { partial.add(ranges[index].offset); partial.add(ranges[index - 1].offset); }
  for (let block = 0; block < layout.records; block++) if (!blockClaims.get(block)?.size) available.add(block * layout.capacity);
  for (const row of owners.keys()) if (logicalRows.has(row)) throw new Error(`Equipment row ${row} is used as both a player loadout and overflow storage. The save has not been written.`);
  const physicalWrite = (record, bytes) => {
    const field = rawField(record), capacity = field.maxLength + 2, block = Buffer.alloc(capacity);
    if (bytes.length > capacity) throw new Error(`Equipment row ${record.index} exceeds safe CharacterVisuals storage. The save has not been written.`);
    bytes.copy(block);
    let offset = field.index;
    const exclusive = occupancy.get(offset)?.size === 1 && occupancy.get(offset)?.has(record.index) && !partial.has(offset) && offset >= 0 && offset + capacity <= layout.poolLength;
    if (!exclusive) {
      claim(record, true);
      const canonical = record.index * capacity;
      offset = available.has(canonical) ? canonical : available.values().next().value;
      if (offset === undefined) { claim(record); throw new Error("The CharacterVisuals fixed storage pool has no free physical block. The save has not been written."); }
      field.offset = offset; claim(record);
    }
    block.copy(base, offset);
  };
  const validOverflow = record => {
    const value = sf(record, "Overflow"), ref = parseRef(value);
    if (!ref) return null;
    const spill = table.records[ref.row];
    if (!/^[01]{32}$/.test(value) || ref.tableId !== table.header.tableId || ref.row === record.index || !spill || spill.isEmpty || parseRef(sf(spill, "Overflow")) || logicalRows.has(ref.row)) throw new Error(`Equipment row ${record.index} has an invalid overflow reference (${ref.tableId}:${ref.row}). The save has not been written.`);
    return spill;
  };
  const detach = (record, spill) => {
    if (!spill) return;
    const rows = owners.get(spill.index); rows?.delete(record.index);
    if (!rows?.size) {
      owners.delete(spill.index); claim(spill, true);
      // Do not write a JSON {} into raw continuation bytes or a shared block.
      spill.empty();
    }
    record.Overflow = EMPTY;
  };
  for (const record of table.records) {
    const field = rawField(record); if (!field?.strategy) continue;
    const codec = field.strategy, originalGet = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), "value").get;
    Object.defineProperty(field, "value", {
      configurable: true,
      get() { return owners.has(record.index) ? null : originalGet.call(this); },
      set(value) {
        if (record.isEmpty || owners.has(record.index)) throw new Error(`Equipment row ${record.index} is empty or overflow storage, not a player loadout. The save has not been written.`);
        const encoded = encodeVisualData(codec, value, this.unformattedValue, this.maxLength, this.strategyContext);
        let decoded;
        try { decoded = codec.getFormattedValueFromUnformatted(encoded, this.strategyContext); }
        catch (error) { throw new Error(`Equipment row ${record.index} could not be encoded safely: ${error.message}`); }
        if (!isDeepStrictEqual(JSON.parse(decoded), JSON.parse(value))) throw new Error(`Equipment row ${record.index} lost data during encoding. The save has not been written.`);
        const capacity = this.maxLength + 2, previous = validOverflow(record);
        if (encoded.length > capacity) {
          const tail = encoded.subarray(capacity);
          let spill = previous;
          if (!spill || owners.get(spill.index)?.size !== 1) {
            const free = table.records[table.header.nextRecordToUse];
            spill = free?.isEmpty && !owners.has(free.index) && !logicalRows.has(free.index) ? free : table.records.find(candidate => candidate?.isEmpty && !owners.has(candidate.index) && !logicalRows.has(candidate.index));
          }
          if (!spill) throw new Error("The CharacterVisuals table has no free overflow storage. The save has not been written.");
          if (tail.length > rawField(spill).maxLength + 2) throw new Error(`Equipment row ${record.index} exceeds safe CharacterVisuals storage. The save has not been written.`);
          if (spill !== previous) detach(record, previous);
          // Setting Overflow unempties the allocation through the library's
          // free-list machinery. Then place it at an exclusive physical block.
          if (spill.isEmpty) spill.Overflow = EMPTY;
          const rows = owners.get(spill.index) ?? new Set(); rows.add(record.index); owners.set(spill.index, rows);
          physicalWrite(spill, tail);
          rawField(spill).unformattedValue = Buffer.from(tail);
          record.Overflow = reference(table.header.tableId, spill.index);
        } else detach(record, previous);
        physicalWrite(record, encoded.subarray(0, capacity));
        // Keep a complete, independently owned buffer for reads between passes.
        // Only fixed-size main/continuation blocks are sent to the serializer.
        this.unformattedValue = Buffer.from(encoded); this._value = value;
      }
    });
  }
  table.strategy = { ...table.strategy, getTable3BinaryData: () => [base] };
}
