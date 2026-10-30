import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { tools } from "../src/shared/toolRegistry.js";

const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");

test("every tool title subtext gives short, user-friendly run timing", () => {
  for (const tool of tools.filter(tool=>tool.status==='available')) assert.match(tool.description, /Best run|Run whenever|Run during|recommended after running/i, tool.id);
  assert.match(tools.find(tool => tool.id === "team-boost").description, /Best run after training results, but it can be run anytime/);
  assert.equal(tools.find(tool => tool.id === "long-snap").status, "maintenance");
  assert.match(tools.find(tool => tool.id === "long-snap").description, /Temporarily disabled.*field-goal accuracy/);
  assert.match(tools.find(tool => tool.id === "automatic-force-win").description, /Best run in Week 0\.$/);
});

test("asynchronous tool loading panels are gated behind an Active Save", () => {
  for (const message of ["Reading teams and equipment filters…", "Preparing dealbreaker settings…", "Reading season and schedule context…"]) assert.match(renderer, new RegExp(`if \\(!state\\.activeSave\\?\\.exists\\)[\\s\\S]{0,500}return;[\\s\\S]{0,250}${message.replace("…", "…")}`));
  assert.match(renderer, /Choose a manual Dynasty save to load the season and schedule/);
});

test("Help recommends Team Boost and explains the Long Snap maintenance pause", () => {
  assert.match(renderer, /Team Boost is recommended after training results, but can technically be run anytime/);
  assert.match(renderer, /A reported game issue links nonzero Long Snap ratings to field-goal accuracy/);
});
