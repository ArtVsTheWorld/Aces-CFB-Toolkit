import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runEquipmentPatcher, runFreshmanEquipment } from "../src/main/tools/equipment/runner.js";
import { hashFile, validateEquipmentSave, validateNilSave, validateBoostSave } from "../test/helpers/v180SaveValidation.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const saves = "C:/Users/Art/Documents/EA SPORTS College Football 27/saves";
const sources = [path.join(saves, "DYNASTY-CRASHTEST"), path.join(saves, "Ace's CFB Toolkit Backups/DYNASTY-CRASHTEST-BACKUP-100226-PRERANDOMIZER"), path.join(saves, "Ace's CFB Toolkit Backups/DYNASTY-CRASHTEST-BACKUP-100326-PREPATCHER")];
const originalHashes = sources.map(hashFile), directory = fs.mkdtempSync(path.join(root, "outputs/v180-save-validation-")), schema = path.join(root, "resources/engine-data/C27_486_6.gz"), results = [];
const copy = (source, label) => { const folder = path.join(directory, label); fs.mkdirSync(folder); const file = path.join(folder, "DYNASTY-TEST"); fs.copyFileSync(source, file); return file; };
try {
  results.push(await validateEquipmentSave(runEquipmentPatcher, copy(sources[2], "patcher"), schema, { pantsFix: true, helmetFix: true, allowVicisZero2: true, balanceExistingHelmets: true, rolledJerseyFix: true, sockFix: true, sleeveCompatibilityFix: true, nikeThighPads: true, visorFix: true, oakleyVisorFix: true, unlockedMouthpieceFix: true, rerollExistingMouthpieces: true, brandedMouthpieceFrequency: 75, allowRandomMouthpieceColors: true, unlockedRecolorFix: true, unlockedColorTheme: "weighted", tapeColorMode: "accessory", unlockedTattooFix: true, unlockedTattooCap: 33 }));
  console.log("Patcher: all passes, Vicis/balance, tape matching and full mouthpiece rerolls passed on a pre-Patcher copy.");
  results.push(await validateEquipmentSave(runFreshmanEquipment, copy(sources[1], "randomizer"), schema, { includedTeams: ["Alabama", "Akron"], classes: [], redshirtGroup: "all", top: 20, crossPositionPercent: 10, multipleDonorPercent: 30, usingUnlockedMod: true, usingRawAccessoriesMod: true, expandedEquipmentPercent: 100, noDripProfile: true }));
  console.log("Randomizer: both mod pools and donor mixing passed on a pre-Randomizer copy.");
  results.push(await validateNilSave(copy(sources[0], "nil-toggle"), schema));
  console.log("NIL Toggle: dynasty/team/player previews and isolated IsNIL-only Apply passed.");
  results.push(await validateBoostSave(copy(sources[0], "team-boost"), schema));
  console.log("Team Boost: below-average QB/WR/TE + Speed/Acceleration/Agility passed with all other fields unchanged.");
} finally {
  assert.deepEqual(sources.map(hashFile), originalHashes, "All three supplied originals must remain untouched");
  fs.writeFileSync(path.join(directory, "validation-results.json"), JSON.stringify({ sources: sources.map((file, index) => ({ file, sha256: originalHashes[index] })), results }, null, 2));
}
console.log(`All supplied-save checks passed. Artifacts: ${directory}`);
