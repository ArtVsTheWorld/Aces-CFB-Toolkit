import test from "node:test";
import assert from "node:assert/strict";
import { equipmentItem, RAW_ACCESSORIES_POOLS, UNLOCKED_POOLS } from "../src/main/tools/equipment/catalog.js";
import { modPoolDefinitions, normalizeModPools } from "../src/main/tools/equipment/core/modPools.js";
import { applyRawRandomizerEquipment, applyUnlockedRandomizerEquipment, mulberry32 } from "../src/main/tools/equipment/core/patcher.js";
import { buildFacePaintPool, rollFacePaint, VANILLA_FACE_PAINT_OPTIONS } from "../src/main/tools/equipment/core/facepaint.js";
import { applyGlobalEquipmentFixes } from "../src/main/tools/equipment/core/globalFixes.js";
import { replaceUnlockedSocks } from "../src/main/tools/equipment/core/unlockedSocks.js";
import { applyUnlockedTattooPlan } from "../src/main/tools/equipment/core/tattoos.js";

const element = (slotType, itemAssetName) => ({ slotType, itemAssetName, keepMetadata: true });
const outfit = (flak = "Flakjacket_None") => [{ loadoutType: "PlayerOnField", loadoutElements: [element("HeadWear", "GearHelmet_Speed_Flex"), element("FlakJacket", flak), element("BackPlate", "Backplate_None"), element("InnerSocks", "Gear_Socks_Mid")] }];
const gear = (loadouts, slot) => loadouts[0].loadoutElements.find(element => element.slotType === slot)?.itemAssetName;
const disabled = origin => Object.fromEntries(modPoolDefinitions()[origin].map(category => [category.id, { chance: 0, items: [] }]));
const only = (origin, category, id, chance = 100) => ({ ...disabled(origin), [category]: { chance, items: [id] } });

test("mod pools validate whole chances, scope and selections; legacy percentage and empty selections survive", () => {
  const defaults = normalizeModPools(undefined, 27);
  assert.equal(defaults.raw.backplates.chance, 27); assert.equal(defaults.unlocked.facepaint.chance, 10);
  assert.deepEqual(normalizeModPools({ raw: { backplates: { chance: 45, items: [] } } }).raw.backplates, { chance: 45, items: [] });
  for (const chance of [-1, 101, 2.5, "50", null]) assert.throws(() => normalizeModPools({ raw: { backplates: { chance } } }), /whole/);
  assert.throws(() => normalizeModPools({ raw: { backplates: { items: null } } }), /this mod/);
  assert.throws(() => normalizeModPools({ raw: { neckwear: { items: [UNLOCKED_POOLS.neckwear[0].itemName] } } }), /this mod/);
  assert.throws(() => normalizeModPools({ unlocked: { socks: { items: ["UnknownSock"] } } }), /this mod/);
  assert.throws(() => normalizeModPools({ raw: { unknown: {} } }), /Unknown/);
  assert.deepEqual(normalizeModPools(JSON.parse(JSON.stringify(defaults))), defaults, "preset JSON round trip");
});

test("each mod generates only its selected items; category zero and empty pools disable additions", () => {
  for (const origin of ["raw", "unlocked"]) {
    const before = outfit(), loadouts = structuredClone(before);
    if (origin === "raw") applyRawRandomizerEquipment(loadouts, mulberry32(18), 1, undefined, "WR", disabled(origin));
    else applyUnlockedRandomizerEquipment(loadouts, { position: "WR", branding: "Nike" }, mulberry32(18), 1, undefined, disabled(origin));
    assert.deepEqual(loadouts, before);
  }
  const loadouts = outfit(), chosen = RAW_ACCESSORIES_POOLS.skullcaps[0].itemName;
  const changes = applyRawRandomizerEquipment(loadouts, mulberry32(18), 0, undefined, "WR", only("raw", "skullcaps", chosen));
  assert.equal(gear(loadouts, "GuardianCap"), chosen); assert.equal(changes.length, 1);
  const socks = outfit(); applyUnlockedRandomizerEquipment(socks, { position: "WR", branding: "Nike" }, mulberry32(18), 0, undefined, only("unlocked", "socks", "Socks_CrewCut"));
  assert.equal(gear(socks, "InnerSocks"), "Socks_CrewCut");
});

test("five RAW backplates are distinct from Unlocked and never added with an active or unknown flak jacket", () => {
  assert.equal(RAW_ACCESSORIES_POOLS.backplates.length, 5);
  for (const item of RAW_ACCESSORIES_POOLS.backplates) {
    assert.equal(item.origin, "raw"); assert.deepEqual(item.slots, ["BackPlate"]);
    const configuration = only("raw", "backplates", item.itemName);
    for (const flak of ["Flakjacket_On", "UnknownActiveJacket"]) {
      const loadouts = outfit(flak), before = structuredClone(loadouts);
      assert.equal(applyRawRandomizerEquipment(loadouts, mulberry32(8), 1, undefined, "WR", configuration).length, 0);
      assert.deepEqual(loadouts, before);
    }
    const clear = outfit(); applyRawRandomizerEquipment(clear, mulberry32(8), 1, undefined, "WR", configuration);
    assert.equal(gear(clear, "BackPlate"), item.itemName); assert.equal(gear(clear, "FlakJacket"), "Flakjacket_None");
    const mixed = [...outfit(), ...outfit("Flakjacket_On")];
    applyRawRandomizerEquipment(mixed, mulberry32(8), 1, undefined, "WR", configuration);
    assert.equal(gear(mixed, "BackPlate"), "Backplate_None", "all loadouts must be jacket-free");
  }
});

test("optional facepaint selection/chance preserves vanilla behavior and position restrictions", () => {
  const config = normalizeModPools({ raw: { facepaint: { chance: 0, items: [] } }, unlocked: { facepaint: { chance: 0, items: [] } } });
  const pool = buildFacePaintPool([], { usingUnlockedMod: true, usingRawAccessoriesMod: true, modPools: config });
  assert.deepEqual(pool.options, VANILLA_FACE_PAINT_OPTIONS);
  const a = mulberry32(421), b = mulberry32(421);
  for (let i = 0; i < 200; i++) assert.equal(rollFacePaint(a, pool.options, "WR", pool.diagnostics), rollFacePaint(b));
  const defs = modPoolDefinitions(), mod = defs.raw.find(category => category.id === "facepaint").items[0].itemName;
  const half = buildFacePaintPool([], { usingRawAccessoriesMod: true, modPools: normalizeModPools({ raw: { facepaint: { chance: 50, items: [mod] } } }) });
  const rng1 = mulberry32(7), rng2 = mulberry32(7);
  const rolls = Array.from({ length: 1000 }, () => rollFacePaint(rng1, half.options, "WR", half.diagnostics));
  assert.deepEqual(rolls, Array.from({ length: 1000 }, () => rollFacePaint(rng2, half.options, "WR", half.diagnostics)));
  assert.ok(rolls.includes(mod)); assert.ok(rolls.some(asset => VANILLA_FACE_PAINT_OPTIONS.includes(asset)));
});

test("socks pass changes only the two requested vanilla items; tattoos and unrelated metadata are preserved", () => {
  const loadouts = outfit(), other = { loadoutCategory: "Base", loadoutElements: [element("LeftLegTattoo", "LegTattoo_Four")] };
  loadouts.push(other); loadouts[0].loadoutElements.push(element("RightArmWear", "ArmSleeve_None"));
  assert.deepEqual(replaceUnlockedSocks(loadouts), [{ oldItem: "Gear_Socks_Mid", newItem: "Socks_CrewCut", slot: "InnerSocks" }]);
  assert.equal(other.loadoutElements[0].itemAssetName, "LegTattoo_Four"); assert.equal(gear(loadouts, "RightArmWear"), "ArmSleeve_None");
  assert.ok(loadouts[0].loadoutElements.every(element => element.keepMetadata));
  assert.deepEqual(replaceUnlockedSocks(loadouts), [], "already modded socks are unchanged");
  for (const name of ["Gear_Socks_Low", "Gear_Socks_Under", "CustomSock"]) { const loadouts = outfit(); loadouts[0].loadoutElements.find(element => element.slotType === "InnerSocks").itemAssetName = name; assert.deepEqual(replaceUnlockedSocks(loadouts), []); }
  const high = outfit(); high[0].loadoutElements.find(element => element.slotType === "InnerSocks").itemAssetName = "Gear_Socks_High"; replaceUnlockedSocks(high); assert.equal(gear(high, "InnerSocks"), "Socks_High");
});

const ref = row => (10).toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
const player = row => ({ FirstName: "Player", LastName: String(row), Position: "WR", SchoolYear: "Freshman", TeamIndex: 1, IsNIL: false, CharacterBodyType: "Standard", CharacterVisuals: ref(row), RedshirtStatus: "Eligible", OverallRating: 70 });
test("Unlocked socks take precedence over legacy mid-sock replacement; tattoo correction runs last deterministically", () => {
  const players = Array.from({ length: 20 }, (_, row) => player(row)), visuals = players.map(() => ({ isEmpty: false, RawData: JSON.stringify({ metadata: "keep", loadouts: outfit() }) }));
  const original = structuredClone(visuals), options = { seed: 7, sockFix: true, unlockedSocksFix: true, teamNames: new Map([[1, "Alabama"]]), activePlayerRows: new Set(players.map((_, index) => index)) };
  const socksOnly = applyGlobalEquipmentFixes(players, visuals, 10, options);
  assert.equal(socksOnly.sockPlayersChanged, 0); assert.equal(socksOnly.unlockedSockPlayersChanged, 20);
  for (const record of visuals) assert.equal(gear(JSON.parse(record.RawData).loadouts, "InnerSocks"), "Socks_CrewCut");
  const one = structuredClone(original), two = structuredClone(original), all = { ...options, unlockedTattooFix: true, unlockedTattooCap: 100, unlockedTattooSelection: ["LegTattoo_Four"], sleeveCompatibilityFix: true, removeHandwarmers: true };
  const result = applyGlobalEquipmentFixes(players, one, 10, all); applyGlobalEquipmentFixes(players, two, 10, all); assert.deepEqual(one, two);
  assert.equal(result.unlockedTattooPlayersChanged, 20);
  for (const record of one) {
    const parsed = JSON.parse(record.RawData), field = parsed.loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField");
    assert.equal(gear(field, "InnerSocks"), "Socks_CrewCut", "leg tattoos preserve the earlier sock correction");
    assert.ok(parsed.loadouts.find(loadout => loadout.loadoutCategory === "Base").loadoutElements.some(element => element.slotType === "LeftLegTattoo" && element.itemAssetName === "LegTattoo_Four"));
    assert.equal(parsed.metadata, "keep");
  }
});

test("arm tattoos coexist with Crew Cut socks and elbow gear without changing either", () => {
  const parsed = { loadouts: outfit() }; parsed.loadouts[0].loadoutElements.push(element("LeftElbowWear", "ElbowGear_RubberBands1")); replaceUnlockedSocks(parsed.loadouts);
  const plan = { kind: "arm", arms: { left: { asset: "CujoMatty_ArmTats_35", label: "Arm Design 35" } }, legs: null };
  applyUnlockedTattooPlan(parsed, plan);
  const fields = parsed.loadouts.filter(loadout => loadout.loadoutType === "PlayerOnField"); assert.equal(gear(fields, "InnerSocks"), "Socks_CrewCut"); assert.equal(gear(fields, "LeftElbowWear"), "ElbowGear_RubberBands1");
  assert.equal(equipmentItem("Socks_CrewCut").origin, "unlocked");
});
