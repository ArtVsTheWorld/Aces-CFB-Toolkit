// Replay subsets of the exact reported changes on working-backup copies.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { openCfb27Save, readTables, PLAYER_TABLE_UID, TEAM_TABLE_UID } from "../src/main/services/save.js";
import { VISUALS_TABLE_UID, ROSTER_TABLE_UID, loadEquipmentTables, snapshotVisualRawData, cacheEquipmentPlan, applyEquipmentPlan } from "../src/main/tools/equipment/shared.js";
import { modAddedFcsPlayerRows } from "../src/main/tools/equipment/skipReporting.js";
import { parseRef, sf } from "../src/main/tools/equipment/openSave.js";
import { ReportService } from "../src/main/services/reports.js";

const root = path.resolve("."), schemaPath = path.join(root, "resources/engine-data/C27_486_6.gz");
const beforeFile = process.argv[2], afterFile = process.argv[3], requested = process.argv[4] ?? "roster";
const directory = fs.mkdtempSync(path.join(root, "outputs/patcher-gear-probes-"));
const hash = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex"), hashes = [hash(beforeFile), hash(afterFile)];
const auditDirectory = process.argv[5] ?? path.join(root, "outputs/v183-pair-audit-baZDAq");
const originalRows = JSON.parse(fs.readFileSync(path.join(auditDirectory, "supplied-before-rows.json"))), targetRows = JSON.parse(fs.readFileSync(path.join(auditDirectory, "supplied-after-rows.json")));
const opened = await openCfb27Save(beforeFile, schemaPath), tables = await readTables(opened.franchise, { players: PLAYER_TABLE_UID, teams: TEAM_TABLE_UID, rosters: ROSTER_TABLE_UID });
const modRows = modAddedFcsPlayerRows(tables.players, tables.teams, tables.rosters), modVisuals = new Set();
for (const row of modRows) { const ref = parseRef(sf(tables.players.records[row], "CharacterVisuals")); if (ref) modVisuals.add(ref.row); }
const changed = originalRows.filter(row => row.raw && !isDeepStrictEqual(row.raw, targetRows[row.row].raw));
const groups = requested === "roster" ? ["FBS", "MODFCS"] : requested.split(",");
const results = [];
for (const group of groups) {
  const savePath = path.join(directory, `DYNASTY-PATCHER-${group}-PROBE`); fs.copyFileSync(beforeFile, savePath);
  const loaded = await loadEquipmentTables(savePath, schemaPath), originals = snapshotVisualRawData(loaded.visuals.records), assignments = [];
  for (const old of changed) {
    const post = structuredClone(targetRows[old.row].raw);
    if (group === "FBS" && modVisuals.has(old.row) || group === "MODFCS" && !modVisuals.has(old.row)) continue;
    if (group === "NO-MOUTH" || group === "NO-HELMET") {
      const slots = new Set(group === "NO-MOUTH" ? ["MouthWear"] : ["HeadWear", "FaceMask"]);
      for (let index = 0; index < post.loadouts.length; index++) {
        const elements = post.loadouts[index].loadoutElements; if (!Array.isArray(elements)) continue;
        post.loadouts[index].loadoutElements = elements.filter(element => !slots.has(element.slotType)).concat((old.raw.loadouts[index]?.loadoutElements ?? []).filter(element => slots.has(element.slotType)));
      }
    }
    if (!isDeepStrictEqual(post, old.raw)) assignments.push({ table: "visuals", row: old.row, field: "RawData", oldValue: originals.get(old.row), newValue: JSON.stringify(post) });
  }
  const planId = cacheEquipmentPlan({ toolId: "equipment-patcher", toolName: "Equipment Patcher", savePath, needsVisuals: true, assignments, previewRows: [], report: { prefix: "diagnostic", headings: ["Equipment row"], rows: assignments.map(row => [row.row]) }, result: { status: "preview", mode: "preview", details: {} } });
  const result = await applyEquipmentPlan({ toolId: "equipment-patcher", savePath, schemaPath, reports: new ReportService(path.join(directory, `${group}-reports`)), options: { planId } });
  assert.equal(hash(result.backupPath), hashes[0]); results.push({ group, savePath, assignments: assignments.length, exactSelectedChanges: true, backupHashMatches: true });
  console.log(JSON.stringify(results.at(-1)));
}
assert.deepEqual([hash(beforeFile), hash(afterFile)], hashes);
fs.writeFileSync(path.join(directory, "results.json"), JSON.stringify({ originalsUnchanged: true, results }, null, 2));
