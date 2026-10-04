import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import FORCE_WIN_CONFIG from "../src/main/tools/forceWin/core/config.js";
import { userControlledTeamNames } from "../src/main/tools/forceWin/runner.js";
import { normalizeEquipmentOptions } from "../src/main/tools/equipment/runner.js";
import { HELMET_FAMILY_DISTRIBUTION_LABEL, SOCK_DISTRIBUTION_LABEL } from "../src/main/tools/equipment/core/globalFixes.js";
import { normalizeMouthpieceColor, TEAM_PRIMARY_MOUTHGUARD, TEAM_SECONDARY_MOUTHGUARD } from "../src/main/tools/equipment/core/patcher.js";
import { patchTeamRatings, weightsForPlayer } from "../src/main/tools/teamBoost/core.js";
import { completePlan, searchPlanRows, storePlan } from "../src/main/tools/jersey/planStore.js";

function boostPlayer(team, position, overall, firstName, playerType) {
  const record = { TeamIndex: team, Position: position, PlayerType: playerType, OverallRating: overall, FirstName: firstName, LastName: "Scope" };
  for (const field of Object.keys(weightsForPlayer(record) ?? {})) record[field] = 70;
  return record;
}

test("verified MGUARDSOURCE team-color mouthguard values are used", () => {
  assert.equal(TEAM_PRIMARY_MOUTHGUARD, "GearMouthpiece_PacifierDualHanging_TeamColor"); // Colorado WR Adrian Hales
  assert.equal(TEAM_SECONDARY_MOUTHGUARD, "GearMouthpiece_PacifierDualHanging_SecondaryColor"); // Penn State WR Alex Clem
  assert.equal(normalizeMouthpieceColor("GearMouthpiece_PacifierDualHanging_White", "Primary"), TEAM_PRIMARY_MOUTHGUARD);
  assert.equal(normalizeMouthpieceColor("GearMouthpiece_PacifierDualHanging_Black", "Secondary"), TEAM_SECONDARY_MOUTHGUARD);
});

test("Randomizer defaults to true freshmen while explicit empty selections are unrestricted", () => {
  const defaults = normalizeEquipmentOptions({ seed: 9 }, true);
  assert.equal(defaults.top, 50);
  assert.deepEqual(defaults.classes, ["Freshman"]);
  assert.deepEqual(defaults.redshirtStatuses, ["Eligible", "Current"]);
  const cleared = normalizeEquipmentOptions({ seed: 9, classes: [], redshirtStatuses: [], positions: [], includedTeams: [], excludedTeams: [] }, true);
  assert.deepEqual(cleared.classes, []);
  assert.deepEqual(cleared.redshirtStatuses, []);
  assert.deepEqual(cleared.positions, []);
});

test("Patcher descriptions expose the exact coded sock and helmet-family weights", () => {
  assert.equal(SOCK_DISTRIBUTION_LABEL, "Mid socks become low socks 85%, high socks 14%, or under socks 1%. Mid socks are retained when spats are worn on both feet.");
  assert.equal(HELMET_FAMILY_DISTRIBUTION_LABEL, "Replacement helmets use SpeedFlex 70%, Axiom 10%, Schutt F7 10%, and Schutt F7 Pro 10%.");
});

test("Team Boost position-room scopes use independent team and exact-position averages", () => {
  const records = [
    boostPlayer(1, "WR", 70, "BelowOne", "WR_Physical"), boostPlayer(1, "WR", 80, "EqualOne", "WR_Physical"), boostPlayer(1, "WR", 90, "AboveOne", "WR_Physical"),
    boostPlayer(2, "WR", 60, "BelowTwo", "WR_Physical"), boostPlayer(2, "WR", 100, "AboveTwo", "WR_Physical"),
    boostPlayer(1, "TE", 75, "OnlyTightEnd", "TE_VerticalThreat"),
    boostPlayer(1, "LE", 60, "BelowLeftEdge", "DE_PowerRusher"), boostPlayer(1, "LE", 80, "AboveLeftEdge", "DE_PowerRusher"),
    boostPlayer(1, "RE", 50, "OnlyRightEdge", "DE_PowerRusher")
  ];
  const below = patchTeamRatings(records, { teamIndexes: [1, 2], playerScope: "below-average", minimum: -1, maximum: -1, mode: "all", seed: 4 });
  assert.deepEqual(new Set(below.players.map(item => item.record.FirstName)), new Set(["BelowOne", "BelowTwo", "BelowLeftEdge"]));
  assert.ok(below.ratingChanges.every(change => change.delta < 0));
  const above = patchTeamRatings(records, { teamIndexes: [1, 2], playerScope: "above-average", minimum: 1, maximum: 1, mode: "all", seed: 4 });
  assert.deepEqual(new Set(above.players.map(item => item.record.FirstName)), new Set(["AboveOne", "AboveTwo", "AboveLeftEdge"]));
  assert.equal(above.players.some(item => ["EqualOne", "OnlyTightEnd", "OnlyRightEdge"].includes(item.record.FirstName)), false);
});

test("Force Win detects all user-controlled teams and defaults FCS disparity to 2.5", () => {
  const teams = [{ teamIndex: 1, name: "Alpha" }, { teamIndex: 2, name: "Beta" }, { teamIndex: 3, name: "Gamma" }];
  const records = [{ TeamIndex: 1, UserCharacter: "00000000000000000000000000000000" }, { TeamIndex: 2, UserCharacter: "00000000000000000000000000000001" }, { TeamIndex: 3, UserCharacter: "00100000000000000000000000000000" }];
  assert.deepEqual(userControlledTeamNames(records, teams), ["Beta", "Gamma"]);
  assert.equal(FORCE_WIN_CONFIG.fcs.disparityMultiplier, 2.5);
});

test("cached preview search finds rows beyond the normal first 1,000", () => {
  const previewRows = Array.from({ length: 1501 }, (_, index) => ({ team: index === 1250 ? "Ohio State" : `Team ${String(index).padStart(4, "0")}`, player: `Player ${index}` }));
  const planId = storePlan({ previewRows, result: { details: { changes: previewRows.slice(0, 1000) } } });
  const searched = searchPlanRows(planId, "Ohio State");
  assert.equal(searched.totalMatches, 1);
  assert.equal(searched.changes[0].team, "Ohio State");
  const cleared = searchPlanRows(planId, "");
  assert.equal(cleared.changes.length, 1000);
  assert.equal(cleared.totalPreviewRows, 1501);
  completePlan(planId);
});

test("v0.9 UI keeps new defaults, scope controls, and backend search", () => {
  const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
  const main = fs.readFileSync(new URL("../src/main/main.js", import.meta.url), "utf8");
  assert.doesNotMatch(renderer, /\bBeta\b/);
  assert.match(renderer, /id="equipment-top"[^>]+value="50"/);
  assert.match(renderer, /equipment-redshirt-group/);
  assert.match(renderer, /Below Position-Room Average/);
  assert.match(renderer, /Playing Style \(RB, WR, TE only\)/);
  assert.match(renderer, /User-controlled teams are selected by default/);
  assert.match(renderer, /searchPreview/);
  assert.match(main, /IPC\.searchPreview/);
});
