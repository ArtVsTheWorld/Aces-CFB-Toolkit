import { isDeepStrictEqual } from "node:util";
import { parseRef, sf } from "./openSave.js";
import { encodeStorageFriendlyVisualData } from "./visualEncoding.js";

const EMPTY = "0".repeat(32), states = new WeakMap();
const rawField = record => record?.getFieldByKey?.("RawData")?.thirdTableField;
const reference = (table, row) => table.toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
class VisualCapacityError extends Error {}
// Preview preflights use the real allocator without invoking a native setter
// that would cache an unsuccessful proposed value. All other errors stay fatal.
export function prepareVisualWrite(record, value) {
  const state = states.get(record.parent);
  if (!state?.prepare) throw new Error("Equipment storage is not initialized.");
  return state.prepare(record, value);
}
export function tryPreparedVisualWrite(prepared) {
  const state = states.get(prepared.record.parent);
  try { state.reserve(prepared); }
  catch (error) { if (error instanceof VisualCapacityError) return false; throw error; }
  state.prepared = prepared;
  try { prepared.record.RawData = prepared.value; } finally { state.prepared = null; }
  return true;
}
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

// Native saves can link more than one continuation block. Walk references,
// never physical neighbours: a continuation has no frame header of its own.
export function visualOverflowChain(table, record, logicalRows = states.get(table)?.logicalRows ?? new Set()) {
  const chain = [], seen = new Set([record.index]);
  let current = record;
  while (true) {
    const value = sf(current, "Overflow");
    if (value === EMPTY || value === undefined && !table.data) return chain;
    const ref = parseRef(value), spill = ref && table.records[ref.row];
    if (!/^[01]{32}$/.test(value) || !ref || ref.tableId !== table.header.tableId || seen.has(ref.row) || !spill || spill.isEmpty || logicalRows.has(ref.row)) throw new Error(`Equipment row ${record.index} has an invalid overflow reference. The save has not been written.`);
    seen.add(ref.row); chain.push(spill); current = spill;
  }
}

export function readVisualStorage(record, base = null) {
  const table = record.parent, field = rawField(record);
  if (!table?.data || !field) return sf(record, "RawData");
  const chain = visualOverflowChain(table, record);
  // The dependency already reads the main block and its first continuation.
  if (chain.length < 2) return sf(record, "RawData");
  const data = base ?? table.data.subarray(table.header.table3StartIndex);
  const buffers = [record, ...chain].map(row => { const value = rawField(row); return data.subarray(value.index, value.index + value.maxLength + 2); });
  const encoded = Buffer.concat(buffers);
  if (encoded.readUInt16LE(0) + 2 > encoded.length) throw new Error(`Equipment row ${record.index} has a truncated overflow chain. The save has not been written.`);
  return field.strategy.getFormattedValueFromUnformatted(encoded, field.strategyContext);
}

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
  const owners = overflowOwners(table), state = { owners, logicalRows }; states.set(table, state);
  const decodedChains = new Map();
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
  const detach = (record, spill) => {
    if (!spill) return;
    const rows = owners.get(spill.index); rows?.delete(record.index);
    if (!rows?.size) {
      const next = parseRef(sf(spill, "Overflow"));
      if (next) detach(spill, table.records[next.row]);
      owners.delete(spill.index); claim(spill, true);
      // Do not write a JSON {} into raw continuation bytes or a shared block.
      spill.empty();
    }
    record.Overflow = EMPTY;
  };
  const exclusive = (record, rows = occupancy.get(rawField(record).index)) => rows?.size === 1 && rows.has(record.index) && !partial.has(rawField(record).index);
  state.prepare = (record, value) => {
    if (record.isEmpty || owners.has(record.index)) throw new Error(`Equipment row ${record.index} is empty or overflow storage, not a player loadout. The save has not been written.`);
    const field = rawField(record), codec = field.strategy;
    const encoded = encodeStorageFriendlyVisualData(codec, value, field.unformattedValue, field.maxLength, field.strategyContext);
    let decoded;
    try { decoded = codec.getFormattedValueFromUnformatted(encoded, field.strategyContext); }
    catch (error) { throw new Error(`Equipment row ${record.index} could not be encoded safely: ${error.message}`); }
    if (!isDeepStrictEqual(JSON.parse(decoded), JSON.parse(value))) throw new Error(`Equipment row ${record.index} lost data during encoding. The save has not been written.`);
    const needed = Math.ceil(encoded.length / layout.capacity) - 1;
    return { record, value, encoded, needed, delta: needed - visualOverflowChain(table, record).length };
  };
  state.reserve = prepared => {
    const { record, needed } = prepared, previous = visualOverflowChain(table, record), chain = [];
    let reusable = 0;
    while (reusable < needed && reusable < previous.length && owners.get(previous[reusable].index)?.size === 1) chain.push(previous[reusable++]);
    if (chain.length < needed) for (const candidate of table.records) {
      if (candidate?.isEmpty && !owners.has(candidate.index) && !logicalRows.has(candidate.index)) chain.push(candidate);
      if (chain.length === needed) break;
    }
    if (chain.length < needed) throw new VisualCapacityError("The CharacterVisuals table has no free overflow storage. The save has not been written.");
    Object.assign(prepared, { previous, chain, reusable });
    // Most cleaned appearances overwrite exclusively owned blocks in place.
    // They need no physical allocation simulation or copy of the free set.
    if ([...chain, record].every(row => !row.isEmpty && exclusive(row))) return prepared;
    // Simulate physical copy-on-write too, including released tails and aliases.
    // Only touched claim sets are copied; no native links, caches or bytes change.
    const free = new Set(available), offsets = new Map(), claims = new Map(), rowsAt = new Map();
    const at = row => offsets.get(row.index) ?? rawField(row).index;
    const rows = offset => { if (!rowsAt.has(offset)) rowsAt.set(offset, new Set(occupancy.get(offset))); return rowsAt.get(offset); };
    const claimSimulation = (row, remove) => {
      const offset = at(row), set = rows(offset); if (remove) set.delete(row.index); else set.add(row.index);
      for (let block = Math.floor(offset / layout.capacity); block <= Math.floor((offset + layout.capacity - 1) / layout.capacity); block++) {
        if (!claims.has(block)) claims.set(block, new Set(blockClaims.get(block)));
        const set = claims.get(block); if (remove) set.delete(row.index); else set.add(row.index);
        if (set.size) free.delete(block * layout.capacity); else free.add(block * layout.capacity);
      }
    };
    let parent = chain[reusable - 1] ?? record;
    for (const spill of previous.slice(reusable)) {
      const parents = owners.get(spill.index);
      if (parents?.size !== 1 || !parents.has(parent.index)) break;
      claimSimulation(spill, true); parent = spill;
    }
    for (const row of [...chain, record]) {
      const offset = at(row);
      if (!exclusive(row, rows(offset))) {
        claimSimulation(row, true);
        const canonical = row.index * layout.capacity, next = free.has(canonical) ? canonical : free.values().next().value;
        if (next === undefined) throw new VisualCapacityError("The CharacterVisuals fixed storage pool has no free physical block. The save has not been written.");
        offsets.set(row.index, next); claimSimulation(row, false);
      }
    }
    return prepared;
  };
  for (const record of table.records) {
    const field = rawField(record); if (!field?.strategy) continue;
    const codec = field.strategy, originalGet = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), "value").get;
    Object.defineProperty(field, "value", {
      configurable: true,
      get() {
        if (owners.has(record.index)) return null;
        const next = parseRef(sf(record, "Overflow"));
        if (!next || !parseRef(sf(table.records[next.row], "Overflow"))) return originalGet.call(this);
        if (!decodedChains.has(record.index)) decodedChains.set(record.index, readVisualStorage(record, base));
        return decodedChains.get(record.index);
      },
      set(value) {
        const prepared = state.prepared?.record === record && state.prepared.value === value ? state.prepared : state.reserve(state.prepare(record, value));
        const { encoded, previous, chain, reusable } = prepared, capacity = this.maxLength + 2;
        detach(chain[reusable - 1] ?? record, previous[reusable]);
        let parent = record;
        for (let index = 0; index < chain.length; index++) {
          const spill = chain[index], tail = encoded.subarray((index + 1) * capacity, (index + 2) * capacity);
          if (spill.isEmpty) spill.Overflow = EMPTY;
          const rows = owners.get(spill.index) ?? new Set(); rows.add(parent.index); owners.set(spill.index, rows);
          parent.Overflow = reference(table.header.tableId, spill.index);
          physicalWrite(spill, tail); rawField(spill).unformattedValue = Buffer.from(tail);
          parent = spill;
        }
        if (chain.length) parent.Overflow = EMPTY;
        physicalWrite(record, encoded.subarray(0, capacity));
        decodedChains.delete(record.index);
        // Keep a complete, independently owned buffer for reads between passes.
        // Only fixed-size main/continuation blocks are sent to the serializer.
        this.unformattedValue = Buffer.from(encoded); this._value = value;
      }
    });
  }
  table.strategy = { ...table.strategy, getTable3BinaryData: () => [base] };
}
