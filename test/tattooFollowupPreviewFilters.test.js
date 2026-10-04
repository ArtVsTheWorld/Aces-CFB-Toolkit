import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { searchPlanRows, storePlan } from "../src/main/tools/jersey/planStore.js";

test("preview dropdown filters search the complete cached plan and combine with text search", () => {
  const rows = Array.from({ length: 1200 }, (_, index) => ({
    team: index === 1199 ? "East Point" : "Alabama",
    position: index === 1199 ? "REDG" : "WR",
    classYear: index === 1199 ? "Sophomore" : "Junior",
    player: index === 1199 ? "Jaron Bowles" : `Player ${index}`
  }));
  const result = { details: { changes: rows.slice(0, 1000) } };
  const id = storePlan({ previewRows: rows, result });
  assert.ok(result.details.previewFacets.team.includes("East Point"));
  assert.ok(result.details.previewFacets.position.includes("REDG"));
  assert.ok(result.details.previewFacets.classYear.includes("Sophomore"));
  const filtered = searchPlanRows(id, "Bowles", 1000, { team: "East Point", position: "REDG", classYear: "Sophomore" });
  assert.equal(filtered.totalMatches, 1);
  assert.equal(filtered.changes[0].player, "Jaron Bowles");
  assert.equal(searchPlanRows(id, "", 1000, { team: "East Point", position: "WR" }).totalMatches, 0);
  assert.equal(searchPlanRows(id, "", 1000, { team: "East Point" }).totalMatches, 1);
});

test("player-tool previews expose applicable dropdowns without changing Smart Force Win filters", () => {
  const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
  assert.match(renderer, /function previewFilterToolbar\(/);
  assert.match(renderer, /\["team", "All teams"\], \["position", "All positions"\], \["classYear", "All class years"\]/);
  assert.match(renderer, /searchPreview\(\{ planId: result\.planId, query, filters \}\)/);
  assert.match(renderer, /function whiteHelmetResults\(/);
  assert.match(renderer, /function bindCommentaryReviewFilters\(/);
  assert.match(renderer, /function bindForceScheduleFilters\(/);
});
