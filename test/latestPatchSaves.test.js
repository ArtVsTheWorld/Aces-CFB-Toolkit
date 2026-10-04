import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ReportService } from "../src/main/services/reports.js";
import { inspectSaveSchema, openCfb27Save, readTables, PLAYER_TABLE_UID, TEAM_TABLE_UID } from "../src/main/services/save.js";
import { prepareCommentary, runCommentary } from "../src/main/tools/commentary/runner.js";
import { loadCommentaryMap } from "../src/main/tools/commentary/map.js";
import { createCommentaryMatcher } from "../src/main/tools/commentary/matcher.js";
import { prepareForceWin, runForceWin } from "../src/main/tools/forceWin/runner.js";
import { runJerseyNoDuplicates } from "../src/main/tools/jersey/noDuplicatesRunner.js";
import { runLongSnap } from "../src/main/tools/longSnap/runner.js";
import { runTeamBoost } from "../src/main/tools/teamBoost/runner.js";
import { buildFcsTeamIndexes, buildRosterPlayerRows, loadEquipmentTables, resolveTeamIndexes, VISUALS_TABLE_UID } from "../src/main/tools/equipment/shared.js";
import { parseRef, sf } from "../src/main/tools/equipment/openSave.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(here, "../../EXAMPLE SAVES VANILLA GAME");
const preseason = path.join(examples, "DYNASTY-LSUTESTSAVEPRESZN");
const weekZero = path.join(examples, "DYNASTY-LSUTESTSAVEWEEK0");
const schemaDirectory = path.resolve(here, "../resources/engine-data");
const schemaPath = path.join(schemaDirectory, "C27_486_6.gz");
const commentaryMap = path.resolve(here, "../resources/commentary-data/PlayerCommentaryidMap.txt");
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

test("both refreshed latest-patch saves route to schema 486.6 and expose required core tables", { timeout: 30000 }, async () => {
  for (const savePath of [preseason, weekZero]) {
    assert.ok(fs.existsSync(savePath), `${path.basename(savePath)} is required`);
    const detected = inspectSaveSchema(savePath, schemaDirectory);
    assert.equal(detected.supported, true);
    assert.equal(detected.version, "C27_486_6");
    assert.equal(detected.saveHeader, "C27_833_0");
    const opened = await openCfb27Save(savePath, schemaPath);
    const tables = await readTables(opened.franchise, { players: PLAYER_TABLE_UID, teams: TEAM_TABLE_UID, visuals: VISUALS_TABLE_UID });
    assert.ok(tables.players.records.some(record => record && !record.isEmpty));
    assert.ok(tables.teams.records.some(record => record && !record.isEmpty));
    assert.ok(tables.visuals.records.some(record => record && !record.isEmpty));
  }
});

test("latest-patch equipment roster discovery excludes dormant zero-reference player-pool rows", { timeout: 30000 }, async () => {
  const loaded = await loadEquipmentTables(preseason, schemaPath);
  const rosterRows = buildRosterPlayerRows(loaded.players, loaded.teams, loaded.rosters);
  assert.ok(rosterRows.size > 10_000);
  let dormantFreshmen = 0;
  for (const [row, record] of loaded.players.records.entries()) {
    if (!record || record.isEmpty || Boolean(sf(record, "IsNIL")) || String(sf(record, "SchoolYear")) !== "Freshman") continue;
    const ref = parseRef(sf(record, "CharacterVisuals"));
    if (ref?.tableId === loaded.visuals.header.tableId) continue;
    dormantFreshmen += 1;
    assert.equal(rosterRows.has(row), false, `invalid visual reference on rostered Player row ${row}`);
  }
  assert.ok(dormantFreshmen > 0, "fixture should retain dormant player-pool rows for this regression");
});

test("latest-patch team filtering uses explicit TeamIndex values without table-row collisions", { timeout: 30000 }, async () => {
  const loaded = await loadEquipmentTables(preseason, schemaPath);
  assert.deepEqual([...buildFcsTeamIndexes(loaded.teams.records)], [255]);
  assert.deepEqual([...resolveTeamIndexes(loaded.teams.records, ["Georgia Tech"])], [30]);
  assert.deepEqual([...resolveTeamIndexes(loaded.teams.records, ["FCS East"])], [255]);
});

test("bundled commentary map covers every rostered latest-patch player with a stored commentary ID", { timeout: 30000 }, async () => {
  const map = loadCommentaryMap(commentaryMap);
  const match = createCommentaryMatcher(map, { allowPhonetic: false, allowFirstName: false });
  assert.equal(map.size, 6969);
  for (const savePath of [preseason, weekZero]) {
    const loaded = await loadEquipmentTables(savePath, schemaPath);
    const rosterRows = buildRosterPlayerRows(loaded.players, loaded.teams, loaded.rosters);
    for (const row of rosterRows) {
      const player = loaded.players.records[row], storedId = Number(sf(player, "PLYR_COMMENT")) || 0;
      if (!storedId) continue;
      const result = match("", sf(player, "LastName"));
      assert.notEqual(result.method, "none", `missing ${sf(player, "LastName")} on Player row ${row}`);
      assert.equal(result.id, storedId, `${sf(player, "LastName")} on Player row ${row}`);
    }
  }
});

test("remaining tool previews run read-only on the refreshed latest-patch saves", { timeout: 60000 }, async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "latest-patch-tools-"));
  const reports = new ReportService(path.join(directory, "reports"));
  try {
    const beforePreseason = hash(preseason), beforeWeekZero = hash(weekZero);
    const longSnap = await runLongSnap({ savePath: preseason, schemaPath, reports, mode: "preview", options: {} });
    assert.equal(longSnap.mode, "preview");

    const commentaryOptions = { phonetic: false, firstName: true, preserveUnmatched: false, freshmenOnly: false, showAll: false };
    const commentaryPrepared = await prepareCommentary({ savePath: preseason, schemaPath, defaultMapPath: commentaryMap, options: commentaryOptions });
    const commentary = await runCommentary({ savePath: preseason, schemaPath, defaultMapPath: commentaryMap, reports, mode: "preview", options: { ...commentaryOptions, analysisSignature: commentaryPrepared.analysisSignature, decisions: {} } });
    assert.equal(commentary.mode, "preview");

    const loaded = await openCfb27Save(preseason, schemaPath);
    const { teams } = await readTables(loaded.franchise, { teams: TEAM_TABLE_UID });
    const teamNames = teams.records.filter(record => record && !record.isEmpty && Number(record.TeamIndex) !== 255).map(record => String(record.DisplayName)).filter(Boolean);
    const noDuplicates = await runJerseyNoDuplicates({ savePath: preseason, schemaPath, reports, mode: "preview", options: { skippedTeams: teamNames.filter(name => name !== "LSU") } });
    assert.equal(noDuplicates.mode, "preview");

    const teamBoost = await runTeamBoost({ savePath: preseason, schemaPath, reports, mode: "preview", options: { teams: ["Georgia Tech"], minimum: 1, maximum: 1, ratingMode: "physical", playerScope: "all" } });
    assert.ok(teamBoost.summary.find(item => item.label === "Players processed").value > 0, "Georgia Tech must not collide with the FCS East table row");

    const forcePrepared = await prepareForceWin({ savePath: weekZero, schemaPath });
    assert.equal(forcePrepared.currentWeek, 0);
    const forceWin = await runForceWin({ savePath: weekZero, schemaPath, reports, mode: "preview", options: { action: "evaluate", scope: "next", involvement: "minimum", modelProfile: "balanced", skippedTeams: [] } });
    assert.equal(forceWin.mode, "preview");
    assert.equal(hash(preseason), beforePreseason);
    assert.equal(hash(weekZero), beforeWeekZero);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
