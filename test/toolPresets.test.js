import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { SettingsStore } from "../src/main/services/settings.js";
import { ToolPresets } from "../src/main/services/toolPresets.js";

const configuration = { version: 1, values: { "fix-unlocked-recolor": true, "equipment-min": "60" }, teamSelections: { "equipment-included": ["Georgia"] }, tapeColors: { georgia: { white: 0, black: 100, primary: 0, secondary: 0 } } };
function storeTest(work) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cfb-preset-test-"));
  try { const store = new SettingsStore(path.join(directory, "settings.json")); store.load(); work(store, new ToolPresets(store)); }
  finally { fs.rmSync(directory, { recursive: true, force: true }); }
}
test("named tool presets survive restart and unrelated settings updates without restoring an Active Save", () => storeTest((store, presets) => {
  const saved = presets.save({ toolId: "equipment-patcher", name: "  Preseason  ", configuration });
  assert.equal(saved.name, "Preseason"); assert.deepEqual(saved.configuration, configuration);
  store.update({ theme: "dark", window: { width: 1200, height: 800 } });
  const reopened = new SettingsStore(store.filePath); reopened.load();
  assert.deepEqual(new ToolPresets(reopened).list(), [saved]); assert.equal(reopened.get().activeSave, null);
  const copy = presets.list(); copy[0].configuration.values["equipment-min"] = "0";
  assert.equal(presets.list()[0].configuration.values["equipment-min"], "60");
}));
test("preset replacement and deletion are explicit and tool-scoped", () => storeTest((_store, presets) => {
  const first = presets.save({ toolId: "equipment-patcher", name: "Gear", configuration });
  assert.throws(() => presets.save({ toolId: "equipment-patcher", name: "gear", configuration }), /already exists/);
  const other = presets.save({ toolId: "freshman-equipment", name: "Gear", configuration });
  assert.throws(() => presets.delete({ toolId: "freshman-equipment", id: first.id }), /no longer exists/);
  const updated = presets.save({ toolId: "equipment-patcher", id: first.id, name: "Gear", configuration: { ...configuration, values: { "equipment-min": "75" } } });
  assert.equal(updated.id, first.id); assert.equal(presets.list().length, 2);
  presets.delete({ toolId: "equipment-patcher", id: first.id }); assert.deepEqual(presets.list(), [other]);
}));
test("preset storage rejects invalid names, oversized input, missing records, and unsafe keys", () => storeTest((_store, presets) => {
  for (const name of ["", " ", "x".repeat(81)]) assert.throws(() => presets.save({ toolId: "equipment-patcher", name, configuration }), /name/);
  assert.throws(() => presets.save({ toolId: "equipment-patcher", id: "missing", name: "Gear", configuration }), /no longer exists/);
  assert.throws(() => presets.save({ toolId: "equipment-patcher", name: "Gear", configuration: { ...configuration, values: { note: "x".repeat(250000) } } }), /oversized/);
  assert.throws(() => presets.save({ toolId: "equipment-patcher", name: "Gear", configuration: JSON.parse('{"version":1,"values":{"__proto__":{}}}') }), /Invalid/);
  assert.deepEqual(presets.list(), []);
}));
test("preset team selections and tape mixes load by name, never by stale save row indexes", () => {
  const input = { id: "tape-team-color-99-black", dataset: { tapeTeam: "georgia", tapeColor: "black" } };
  const select = { multiple: true, options: [{ value: "new-save-row-40", textContent: "Georgia" }] };
  const context = vm.createContext({ document: { getElementById: () => select }, content: { querySelectorAll: () => [input] } });
  vm.runInContext(fs.readFileSync(new URL("../src/renderer/presets.js", import.meta.url), "utf8"), context);
  const values = context.presetValues(configuration);
  assert.deepEqual(Array.from(values["equipment-included"]), ["new-save-row-40"]); assert.equal(values[input.id], "100");
  assert.throws(() => context.presetValues({ ...configuration, teamSelections: { "equipment-included": ["Shanks U"] } }), /not in this save/);
  assert.equal(context.presetValues({ ...configuration, tapeColors: { georgia: "black" } })[input.id], "100");
});
