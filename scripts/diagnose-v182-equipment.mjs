import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { loadEquipmentTables, snapshotVisualRawData } from "../src/main/tools/equipment/shared.js";
import { runEquipmentPatcher, runFreshmanEquipment } from "../src/main/tools/equipment/runner.js";
import { takePlan } from "../src/main/tools/jersey/planStore.js";
import { ReportService } from "../src/main/services/reports.js";
import { openCfb27Save, readTables } from "../src/main/services/save.js";
import { parseRef, sf } from "../src/main/tools/equipment/openSave.js";
const root = fileURLToPath(new URL("../", import.meta.url)), mode = process.argv[2] ?? "patcher", schemaPath = path.join(root, "resources/engine-data/C27_486_6.gz");
const source = mode === "patcher" ? "D:/Downloads/DYNASTY-UWDYNTEST" : "D:/Downloads/DYNASTY-CHEE", directory = fs.mkdtempSync(path.join(root, `outputs/v182-${mode}-diagnosis-`));
const savePath = path.join(directory, "DYNASTY-TEST"); fs.copyFileSync(source, savePath);
const run = mode === "patcher" ? runEquipmentPatcher : runFreshmanEquipment;
const reports = new ReportService(path.join(directory, "reports"));
const options = mode === "patcher" ? { pantsFix: true, helmetFix: true, rolledJerseyFix: true, sockFix: true, sleeveCompatibilityFix: true, nikeThighPads: true, visorFix: true, oakleyVisorFix: true, unlockedMouthpieceFix: true, rerollExistingMouthpieces: true, unlockedRecolorFix: true, unlockedTattooFix: true } : { classes: [], redshirtGroup: "all", skipNilPlayers: false, usingUnlockedMod: true, usingRawAccessoriesMod: true, top: 50 };
const preview = await run({ savePath, schemaPath, mode: "preview", reports, options });
const plan = takePlan(preview.planId); fs.writeFileSync(path.join(directory, "plan.json"), JSON.stringify(plan));
console.log(`Preview: ${plan.assignments.length} assignments; ${directory}`);
const loaded = await loadEquipmentTables(savePath, schemaPath), table = loaded.visuals, before = snapshotVisualRawData(table.records);
const desc = row => { const r = table.records[row], f = r.getFieldByKey("RawData").thirdTableField, ref = parseRef(r.Overflow); return { row, empty: r.isEmpty, overflow: ref, index: f.index, maxLength: f.maxLength, bytes: f.unformattedValue?.length, size: f.unformattedValue?.readUInt16LE(0), owners: ref ? table.records.filter(x => !x.isEmpty && x.Overflow === r.Overflow).map(x => x.index) : [], aliases: table.records.filter(x => !x.isEmpty && x.getFieldByKey("RawData").thirdTableField.index === f.index).map(x => x.index) }; };
for (const row of [178, 14161]) console.log("Original", JSON.stringify(desc(row)));
let applied = 0;
for (const change of plan.assignments) {
  try { table.records[change.row][change.field] = change.newValue; applied++; }
  catch (error) { console.log("Mutation failed", JSON.stringify({ applied, changeRow: change.row, message: error.message, row: desc(change.row), original: before.get(change.row), expected: change.newValue })); break; }
}
const candidate = path.join(directory, "candidate.tmp"); await loaded.franchise.save(candidate);
const opened = await openCfb27Save(candidate, schemaPath), { visuals } = await readTables(opened.franchise, { visuals: table.header.uniqueId });
const wanted = new Map(plan.assignments.slice(0, applied).map(change => [change.row, change.newValue]));
function diffs(a, b, at = "", result = []) {
  if (isDeepStrictEqual(a, b)) return result;
  if (a && b && typeof a === "object" && typeof b === "object") for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) diffs(a[key], b[key], `${at}/${key}`, result);
  else result.push({ path: at, expected: a, actual: b }); return result;
}
const mismatches = [];
for (const [row, old] of before) {
  if (typeof old !== "string") continue;
  const expected = wanted.get(row) ?? old, actual = sf(visuals.records[row], "RawData");
  if (!actual) { mismatches.push({ row, noActual: true }); continue; }
  const differences = diffs(JSON.parse(expected), JSON.parse(actual));
  if (differences.length) mismatches.push({ row, changed: wanted.has(row), before: desc(row), after: { empty: visuals.records[row].isEmpty, overflow: parseRef(visuals.records[row].Overflow), index: visuals.records[row].getFieldByKey("RawData").thirdTableField.index }, differences });
}
fs.writeFileSync(path.join(directory, "mismatches.json"), JSON.stringify(mismatches, null, 2));
console.log(JSON.stringify({ applied, mismatchCount: mismatches.length, first: mismatches.slice(0, 3), target: mismatches.find(row => row.row === 178) }, null, 2));
