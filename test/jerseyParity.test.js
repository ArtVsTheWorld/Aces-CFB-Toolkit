import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { runRenumberEngine as originalStandard } from "./legacy-reference/jersey/renumberEngine.js";
import { runNoDuplicatesRoster as originalNoDuplicates } from "./legacy-reference/jersey/noDuplicatesEngine.js";
import { runRenumberEngine as desktopStandard } from "../src/main/tools/jersey/core/renumberEngine.js";
import { runNoDuplicatesRoster as desktopNoDuplicates } from "../src/main/tools/jersey/core/noDuplicatesEngine.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const originalLib = path.resolve(here, "legacy-reference/jersey");
const desktopCore = path.resolve(here, "../src/main/tools/jersey/core");
const coreFiles = ["candidateGenerator.js", "duplicateResolver.js", "logger.js", "nilPolicy.js", "noDuplicatesEngine.js", "numberRules.js", "playerSorter.js", "retiredNumbers.js", "rules.js", "teamEligibility.js", "teamRules.js", "validator.js"];
const player = (Position, JerseyNum, name, extra = {}) => ({ Position, JerseyNum, FirstName: name, LastName: "Parity", OverallRating: 75, Age: 20, SchoolYear: "Sophomore", RedshirtStatus: "Eligible", IsNIL: false, teamRuleLocked: false, teamReservedNumbers: new Set(), retiredNumbers: new Set(), wasRenumberedThisRun: false, originalJerseyNum: JerseyNum, nilRenumberAllowed: false, ...extra });
const clone = value => value.map(item => ({ ...item, teamReservedNumbers: new Set(item.teamReservedNumbers), retiredNumbers: new Set(item.retiredNumbers) }));
const snapshot = roster => roster.map(item => ({ name: item.FirstName, number: item.JerseyNum })).sort((a, b) => a.name.localeCompare(b.name));

test("unchanged Jersey core remains standalone-identical except the requested LEDG display localization", () => { const text = file => fs.readFileSync(file, "utf8").replaceAll("\r\n", "\n").trimEnd(); for (const name of coreFiles) { const expected = text(path.join(originalLib, name)).replaceAll('LE: "LEDGE"', 'LE: "LEDG"'); assert.equal(text(path.join(desktopCore, name)), expected, name); } });

test("standard mode matches CLI for collisions, NIL protection, promotions, and fallback pressure", () => {
  const fixture = [player("QB", 7, "Quarterback", { OverallRating: 92 }), player("WR", 7, "Receiver", { OverallRating: 88 }), player("WR", 80, "Veteran", { OverallRating: 95, SchoolYear: "Senior", RedshirtStatus: "Previous" }), player("TE", 99, "Illegal", { OverallRating: 84 }), player("WR", 1, "Protected", { IsNIL: true, OverallRating: 99 })];
  const left = clone(fixture), right = clone(fixture); const options = { enableTeamRules: false, enableRetiredNumbers: false, enablePromotions: true, random: () => 0 };
  const silent = operation => { const log = console.log; console.log = () => {}; try { return operation(); } finally { console.log = log; } };
  const originalResult = silent(() => originalStandard(new Map([[1, { offense: left, defense: [], specialists: [] }]]), new Map([[1, "Test Team"]]), options));
  const desktopResult = silent(() => desktopStandard(new Map([[1, { offense: right, defense: [], specialists: [] }]]), new Map([[1, "Test Team"]]), options));
  assert.deepEqual(desktopResult, originalResult); assert.deepEqual(snapshot(right), snapshot(left));
});

test("no-duplicates mode matches CLI under duplicate, NIL, QB fallback, and specialist pressure", () => {
  const fixture = [player("QB", 20, "FallbackQB", { OverallRating: 99 }), player("QB", 7, "QB2", { OverallRating: 90 }), player("WR", 7, "Receiver", { OverallRating: 95 }), player("K", 7, "NilKicker", { IsNIL: true }), ...Array.from({ length: 19 }, (_, index) => player("CB", index + 1, `Block${index}`, { OverallRating: 70 - index }))];
  const left = clone(fixture), right = clone(fixture); const options = { enableTeamRules: false, enableRetiredNumbers: false, enablePromotions: false, random: () => 0.5 };
  const originalResult = originalNoDuplicates(left, "Test Team", options); const desktopResult = desktopNoDuplicates(right, "Test Team", options);
  assert.deepEqual(snapshot(right), snapshot(left)); assert.deepEqual({ changes: desktopResult.changes.map(change => [change.player.FirstName, change.oldNumber, change.newNumber, change.reason, change.fallback]), analytics: { qbFallbacks: desktopResult.analytics.qbFallbacks, wrFallbacks: desktopResult.analytics.wrFallbacks } }, { changes: originalResult.changes.map(change => [change.player.FirstName, change.oldNumber, change.newNumber, change.reason, change.fallback]), analytics: { qbFallbacks: originalResult.analytics.qbFallbacks, wrFallbacks: originalResult.analytics.wrFallbacks } });
});

test("no-duplicates preserves CLI failure when a roster exceeds jersey capacity", () => { const roster = Array.from({ length: 101 }, (_, index) => player("WR", index % 100, `Player${index}`)); assert.throws(() => desktopNoDuplicates(clone(roster), "Crowded", {}), /101 rostered players/); assert.throws(() => originalNoDuplicates(clone(roster), "Crowded", {}), /101 rostered players/); });
