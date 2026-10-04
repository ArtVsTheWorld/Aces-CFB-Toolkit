import test from "node:test";
import assert from "node:assert/strict";
import { patchTeamRatings as originalPatch, validateBoostRange as originalValidate, weightsForPlayer as originalWeights } from "./legacy-reference/ratings/teamBoost.js";
import { patchTeamRatings as guiPatch, validateBoostRange as guiValidate, weightsForPlayer as guiWeights } from "../src/main/tools/teamBoost/core.js";

const player = (teamIndex = 7) => ({ TeamIndex: teamIndex, Position: "CB", PlayerType: "CB_MantoMan", FirstName: "Test", LastName: "Corner", OverallRating: 80, SpeedRating: 80, StrengthRating: 70, AgilityRating: 80, AccelerationRating: 80, ChangeOfDirectionRating: 80, JumpingRating: 80, AwarenessRating: 75, TackleRating: 65, HitPowerRating: 60, PursuitRating: 65, PlayRecognitionRating: 70, ManCoverageRating: 78, ZoneCoverageRating: 70, PressRating: 76, CatchingRating: 65, KickReturnRating: 60, StaminaRating: 85, InjuryRating: 85, ToughnessRating: 80 });

for (const scenario of [
  { minimum: 1, maximum: 3, mode: "nonphysical", seed: 1 },
  { minimum: 2, maximum: 2, mode: "physical", seed: 42 },
  { minimum: -5, maximum: -1, mode: "all", seed: 0xffffffff },
  { minimum: -2, maximum: 4, mode: "nonphysical", seed: 0 }
]) test(`Team Boost matches CLI core: ${JSON.stringify(scenario)}`, () => {
  const originalRecords = [player(), player(8)]; const guiRecords = [player(), player(8)];
  const original = originalPatch(originalRecords, { teamIndex: 7, ...scenario, apply: true }); const gui = guiPatch(guiRecords, { teamIndex: 7, ...scenario, apply: true });
  const compact = result => result.ratingChanges.map(({ row, field, label, weight, oldRating, newRating, delta }) => ({ row, field, label, weight, oldRating, newRating, delta }));
  assert.deepEqual(compact(gui), compact(original)); assert.deepEqual(guiRecords, originalRecords);
});

test("Team Boost copied weight data and validation remain identical", () => {
  assert.deepEqual(guiWeights(player()), originalWeights(player()));
  for (const range of [[1, 3], [-99, 99], [4, 2], [-100, 2]]) assert.equal(guiValidate(...range), originalValidate(...range));
});
