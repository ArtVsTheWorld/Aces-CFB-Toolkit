import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const source = fs.readFileSync(new URL("../src/renderer/configuration.js", import.meta.url), "utf8");
function context() {
  const result = vm.createContext({ Event, multiSelectEmptyMeaning: id => /included|positions|classes/.test(id) ? "All" : "None" });
  vm.runInContext(source, result); return result;
}
function root(controls = {}, numbers = [], groups = {}) {
  return { querySelector: selector => controls[selector.match(/data-config-original="([^"]+)"/)?.[1] ?? selector.slice(1)] ?? null, querySelectorAll: selector => selector === 'input[type="number"]' ? numbers : groups[selector] ?? [] };
}
function input(id, value = "", options = {}) {
  return { id, value, type: "number", tagName: "INPUT", disabled: false, defaultValue: options.defaultValue ?? value, closest: () => null, hasAttribute: name => name === "value" && Boolean(options.required), checkValidity: () => value === "" || Number.isFinite(Number(value)) && Number(value) >= (options.min ?? 0) && Number(value) <= (options.max ?? 100) && (options.decimal || Number.isInteger(Number(value))), ...options };
}
function select(id, values, chosen = []) {
  const options = values.map(value => ({ value, textContent: value, selected: chosen.includes(value), defaultSelected: false }));
  return { id, tagName: "SELECT", type: "select-multiple", multiple: true, options, get selectedOptions() { return options.filter(option => option.selected); } };
}

test("configuration values round-trip booleans, strings and checkbox-backed selection arrays", () => {
  const ui = context(), control = select("equipment-included", ["A", "B"], ["A"]);
  ui.setConfigurationValue(control, ["B"]); assert.deepEqual([...ui.configurationValue(control)], ["B"]);
  const toggle = { type: "checkbox", checked: false }; ui.setConfigurationValue(toggle, true); assert.equal(ui.configurationValue(toggle), true);
  const hidden = { type: "hidden", value: "null" }; ui.setConfigurationValue(hidden, '{"custom":true}'); assert.equal(ui.configurationValue(hidden), '{"custom":true}');
});
test("legacy Team Boost team-search select is a configuration value, not a transient search box", () => {
  const ui = context(), team = select("team-search", ["LSU"]), search = { id: "tape-team-search", tagName: "INPUT", type: "search" };
  assert.deepEqual([...ui.configurationControls({ querySelectorAll: () => [team, search] })], [team]);
});
test("feature defaults come from original defaults rather than the current modified settings", () => {
  const ui = context(), teams = select("teams", ["A", "B"], ["B"]); teams.options[0].defaultSelected = true;
  const control = input("cap", "88", { defaultValue: "33" }), toggle = { id: "skip", type: "checkbox", checked: false, defaultChecked: true };
  const defaults = ui.configurationDefaults({ querySelectorAll: () => [teams, control, toggle] });
  assert.deepEqual([...defaults.teams], ["A"]); assert.equal(defaults.cap, "33"); assert.equal(defaults.skip, true);
});
test("empty scope and exclusion summaries retain distinct meanings", () => {
  const ui = context(); assert.equal(ui.configurationSelectionSummary(select("equipment-included", ["A"])), "All allowed");
  assert.equal(ui.configurationSelectionSummary(select("jersey-skipped", ["A"])), "None selected");
  assert.equal(ui.configurationSelectionSummary(select("team-search", ["A"]), "Choose teams"), "Choose teams");
});
test("selection summaries are bounded but retain accurate counts", () => {
  const ui = context(), values = ["A", "B", "C", "D", "E"];
  assert.equal(ui.configurationSelectionSummary(select("positions", values, values)), "5 of 5 selected · A, B, C +2 more");
});
test("batch commit updates every value before observers see a change", () => {
  const ui = context(), first = input("first", "10"), second = input("second", "20"), draft = root({ first: input("first", "30"), second: input("second", "40") }), events = [];
  for (const control of [first, second]) control.dispatchEvent = event => { assert.equal(event.type, "change"); assert.equal(first.value, "30"); assert.equal(second.value, "40"); events.push(control.id); };
  let closed = false;
  assert.equal(ui.commitConfigurationDraft([first, second], draft, { first: "10", second: "20" }, () => closed = true), 2);
  assert.equal(closed, true); assert.deepEqual(events, ["first", "second"]);
});
test("saving an unchanged draft emits no changes and preserves cached previews", () => {
  const ui = context(), control = input("value", "10"); control.dispatchEvent = () => assert.fail("Unchanged settings must not invalidate Preview");
  assert.equal(ui.commitConfigurationDraft([control], root({ value: input("value", "10") }), { value: "10" }, () => {}), 0);
});
test("OVR ranges allow blank bounds but reject an inverted range", () => {
  const ui = context();
  assert.equal(ui.validateConfigurationDraft(root({ "equipment-min": input("min"), "equipment-max": input("max") }), {}), "");
  assert.match(ui.validateConfigurationDraft(root({ "equipment-min": input("min", "90"), "equipment-max": input("max", "60") }), {}), /Minimum Overall/);
});
test("percentage editors reject fractional whole-only values and out-of-range numbers", () => {
  const ui = context();
  for (const value of ["70.5", "101", "-1", "bad", ""]) assert.match(ui.validateConfigurationDraft(root({}, [input("percent", value, { required: true })]), {}), /numbers/);
  assert.equal(ui.validateConfigurationDraft(root({}, [input("percent", "70")]), {}), "");
});
test("mixing chance total is bounded, and selected donor mode requires a donor", () => {
  const ui = context();
  assert.match(ui.validateConfigurationDraft(root({ "equipment-cross-percent": input("cross", "80"), "equipment-multiple-percent": input("multi", "30") }), {}), /no more than 100/);
  assert.match(ui.validateConfigurationDraft(root({ "equipment-donor-mode": { value: "selected" }, "equipment-donor-players": select("donors", ["A"]) }), {}), /at least one donor/);
});
test("accessory totals validate only when the weighted theme is active", () => {
  const ui = context(), weights = [input("white", "60"), input("black", "20")];
  assert.match(ui.validateConfigurationDraft(root({ "unlocked-color-theme": { value: "weighted" } }, [], { "[data-accessory-color]": weights }), {}), /total 100/);
  assert.equal(ui.validateConfigurationDraft(root({ "unlocked-color-theme": { value: "black" } }, [], { "[data-accessory-color]": weights }), {}), "");
});
test("dealbreaker mix preserves decimal precision and enforces its exact total", () => {
  const ui = context(), controls = { "db-total": {} };
  assert.equal(ui.validateConfigurationDraft(root(controls, [], { ".db-percent": [input("a", "55.5"), input("b", "44.5")] }), {}), "");
  assert.match(ui.validateConfigurationDraft(root(controls, [], { ".db-percent": [input("a", "99.9")] }), {}), /exactly 100/);
});
test("configuration windows are outside tool forms, drafts have separate IDs, and nested windows are guarded", () => {
  assert.match(source, /document\.body\.append\(dialog\)/); assert.match(source, /source\.cloneNode\(true\)/);
  assert.match(source, /node\.id = prefix \+ attribute\.value/); assert.match(source, /node\.dataset\.presetControl = ""/);
  assert.match(source, /dialog\.configuration-dialog\[open\]/); assert.match(source, /opener\.focus\(\{ preventScroll: true \}\)/);
});
test("all moved controls remain canonical and UI modules load before the renderer", () => {
  const index = fs.readFileSync(new URL("../src/renderer/index.html", import.meta.url), "utf8");
  assert.ok(index.indexOf('src="configuration.js"') < index.indexOf('src="helmets.js"'));
  assert.ok(index.indexOf('src="helmets.js"') < index.indexOf('src="renderer.js"'));
  for (const title of ["Player Filters", "Donor Settings", "Mouthpiece Settings", "Colors & Tape", "Tattoo Settings", "Starting Dealbreaker Mix", "Player Scope"]) assert.ok(source.includes(title));
  assert.match(source, /element\.before\(entry, source\); source\.append\(element\)/);
});
test("artwork management explicitly preserves immediate personal-setting persistence", () => {
  assert.match(source, /Uploads and Use Default are saved immediately/); assert.match(source, /immediate: true/);
  assert.match(source, /data-artwork-team-choice/);
});

test("rollback restores a source snapshot and first protects all newer work", t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "cfb-ui-rollback-test-"));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  fs.mkdirSync(path.join(temporary, "scripts")); fs.mkdirSync(path.join(temporary, "src"));
  const script = path.join(temporary, "scripts/ui-snapshot.mjs");
  fs.copyFileSync(new URL("../scripts/ui-snapshot.mjs", import.meta.url), script);
  fs.writeFileSync(path.join(temporary, "package.json"), '{"version":"19.0.0"}');
  const file = path.join(temporary, "src/example.js"); fs.writeFileSync(file, "original UI");
  const run = (...args) => { const result = spawnSync(process.execPath, [script, ...args], { cwd: temporary, encoding: "utf8" }); assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout); };
  const snapshot = run("create"); assert.equal(run("verify", snapshot.snapshot).verifiedFiles, 3);
  fs.writeFileSync(file, "new UI"); fs.writeFileSync(path.join(temporary, "src/addition.js"), "new extra file");
  const restored = run("restore", snapshot.snapshot);
  assert.equal(fs.readFileSync(file, "utf8"), "original UI");
  assert.equal(fs.readFileSync(path.join(temporary, "src/addition.js"), "utf8"), "new extra file");
  assert.equal(fs.readFileSync(path.join(restored.newerWorkSavedTo, "files/src/example.js"), "utf8"), "new UI");
});
test("rollback checksums reject damaged snapshots before any restoration", t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "cfb-ui-rollback-invalid-"));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  fs.mkdirSync(path.join(temporary, "scripts"));
  const script = path.join(temporary, "scripts/ui-snapshot.mjs"); fs.copyFileSync(new URL("../scripts/ui-snapshot.mjs", import.meta.url), script);
  fs.writeFileSync(path.join(temporary, "package.json"), '{"version":"19.0.0"}');
  const created = spawnSync(process.execPath, [script, "create"], { cwd: temporary, encoding: "utf8" }); assert.equal(created.status, 0);
  const snapshot = JSON.parse(created.stdout).snapshot;
  fs.writeFileSync(path.join(snapshot, "files/package.json"), "damaged");
  const restored = spawnSync(process.execPath, [script, "restore", snapshot], { cwd: temporary, encoding: "utf8" });
  assert.notEqual(restored.status, 0); assert.match(restored.stderr, /checksum mismatch/);
  assert.equal(fs.readFileSync(path.join(temporary, "package.json"), "utf8"), '{"version":"19.0.0"}');
});
