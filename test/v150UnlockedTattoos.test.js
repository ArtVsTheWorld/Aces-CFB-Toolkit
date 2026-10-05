import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { applyGlobalEquipmentFixes } from "../src/main/tools/equipment/core/globalFixes.js";
import { applyUnlockedTattooPlan, hasUnlockedBodyTattoo, repairUnlockedTattooLoadout, rollUnlockedTattoo } from "../src/main/tools/equipment/core/tattoos.js";
import { normalizeEquipmentOptions } from "../src/main/tools/equipment/runner.js";

const ref = (table, row) => table.toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
const onField = () => ({ loadoutType: "PlayerOnField", loadoutCategory: "GearOnly", loadoutElements: [
  { slotType: "LeftArmWear", itemAssetName: "GearArmSleeve_Baggy_Black" },
  { slotType: "RightArmWear", itemAssetName: "GearArmSleeve_Baggy_Black" },
  { slotType: "InnerSocks", itemAssetName: "Gear_Socks_Mid" },
  { slotType: "InnerPants", itemAssetName: "GearLegsBase_LeftSleeve_Black" }
] });
const tattooLoadout = asset => ({ loadoutType: "loadoutElements", loadoutElements: [
  { slotType: "LeftArmTattoo", itemAssetName: asset },
  { slotType: "RightArmTattoo", itemAssetName: "ArmTattoo_None" },
  { slotType: "LeftLegTattoo", itemAssetName: "LegTattoo_None" },
  { slotType: "RightLegTattoo", itemAssetName: "LegTattoo_None" }
] });
const visual = tattoo => ({ isEmpty: false, RawData: JSON.stringify({ loadouts: [...(tattoo ? [tattooLoadout(tattoo)] : []), onField()] }) });
const player = (row, position = "WR", visualRow = row, teamIndex = 1) => ({
  isEmpty: false,
  FirstName: `Player${row}`,
  LastName: "Tattoo",
  Position: position,
  SchoolYear: "Junior",
  RedshirtStatus: "Previous",
  CharacterBodyType: "Thin",
  CharacterVisuals: ref(10, visualRow),
  IsNIL: false,
  TeamIndex: teamIndex,
  OverallRating: 80
});
const tattooedCount = visuals => visuals.filter(item => hasUnlockedBodyTattoo(JSON.parse(item.RawData))).length;
const activeRows = count => new Set(Array.from({ length: count }, (_, row) => row));

test("CFB27 Unlocked tattoos are disabled by default with a validated 33% cap", () => {
  const defaults = normalizeEquipmentOptions({}, false);
  assert.equal(defaults.unlockedTattooFix, false);
  assert.equal(defaults.unlockedTattooCap, 33);
  assert.equal(normalizeEquipmentOptions({ unlockedTattooFix: true, unlockedTattooCap: 25 }, false).unlockedTattooCap, 25);
  assert.throws(() => normalizeEquipmentOptions({ unlockedTattooCap: 15.5 }, false), /whole percentage/);
  assert.throws(() => normalizeEquipmentOptions({ unlockedTattooCap: 101 }, false), /whole percentage/);
});

test("tattoo pass adds only enough players to reach the exact population cap", () => {
  const players = Array.from({ length: 20 }, (_, row) => player(row));
  const visuals = Array.from({ length: 20 }, () => visual());
  const result = applyGlobalEquipmentFixes(players, visuals, 10, {
    unlockedTattooFix: true,
    unlockedTattooCap: 15,
    seed: 20260923,
    activePlayerRows: activeRows(20),
    teamNames: new Map([[1, "Test Team"]])
  });
  assert.equal(result.unlockedTattooPlayersChanged, 3);
  assert.equal(tattooedCount(visuals), 3);
  assert.equal(result.unlockedTattooPopulation.fbs.capCount, 3);
  assert.equal(result.unlockedTattooPopulation.fbs.projectedTattooPlayers, 3);
  assert.equal(result.unlockedTattooPopulation.fbs.projectedPrevalence, 0.15);
});

test("existing tattoos count toward the cap, keep their assets, and repair malformed loadouts", () => {
  const players = Array.from({ length: 20 }, (_, row) => player(row));
  const visuals = Array.from({ length: 20 }, (_, row) => visual(row < 2 ? `ExistingTattoo_${row}` : null));
  const before = visuals.slice(0, 2).map(item => JSON.parse(item.RawData).loadouts.map(loadout => loadout.loadoutElements));
  const result = applyGlobalEquipmentFixes(players, visuals, 10, {
    unlockedTattooFix: true,
    unlockedTattooCap: 15,
    seed: 17,
    activePlayerRows: activeRows(20),
    teamNames: new Map([[1, "Test Team"]])
  });
  assert.equal(result.unlockedTattooPlayersChanged, 1);
  assert.equal(tattooedCount(visuals), 3);
  assert.deepEqual(visuals.slice(0, 2).map(item => JSON.parse(item.RawData).loadouts.map(loadout => loadout.loadoutElements)), before);
  assert.equal(result.unlockedTattooPopulation.existingTattooPlayers, 2);
  assert.equal(result.unlockedTattooPlayersRepaired, 2);
});

test("already valid Base tattoo loadouts are left untouched", () => {
  const players = Array.from({ length: 20 }, (_, row) => player(row));
  const visuals = Array.from({ length: 20 }, () => visual());
  visuals[0].RawData = JSON.stringify({ loadouts: [
    { loadoutCategory: "Base", loadoutElements: tattooLoadout("CujoMatty_ArmTats_35").loadoutElements },
    { ...onField(), loadoutCategory: undefined }
  ] });
  const before = visuals[0].RawData;
  const result = applyGlobalEquipmentFixes(players, visuals, 10, {
    unlockedTattooFix: true, unlockedTattooCap: 5, seed: 17,
    activePlayerRows: activeRows(20), teamNames: new Map([[1, "Test Team"]])
  });
  assert.equal(result.unlockedTattooPlayersChanged, 0);
  assert.equal(result.unlockedTattooPlayersRepaired, 0);
  assert.equal(visuals[0].RawData, before);
});

test("FBS and directional FCS tattoo prevalence are capped independently", () => {
  const players = Array.from({ length: 20 }, (_, row) => player(row, "WR", row, row < 10 ? 1 : 2));
  const visuals = Array.from({ length: 20 }, () => visual());
  const result = applyGlobalEquipmentFixes(players, visuals, 10, {
    unlockedTattooFix: true,
    unlockedTattooCap: 15,
    seed: 99,
    activePlayerRows: activeRows(20),
    teamNames: new Map([[1, "Test Team"], [2, "FCS East"]]),
    fcsTeamIndexes: new Set([2])
  });
  assert.equal(result.unlockedTattooPlayersChanged, 2);
  assert.equal(result.unlockedTattooPopulation.fbs.addedTattooPlayers, 1);
  assert.equal(result.unlockedTattooPopulation.fcs.addedTattooPlayers, 1);
});

test("tattoo pass protects inactive, unsupported, and shared CharacterVisuals players", () => {
  const players = Array.from({ length: 20 }, (_, row) => player(row));
  players.push(player(20, "WR", 0));
  players[1].Position = "K";
  const visuals = Array.from({ length: 20 }, () => visual());
  const result = applyGlobalEquipmentFixes(players, visuals, 10, {
    unlockedTattooFix: true,
    unlockedTattooCap: 100,
    seed: 5,
    activePlayerRows: new Set(Array.from({ length: 10 }, (_, row) => row)),
    teamNames: new Map([[1, "Test Team"]])
  });
  assert.equal(result.unlockedTattooPlayersChanged, 8);
  assert.equal(hasUnlockedBodyTattoo(JSON.parse(visuals[0].RawData)), false);
  assert.equal(hasUnlockedBodyTattoo(JSON.parse(visuals[1].RawData)), false);
  for (let row = 10; row < 20; row++) assert.equal(hasUnlockedBodyTattoo(JSON.parse(visuals[row].RawData)), false);
});

test("arm tattoo plans create a separate body loadout without touching NeckTattoo", () => {
  const parsed = { loadouts: [
    { loadoutType: "Head", loadoutCategory: "Head", loadoutElements: [{ slotType: "NeckTattoo", itemAssetName: "NeckTattoo_Existing" }] },
    onField()
  ] };
  applyUnlockedTattooPlan(parsed, {
    kind: "arm",
    arms: { left: { asset: "CujoMatty_ArmTats_35", label: "Arm Tattoo 35" } },
    legs: null
  });
  const head = parsed.loadouts.find(loadout => loadout.loadoutType === "Head");
  const body = parsed.loadouts.find(loadout => loadout !== head && loadout.loadoutElements?.some(element => element.slotType === "LeftArmTattoo"));
  const bodySlots = new Map(body.loadoutElements.map(element => [element.slotType, element.itemAssetName]));
  assert.equal(head.loadoutElements.find(element => element.slotType === "NeckTattoo").itemAssetName, "NeckTattoo_Existing");
  assert.equal(body.loadoutCategory, "Base");
  assert.equal(body.loadoutType, undefined);
  assert.equal(bodySlots.size, 4);
  assert.equal(bodySlots.get("LeftArmTattoo"), "CujoMatty_ArmTats_35");
  assert.equal(bodySlots.get("RightArmTattoo"), "ArmTattoo_None");
  assert.equal(parsed.loadouts.find(loadout => loadout.loadoutType === "PlayerOnField").loadoutElements.find(element => element.slotType === "LeftArmWear").itemAssetName, "GearArmSleeve_Baggy_Black");
});

test("new tattoos use the game's Base layer and keep the original gear intact", () => {
  for (const original of [
    { loadouts: [onField()] },
    { loadouts: [{ ...onField(), loadoutCategory: undefined }] }
  ]) {
    const parsed = structuredClone(original);
    const originalGear = structuredClone(parsed.loadouts[0].loadoutElements);
    applyUnlockedTattooPlan(parsed, {
      kind: "arm", arms: { left: { asset: "CujoMatty_ArmTats_36", label: "Arm Tattoo 36" } }, legs: null
    });
    assert.equal(parsed.loadouts[0].loadoutCategory, "Base");
    assert.equal(parsed.loadouts[0].loadoutType, undefined);
    assert.equal(parsed.loadouts[1].loadoutType, "PlayerOnField");
    assert.equal(parsed.loadouts[1].loadoutCategory, undefined);
    assert.deepEqual(parsed.loadouts[1].loadoutElements, originalGear);
  }
});

test("malformed tattoo layers from earlier versions can be repaired without replacing equipment or tattoos", () => {
  const parsed = { loadouts: [tattooLoadout("CujoMatty_ArmTats_35"), onField()] };
  const originalGear = structuredClone(parsed.loadouts[1].loadoutElements);
  assert.equal(repairUnlockedTattooLoadout(parsed), true);
  assert.equal(parsed.loadouts[0].loadoutCategory, "Base");
  assert.equal(parsed.loadouts[0].loadoutType, undefined);
  assert.equal(parsed.loadouts[1].loadoutCategory, undefined);
  assert.deepEqual(parsed.loadouts[1].loadoutElements, originalGear);
  assert.equal(repairUnlockedTattooLoadout(parsed), false);
});

test("automatic tattoo choices never include Japanese assets", () => {
  let state = 1;
  const rng = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 0x100000000; };
  for (let index = 0; index < 2000; index += 1) {
    const plan = rollUnlockedTattoo(rng);
    for (const item of [...Object.values(plan.arms), ...(plan.legs ? [plan.legs] : [])]) assert.doesNotMatch(item.asset, /Japanese/i);
  }
});

test("arm tattoos dominate, combined arm-and-leg tattoos occur, and both arms can differ", () => {
  let state = 1;
  const rng = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 0x100000000; };
  const counts = { arm: 0, leg: 0, both: 0, bothArms: 0, asymmetrical: 0 };
  for (let index = 0; index < 5000; index += 1) {
    const plan = rollUnlockedTattoo(rng);
    counts[plan.kind] += 1;
    if (Object.keys(plan.arms).length === 2) {
      counts.bothArms += 1;
      if (plan.arms.left.asset !== plan.arms.right.asset) counts.asymmetrical += 1;
    }
  }
  assert.ok(counts.arm > counts.leg * 4);
  assert.ok(counts.both > 250);
  assert.ok(counts.bothArms > 1000);
  assert.ok(counts.asymmetrical > 200);
});

test("tattoos preserve sleeve colors and avoid fully covered arms", () => {
  const parsed = { loadouts: [onField()] };
  const gear = parsed.loadouts[0].loadoutElements;
  gear.find(element => element.slotType === "LeftArmWear").itemAssetName = "GearArmSleeve_NikeProDriFitSleeve_TeamColor";
  gear.find(element => element.slotType === "RightArmWear").itemAssetName = "ArmSleeve_None";
  const before = structuredClone(gear);
  let state = 2;
  const rng = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 0x100000000; };
  for (let index = 0; index < 100; index += 1) {
    const plan = rollUnlockedTattoo(rng, parsed);
    assert.equal(plan.arms.left, undefined);
    assert.ok(plan.kind === "leg" || plan.arms.right);
  }
  applyUnlockedTattooPlan(parsed, { kind: "arm", arms: { right: { asset: "CujoMatty_ArmTats_35", label: "Arm Tattoo 35" } }, legs: null });
  assert.deepEqual(parsed.loadouts.find(loadout => loadout.loadoutType === "PlayerOnField").loadoutElements, before);
});

test("one player can receive different left and right tattoos plus matching leg tattoos", () => {
  const parsed = { loadouts: [onField()] };
  const change = applyUnlockedTattooPlan(parsed, {
    kind: "both",
    arms: {
      left: { asset: "CujoMatty_ArmTats_35", label: "Arm Tattoo 35" },
      right: { asset: "CujoMatty_ArmTats_36", label: "Arm Tattoo 36" }
    },
    legs: { asset: "LegTattoo_Four", label: "Leg Tattoo Four" }
  });
  const body = parsed.loadouts.find(loadout => loadout.loadoutCategory === "Base");
  const slots = Object.fromEntries(body.loadoutElements.map(element => [element.slotType, element.itemAssetName]));
  assert.equal(slots.LeftArmTattoo, "CujoMatty_ArmTats_35");
  assert.equal(slots.RightArmTattoo, "CujoMatty_ArmTats_36");
  assert.equal(slots.LeftLegTattoo, "LegTattoo_Four");
  assert.equal(slots.RightLegTattoo, "LegTattoo_Four");
  assert.match(change.newItem, /left arm: Arm Tattoo 35/);
  assert.match(change.newItem, /right arm: Arm Tattoo 36/);
  assert.match(change.newItem, /both legs: Leg Tattoo Four/);
});

test("leg tattoos use both tattoo slots, low socks, and bare legs", () => {
  const parsed = { loadouts: [onField()] };
  applyUnlockedTattooPlan(parsed, { kind: "leg", arms: {}, legs: { asset: "LegTattoo_Three", label: "Leg Tattoo Three" } });
  const allElements = parsed.loadouts.flatMap(loadout => loadout.loadoutElements ?? []);
  const slots = new Map(allElements.map(element => [element.slotType, element.itemAssetName]));
  assert.equal(slots.get("LeftLegTattoo"), "LegTattoo_Three");
  assert.equal(slots.get("RightLegTattoo"), "LegTattoo_Three");
  assert.equal(slots.get("InnerSocks"), "Gear_Socks_Low");
  assert.equal(slots.get("InnerPants"), "BottomBase_None");
});

test("tattoo option is user-visible, off by default, and included in review/help text", () => {
  const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
  assert.match(renderer, /optionalPass\("fix-unlocked-tattoos", "Add Tattoos"/);
  assert.match(renderer, /id="unlocked-tattoo-cap"[^>]+value="33"/);
  assert.match(renderer, /Existing sleeves and tattoos are preserved/);
  assert.match(renderer, /FBS and directional FCS populations are capped separately/);
  assert.match(renderer, /Requires CFB27 Unlocked/);
});
