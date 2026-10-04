import test from "node:test";
import assert from "node:assert/strict";
import { categories, tools } from "../src/shared/toolRegistry.js";

test("registry contains ten registered tools in valid categories", () => {
  assert.equal(tools.length, 10); assert.equal(new Set(tools.map(tool => tool.id)).size, 10);
  assert.ok(tools.every(tool => categories.some(category => category.id === tool.category)));
  assert.deepEqual(tools.filter(tool => tool.status === "available").map(tool => tool.id), ["nil-toggle", "jersey-renumber", "jersey-no-duplicates", "commentary-id", "freshman-equipment", "equipment-patcher", "long-snap", "team-boost", "dealbreaker-fixer", "automatic-force-win"]);
});

test("every registered tool declares active-save compatibility and version", () => {
  assert.ok(tools.every(tool => tool.input?.mode && typeof tool.input.required === "boolean" && tool.version));
});
