import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { tools } from "../src/shared/toolRegistry.js";

const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");

test("every tool title subtext gives short, user-friendly run timing", () => {
  for (const tool of tools) assert.match(tool.description, /Best run|Run whenever|recommended after running/i, tool.id);
  assert.match(tools.find(tool => tool.id === "team-boost").description, /Best run after training results, but it can be run anytime/);
  assert.match(tools.find(tool => tool.id === "long-snap").description, /Best run after training results, but it can be run anytime/);
  assert.match(tools.find(tool => tool.id === "automatic-force-win").description, /Best run in Week 0\.$/);
});

test("asynchronous tool loading panels are gated behind an Active Save", () => {
  for (const message of ["Reading teams and equipment filters…", "Preparing dealbreaker settings…", "Reading season and schedule context…"]) assert.match(renderer, new RegExp(`if \\(!state\\.activeSave\\?\\.exists\\)[\\s\\S]{0,500}return;[\\s\\S]{0,250}${message.replace("…", "…")}`));
  assert.match(renderer, /Choose a manual Dynasty save to load the season and schedule/);
});

test("Help recommends Team Boost and Long Snap Fixer after training results", () => {
  assert.match(renderer, /Team Boost and Long Snap Fixer are recommended after training results, but can technically be run anytime/);
});
