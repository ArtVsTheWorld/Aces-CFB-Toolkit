import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { tools } from "../src/shared/toolRegistry.js";

const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
const localization = fs.readFileSync(new URL("../src/shared/localization.js", import.meta.url), "utf8");

test("v0.7 appearance navigation order, icon tokens, and recommendation are correct", () => {
  const appearance = tools.filter(tool => tool.category === "appearance" && !tool.hidden);
  assert.deepEqual(appearance.map(tool => tool.id), ["jersey-renumber", "commentary-id", "freshman-equipment", "equipment-patcher"]);
  assert.deepEqual(appearance.map(tool => tool.icon), ["#", "microphone", "shuffle", "shoulder-pads"]);
  assert.equal(tools.find(tool => tool.id === "automatic-force-win").icon, "referee");
  assert.match(tools.find(tool => tool.id === "equipment-patcher").description, /recommended after running Equipment Randomizer/);
});

test("random seed controls and help text are removed", () => {
  for (const id of ["equipment-seed", "force-seed", "db-seed"]) assert.doesNotMatch(renderer, new RegExp(`id="${id}"`));
  assert.doesNotMatch(renderer, /Random Seed|Reproducibility/);
});

test("position localization uses LEDG, REDG, MIKE, WILL, and SAM without LEDGE", () => {
  for (const label of ["LEDG", "REDG", "MIKE", "WILL", "SAM"]) assert.match(localization, new RegExp(label));
  assert.doesNotMatch(renderer, /LEDGE/); assert.doesNotMatch(localization, /LEDGE/);
});

test("Dealbreaker UI exposes exact totals, reset, invalid-style cleanup, and bounded review", () => {
  assert.match(renderer, /Base Distribution/); assert.match(renderer, /db-total/); assert.match(renderer, /Reset to Defaults/); assert.match(renderer, /Fix invalid Playing Style assignments/); assert.match(renderer, /total exactly 100%/); assert.match(renderer, /full result remains available in the generated report/);
});
