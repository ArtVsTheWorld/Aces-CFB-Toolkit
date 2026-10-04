import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { isToolMouthpieceColor, recolorMouthpieceItem, UNLOCKED_POOLS } from "../src/main/tools/equipment/catalog.js";
import { patchFreshmanEquipment } from "../src/main/tools/equipment/core/patcher.js";
import { applyGlobalEquipmentFixes } from "../src/main/tools/equipment/core/globalFixes.js";
import { normalizeEquipmentOptions } from "../src/main/tools/equipment/runner.js";

const ref = (table, row) => table.toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
const raw = item => JSON.stringify({ loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: item }] });
const player = (row, extra = {}) => ({ isEmpty: false, FirstName: `Player${row}`, LastName: "Scope", Position: "WR", SchoolYear: "Freshman", RedshirtStatus: "Eligible", CharacterBodyType: "Thin", CharacterVisuals: ref(10, row), IsNIL: false, TeamIndex: 1, OverallRating: 80, JerseyNum: row, ...extra });

test("NIL skipping is an explicit default-on option for both equipment tools", () => {
  assert.equal(normalizeEquipmentOptions({}, true).skipNilPlayers, true);
  assert.equal(normalizeEquipmentOptions({}, false).skipNilPlayers, true);
  assert.equal(normalizeEquipmentOptions({ skipNilPlayers: false }, true).skipNilPlayers, false);
  assert.equal(normalizeEquipmentOptions({ skipNilPlayers: false }, false).skipNilPlayers, false);
  const renderer = fs.readFileSync(new URL("../src/renderer/renderer.js", import.meta.url), "utf8");
  assert.match(renderer, /id="equipment-skip-nil" type="checkbox" checked> Skip NIL players/);
});

test("Equipment Randomizer skips NIL recipients by default and includes them when requested", () => {
  const players = [player(0, { IsNIL: true }), player(1, { SchoolYear: "Senior", RedshirtStatus: "Previous", OverallRating: 99 })];
  const visuals = [{ isEmpty: false, RawData: raw([{ slotType: "MouthWear", itemAssetName: "GearMouthpiece_White" }]) }, { isEmpty: false, RawData: raw([{ slotType: "MouthWear", itemAssetName: "GearMouthpiece_Black" }]) }];
  const options = { eligiblePlayer: record => record.FirstName === "Player0", top: 1, mixedChance: 0, crossMixedChance: 0, seed: 4, apply: true };
  assert.equal(patchFreshmanEquipment(structuredClone(players), structuredClone(visuals), 10, options).changes.length, 0);
  assert.equal(patchFreshmanEquipment(structuredClone(players), structuredClone(visuals), 10, { ...options, skipNilPlayers: false }).changes.length, 1);
});

test("Equipment Patcher skips NIL visuals by default and includes them when requested", () => {
  const players = [player(0, { IsNIL: true })], visuals = [{ isEmpty: false, RawData: raw([{ slotType: "OuterPants", itemAssetName: "GearPants_Standard" }]) }];
  const protectedVisuals = structuredClone(visuals);
  assert.equal(applyGlobalEquipmentFixes(players, protectedVisuals, 10, { pantsFix: true }).pantsPlayersChanged, 0);
  const includedVisuals = structuredClone(visuals);
  assert.equal(applyGlobalEquipmentFixes(players, includedVisuals, 10, { pantsFix: true, skipNilPlayers: false }).pantsPlayersChanged, 1);
});

test("mouthpiece pools and recoloring reject misleading numbered multicolor assets", () => {
  assert.equal(isToolMouthpieceColor("GearMouthpiece_PacifierDualHanging_White12"), false);
  assert.equal(recolorMouthpieceItem("GearMouthpiece_PacifierDualHanging_White12", "white"), "GearMouthpiece_PacifierDualHanging_White");
  for (const pool of [UNLOCKED_POOLS.unlockedMouthpieces, UNLOCKED_POOLS.hangingMouthpieces, UNLOCKED_POOLS.standardPacifiers, UNLOCKED_POOLS.mouthguards]) {
    assert.ok(pool.length > 0);
    assert.ok(pool.every(item => isToolMouthpieceColor(item.itemName)));
  }
});

test("tool option labels are bold and helper copy remains normal weight", () => {
  const css = fs.readFileSync(new URL("../src/renderer/activity.css", import.meta.url), "utf8");
  assert.match(css, /\.card label \{ font-weight: 700; \}/);
  assert.match(css, /\.pass-row small \{[^}]*font-weight: 400/);
  assert.match(css, /\.mode-card span \{[^}]*font-weight: 400/);
});
