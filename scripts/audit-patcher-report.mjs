// Stream the supplied large CSV. No workbook/report or source save is modified.
import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { equipmentItem } from "../src/main/tools/equipment/catalog.js";
const source = process.argv[2], folder = process.argv[3] ?? "outputs/v183-pair-audit-baZDAq";
const before = JSON.parse(fs.readFileSync(path.join(folder, "supplied-before-rows.json"))), after = JSON.parse(fs.readFileSync(path.join(folder, "supplied-after-rows.json")));
let quoted = false, pendingQuote = false, value = "", row = [], headings, count = 0;
const types = {}, changedRows = new Set(), mismatches = [], newSlots = {}, uncatalogued = {};
function consume() {
  if (!headings) { headings = row; row = []; return; }
  if (row.length === 1 && !row[0]) { row = []; return; }
  count++; const entry = Object.fromEntries(headings.map((heading, index) => [heading, row[index]]));
  types[entry.ChangeType] = (types[entry.ChangeType] ?? 0) + 1;
  const id = Number(entry.CharacterVisualsRow); changedRows.add(id);
  if (!isDeepStrictEqual(JSON.parse(entry.BeforeRawData), before[id]?.raw) || !isDeepStrictEqual(JSON.parse(entry.AfterRawData), after[id]?.raw)) mismatches.push({ csvRow: count + 1, visualRow: id });
  row = [];
}
for await (const chunk of fs.createReadStream(source, { encoding: "utf8" })) for (const char of chunk) {
  if (pendingQuote) { pendingQuote = false; if (char === '"') { value += char; continue; } quoted = false; }
  if (quoted) { if (char === '"') pendingQuote = true; else value += char; }
  else if (char === '"' && !value) quoted = true;
  else if (char === ',') { row.push(value); value = ""; }
  else if (char === '\n') { row.push(value.replace(/\r$/, "")); value = ""; consume(); }
  else value += char;
}
if (row.length || value) { row.push(value); consume(); }
for (const id of changedRows) for (let index = 0; index < (after[id]?.raw?.loadouts?.length ?? 0); index++) {
  const old = before[id].raw.loadouts[index]?.loadoutElements ?? [];
  for (const element of after[id].raw.loadouts[index].loadoutElements ?? []) {
    const previous = old.find(item => item.slotType === element.slotType);
    if (previous?.itemAssetName === element.itemAssetName) continue;
    newSlots[element.slotType] = (newSlots[element.slotType] ?? 0) + 1;
    if (!equipmentItem(element.itemAssetName)) uncatalogued[`${element.slotType}: ${element.itemAssetName}`] = (uncatalogued[`${element.slotType}: ${element.itemAssetName}`] ?? 0) + 1;
  }
}
const result = { source, rows: count, visualRows: changedRows.size, types, expectedVsSavedMismatches: mismatches, changedSlotCounts: newSlots, uncataloguedChanges: uncatalogued };
fs.writeFileSync(path.join(folder, "report-audit.json"), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
