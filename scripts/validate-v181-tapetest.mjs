import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashFile, saveTables, validateEquipmentSave } from "../test/helpers/v180SaveValidation.js";
import { runEquipmentPatcher } from "../src/main/tools/equipment/runner.js";
import { parseRef } from "../src/main/tools/equipment/openSave.js";
import { isInvalidMouthpieceAsset } from "../src/main/tools/equipment/catalog.js";
import { canUseVicis } from "../src/main/tools/equipment/core/helmetBalance.js";
const root = fileURLToPath(new URL("../", import.meta.url)), saves = "C:/Users/Art/Documents/EA SPORTS College Football 27/saves";
const sources = [path.join(saves, "DYNASTY-TAPETEST"), path.join(saves, "Ace's CFB Toolkit Backups/DYNASTY-TAPETEST-BACKUP-100326")];
const hashes = sources.map(hashFile), schema = path.join(root, "resources/engine-data/C27_486_6.gz"), directory = fs.mkdtempSync(path.join(root, "outputs/v181-tapetest-"));
const mouthAssets = visual => JSON.parse(visual.RawData).loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField").flatMap(loadout => loadout.loadoutElements.filter(element => element.slotType === "MouthWear").map(element => element.itemAssetName));
try {
  const folder = path.join(directory, "mouthpieces"); fs.mkdirSync(folder);
  const copy = path.join(folder, "DYNASTY-TEST"); fs.copyFileSync(sources[1], copy);
  const before = await saveTables(copy, schema);
  const badRows = before.visuals.records.flatMap((visual, row) => { try { return mouthAssets(visual).some(isInvalidMouthpieceAsset) ? [row] : []; } catch { return []; } });
  assert.ok(badRows.length >= 13);
  const result = await validateEquipmentSave(runEquipmentPatcher, copy, schema, { unlockedMouthpieceFix: true, skipNilPlayers: false });
  const after = await saveTables(copy, schema);
  const repaired = badRows.filter(row => !mouthAssets(after.visuals.records[row]).some(isInvalidMouthpieceAsset));
  const austin = before.players.records.find(record => !record.isEmpty && record.FirstName === "Austin" && record.LastName === "DiNapoli");
  const row = parseRef(austin.CharacterVisuals).row;
  assert.ok(badRows.includes(row)); assert.ok(repaired.includes(row));
  console.log(JSON.stringify({ scenario: "Add Mouthpieces repairs pre-existing wrong-slot assets without reroll being enabled", invalidVisualsBefore: badRows.length, repairedVisuals: repaired.length, austinRepaired: true, ...result }));
  const helmets = path.join(directory, "helmets"); fs.mkdirSync(helmets);
  const helmetCopy = path.join(helmets, "DYNASTY-TEST"); fs.copyFileSync(sources[0], helmetCopy);
  const originalHelmets = await saveTables(helmetCopy, schema);
  const originalRaw = originalHelmets.visuals.records.map(record => record.isEmpty ? null : record.RawData);
  const balance = await validateEquipmentSave(runEquipmentPatcher, helmetCopy, schema, { helmetFix: true, allowVicisZero2: true, balanceExistingHelmets: true });
  const balanced = await saveTables(helmetCopy, schema);
  let vicisCount = 0;
  for (const record of balanced.players.records) {
    if (record.isEmpty) continue;
    const ref = parseRef(record.CharacterVisuals); if (ref?.tableId !== balanced.visuals.header.tableId) continue;
    try {
      const hasVicis = JSON.parse(balanced.visuals.records[ref.row].RawData).loadouts.some(loadout => loadout.loadoutType === "PlayerOnField" && loadout.loadoutElements.some(element => element.slotType === "HeadWear" && element.itemAssetName === "GearHelmet_VicisZero2"));
      if (hasVicis && !record.IsNIL && originalRaw[ref.row] !== balanced.visuals.records[ref.row].RawData) { assert.ok(canUseVicis(record.Position), `New Vicis position: ${record.Position}`); vicisCount++; }
    } catch (error) { if (error.code === "ERR_ASSERTION") throw error; }
  }
  console.log(JSON.stringify({ scenario: "Vicis balancing respects position eligibility and exact Preview/Apply assignments", vicisCount, ...balance }));
} finally { assert.deepEqual(sources.map(hashFile), hashes, "Original saves and backup remain untouched"); }
console.log(`Originals unchanged. Validation output: ${directory}`);
