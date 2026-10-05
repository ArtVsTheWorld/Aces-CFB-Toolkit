import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = file => fs.readFileSync(new URL(file, import.meta.url), "utf8");
function selectorContext() {
  const context = vm.createContext({ localizedPosition: value => value, positionCompare: (a, b) => a.localeCompare(b), escapeHtml: value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]), multiSelectEmptyMeaning: () => "None" });
  vm.runInContext(read("../src/renderer/selectors.js"), context);
  return context;
}
const row = (order, overall) => ({ dataset: { optionOrder: String(order), overall: overall === undefined ? "" : String(overall) } });

test("donor overall ordering is descending, stable on ties, and keeps unknown ratings last", () => {
  const context = selectorContext(), rows = [row(0, 65), row(1, 99), row(2, 80), row(3, 80), row(4), row(5, 0)];
  const sorted = [...rows].sort((a, b) => context.donorRowCompare(a, b, "overall"));
  assert.deepEqual(sorted.map(item => item.dataset.optionOrder), ["1", "2", "3", "0", "5", "4"]);
  const restored = sorted.sort((a, b) => context.donorRowCompare(a, b, "default"));
  assert.deepEqual(restored, rows, "Default restores the original preparation order exactly");
});

test("Shift-click ranges include both endpoints in either direction without changing the input list", () => {
  const context = selectorContext(), values = Array.from({ length: 12 }, (_, index) => String(index));
  assert.deepEqual(Array.from(context.checkboxSelectionRange(values, "0", "9")), values.slice(0, 10));
  assert.deepEqual(Array.from(context.checkboxSelectionRange(values, "9", "0")), values.slice(0, 10));
  assert.deepEqual(Array.from(context.checkboxSelectionRange(values, "4", "4")), ["4"]);
  assert.deepEqual(values, Array.from({ length: 12 }, (_, index) => String(index)));
});

test("range selection only includes displayed values and never reaches a hidden or different-position anchor", () => {
  const context = selectorContext(), visible = ["90", "12", "45", "2"];
  assert.deepEqual(Array.from(context.checkboxSelectionRange(visible, "90", "2")), visible);
  for (const [anchor, target] of [["hidden", "2"], ["90", "hidden"], [null, "90"]]) assert.deepEqual(Array.from(context.checkboxSelectionRange(visible, anchor, target)), []);
});

test("only manual donor checkboxes expose sorting and the optional Shift-click shortcut", () => {
  const context = selectorContext(), values = [{ value: "1", label: "Donor One", position: "WR", overall: 88 }, { value: "2", label: "Donor Two", position: "WR", overall: 65 }], before = structuredClone(values);
  const donorHtml = context.checkboxPicker("equipment-donor-players", "Donors", values, "Choose donors.", ["2"]);
  assert.match(donorHtml, /id="equipment-player-sort"/); assert.match(donorHtml, /Overall \(Highest First\)/);
  assert.match(donorHtml, /data-option-order="0" data-overall="88"/); assert.match(donorHtml, /Shift-click another player/);
  const positions = context.checkboxPicker("equipment-positions", "Positions", ["QB", "WR"], "Leave empty for all.");
  assert.doesNotMatch(positions, /equipment-player-sort|Shift-click/);
  assert.deepEqual(values, before, "Presentation metadata never modifies donor preparation results");
});

test("manual donor sort is presentation-only and the selected tab style overrides secondary button styling", () => {
  const renderer = read("../src/renderer/renderer.js"), css = read("../src/renderer/redesign.css"), runner = read("../src/main/tools/equipment/runner.js");
  assert.match(renderer, /input.id === "tape-team-search" \|\| input.id === "equipment-player-sort"/);
  const equipmentOptions = renderer.slice(renderer.indexOf("function equipmentOptions("), renderer.indexOf("function updateEquipmentScopeStats("));
  assert.doesNotMatch(equipmentOptions, /equipment-player-sort/);
  assert.match(css, /\.experimental-ui \.option-position-tabs \.button\[aria-pressed="true"\] \{ background: var\(--action\)/);
  assert.match(runner, /overall: player.overall, label:/);
});

test("top bar and footer both display the existing bootstrap app version", () => {
  const index = read("../src/renderer/index.html"), renderer = read("../src/renderer/renderer.js");
  assert.match(index, /<header class="topbar">[\s\S]*id="topbar-app-version"/);
  assert.match(renderer, /querySelectorAll\("#app-version,#topbar-app-version"\)[^\n]+snapshot.app.version/);
  assert.equal(JSON.parse(read("../package.json")).version, "19.0.0", "The current packaged release version");
});
