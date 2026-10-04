import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ReportService } from "../src/main/services/reports.js";
import { openCfb27Save, readTables, PLAYER_TABLE_UID, TEAM_TABLE_UID } from "../src/main/services/save.js";
import { DEFAULT_DISTRIBUTION } from "../src/main/tools/dealbreaker/core.js";
import { runDealbreaker } from "../src/main/tools/dealbreaker/runner.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.resolve(here, "../../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN");
const schemaPath = path.resolve(here, "../resources/engine-data/C27_486_6.gz");
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const options = { seed: 707070, fixInvalidPlayingStyle: true, distribution: DEFAULT_DISTRIBUTION };

async function loadPlayers(savePath) {
  const opened = await openCfb27Save(savePath, schemaPath); const tables = await readTables(opened.franchise, { players: PLAYER_TABLE_UID, teams: TEAM_TABLE_UID }); const names = new Map();
  tables.teams.records.forEach((record, row) => { if (!record || record.isEmpty) return; const name = String(record.DisplayName || record.LongName || record.ShortName || `Team ${row}`), index = Number(record.TeamIndex); if (Number.isInteger(index)) names.set(index, name); if (!names.has(row)) names.set(row, name); });
  return { players: tables.players.records, names };
}

test("Dealbreaker Preview is read-only and Apply persists the complete cached plan after backing up", { timeout: 30000 }, async () => {
  assert.ok(fs.existsSync(fixture), "Latest-patch preseason regression fixture is required");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dealbreaker-workflow-")), savePath = path.join(directory, "DYNASTY-LSUTESTSAVEPRESZN"), reports = new ReportService(path.join(directory, "reports"));
  fs.copyFileSync(fixture, savePath); const originalHash = hash(savePath);
  try {
    const preview = await runDealbreaker({ savePath, schemaPath, reports, mode: "preview", options });
    assert.equal(hash(savePath), originalHash); assert.equal(preview.backupPath, null); assert.ok(preview.planId); assert.ok(preview.details.changes.length <= 1000);
    assert.equal(preview.details.totalPreviewRows, preview.summary.find(item => item.label === "Changes proposed").value);
    assert.ok(preview.details.changes.every(row => row.currentStoredValue !== row.proposedStoredValue));
    const applied = await runDealbreaker({ savePath, schemaPath, reports, mode: "apply", options: { planId: preview.planId } });
    assert.equal(applied.mode, "apply"); assert.ok(fs.existsSync(applied.backupPath)); assert.equal(hash(applied.backupPath), originalHash); assert.notEqual(hash(savePath), originalHash);
    const source = await loadPlayers(applied.backupPath), persisted = await loadPlayers(savePath);
    const changedRows = source.players.reduce((rows, record, row) => record?.RecruitingDealbreaker !== persisted.players[row]?.RecruitingDealbreaker ? [...rows, row] : rows, []);
    assert.equal(changedRows.length, preview.summary.find(item => item.label === "Changes proposed").value);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
