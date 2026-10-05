import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
const registry = fs.readFileSync(new URL("../src/shared/toolRegistry.js", import.meta.url), "utf8");
const main = fs.readFileSync(new URL("../src/main/main.js", import.meta.url), "utf8");

test("v0.6 labels, defaults, consolidated Jersey navigation, and confirmations remain wired", () => {
  assert.match(renderer, /Dynasty Operations Center/);
  assert.match(renderer, /return checkboxPicker/);
  assert.doesNotMatch(renderer, /function logsPage/);
  assert.match(renderer, /# of Donors Per Position/);
  assert.match(renderer, /Select All, then uncheck any teams you want to skip/);
  assert.doesNotMatch(renderer, /Advanced table and map settings/);
  assert.doesNotMatch(renderer, /id="show-all" type="checkbox">/);
  assert.match(renderer, /const pass = \(id, title, description\) => `[^`]+type="checkbox" checked/);
  for (const title of ["Above-Knee Pants", "Improve Helmets and Facemasks", "Rolled-Jersey Undershirts", "Mid-Sock Replacement", "Equipment Compatibility", "Nike Thigh Pads", "Hand Out Visors", "Brand Existing Visors"]) assert.match(renderer, new RegExp(title));
  assert.match(registry, /id: "jersey-no-duplicates"[^\n]+hidden: true/);
  assert.match(main, /filters: \[\{ name: "All files", extensions: \["\*"\] \}/);
});
