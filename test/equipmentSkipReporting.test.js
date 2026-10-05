import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import semver from "semver";
import { equipmentSkipReporting, modAddedFcsPlayerRows } from "../src/main/tools/equipment/skipReporting.js";
import { displayAppVersion } from "../src/shared/appVersion.js";
const ref = (table, row) => table.toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
function fixture() {
  const players = { header: { tableId: 20 }, records: Array.from({ length: 9 }, () => ({ isEmpty: false, TeamIndex: 255 })) };
  const rosters = { header: { tableId: 21 }, records: Array.from({ length: 8 }, (_, row) => ({ isEmpty: false, arraySize: 1, Player0: ref(20, row) })) };
  const teams = { records: [
    { isEmpty: false, TeamIndex: 12, Roster: ref(21, 0), DisplayName: "Custom FBS" },
    ...["FCSE", "FCSMW", "FCSNW", "FCSSE", "FCSW"].map((asset, row) => ({ isEmpty: false, TeamIndex: 255, AssetName: asset, Roster: ref(21, row + 1), DisplayName: `Renamed directional ${row}` })),
    ...[6, 7].map(row => ({ isEmpty: false, TeamIndex: 255, AssetName: `CUSTOM${row}`, Roster: ref(21, row), DisplayName: `Any name ${row}` }))
  ] };
  return { players, teams, rosters };
}
test("expanded non-FBS roster classification preserves FBS and vanilla directional FCS players regardless of names", () => {
  const data = fixture(); assert.deepEqual([...modAddedFcsPlayerRows(data.players, data.teams, data.rosters)], [6, 7]);
  data.teams.records[6].DisplayName = "Alabama";
  assert.deepEqual([...modAddedFcsPlayerRows(data.players, data.teams, data.rosters)], [6, 7], "Names cannot drive classification");
});
test("normal five-FCS structure, unknown membership and overlapping FBS membership stay visible", () => {
  const data = fixture(); data.rosters.records[0].arraySize = 2; data.rosters.records[0].Player1 = ref(20, 6);
  assert.deepEqual([...modAddedFcsPlayerRows(data.players, data.teams, data.rosters)], [7]);
  assert.equal(modAddedFcsPlayerRows(data.players, { records: data.teams.records.slice(0, 6) }, data.rosters).size, 0);
  assert.equal(modAddedFcsPlayerRows(data.players, data.teams, { records: [] }).size, 0);
});
test("skipped totals separate mod-FCS information while retaining every diagnostic reason and player", () => {
  const skipped = [{ row: 0, reason: "shared", firstName: "A", lastName: "B" }, { row: 6, reason: "shared" }, { row: 7, reason: "empty" }], original = structuredClone(skipped);
  const result = equipmentSkipReporting(skipped, new Set([6, 7]));
  assert.equal(result.skipped, 3); assert.equal(result.reportedSkipped, 1); assert.equal(result.modFcsSkipped, 2);
  assert.deepEqual(result.skippedReasons, { shared: 2, empty: 1 }); assert.deepEqual(result.reportedSkippedReasons, { shared: 1 });
  assert.deepEqual(result.modFcsSkippedReasons, { shared: 1, empty: 1 }); assert.equal(result.skippedPlayers.length, 3);
  assert.deepEqual(skipped, original, "Reporting never changes the algorithm's results");
});
const source = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
const notice = source.split(/\r?\n/).find(line => line.startsWith("function equipmentSkippedNotice"));
const render = vm.runInNewContext(`(${notice})`, { escapeHtml: value => String(value) });
test("mod-only skipped rows use a collapsed informational note without an empty warning", () => {
  const html = render({ resultKind: "freshman-equipment", details: { skipped: 3, reportedSkipped: 0, modFcsSkipped: 3, modFcsSkippedReasons: { shared: 3 } } });
  assert.match(html, /<details/); assert.match(html, /Mod-added FCS players left unchanged: 3/); assert.doesNotMatch(html, /Why eligible players/);
});
test("mixed warnings and previously saved run reviews remain supported", () => {
  const html = render({ resultKind: "freshman-equipment", details: { skipped: 4, reportedSkipped: 1, reportedSkippedReasons: { invalid: 1 }, modFcsSkipped: 3 } });
  assert.match(html, /1 — invalid/); assert.doesNotMatch(html, /4 —/);
  assert.match(render({ resultKind: "freshman-equipment", details: { skipped: 1, skippedReasons: { shared: 1 } } }), /1 — shared/);
});
test("current display keeps valid installer SemVer and updates correctly from v0.18.3", () => {
  const version = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url))).version;
  assert.equal(version, "19.0.0"); assert.ok(semver.gt(version, "18.3.0"));
  assert.equal(displayAppVersion(version), "19.0"); assert.equal(displayAppVersion("18.3.1"), "18.3.1");
  assert.equal(displayAppVersion("18.4.0-beta.1"), "18.4-beta.1");
});
