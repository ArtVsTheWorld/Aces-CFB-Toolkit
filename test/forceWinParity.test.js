import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findNextActionableWeek, inSelectedScope } from "../src/main/tools/forceWin/core/scheduleProcessor.js";
import { createRandom, probabilityForDisparity } from "../src/main/tools/forceWin/core/probabilityEngine.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const originalCore = path.resolve(here, "legacy-reference/forceWin");
const migratedCore = path.resolve(here, "../src/main/tools/forceWin/core");
const modules = ["diagnostics.js", "disparityCalculator.js", "favoriteExplanation.js", "modelProfiles.js", "protections.js"];

test("unchanged Automatic Force Win core modules remain text-identical to the reference CLI", () => {
  for (const module of modules) assert.equal(fs.readFileSync(path.join(migratedCore, module), "utf8").trimEnd(), fs.readFileSync(path.join(originalCore, module), "utf8").trimEnd(), module);
});

test("Automatic Force Win preserves week guards and deterministic probability behavior", () => {
  const schema = { game: { season: "season", week: "week", weekType: "weekType", status: "status", regularSeasonType: "RegularSeason", unplayedStatus: "Unplayed" } };
  const context = { currentSeasonRecord: 2026, currentWeek: 7 };
  const game = week => ({ season: 2026, week, weekType: "RegularSeason", status: "Unplayed" });
  assert.equal(inSelectedScope(game(0), context, "regular", null, schema), false);
  assert.equal(inSelectedScope(game(7), context, "regular", null, schema), false);
  assert.equal(findNextActionableWeek([game(7), game(8)], context, schema), 8);
  const first = createRandom("parity-seed"), second = createRandom("parity-seed");
  assert.deepEqual([first(), first(), first()], [second(), second(), second()]);
  assert.equal(probabilityForDisparity(100), 0.999);
});
