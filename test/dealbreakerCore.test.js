import test from "node:test";
import assert from "node:assert/strict";
import { ALLOWED_DEALBREAKERS, CONTEXT_MODIFIERS, DEFAULT_DISTRIBUTION, contextualWeights, normalizeDistribution, patchDealbreakers } from "../src/main/tools/dealbreaker/core.js";

const teams = new Map([[1, "Test Team"]]);
const player = (overrides = {}) => ({ isEmpty: false, FirstName: "Test", LastName: "Player", TeamIndex: 1, Position: "WR", SchoolYear: "Sophomore", RedshirtStatus: "Eligible", Age: 20, OverallRating: 80, RecruitingDealbreaker: "Invalid", ...overrides });
const sequence = values => { let index = 0; return () => values[index++] ?? values.at(-1) ?? 0; };

test("Dealbreaker defaults total exactly 100 percent", () => assert.equal(Object.values(DEFAULT_DISTRIBUTION).reduce((sum, value) => sum + value, 0), 100));
test("None roll retains stored Invalid and the population floor protects a one-player dynasty", () => {
  const retained = patchDealbreakers([player()], { teamNames: teams, distribution: DEFAULT_DISTRIBUTION, random: () => 0 });
  assert.equal(retained.outcomes[0].newValue, "Invalid"); assert.equal(retained.changes.length, 0);
  const protectedResult = patchDealbreakers([player()], { teamNames: teams, distribution: DEFAULT_DISTRIBUTION, random: sequence([0.99, 0]) });
  assert.equal(protectedResult.outcomes[0].newValue, "Invalid"); assert.equal(protectedResult.changes.length, 0); assert.equal(protectedResult.population.floorLimited, true);
});
test("invalid Playing Style is optionally removed and cannot be selected again", () => {
  const bad = player({ Position: "QB", RecruitingDealbreaker: "PlayingStyle" });
  assert.equal(patchDealbreakers([bad], { teamNames: teams, distribution: DEFAULT_DISTRIBUTION, random: () => 0.9 }).outcomes.length, 0);
  const fixed = patchDealbreakers([bad], { teamNames: teams, distribution: DEFAULT_DISTRIBUTION, fixInvalidPlayingStyle: true, random: sequence([0.99, 0.3]) });
  assert.equal(fixed.outcomes.length, 1); assert.notEqual(fixed.outcomes[0].newValue, "PlayingStyle");
});
test("Playing Style remains eligible only for stored RB/HB, TE, and WR positions", () => {
  for (const position of ["RB", "HB", "TE", "WR"]) assert.ok(contextualWeights(player({ Position: position }), DEFAULT_DISTRIBUTION).normalized.PlayingStyle > 0);
  for (const position of ["QB", "C", "CB"]) assert.equal(contextualWeights(player({ Position: position }), DEFAULT_DISTRIBUTION).normalized.PlayingStyle, 0);
});
test("85–89 and 90+ OVR tiers apply the documented multipliers", () => {
  const high = contextualWeights(player({ OverallRating: 87 }), DEFAULT_DISTRIBUTION).weights;
  assert.equal(high.ProPotential, 7 * CONTEXT_MODIFIERS.overall85.ProPotential); assert.equal(high.ChampionshipContender, 16 * 1.35); assert.equal(high.BrandExposure, 10 * 1.25); assert.equal(high.ConferencePrestige, 7 * 1.2);
  const elite = contextualWeights(player({ OverallRating: 94 }), DEFAULT_DISTRIBUTION).weights;
  assert.equal(elite.ProPotential, 7 * 2); assert.equal(elite.ChampionshipContender, 16 * 1.6); assert.equal(elite.BrandExposure, 10 * 1.45); assert.equal(elite.ConferencePrestige, 7 * 1.4);
});
test("low OVR and lower-class modifiers favor style, home proximity, and coach prestige", () => {
  const result = contextualWeights(player({ OverallRating: 70, Position: "WR", SchoolYear: "Freshman" }), DEFAULT_DISTRIBUTION);
  assert.equal(result.weights.PlayingStyle, 5 * 1.5); assert.equal(result.weights.ProximityToHome, 12 * 1.4 * 1.25); assert.equal(result.weights.CoachPrestige, 10 * 1.3);
});
test("junior and senior classes receive the Playing Time modifier", () => {
  for (const SchoolYear of ["Junior", "Senior"]) assert.equal(contextualWeights(player({ SchoolYear }), DEFAULT_DISTRIBUTION).weights.PlayingTime, 18 * 1.35);
  for (const SchoolYear of ["Freshman", "Sophomore"]) assert.equal(contextualWeights(player({ SchoolYear }), DEFAULT_DISTRIBUTION).weights.ProximityToHome, 12 * 1.25);
});
test("an older QB behind a younger higher-rated QB receives strong Playing Time pressure", () => {
  const older = player({ Position: "QB", Age: 22, OverallRating: 82 }), younger = player({ Position: "QB", Age: 20, OverallRating: 90, FirstName: "Young" });
  const result = contextualWeights(older, DEFAULT_DISTRIBUTION, { teamQbs: [older, younger] });
  assert.equal(result.weights.PlayingTime, 18 * 4); assert.ok(result.context.includes("Younger higher-rated QB on roster"));
});
test("simultaneous modifiers normalize to one without mutating base percentages", () => {
  const base = { ...DEFAULT_DISTRIBUTION }, older = player({ Position: "QB", Age: 23, OverallRating: 70, SchoolYear: "Senior" }), younger = player({ Position: "QB", Age: 19, OverallRating: 80 });
  const result = contextualWeights(older, base, { teamQbs: [older, younger] });
  assert.ok(Math.abs(Object.values(result.normalized).reduce((sum, value) => sum + value, 0) - 1) < 1e-12); assert.deepEqual(base, DEFAULT_DISTRIBUTION); assert.equal(result.weights.PlayingTime, 18 * 1.35 * 4); assert.equal(result.weights.PlayingStyle, 0);
});
test("seeded assignments reproduce exactly and only use permitted stored values", () => {
  const records = Array.from({ length: 100 }, (_, index) => player({ FirstName: `P${index}`, Position: index % 4 ? "WR" : "QB", OverallRating: 60 + index % 40 }));
  const first = patchDealbreakers(structuredClone(records), { teamNames: teams, distribution: DEFAULT_DISTRIBUTION, seed: 12345 });
  const second = patchDealbreakers(structuredClone(records), { teamNames: teams, distribution: DEFAULT_DISTRIBUTION, seed: 12345 });
  assert.deepEqual(first.outcomes.map(item => item.newValue), second.outcomes.map(item => item.newValue)); assert.ok(first.outcomes.every(item => ALLOWED_DEALBREAKERS.includes(item.newValue)));
});
test("distribution validation blocks totals other than exactly 100", () => { assert.throws(() => normalizeDistribution({ ...DEFAULT_DISTRIBUTION, Invalid: 14 }), /exactly 100/); });
