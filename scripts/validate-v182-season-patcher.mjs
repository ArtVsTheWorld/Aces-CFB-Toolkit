import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { runEquipmentPatcher } from "../src/main/tools/equipment/runner.js";
import { loadEquipmentTables, snapshotVisualRawData } from "../src/main/tools/equipment/shared.js";
import { parseRef, sf } from "../src/main/tools/equipment/openSave.js";
import { takePlan } from "../src/main/tools/jersey/planStore.js";
import { ReportService } from "../src/main/services/reports.js";

const root = fileURLToPath(new URL("../", import.meta.url)), schemaPath = path.join(root, "resources/engine-data/C27_486_6.gz");
const source = path.resolve(process.argv[2] ?? "D:/Downloads/DYNASTY-SEASON-BACKUP-100126"), target = Number(process.argv[3] ?? 129);
const directory = fs.mkdtempSync(path.join(root, "outputs/v182-season-patcher-")), savePath = path.join(directory, "DYNASTY-TEST");
const hash = bytes => createHash("sha256").update(bytes).digest("hex"), hashFile = file => hash(fs.readFileSync(file));
const sourceHash = hashFile(source), reports = new ReportService(path.join(directory, "reports"));
const options = { pantsFix: true, helmetFix: true, rolledJerseyFix: true, sockFix: true, sleeveCompatibilityFix: true, nikeThighPads: true, visorFix: true, oakleyVisorFix: true, unlockedMouthpieceFix: true, rerollExistingMouthpieces: true, unlockedRecolorFix: true, unlockedTattooFix: true, skipNilPlayers: false };
const log = message => console.log(`${new Date().toISOString()} ${message}`);
function describe(table, row) {
  const record = table.records[row], field = record.getFieldByKey("RawData").thirdTableField, start = field.index, capacity = field.maxLength + 2;
  return { row, isEmpty: record.isEmpty, start, capacity, compressedSize: field.unformattedValue.readUInt16LE(0), overflow: parseRef(sf(record, "Overflow")), overlaps: table.records.filter(other => {
    if (other.isEmpty || other.index === row) return false;
    const field = other.getFieldByKey("RawData").thirdTableField; return field.index < start + capacity && field.index + field.maxLength + 2 > start;
  }).map(other => ({ row: other.index, start: other.getFieldByKey("RawData").thirdTableField.index })) };
}
function diffs(a, b, at = "", result = []) {
  if (isDeepStrictEqual(a, b)) return result;
  if (a && b && typeof a === "object" && typeof b === "object") for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) diffs(a[key], b[key], `${at}/${key}`, result);
  else result.push({ path: at, expected: a, actual: b }); return result;
}
fs.copyFileSync(source, savePath);
try {
  log(`Starting current v${JSON.parse(fs.readFileSync(path.join(root, "package.json"))).version} broad Patcher Preview`);
  const random = Math.random; Math.random = () => 53 / 0x100000000;
  let preview;
  try { preview = await runEquipmentPatcher({ savePath, schemaPath, mode: "preview", reports, options }); } finally { Math.random = random; }
  const plan = takePlan(preview.planId), wanted = new Map(plan.assignments.map(change => [change.row, change.newValue]));
  fs.writeFileSync(path.join(directory, "plan.json"), JSON.stringify(plan));
  assert.equal(hashFile(savePath), sourceHash); assert.equal(preview.backupPath, null); assert.equal(fs.existsSync(path.join(directory, "Ace's CFB Toolkit Backups")), false);
  log(`Preview complete: ${plan.assignments.length} assignments; target changed: ${wanted.has(target)}`);
  let baseline = await loadEquipmentTables(savePath, schemaPath);
  const before = snapshotVisualRawData(baseline.visuals.records), originalTarget = JSON.parse(before.get(target)), expectedTarget = JSON.parse(wanted.get(target) ?? before.get(target)), originalStorage = describe(baseline.visuals, target);
  const otherTableHashes = new Map(baseline.franchise.tables.filter(table => table.header.tableId !== baseline.visuals.header.tableId).map(table => [table.header.tableId, hash(table.data)]));
  const targetTrace = { source, sourceHash, target, originalStorage, original: originalTarget, expected: expectedTarget, proposedChanges: diffs(originalTarget, expectedTarget) };
  fs.writeFileSync(path.join(directory, "target-trace.json"), JSON.stringify(targetTrace, null, 2));
  baseline = null;
  log("Starting verified Apply on workspace copy");
  const applied = await runEquipmentPatcher({ savePath, schemaPath, mode: "apply", reports, options: { planId: preview.planId } });
  assert.equal(applied.status, "completed"); assert.equal(hashFile(applied.backupPath), sourceHash);
  log("Apply completed; comparing every logical row after reopen");
  const reopened = await loadEquipmentTables(savePath, schemaPath), after = snapshotVisualRawData(reopened.visuals.records), mismatches = [];
  for (const [row, raw] of before) if (typeof raw === "string") {
    const expected = JSON.parse(wanted.get(row) ?? raw), actual = typeof after.get(row) === "string" ? JSON.parse(after.get(row)) : null, differences = diffs(expected, actual);
    if (differences.length) mismatches.push({ row, differences });
  }
  for (const table of reopened.franchise.tables) if (otherTableHashes.has(table.header.tableId)) assert.equal(hash(table.data), otherTableHashes.get(table.header.tableId), `${table.name} must remain unchanged`);
  const actualTarget = JSON.parse(after.get(target));
  Object.assign(targetTrace, { reopenedStorage: describe(reopened.visuals, target), reopened: actualTarget, reopenedDifferences: diffs(expectedTarget, actualTarget) });
  fs.writeFileSync(path.join(directory, "target-trace.json"), JSON.stringify(targetTrace, null, 2));
  fs.writeFileSync(path.join(directory, "mismatches.json"), JSON.stringify(mismatches, null, 2));
  assert.deepEqual(mismatches, []); assert.equal(hashFile(source), sourceHash);
  assert.equal(fs.readdirSync(directory).some(file => file.startsWith(".ace-equipment-")), false);
  const result = { source, sourceHash, currentVersion: JSON.parse(fs.readFileSync(path.join(root, "package.json"))).version, target, targetPlannedChange: wanted.has(target), assignments: plan.assignments.length, mismatches: 0, previewReadOnly: true, backupHashMatches: true, originalUnchanged: true, otherTablesUnchanged: true, report: applied.reportPath, backup: applied.backupPath, directory };
  fs.writeFileSync(path.join(directory, "results.json"), JSON.stringify(result, null, 2)); log(JSON.stringify(result));
} finally { assert.equal(hashFile(source), sourceHash, "Supplied original must remain byte-identical"); }
