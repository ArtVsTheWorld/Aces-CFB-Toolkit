import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { ReportService } from "../src/main/services/reports.js";
import { parseCsv } from "../src/main/services/reportAudit.js";
import { prepareEquipmentTool, runFreshmanEquipment, runEquipmentPatcher } from "../src/main/tools/equipment/runner.js";
import { loadEquipmentTables } from "../src/main/tools/equipment/shared.js";
import { sf } from "../src/main/tools/equipment/openSave.js";
import { modPoolDefinitions } from "../src/main/tools/equipment/core/modPools.js";

const fixture = path.resolve("../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN"), schemaPath = path.resolve("resources/engine-data/C27_486_6.gz");
const hash = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const disabled = origin => Object.fromEntries(modPoolDefinitions()[origin].map(category => [category.id, { chance: 0, items: [] }]));
const one = (origin, id, item) => ({ ...disabled(origin), [id]: { chance: 100, items: [item] } });
for (const [name, run, options] of [
  ["custom mod pool settings", runFreshmanEquipment, { positions: ["WR", "TE"], usingUnlockedMod: true, usingRawAccessoriesMod: true, crossPositionPercent: 0, multipleDonorPercent: 40, modPools: { unlocked: one("unlocked", "socks", "Socks_CrewCut"), raw: one("raw", "backplates", "GearBackplate_RawXTech") } }],
  ["Unlocked socks priority", runEquipmentPatcher, { unlockedSocksFix: true, sockFix: true }],
  ["socks and final tattoo correction", runEquipmentPatcher, { unlockedSocksFix: true, sockFix: true, unlockedTattooFix: true, unlockedTattooCap: 100, unlockedTattooSelection: ["LegTattoo_Four"], sleeveCompatibilityFix: true }]
]) test(`v19.1 ${name}: exact Preview/Apply/reopen and full CSV audit`, { timeout: 60000 }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cfb-v191-pools-")), savePath = path.join(directory, "DYNASTY-POOL-TEST"), reports = new ReportService(path.join(directory, "reports"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true })); fs.copyFileSync(fixture, savePath);
  const original = hash(savePath), prepared = await prepareEquipmentTool({ savePath, schemaPath }); assert.ok(prepared.modPoolCategories.raw.some(category => category.id === "backplates" && category.items.length === 5));
  const preview = await run({ savePath, schemaPath, reports, mode: "preview", options: { includedTeams: ["LSU"], skipNilPlayers: false, ...options } });
  assert.equal(hash(savePath), original); assert.ok(preview.details.totalPreviewRows > 0);
  if (name === "custom mod pool settings") { assert.equal(preview.details.modPools.raw.backplates.chance, 100); assert.ok(preview.details.rawPlayersChanged > 0); }
  else { assert.ok(preview.details.unlockedSockPlayersChanged > 0); assert.equal(preview.details.sockPlayersChanged, 0); }
  const applied = await run({ savePath, schemaPath, reports, mode: "apply", options: { planId: preview.planId } });
  assert.equal(applied.status, "completed"); assert.equal(hash(applied.backupPath), original); assert.deepEqual(applied.details.changes, preview.details.changes);
  const reopened = await loadEquipmentTables(savePath, schemaPath), csv = parseCsv(fs.readFileSync(applied.reportPath, "utf8"));
  const [headings, ...rows] = csv;
  assert.ok(rows.length > 0); const records = rows.map(row => Object.fromEntries(headings.map((heading, index) => [heading, row[index]])));
  assert.equal(JSON.parse(records[0].ResolvedOptionsJSON).unlockedSocksFix, Boolean(options.unlockedSocksFix));
  for (const record of records) {
    assert.equal(sf(reopened.visuals.records[Number(record.CharacterVisualsRow)], "RawData"), record.AfterRawData);
    assert.ok(record.ChangedSlotsAndMetadata.length > 0);
    if (name !== "socks and final tattoo correction") assert.ok(record.ChangedSlotsAndMetadata.includes("InnerSocks"));
    const parsed = JSON.parse(record.AfterRawData), fields = parsed.loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField");
    if (name === "custom mod pool settings") for (const field of fields) {
      assert.equal(field.loadoutElements.find(element => element.slotType === "InnerSocks")?.itemAssetName, "Socks_CrewCut");
      const flak = field.loadoutElements.find(element => element.slotType === "FlakJacket")?.itemAssetName;
      if (flak && flak !== "Flakjacket_None") assert.notEqual(field.loadoutElements.find(element => element.slotType === "BackPlate")?.itemAssetName, "GearBackplate_RawXTech");
    }
    if (name === "Unlocked socks priority") assert.ok(fields.every(field => ["Socks_CrewCut", "Socks_High"].includes(field.loadoutElements.find(element => element.slotType === "InnerSocks")?.itemAssetName)));
    assert.notEqual(record.BeforeRawData, record.AfterRawData);
  }
});
