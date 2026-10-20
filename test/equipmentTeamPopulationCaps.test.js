import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { applyGlobalEquipmentFixes } from "../src/main/tools/equipment/core/globalFixes.js";
import { hasUnlockedBodyTattoo } from "../src/main/tools/equipment/core/tattoos.js";
import { POSITION_GROUPS } from "../src/main/tools/equipment/core/passSettings.js";

const ref = row => (10).toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
const caps = value => Object.fromEntries(POSITION_GROUPS.map(group => [group, value]));
const element = (slotType, itemAssetName) => ({ slotType, itemAssetName });
function fixture(sizes = [20, 20], customize = () => {}) {
  const players = [], visuals = [], teamNames = new Map();
  sizes.forEach((size, index) => {
    const teamIndex = index + 1; teamNames.set(teamIndex, ["Alabama", "Wyoming", "FCS East"][index] ?? `Team ${teamIndex}`);
    for (let number = 0; number < size; number++) {
      const row = players.length;
      const player = { isEmpty: false, FirstName: "Player", LastName: String(row), TeamIndex: teamIndex, Position: "WR", SchoolYear: "Junior", RedshirtStatus: "Previous", IsNIL: false, CharacterBodyType: "Thin", CharacterVisuals: ref(row) };
      const parsed = { loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: [
        element("Visor", "GearVisor_None"), element("MouthWear", "GearMouthpiece_None"),
        element("OuterShirt", "Gear_JerseyStyle_RolledLow"), element("InnerShirt", "Gear_Undershirt_CompressionTCrewSleeveless"),
        element("OuterPants", "GearPants_AboveKnee"), element("InnerPants", "BottomBase_None")
      ] }] };
      customize({ player, parsed, row, number, teamIndex });
      players.push(player); visuals.push({ isEmpty: false, RawData: JSON.stringify(parsed) });
    }
  });
  return { players, visuals, teamNames };
}
const set = (parsed, slot, asset) => { parsed.loadouts[0].loadoutElements.find(item => item.slotType === slot).itemAssetName = asset; };
const asset = (visual, slot) => JSON.parse(visual.RawData).loadouts.find(outfit => outfit.loadoutType === "PlayerOnField").loadoutElements.find(item => item.slotType === slot)?.itemAssetName;
const run = (data, options = {}) => applyGlobalEquipmentFixes(data.players, data.visuals, 10, { seed: 71, teamNames: data.teamNames, ...options });
function addTattoo(parsed) { parsed.loadouts.unshift({ loadoutCategory: "Base", loadoutElements: [element("LeftArmTattoo", "CujoMatty_ArmTats_35")] }); }

test("tattoo caps are per team: an over-cap early team cannot consume later teams' allowances", () => {
  const make = () => fixture([10, 10, 10], ({ parsed, teamIndex, number }) => { if (teamIndex === 1 && number < 8) addTattoo(parsed); });
  const a = make(), b = make(), options = { unlockedTattooFix: true, unlockedTattooCap: 40, fcsTeamIndexes: new Set([3]) };
  const result = run(a, options); run(b, options);
  assert.deepEqual(a.visuals, b.visuals, "same seed and settings reproduce the exact preview");
  assert.deepEqual([0, 10, 20].map(start => a.visuals.slice(start, start + 10).filter(row => hasUnlockedBodyTattoo(JSON.parse(row.RawData))).length), [8, 4, 4]);
  assert.equal(result.unlockedTattooPopulation.scope, "team");
  assert.deepEqual(result.unlockedTattooPopulation.teams.map(team => [team.teamIndex, team.capCount, team.addedTattooPlayers]), [[1, 4, 0], [2, 4, 4], [3, 4, 4]]);
  assert.equal(result.unlockedTattooPopulation.fbs.capCount, 8);
  assert.equal(run(a, options).unlockedTattooPlayersChanged, 0, "repeat runs do not exceed each team's cap");
});

test("tattoo limits round down within each team and retain player/NIL/shared-row scope safety", () => {
  const tiny = fixture([2, 2]);
  const result = run(tiny, { unlockedTattooFix: true, unlockedTattooCap: 40 });
  assert.equal(result.unlockedTattooPlayersChanged, 0);
  assert.equal(result.unlockedTattooPopulation.capCount, 0, "fractional places cannot be pooled between teams");
  const scoped = fixture([10, 10], ({ player, teamIndex, number }) => { if (number === 0) player.IsNIL = true; if (teamIndex === 2 && number === 2) player.CharacterVisuals = ref(1); });
  const before = scoped.visuals.map(row => row.RawData);
  run(scoped, { unlockedTattooFix: true, unlockedTattooCap: 100, activePlayerRows: new Set([0, 1, 2, 10, 11, 12]) });
  for (const row of [0, 1, 10, 12]) assert.equal(scoped.visuals[row].RawData, before[row]);
  assert.ok(hasUnlockedBodyTattoo(JSON.parse(scoped.visuals[2].RawData)));
  assert.ok(hasUnlockedBodyTattoo(JSON.parse(scoped.visuals[11].RawData)));
  assert.equal(scoped.visuals[3].RawData, before[3]);
});

test("visor and mouthpiece ceilings remain local to each team's position groups over many seeds", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const data = fixture([10, 10, 10], ({ parsed, teamIndex, number }) => {
      if (teamIndex === 1 && number < 9) { set(parsed, "Visor", "GearVisor_visorOakley_clear"); set(parsed, "MouthWear", "GearMouthpiece_Standard_White"); }
    });
    const result = run(data, { seed, visorFix: true, unlockedMouthpieceFix: true, fcsTeamIndexes: new Set([3]) });
    const teams = result.populationSafeguards.teams;
    assert.equal(result.populationSafeguards.scope, "team");
    assert.equal(teams[0].visors.WR.equipped, 9); assert.equal(teams[0].mouthpieces.skill.equipped, 9);
    for (const team of teams.slice(1)) {
      assert.equal(team.visors.WR.ceilingCount, 6); assert.ok(team.visors.WR.equipped > 0 && team.visors.WR.equipped <= 6);
      assert.equal(team.mouthpieces.skill.ceilingCount, 8); assert.ok(team.mouthpieces.skill.equipped > 0 && team.mouthpieces.skill.equipped <= 8);
    }
    assert.equal(result.populationSafeguards.fbs.visors.WR.ceilingCount, 12);
  }
  const tiny = fixture([1, 1]);
  const result = run(tiny, { visorFix: true, unlockedMouthpieceFix: true });
  assert.equal(result.visorPlayersChanged, 0); assert.equal(result.unlockedMouthpiecePlayersChanged, 0);
});

test("shared equipment can receive capped items only when every linked team's allowance permits it", () => {
  const data = fixture([6, 6], ({ parsed, teamIndex, number }) => {
    if (teamIndex === 1 && number < 5) set(parsed, "MouthWear", "GearMouthpiece_Standard_White");
  });
  data.players[6].CharacterVisuals = ref(5);
  const result = run(data, { unlockedMouthpieceFix: true, seed: 2 });
  assert.equal(asset(data.visuals[5], "MouthWear"), "GearMouthpiece_None", "the first team's full cap protects the shared row");
  assert.equal(result.populationSafeguards.teams[0].mouthpieces.skill.equipped, 5);
  assert.ok(result.populationSafeguards.teams[1].mouthpieces.skill.equipped > 0);
  assert.ok(result.populationSafeguards.teams[1].mouthpieces.skill.equipped <= 5);
});

test("custom position settings keep independent team-and-position ceilings and disabled groups", () => {
  const data = fixture([20, 20], ({ player, number }) => { player.Position = number < 10 ? "WR" : "QB"; });
  const profile = { enabled: true, standard: 0, pacifier: 0, hanging: 100 };
  const result = run(data, { visorFix: true, visorFrequencies: { WR: 30, QB: 0 }, unlockedMouthpieceFix: true, mouthpiecePositions: { WR: profile, QB: { ...profile, enabled: false } } });
  for (const team of result.populationSafeguards.teams) {
    assert.equal(team.visors.WR.total, 10); assert.equal(team.visors.WR.ceilingCount, 3); assert.ok(team.visors.WR.equipped <= 3);
    assert.equal(team.visors.QB.equipped, 0); assert.equal(team.mouthpieces.WR.ceilingCount, 8);
    assert.equal(team.mouthpieces.QB, undefined);
  }
  for (let row = 0; row < data.players.length; row++) if (data.players[row].Position === "QB") {
    assert.equal(asset(data.visuals[row], "MouthWear"), "GearMouthpiece_None"); assert.equal(asset(data.visuals[row], "Visor"), "GearVisor_None");
  }
});

test("uniform caps and final before/limit/after counts are separate for each team and position group", () => {
  const make = () => fixture([20, 20], ({ parsed, teamIndex, number, player }) => {
    player.Position = number < 10 ? "WR" : "CB";
    if (teamIndex === 1 && number % 10 < 6) { set(parsed, "OuterShirt", "Gear_JerseyStyle_RolledLowest_Untucked"); set(parsed, "OuterPants", "GearPants_Cutoff"); }
  });
  const data = make(), copy = make(), options = { lowerRolledJerseyFix: true, lowerJerseyCaps: caps(40), cutoffPantsFix: true, cutoffPantsCaps: caps(40) };
  const result = run(data, options); run(copy, options);
  assert.deepEqual(data.visuals, copy.visuals); assert.equal(result.uniformPopulation.length, 4);
  for (const row of result.uniformPopulation) {
    assert.equal(row.total, 10); assert.equal(row.lowerTarget, 4); assert.equal(row.cutoffTarget, 4);
    assert.equal(row.lowerAfter, row.teamIndex === 1 ? 6 : 4); assert.equal(row.cutoffAfter, row.teamIndex === 1 ? 6 : 4);
  }
  assert.equal(run(data, options).lowerJerseyChanges.length, 0); assert.equal(run(data, options).cutoffPantsChanges.length, 0);
});

test("no-undershirt safeguards preserve the floor in each team instead of borrowing from another team", () => {
  const data = fixture([20, 20], ({ player, parsed, number, teamIndex }) => {
    player.CharacterBodyType = "Standard";
    if (number < (teamIndex === 1 ? 1 : 10)) set(parsed, "InnerShirt", "Undershirt_None");
  });
  const result = run(data, { rolledJerseyFix: true, undershirtColor: "white" });
  assert.equal(asset(data.visuals[0], "InnerShirt"), "Undershirt_None");
  assert.deepEqual(result.populationSafeguards.teams.map(team => [team.undershirts.none, team.undershirts.floor]), [[1, 1], [1, 1]]);
});

test("whole-percentage team caps do not lose a player to floating-point rounding", () => {
  const data = fixture([50, 50]);
  const result = run(data, { unlockedTattooFix: true, unlockedTattooCap: 58, visorFix: true, visorFrequencies: { WR: 58 } });
  for (const team of result.unlockedTattooPopulation.teams) { assert.equal(team.capCount, 29); assert.equal(team.addedTattooPlayers, 29); }
  for (const team of result.populationSafeguards.teams) assert.equal(team.visors.WR.ceilingCount, 29);
});

test("per-team cap scope and audit are exposed in configuration, previews, and CSV reports", () => {
  const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  assert.match(read("src/renderer/renderer.js"), /Tattoo Caps by Team/);
  assert.match(read("src/renderer/renderer.js"), /Equipment Caps by Team/);
  assert.match(read("src/renderer/configuration.js"), /per-team cap/);
  assert.match(read("src/renderer/unlocked-uniforms.js"), /Each team's position groups are capped separately/);
  assert.match(read("src/main/tools/equipment/runner.js"), /PopulationCapsAuditJSON/);
});
