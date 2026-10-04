import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { collectEquipmentDonors, getCrossDonorPositions, patchFreshmanEquipment } from "../src/main/tools/equipment/core/patcher.js";
import { normalizeEquipmentOptions } from "../src/main/tools/equipment/runner.js";
import { UNLOCKED_TATTOO_POOL, rollUnlockedTattoo, applyUnlockedTattooPlan } from "../src/main/tools/equipment/core/tattoos.js";

const ref = row => (10).toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
const player = (position, row, year = "Senior", overall = 80) => ({ isEmpty: false, FirstName: `P${row}`, LastName: "Donor", Position: position, SchoolYear: year, RedshirtStatus: "Eligible", CharacterBodyType: "Thin", CharacterVisuals: ref(row), IsNIL: false, TeamIndex: 1, OverallRating: overall });
const visual = row => ({ isEmpty: false, RawData: JSON.stringify({ loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: [{ slotType: "HeadWear", itemAssetName: `Helmet_${row}` }, { slotType: "LeftArmWear", itemAssetName: "ArmSleeve_None" }, { slotType: "RightArmWear", itemAssetName: "ArmSleeve_None" }] }] }) });
const run = (players, options = {}) => patchFreshmanEquipment(players, players.map((_, row) => visual(row)), 10, { eligiblePlayer: record => record === players[0], seed: 52, top: 1, ...options });

test("disable mixing keeps donors at the exact position across all game positions and brand slots", () => {
  const positions = ["QB", "HB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "LE", "RE", "DT", "LOLB", "MLB", "ROLB", "CB", "FS", "SS", "K", "P"];
  for (const position of positions) {
    const other = getCrossDonorPositions(position)[0] ?? (position === "LT" ? "LG" : "LT");
    const players = [player(position, 0, "Freshman"), player(position, 1), player(other, 2)];
    const result = run(players, { disableCrossPosition: true, crossMixedChance: 1, mixedChance: 1, teamApparel: new Map([[1, "nike"]]) });
    assert.equal(result.changes.length, 1, position);
    assert.equal(result.changes[0].crossPositionMixed, false);
    assert.ok(result.changes[0].donorUses.every(use => use.donor.position === position), position);
  }
  assert.equal(run([player("LT", 0, "Freshman"), player("LG", 1)], { disableCrossPosition: true }).changes.length, 0);
  assert.equal(run([player("LT", 0, "Freshman"), player("LG", 1)]).changes.length, 1, "normal OL family fallback remains unchanged");
});

test("mixing switches are mutually exclusive in core and main-process validation", () => {
  assert.throws(() => run([], { disableCrossPosition: true, forceCrossPosition: true }), /cannot both/);
  assert.throws(() => normalizeEquipmentOptions({ disableCrossPosition: true, forceCrossPosition: true }, true), /cannot both/);
  assert.equal(normalizeEquipmentOptions({}, true).disableCrossPosition, false);
});

test("manual pool replaces the cutoff, uses only selected eligible donors, and preserves their gear", () => {
  const players = [player("WR", 0, "Freshman"), player("WR", 1, "Senior", 99), player("WR", 2, "Senior", 55), player("WR", 3, "Senior", 45)];
  const visuals = players.map((_, row) => visual(row)), original = visuals.map(row => row.RawData);
  const result = patchFreshmanEquipment(players, visuals, 10, { donorRows: [2, 3], top: 1, disableCrossPosition: true, eligiblePlayer: () => true, seed: 1, apply: true });
  assert.ok(result.changes.length > 0);
  assert.ok(result.changes.every(change => change.donorUses.every(use => [2, 3].includes(use.donor.row))));
  assert.equal(visuals[2].RawData, original[2]); assert.equal(visuals[3].RawData, original[3]);
  assert.equal(result.skipped.filter(row => /selected donor pool/.test(row.reason)).length, 2);
  const options = normalizeEquipmentOptions({ donorMode: "selected", donorRows: ["2", "3", "2"], top: "invalid", donorSave: "not-used" }, true);
  assert.deepEqual(options.donorRows, [2, 3]); assert.equal(options.donorSave, "");
});

test("manual donors retain active-roster, upperclassman, placeholder, FCS, and valid visuals checks", () => {
  const players = [player("WR", 0, "Freshman"), player("WR", 1), player("WR", 2), player("WR", 3), player("WR", 4), player("WR", 5)];
  players[2].FirstName = "Omar"; players[2].LastName = "Omar"; players[3].TeamIndex = 255;
  const visuals = players.map((_, row) => visual(row)); visuals[4].RawData = "invalid";
  const donors = collectEquipmentDonors(players, visuals, 10, { rosterRows: new Set([0, 1, 2, 3, 4]), fcsTeamIndexes: new Set([255]) });
  assert.deepEqual(donors.map(donor => donor.row), [1]);
  for (const donorRows of [[], [0], [99], [-1], [1.5]]) assert.throws(() => run(players, { donorRows }), /donor/);
  for (const donorRows of [[], ["oops"], ["1.5"], ["-1"]]) assert.throws(() => normalizeEquipmentOptions({ donorMode: "selected", donorRows }, true), /donor/);
  const result = run([player("QB", 0, "Freshman"), player("WR", 1)], { donorRows: [1], disableCrossPosition: true });
  assert.equal(result.changes.length, 0); assert.match(result.skipped[0].reason, /no compatible/);
});

test("explicitly disabled new options preserve the default seeded output exactly", () => {
  const players = [player("WR", 0, "Freshman"), player("WR", 1), player("CB", 2)];
  assert.deepEqual(run(players), run(players, { disableCrossPosition: false, donorRows: undefined }));
  const options = { donorRows: [2], forceCrossPosition: true };
  assert.deepEqual(run(players, options), run(players, options));
  assert.ok(run(players, options).changes[0].donorUses.every(use => use.donor.row === 2));
});

test("expanded pool retains CujoMatty 21–41 and five default legs, with gear preserved", () => {
  assert.equal(UNLOCKED_TATTOO_POOL.filter(item => item.defaultSelected).length, 26);
  for (let number = 21; number <= 41; number++) {
    const asset = `CujoMatty_ArmTats_${number}`;
    assert.ok(UNLOCKED_TATTOO_POOL.some(item => item.value === asset));
    const parsed = JSON.parse(visual(number).RawData), before = structuredClone(parsed.loadouts[0]);
    const plan = rollUnlockedTattoo(() => 0.2, parsed, [asset]); applyUnlockedTattooPlan(parsed, plan);
    assert.deepEqual(parsed.loadouts.find(row => row.loadoutType === "PlayerOnField"), before);
    assert.ok(Object.values(plan.arms).every(item => item.asset === asset));
  }
  assert.ok(UNLOCKED_TATTOO_POOL.filter(item => item.defaultSelected).every(item => !/Japanese|Polynesian/i.test(item.value)));
});

test("donor presets map by player identity labels, blocking missing and ambiguous matches", () => {
  const control = { multiple: true, options: [{ value: "42", textContent: "P1 Donor · Alabama · WR · Senior · #1 · 80 OVR" }] };
  const context = vm.createContext({ document: { getElementById: () => control }, content: { querySelectorAll: () => [] } });
  vm.runInContext(fs.readFileSync(new URL("../src/renderer/presets.js", import.meta.url), "utf8"), context);
  const config = { values: {}, teamSelections: { "equipment-donor-players": [control.options[0].textContent] } };
  assert.equal(context.presetValues(config)["equipment-donor-players"][0], "42");
  control.options.push({ ...control.options[0], value: "43" }); assert.throws(() => context.presetValues(config), /multiple players/);
  control.options = []; assert.throws(() => context.presetValues(config), /donor players.*not in this save/);
});
