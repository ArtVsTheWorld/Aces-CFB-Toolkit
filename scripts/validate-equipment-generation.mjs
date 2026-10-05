// Read the supplied before/after files without changing them. Exercise Apply
// only on a newly created workspace copy, never on the user's saves.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { openCfb27Save, readTables, PLAYER_TABLE_UID, TEAM_TABLE_UID } from "../src/main/services/save.js";
import { ReportService } from "../src/main/services/reports.js";
import { runFreshmanEquipment } from "../src/main/tools/equipment/runner.js";
import { parseRef } from "../src/main/tools/equipment/openSave.js";
import { VISUALS_TABLE_UID, buildTeamNames } from "../src/main/tools/equipment/shared.js";
import { EQUIPMENT_ITEMS, brandedEquipmentItems, canGenerateItem, equipmentDisplayName } from "../src/main/tools/equipment/catalog.js";
import { GENERATION_METADATA } from "../src/main/tools/equipment/semantics.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "outputs");
const save = "C:/Users/Art/Documents/EA SPORTS College Football 27/saves/DYNASTY-CRASHTEST";
const backup = "C:/Users/Art/Documents/EA SPORTS College Football 27/saves/Ace's CFB Toolkit Backups/DYNASTY-CRASHTEST-BACKUP-100226";
const schema = path.join(root, "resources/engine-data/C27_486_6.gz");
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const originalHashes = { save: hash(save), backup: hash(backup) };
const evidenceFiles = ["runtime-equipment-validation-labels-2026-10-03.json", "runtime-equipment-validation-refresh-labels-2026-10-03.json"];
const verified = new Map();
for (const source of evidenceFiles) {
  const evidence = JSON.parse(fs.readFileSync(path.join(out, source)));
  for (const record of evidence.Records) if (record.RepeatedNameFields) for (const label of record.Labels) {
    if (label.FieldOffset !== 56 || /[_/]/.test(label.Value)) continue;
    const displayName = label.Value.trim(), existing = verified.get(record.ItemName);
    if (existing) assert.equal(existing.menuDisplayName, displayName, `Conflicting labels: ${record.ItemName}`);
    const item = existing ?? { itemName: record.ItemName, menuDisplayName: displayName, sources: [] };
    item.sources.push({ file: source, itemNameField: record.NamePointerAddress, labelOffset: 56 });
    verified.set(record.ItemName, item);
  }
}
for (const [name, override] of Object.entries(GENERATION_METADATA.itemOverrides)) {
  assert.equal(verified.get(name)?.menuDisplayName, override.menuDisplayName ?? override.displayName);
}

const targets = ["Jaborree Riggins", "Jalen Taylor", "Aubrey Walker", "Tyler Henderson", "Daniel Hill", "Trae'shawn Brown", "Marshall Pritchett", "Chris Booker", "Ivan Taylor"];
const inspected = {};
for (const [label, file] of Object.entries({ save, backup })) {
  const opened = await openCfb27Save(file, schema), tables = await readTables(opened.franchise, { players: PLAYER_TABLE_UID, teams: TEAM_TABLE_UID, visuals: VISUALS_TABLE_UID });
  const teams = buildTeamNames(tables.teams.records);
  inspected[label] = tables.players.records.flatMap((player, row) => {
    if (!player || player.isEmpty) return [];
    const name = `${player.FirstName} ${player.LastName}`;
    if (!targets.some(target => target.toLowerCase() === name.toLowerCase())) return [];
    const ref = parseRef(player.CharacterVisuals);
    return [{ name, playerRow: row, team: teams.get(player.TeamIndex), position: player.Position, visualsRow: ref?.row, loadouts: ref?.tableId === tables.visuals.header.tableId ? JSON.parse(tables.visuals.records[ref.row].RawData).loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField") : [] }];
  });
}
const savedItem = (name, slot) => inspected.save.find(player => player.name.toLowerCase() === name.toLowerCase())?.loadouts[0].loadoutElements.find(element => element.slotType === slot)?.itemAssetName;
assert.equal(savedItem("Jaborree Riggins", "LeftShoe"), "GearFootwear_shoe_mid_NikeAlphaMenacePro299Club");
assert.equal(savedItem("Trae'shawn Brown", "MouthWear"), "GearMouthpiece_PacifierDualHanging_Black4");
assert.equal(savedItem("Marshall Pritchett", "Neckpad"), "GearNeckpad_VintageSingleNeckRoll");
assert.equal(savedItem("Chris Booker", "Neckpad"), "GearNeckpad_VintageNeckRoll");
assert.equal(savedItem("Ivan Taylor", "FaceWear"), "FaceGear_BalaclavaOverNose_White");

const directory = fs.mkdtempSync(path.join(out, "equipment-generation-crashtest-"));
const copy = path.join(directory, "DYNASTY-CRASHTEST-VALIDATION");
fs.copyFileSync(backup, copy);
const copyHash = hash(copy), reports = new ReportService(path.join(directory, "reports"));
const preview = await runFreshmanEquipment({ savePath: copy, schemaPath: schema, reports, mode: "preview", options: { includedTeams: ["Akron", "Alabama"], classes: [], redshirtStatuses: [], skipNilPlayers: false, top: 50, usingUnlockedMod: true, usingRawAccessoriesMod: true, expandedEquipmentPercent: 65, noDripProfile: false } });
assert.equal(hash(copy), copyHash); assert.equal(preview.backupPath, null); assert.ok(preview.details.totalPreviewRows > 0);
const applied = await runFreshmanEquipment({ savePath: copy, schemaPath: schema, reports, mode: "apply", options: { planId: preview.planId } });
assert.deepEqual(applied.details.changes, preview.details.changes); assert.equal(hash(applied.backupPath), copyHash);
const reopened = await openCfb27Save(copy, schema), tables = await readTables(reopened.franchise, { visuals: VISUALS_TABLE_UID, players: PLAYER_TABLE_UID });
// Overflow rows hold continuation bytes, not independently encoded loadouts.
// Decode the actual player owners instead of attempting to parse storage rows.
const persisted = new Map(preview.details.changes.map(change => {
  const ref = parseRef(tables.players.records[change.row].CharacterVisuals);
  assert.equal(ref?.tableId, tables.visuals.header.tableId);
  const raw = tables.visuals.records[ref.row].RawData;
  assert.ok(JSON.parse(raw).loadouts.some(loadout => loadout.loadoutType === "PlayerOnField"));
  return [ref.row, raw];
}));
// The write pipeline itself checks every assignment and all untouched tables
// against the staged, reopened file before replacing this validation copy.
assert.ok(persisted.size > 0); assert.equal(hash(save), originalHashes.save); assert.equal(hash(backup), originalHashes.backup);
const audit = {
  date: "2026-10-03", originalFilesUnchanged: true, originalHashes,
  evidence: { method: "Normal read-only process access, repeated ItemName fields at -96/-160, label at +56; no arbitrary adjacent strings", verifiedLabels: [...verified.values()].sort((a, b) => a.itemName.localeCompare(b.itemName)) },
  displayCorrections: GENERATION_METADATA.itemOverrides,
  generatedFootwear: Object.fromEntries(["Nike", "Adidas", "UnderArmour", "Jordan", "NewBalance"].map(brand => [brand, brandedEquipmentItems("Cleats", brand).filter(canGenerateItem).map(item => ({ itemName: item.itemName, displayName: equipmentDisplayName(item.itemName) }))])),
  excludedFootwear: EQUIPMENT_ITEMS.filter(item => item.category === "Cleats" && !canGenerateItem(item)).map(item => ({ itemName: item.itemName, displayName: item.displayName, classification: item.semantic.actualType })),
  inspected,
  workflow: { directory, preview: { playersChanged: preview.details.totalPreviewRows, seed: preview.details.seed, reportPath: preview.reportPath, originalHashUnchanged: true, noBackup: true }, apply: { backupPath: applied.backupPath, reportPath: applied.reportPath, cachedPlanUnchanged: true, stagedSaveVerificationPassed: true } },
  limitations: ["Loaded display labels are not proof of actual artwork colors. The Black4 artwork classification comes from the user's in-game validation tied to the exact saved ID.", "Older exported Player-role and shoe-slot tags also appear on the Air Max sneaker. Generation requires a recognized football-cleat model; unknown models are omitted rather than guessed.", "New-generation changes need another in-game visual check. No user save or mod was modified."]
};
fs.writeFileSync(path.join(out, "equipment-generation-audit-2026-10-03.json"), JSON.stringify(audit, null, 2));
console.log(JSON.stringify({ verifiedLabels: verified.size, playersChanged: preview.details.totalPreviewRows, originalFilesUnchanged: true, copyPreviewUnchanged: true, copyApplyBackupAndExactPlan: true, audit: path.join(out, "equipment-generation-audit-2026-10-03.json") }, null, 2));
