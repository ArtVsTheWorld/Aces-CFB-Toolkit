import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import { ReviewSnapshots } from "../src/main/services/reviewSnapshots.js";
import { HistoryStore } from "../src/main/services/history.js";
import { readSeasonLines } from "../src/main/tools/forceWin/runner.js";
import { runForceWin } from "../src/main/tools/forceWin/runner.js";
import { ReportService } from "../src/main/services/reports.js";

test("equipment preview defaults to visible cards and positions follow in-game order", () => {
  const source = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
  assert.match(source, /equipmentView: "cards"/);
  assert.match(source, /state\.equipmentView === "cards" \? "" : "hidden"/);
  const localized = source.match(/const localizedPosition = [^\n]+;/)?.[0];
  const order = source.match(/const POSITION_ORDER = [^\n]+;/)?.[0];
  const compare = source.match(/function positionCompare\([^\n]+/)?.[0];
  const context = vm.createContext({});
  vm.runInContext(`${localized}\n${order}\n${compare}\nresult = ["P", "CB", "RE", "QB", "MLB", "LT", "LE", "FB", "LOLB", "K"].sort(positionCompare);`, context);
  assert.deepEqual([...context.result], ["QB", "FB", "LT", "LE", "RE", "LOLB", "MLB", "CB", "K", "P"]);
  assert.match(source, /\[\.\.\.prepared\.positions\]\.sort\(positionCompare\)/);
  assert.match(source, /field === "position" \? positionCompare/);
});

test("completed run review snapshots persist all display rows and can be reopened after reload", t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cfb-review-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const id = crypto.randomUUID(), snapshots = new ReviewSnapshots(path.join(directory, "reviews"));
  const rows = Array.from({ length: 1200 }, (_, row) => ({ row, team: row % 2 ? "Alabama" : "LSU", player: `Player ${row}`, position: "QB" }));
  const result = { resultKind: "team-boost", planId: "transient-cache-id", mode: "apply", status: "completed", summary: [{ label: "Players changed", value: 1200 }], details: { changes: rows.slice(0, 1000) } };
  snapshots.save(id, result, rows);
  const history = new HistoryStore(path.join(directory, "history.json"));
  history.load(); history.add({ id, timestamp: new Date().toISOString(), toolId: "team-boost", toolName: "Team Boost", mode: "apply", status: "completed", reviewAvailable: true });
  const reloaded = new HistoryStore(path.join(directory, "history.json")); reloaded.load();
  assert.equal(reloaded.get(id).reviewAvailable, true);
  const saved = new ReviewSnapshots(path.join(directory, "reviews")).get(id);
  assert.equal(saved.rows.length, 1200);
  assert.equal(saved.result.details.changes.length, 1000);
  assert.equal(saved.result.planId, null);
  assert.equal(saved.rows[1199].player, "Player 1199");
  snapshots.prune([]);
  assert.equal(snapshots.get(id), null);
});

test("Home season lines read the full current schedule, match Smart Force Win projections, and never alter the save", async t => {
  const savePath = path.resolve("../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEWEEK0");
  const schemaPath = path.resolve("resources/engine-data/C27_486_6.gz");
  const before = crypto.createHash("sha256").update(fs.readFileSync(savePath)).digest("hex");
  const lines = await readSeasonLines({ savePath, schemaPath });
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cfb-lines-parity-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const preview = await runForceWin({ savePath, schemaPath, reports: new ReportService(directory), mode: "preview", options: {} });
  const byRow = new Map(lines.rows.map(row => [row.row, row]));
  let matched = 0;
  for (const row of preview.details.changes.filter(row => row.bettingLines)) {
    const projected = byRow.get(row.row);
    assert.ok(projected, `Schedule row ${row.row} should be present on Home`);
    assert.equal(projected.favoriteSpread, row.bettingLines.favoriteSpread);
    assert.equal(projected.total, row.bettingLines.total);
    assert.equal(projected.favoriteMoneyline, row.bettingLines.favoriteMoneyline);
    assert.equal(projected.underdogMoneyline, row.bettingLines.underdogMoneyline);
    matched++;
  }
  assert.ok(matched > 100);
  assert.ok(lines.rows.length > 100);
  assert.ok(lines.rows.every(row => row.week >= 1 && row.week <= 14));
  assert.ok(lines.rows.some(row => row.bettingLines !== null || Number.isFinite(row.total)));
  assert.ok(lines.rows.every(row => Number.isFinite(row.favoriteSpread) && Number.isFinite(row.total) && Number.isFinite(row.favoriteMoneyline) && Number.isFinite(row.underdogMoneyline)));
  const after = crypto.createHash("sha256").update(fs.readFileSync(savePath)).digest("hex");
  assert.equal(after, before);
});
