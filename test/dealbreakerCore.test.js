import test from "node:test";
import assert from "node:assert/strict";
import { ALLOWED_DEALBREAKERS, CONTEXT_MODIFIERS, DEFAULT_DISTRIBUTION, contextualWeights, normalizeDistribution, patchDealbreakers } from "../src/main/tools/dealbreaker/core.js";

const teams = new Map([[1, "Test Team"]]);
const player = (overrides = {}) => ({ isEmpty: false, FirstName: "Test", LastName: "Player", TeamIndex: 1, Position: "WR", SchoolYear: "Sophomore", RedshirtStatus: "Eligible", Age: 20, OverallRating: 80, RecruitingDealbreaker: "Invalid", ...overrides });
const sequence = values => { let index = 0; return () => values[index++] ?? values.at(-1) ?? 0; };

test("Dealbreaker defaults total exactly 100 percent", () => assert.equal(Object.values(DEFAULT_DISTRIBUTION).reduce((sum, value) => sum + value, 0), 100));
test("an explicitly configured None share retains Invalid and its floor protects a one-player dynasty", () => {
  const explicitNone={...DEFAULT_DISTRIBUTION,Invalid:15,PlayingTime:10};
  const retained = patchDealbreakers([player()], { teamNames: teams, distribution: explicitNone, random: () => 0 });
  assert.equal(retained.outcomes[0].newValue, "Invalid"); assert.equal(retained.changes.length, 0);
  const protectedResult = patchDealbreakers([player()], { teamNames: teams, distribution: explicitNone, random: sequence([0.99, 0]) });
  assert.equal(protectedResult.outcomes[0].newValue, "Invalid"); assert.equal(protectedResult.changes.length, 0); assert.equal(protectedResult.population.floorLimited, true);
});
test("invalid Playing Style is optionally removed and cannot be selected again", () => {
  const bad = player({ Position: "QB", RecruitingDealbreaker: "PlayingStyle" });
  assert.equal(patchDealbreakers([bad], { teamNames: teams, distribution: DEFAULT_DISTRIBUTION, random: () => 0.9 }).outcomes.length, 0);
  const fixed = patchDealbreakers([bad], { teamNames: teams, distribution: DEFAULT_DISTRIBUTION, restrictPlayingStylePositions: true, fixInvalidPlayingStyle: true, random: sequence([0.99, 0.3]) });
  assert.equal(fixed.outcomes.length, 1); assert.notEqual(fixed.outcomes[0].newValue, "PlayingStyle");
});
test("Playing Style is available to every position by default, with optional HB/WR/TE limits", () => {
  for (const position of ["RB", "HB", "TE", "WR"]) assert.ok(contextualWeights(player({ Position: position }), DEFAULT_DISTRIBUTION).normalized.PlayingStyle > 0);
  for (const position of ["QB", "C", "CB", "K", "P"]) {
    assert.ok(contextualWeights(player({ Position: position }), DEFAULT_DISTRIBUTION).normalized.PlayingStyle > 0);
    assert.equal(contextualWeights(player({ Position: position }), DEFAULT_DISTRIBUTION, {restrictPlayingStylePositions:true}).normalized.PlayingStyle, 0);
  }
  const existing=player({Position:'QB',RecruitingDealbreaker:'PlayingStyle'});
  assert.equal(patchDealbreakers([existing],{teamNames:teams,fixInvalidPlayingStyle:true}).changes.length,0,'All-position mode must not reroll valid existing Playing Style');
});
test("85–89 and 90+ OVR tiers apply the documented multipliers", () => {
  const high = contextualWeights(player({ OverallRating: 87 }), DEFAULT_DISTRIBUTION).weights;
  assert.equal(high.ProPotential, DEFAULT_DISTRIBUTION.ProPotential * CONTEXT_MODIFIERS.overall85.ProPotential); assert.equal(high.ChampionshipContender, DEFAULT_DISTRIBUTION.ChampionshipContender * 1.35); assert.equal(high.BrandExposure, DEFAULT_DISTRIBUTION.BrandExposure * 1.25); assert.equal(high.ConferencePrestige, DEFAULT_DISTRIBUTION.ConferencePrestige * 1.2);
  const elite = contextualWeights(player({ OverallRating: 94 }), DEFAULT_DISTRIBUTION).weights;
  assert.equal(elite.ProPotential, DEFAULT_DISTRIBUTION.ProPotential * 2); assert.equal(elite.ChampionshipContender, DEFAULT_DISTRIBUTION.ChampionshipContender * 1.6); assert.equal(elite.BrandExposure, DEFAULT_DISTRIBUTION.BrandExposure * 1.45); assert.equal(elite.ConferencePrestige, DEFAULT_DISTRIBUTION.ConferencePrestige * 1.4);
});
test("low OVR and lower-class modifiers favor style, home proximity, and coach prestige", () => {
  const result = contextualWeights(player({ OverallRating: 70, Position: "WR", SchoolYear: "Freshman" }), DEFAULT_DISTRIBUTION);
  assert.equal(result.weights.PlayingStyle, 5 * 1.5); assert.equal(result.weights.ProximityToHome, DEFAULT_DISTRIBUTION.ProximityToHome * 1.4 * 1.25); assert.equal(result.weights.CoachPrestige, 10 * 1.3);
});
test("junior and senior classes receive the Playing Time modifier", () => {
  for (const SchoolYear of ["Junior", "Senior"]) assert.equal(contextualWeights(player({ SchoolYear }), DEFAULT_DISTRIBUTION).weights.PlayingTime, DEFAULT_DISTRIBUTION.PlayingTime * 1.35);
  for (const SchoolYear of ["Freshman", "Sophomore"]) assert.equal(contextualWeights(player({ SchoolYear }), DEFAULT_DISTRIBUTION).weights.ProximityToHome, DEFAULT_DISTRIBUTION.ProximityToHome * 1.25);
});
test("an older QB behind a younger higher-rated QB receives strong Playing Time pressure", () => {
  const older = player({ Position: "QB", Age: 22, OverallRating: 82 }), younger = player({ Position: "QB", Age: 20, OverallRating: 90, FirstName: "Young" });
  const result = contextualWeights(older, DEFAULT_DISTRIBUTION, { teamQbs: [older, younger] });
  assert.equal(result.weights.PlayingTime, DEFAULT_DISTRIBUTION.PlayingTime * 4); assert.ok(result.context.includes("Younger higher-rated QB on roster"));
});
test("simultaneous modifiers normalize to one without mutating base percentages", () => {
  const base = { ...DEFAULT_DISTRIBUTION }, older = player({ Position: "QB", Age: 23, OverallRating: 70, SchoolYear: "Senior" }), younger = player({ Position: "QB", Age: 19, OverallRating: 80 });
  const result = contextualWeights(older, base, { teamQbs: [older, younger] });
  assert.ok(Math.abs(Object.values(result.normalized).reduce((sum, value) => sum + value, 0) - 1) < 1e-12); assert.deepEqual(base, DEFAULT_DISTRIBUTION); assert.equal(result.weights.PlayingTime, DEFAULT_DISTRIBUTION.PlayingTime * 1.35 * 4); assert.equal(result.weights.PlayingStyle, 5 * 1.5);
});
test("seeded assignments reproduce exactly and only use permitted stored values", () => {
  const records = Array.from({ length: 100 }, (_, index) => player({ FirstName: `P${index}`, Position: index % 4 ? "WR" : "QB", OverallRating: 60 + index % 40 }));
  const first = patchDealbreakers(structuredClone(records), { teamNames: teams, distribution: DEFAULT_DISTRIBUTION, seed: 12345 });
  const second = patchDealbreakers(structuredClone(records), { teamNames: teams, distribution: DEFAULT_DISTRIBUTION, seed: 12345 });
  assert.deepEqual(first.outcomes.map(item => item.newValue), second.outcomes.map(item => item.newValue)); assert.ok(first.outcomes.every(item => ALLOWED_DEALBREAKERS.includes(item.newValue)));
});
test("distribution validation blocks totals other than exactly 100", () => { assert.throws(() => normalizeDistribution({ ...DEFAULT_DISTRIBUTION, Invalid: 14 }), /exactly 100/); });
test('dealbreaker mix uses whole percentages, even when fractional values total 100',()=>{
  assert.throws(()=>normalizeDistribution({...DEFAULT_DISTRIBUTION,PlayingStyle:5.1,PlayingTime:17.9}),/whole number/);
});
test('a Playing Style-only mix reaches all positions by default and respects opt-in limits',()=>{
  const distribution=Object.fromEntries(ALLOWED_DEALBREAKERS.map(value=>[value,value==='PlayingStyle'?100:0]));
  for(const Position of ['QB','HB','WR','TE','LT','DT','MIKE','CB','FS','K','P']){
    const result=patchDealbreakers([player({Position})],{teamNames:teams,distribution,apply:true});
    assert.equal(result.changes[0].newValue,'PlayingStyle');
  }
  assert.throws(()=>patchDealbreakers([player({Position:'QB'})],{teamNames:teams,distribution,restrictPlayingStylePositions:true}),/positive value/);
});
