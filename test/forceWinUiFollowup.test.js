import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { inSelectedScope, findNextActionableWeek } from "../src/main/tools/forceWin/core/scheduleProcessor.js";
import { availableTeamOptions } from "../src/main/tools/forceWin/core/userTeams.js";
import { normalizeTeam } from "../src/main/tools/forceWin/core/teamRatings.js";

const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../src/renderer/force-win.css", import.meta.url), "utf8");

test("Force Win uses full team names while retaining stable row identities", () => {
  const records = [
    { DisplayName: "E. Michigan", LongName: "Eastern Michigan", TeamIndex: 25 },
    { DisplayName: "C. Carolina", LongName: "Coastal Carolina", TeamIndex: 127 },
    { DisplayName: "W. Michigan", LongName: "Western Michigan", TeamIndex: 111 }
  ];
  assert.deepEqual(availableTeamOptions({ records }).map(team => [team.value, team.label]), [
    ["1", "Coastal Carolina"], ["0", "Eastern Michigan"], ["2", "Western Michigan"]
  ]);
  assert.equal(normalizeTeam(records[0], 0).name, "Eastern Michigan");
});

test("malformed Week 15 placeholder rows are excluded from all evaluation scopes", () => {
  const schema = { game: { season: "season", week: "week", weekType: "weekType", status: "status", regularSeasonType: "RegularSeason", unplayedStatus: "Unplayed" } };
  const context = { currentSeasonRecord: 2026, currentWeek: 0 };
  const game = week => ({ season: 2026, week, weekType: "RegularSeason", status: "Unplayed" });
  assert.equal(inSelectedScope(game(15), context, "regular", null, schema), false);
  assert.equal(inSelectedScope(game(15), context, "week", 15, schema), false);
  assert.equal(findNextActionableWeek([game(15)], context, schema), null);
});

test("Force Win logo aliases, team-picker scroll, filters, and friendly summary are wired", () => {
  assert.match(renderer, /"texasaandm": "TexasAM"/);
  assert.match(renderer, /"ccarolina": "CoastalCarolina"/);
  assert.match(renderer, /"floridainternational": "FIU"/);
  assert.match(renderer, /"southernmississippi": "SouthernMiss"/);
  assert.match(renderer, /TeamBuilderFallback\.png/);
  assert.doesNotMatch(renderer, /Find teams to skip/);
  assert.match(renderer, /select\.scrollTop = 0; requestAnimationFrame/);
  assert.match(renderer, /force-schedule-search/);
  assert.match(renderer, /force-team-filter/);
  assert.match(renderer, /force-outcome-filter/);
  assert.match(renderer, /force-mismatch-filter/);
  assert.match(renderer, /mismatchOrder = \["small", "medium", "high", "extreme"\]/);
  assert.doesNotMatch(renderer, />All weeks</);
  assert.match(renderer, /forceProjectionDetails/);
  assert.match(renderer, /Fair moneyline/);
  assert.match(renderer, /Future Week \(1–14\)/);
  assert.match(styles, /\.force-game\[hidden\], \.force-week\[hidden\] \{ display: none !important; \}/);
  const runner = fs.readFileSync(new URL("../src/main/tools/forceWin/runner.js", import.meta.url), "utf8");
  assert.match(runner, /Force wins: Medium \/ High \/ Extreme/);
});
