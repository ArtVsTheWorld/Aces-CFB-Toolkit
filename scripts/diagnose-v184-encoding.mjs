import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { openCfb27Save, readTables, PLAYER_TABLE_UID, TEAM_TABLE_UID } from "../src/main/services/save.js";
import { VISUALS_TABLE_UID, ROSTER_TABLE_UID, buildTeamNames, buildTeamApparel, buildRosterPlayerRows, buildRosterPlayerApparel, buildFcsTeamIndexes } from "../src/main/tools/equipment/shared.js";
import { installVisualsWriteSafety } from "../src/main/tools/equipment/visualsSafety.js";
import { overflowOwners } from "../src/main/tools/equipment/visualStorage.js";
import { parseRef, sf } from "../src/main/tools/equipment/openSave.js";
import { patchFreshmanEquipment } from "../src/main/tools/equipment/core/patcher.js";

const source = path.resolve(process.argv.slice(2).find(arg => !arg.startsWith("--")) ?? "D:/Downloads/DYNASTY-OCT04-03h21m46-AUTOSAVE");
const directory = fs.mkdtempSync(path.resolve("outputs/v184-encoding-"));
const savePath = path.join(directory, "DYNASTY-TEST");
const hash = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const originalHash = hash(source);
fs.copyFileSync(source, savePath);
const differences = (a, b, location = "$") => {
  if (isDeepStrictEqual(a, b)) return [];
  if (a && b && typeof a === "object" && typeof b === "object" && Array.isArray(a) === Array.isArray(b)) return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(key => differences(a[key], b[key], `${location}.${key}`));
  return [{ path: location, expected: a, actual: b }];
};
const opened = await openCfb27Save(savePath, path.resolve("resources/engine-data/C27_486_6.gz"));
const tables = await readTables(opened.franchise, { players: PLAYER_TABLE_UID, teams: TEAM_TABLE_UID, rosters: ROSTER_TABLE_UID, visuals: VISUALS_TABLE_UID });
const owners = overflowOwners(tables.visuals);
const failures = [];
for (const record of tables.visuals.records) {
  if (!record || record.isEmpty || owners.has(record.index)) continue;
  const raw = sf(record, "RawData");
  if (typeof raw !== "string") continue;
  const field = record.getFieldByKey("RawData").thirdTableField;
  const original = field.strategy;
  field.strategy = { ...original, setUnformattedValueFromFormatted(value, old, maxLength, context) {
    const encoded = original.setUnformattedValueFromFormatted(value, old, maxLength, context);
    const decoded = original.getFormattedValueFromUnformatted(encoded, context);
    const diff = differences(JSON.parse(value), JSON.parse(decoded));
    if (diff.length) {
      const info = { row: record.index, stage: value === raw ? "original roundtrip" : "mutation", differences: diff, context, before: JSON.parse(raw), expected: JSON.parse(value), actual: JSON.parse(decoded), originalBytes: field.unformattedValue.toString("base64"), encodedBytes: encoded.toString("base64") };
      failures.push(info);
      fs.writeFileSync(path.join(directory, `row-${record.index}-${failures.length}.json`), JSON.stringify(info, null, 2));
      if (process.argv.includes("--baseline")) throw new Error(`Diagnostic row ${record.index}: ${JSON.stringify(diff.slice(0, 6))}`);
    }
    return encoded;
  } };
  if (process.argv.includes("--baseline")) {
    try { field.strategy.setUnformattedValueFromFormatted(raw, field.unformattedValue, field.maxLength, field.strategyContext); }
    catch (error) { console.log(error.message); if (failures.length >= 10) break; }
  }
}
if (!process.argv.includes("--baseline")) {
  const logicalRows = new Set(tables.players.records.filter(record => !record.isEmpty).map(record => parseRef(sf(record, "CharacterVisuals"))).filter(ref => ref?.tableId === tables.visuals.header.tableId).map(ref => ref.row));
  installVisualsWriteSafety(tables.visuals, logicalRows);
  const broad = process.argv.includes("--broad"), mods = process.argv.includes("--mods");
  try {
    const result = patchFreshmanEquipment(tables.players.records, tables.visuals.records, tables.visuals.header.tableId, {
      teamNames: buildTeamNames(tables.teams.records), teamApparel: buildTeamApparel(tables.teams.records), playerApparel: buildRosterPlayerApparel(tables.players, tables.teams, tables.rosters), recipientRosterRows: buildRosterPlayerRows(tables.players, tables.teams, tables.rosters), fcsTeamIndexes: buildFcsTeamIndexes(tables.teams.records),
      eligiblePlayer: broad ? () => true : record => sf(record, "SchoolYear") === "Freshman" && ["Eligible", "Current"].includes(sf(record, "RedshirtStatus")),
      skipNilPlayers: !broad, top: 50, mixedChance: 0.3, crossMixedChance: 0.1, usingUnlockedMod: mods, usingRawAccessoriesMod: mods, seed: Number(process.argv.find(arg => arg.startsWith("--seed="))?.slice(7) ?? 184), apply: true
    });
    console.log(JSON.stringify({ changes: result.changes.length, skipped: result.skipped.length }));
  } catch (error) { console.log(error.stack); }
}
if (hash(source) !== originalHash || hash(savePath) !== originalHash) throw new Error("Read-only diagnostic changed save bytes");
console.log(JSON.stringify({ directory, failures: failures.length, sourceUnchanged: true }));
