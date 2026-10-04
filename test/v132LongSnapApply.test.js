import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { tools } from "../src/shared/toolRegistry.js";

test("generic cached Preview and Apply lifecycle includes Long Snap Fixer", () => {
  const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
  assert.match(renderer, /genericPreviews: new Map\(\)/);
  assert.match(renderer, /previous = state\.genericPreviews\.get\(toolId\)/);
  assert.match(renderer, /mode === "apply" \? \{ planId: previous\?\.planId \} : collectOptions\(toolId\)/);
  assert.match(renderer, /if \(mode === "preview"\) state\.genericPreviews\.set\(toolId, result\); else \{ state\.genericPreviews\.delete\(toolId\)/);
  assert.match(renderer, /document\.querySelector\("#apply"\)\.disabled = !state\.genericPreviews\.has\(toolId\)/);
  assert.equal(tools.find(tool => tool.id === "long-snap").version, "1.2");
});

test("changing Active Save or resetting defaults invalidates generic cached plans", () => {
  const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
  assert.ok(renderer.match(/state\.genericPreviews\.clear\(\)/g)?.length >= 2);
});
