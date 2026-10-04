import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { ReportService } from "../src/main/services/reports.js";
import { runJerseyRenumber } from "../src/main/tools/jersey/standardRunner.js";
import { runTeamBoost } from "../src/main/tools/teamBoost/runner.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const savePath = path.resolve(here, "../../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN");
const schemaPath = path.resolve(here, "../resources/engine-data/C27_486_6.gz");

test("Standard Jersey Preview excludes blank allocated rows and never leaks temporary negative values on the latest-patch save", async () => {
  const reportsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "jersey-v080-"));
  const before = fs.statSync(savePath).mtimeMs;
  const oldLog = console.log, oldWarn = console.warn; console.log = () => {}; console.warn = () => {};
  let preview; try { preview = await runJerseyRenumber({ savePath, schemaPath, reports: new ReportService(reportsDirectory), mode: "preview", options: {} }); } finally { console.log = oldLog; console.warn = oldWarn; }
  assert.ok(preview.details.totalPreviewRows > 0);
  assert.equal(preview.details.changes.some(change => change.newNumber < 0 || change.newNumber > 99), false);
  assert.equal(preview.details.changes.some(change => !change.player), false);
  for (const field of ["team", "player", "position", "classYear", "overall", "nil", "oldNumber", "newNumber", "reason", "fallback"]) assert.ok(field in preview.details.changes[0], field);
  assert.equal(fs.statSync(savePath).mtimeMs, before);
});

test("v0.8 user-facing copy, themes, versions, review scope, and report schemas are wired", () => {
  const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8"), registry = fs.readFileSync(new URL("../src/shared/toolRegistry.js", import.meta.url), "utf8"), settings = fs.readFileSync(new URL("../src/main/services/settings.js", import.meta.url), "utf8"), commentary = fs.readFileSync(new URL("../src/main/tools/commentary/runner.js", import.meta.url), "utf8"), equipment = fs.readFileSync(new URL("../src/main/tools/equipment/runner.js", import.meta.url), "utf8"), layout = fs.readFileSync(new URL("../src/renderer/layout-fixes.css", import.meta.url), "utf8"), index = fs.readFileSync(new URL("../src/renderer/index.html", import.meta.url), "utf8");
  assert.match(renderer, /Dynasty Operations Center/); assert.doesNotMatch(renderer, /Because the little details matter\./);
  assert.doesNotMatch(renderer, /\bCLI\b|command line|terminal|original script behavior/i);
  assert.match(settings, /theme: "light"/); assert.match(renderer, /theme-select/); assert.match(renderer, /On-screen previews display up to 1,000 rows/);
  for (const version of ['id: "jersey-renumber"[^\n]+version: "4.0"', 'id: "freshman-equipment"[^\n]+version: "5.0"', 'id: "equipment-patcher"[^\n]+version: "5.0"', 'id: "automatic-force-win"[^\n]+version: "4.0"', 'id: "team-boost"[^\n]+version: "2.0"']) assert.match(registry, new RegExp(version));
  assert.match(registry, /icon: "long-snap"/); assert.match(registry, /icon: "handshake"/); assert.match(registry, /icon: "referee"/);
  assert.match(renderer, /assets\/force-win-referee\.png/); assert.ok(fs.existsSync(new URL("../src/renderer/assets/force-win-referee.png", import.meta.url)));
  assert.match(renderer, /assets\/dealbreaker-handshake\.png/); assert.ok(fs.existsSync(new URL("../src/renderer/assets/dealbreaker-handshake.png", import.meta.url)));
  assert.match(commentary, /result\.changes\.filter\(item => item\.match\.method === "phonetic"\)/); assert.match(commentary, /changes: reviewRows\.slice\(0, 1000\)/);
  assert.match(equipment, /"OldGearItem", "NewGearItem"/); assert.match(equipment, /"OldOrDonorTeam", "NewOrDonorPlayerAndEquipmentGroups"/);
  assert.match(equipment, /equipmentSkipReporting/); assert.match(fs.readFileSync(new URL("../src/main/tools/equipment/skipReporting.js", import.meta.url), "utf8"), /skippedReasons/); assert.match(renderer, /Why eligible players were skipped/);
  assert.match(index, /layout-fixes\.css/); assert.match(layout, /#tool-navigation[\s\S]+overflow-y: auto/); assert.match(layout, /\.sidebar-bottom[\s\S]+flex: none/);
  assert.match(layout, /\[data-theme="dark"\][\s\S]+custom-tool-icon[\s\S]+filter: invert\(1\)/);
  assert.match(renderer, /Playing Style \(RB, WR, TE only\)/); assert.doesNotMatch(renderer, /By default, only legitimate rostered players/);
});

test("Team Boost previews and applies one cached multi-team plan with a backup", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "team-boost-v080-")), copy = path.join(directory, "DYNASTY-LSUTESTSAVEPRESZN"); fs.copyFileSync(savePath, copy); const reports = new ReportService(path.join(directory, "reports"));
  const preview = await runTeamBoost({ savePath: copy, schemaPath, reports, mode: "preview", options: { teams: ["Air Force", "Alabama"], minimum: 1, maximum: 1, ratingMode: "physical", seed: 808 } });
  assert.equal(preview.summary.find(item => item.label === "Teams selected").value, 2); assert.ok(preview.planId); assert.ok(preview.details.changes.every(change => ["Air Force", "Alabama"].includes(change.team)));
  const applied = await runTeamBoost({ savePath: copy, schemaPath, reports, mode: "apply", options: { planId: preview.planId } });
  assert.equal(applied.status, "completed"); assert.ok(fs.existsSync(applied.backupPath)); assert.ok(fs.existsSync(applied.reportPath));
});
