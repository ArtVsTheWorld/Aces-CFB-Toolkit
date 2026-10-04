import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCommentaryMatcher as originalMatcher } from "./legacy-reference/commentary/matcher.js";
import { patchPlayerCommentary as originalPatch } from "./legacy-reference/commentary/patcher.js";
import { loadCommentaryMap as originalLoad } from "./legacy-reference/commentary/map.js";
import { createCommentaryMatcher as guiMatcher } from "../src/main/tools/commentary/matcher.js";
import { patchPlayerCommentary as guiPatch } from "../src/main/tools/commentary/patcher.js";
import { loadCommentaryMap as guiLoad } from "../src/main/tools/commentary/map.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const mapPath = path.resolve(dirname, "../resources/commentary-data/PlayerCommentaryidMap.txt");
const compact = result => ({ summary: result.summary, players: result.players.map(item => ({ row: item.row, firstName: item.firstName, lastName: item.lastName, teamIndex: item.teamIndex, teamName: item.teamName, oldId: item.oldId, newId: item.newId, match: item.match, preserved: item.preserved })), changes: result.changes.map(item => ({ row: item.row, oldId: item.oldId, newId: item.newId, match: item.match, preserved: item.preserved })) });

test("bundled Commentary map parser exactly matches v1.6", () => {
  const original = originalLoad(mapPath); const gui = guiLoad(mapPath); assert.equal(gui.size, 6969); assert.deepEqual([...gui], [...original]);
  assert.equal(gui.get("Wydermyer"), 8598);
  assert.equal(gui.get("David"), 494);
  assert.equal(gui.get("Williams"), 5346);
  assert.equal(gui.get("Coleman-Williams"), 9525);
});

test("Commentary matcher exactly preserves exact, suffix, phonetic, first-name, and none behavior", () => {
  const map = new Map([["Pollack", 3951], ["Ware", 700], ["James", 900]]);
  for (const options of [{ allowPhonetic: false, allowFirstName: true }, { allowPhonetic: true, allowFirstName: true }, { allowPhonetic: true, allowFirstName: false }]) {
    const original = originalMatcher(map, options); const gui = guiMatcher(map, options);
    for (const names of [["X", "Pollack"], ["X", "Pollack Jr."], ["X", "Wear"], ["James", "Unknown"], ["X", "Unknown"]]) assert.deepEqual(gui(...names), original(...names));
  }
});

test("Commentary patcher output and mutation exactly match v1.6 across option branches", () => {
  const map = new Map([["Pollack", 3951], ["Ware", 700], ["James", 900]]); const teams = new Map([[1, "Air Force"]]);
  const fixture = () => [{ TeamIndex: 1, FirstName: "A", LastName: "Pollack", Position: "QB", SchoolYear: "Freshman", RedshirtStatus: "Eligible", IsNIL: false, PLYR_COMMENT: 0 }, { TeamIndex: 1, FirstName: "B", LastName: "Wear", Position: "WR", SchoolYear: "Freshman", RedshirtStatus: "Current", IsNIL: false, PLYR_COMMENT: 2 }, { TeamIndex: 1, FirstName: "James", LastName: "Unknown", Position: "HB", SchoolYear: "Sophomore", RedshirtStatus: "Eligible", IsNIL: false, PLYR_COMMENT: 3 }, { TeamIndex: 1, FirstName: "No", LastName: "Match", Position: "TE", SchoolYear: "Freshman", RedshirtStatus: "Previous", IsNIL: false, PLYR_COMMENT: 4 }, { TeamIndex: 1, FirstName: "Nil", LastName: "Pollack", Position: "CB", SchoolYear: "Freshman", RedshirtStatus: "Eligible", IsNIL: true, PLYR_COMMENT: 5 }, { TeamIndex: 255, FirstName: "Free", LastName: "Pollack", Position: "QB", SchoolYear: "Freshman", RedshirtStatus: "Eligible", IsNIL: false, PLYR_COMMENT: 6 }, { TeamIndex: 1, FirstName: "Omar", LastName: "Omar", Position: "QB", SchoolYear: "Freshman", RedshirtStatus: "Eligible", IsNIL: false, PLYR_COMMENT: 7 }];
  for (const options of [{ allowPhonetic: false, allowFirstName: true, preserveUnmatched: false, freshmenOnly: false }, { allowPhonetic: true, allowFirstName: true, preserveUnmatched: true, freshmenOnly: false }, { allowPhonetic: true, allowFirstName: false, preserveUnmatched: false, freshmenOnly: true }]) { const a = fixture(); const b = fixture(); const original = originalPatch(a, map, { ...options, teamNames: teams, apply: true }); const gui = guiPatch(b, map, { ...options, teamNames: teams, apply: true }); assert.deepEqual(compact(gui), compact(original)); assert.deepEqual(b, a); }
});
