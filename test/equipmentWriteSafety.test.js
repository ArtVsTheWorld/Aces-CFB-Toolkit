import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { installVisualsWriteSafety, verifyVisualSnapshot, snapshotVisualsForVerification, saveEquipmentCandidate } from "../src/main/tools/equipment/visualsSafety.js";
import { loadEquipmentTables, snapshotVisualRawData } from "../src/main/tools/equipment/shared.js";
import { normalizeEquipmentOptions } from "../src/main/tools/equipment/runner.js";
import { EQUIPMENT_ITEMS, mouthpieceColorVariants } from "../src/main/tools/equipment/catalog.js";
import { randomizeExistingMouthpieceColors, applyGlobalEquipmentFixes } from "../src/main/tools/equipment/core/globalFixes.js";
import { mulberry32 } from "../src/main/tools/equipment/core/patcher.js";

const ref = (table, row) => table.toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
const fixture = path.resolve("../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN");
const schemaPath = path.resolve("resources/engine-data/C27_486_6.gz");
function mockTable({ full = false, encoder = value => Buffer.from(value), overflow = "0".repeat(32) } = {}) {
  const strategy = { setUnformattedValueFromFormatted: encoder, getFormattedValueFromUnformatted: bytes => bytes.toString() };
  const records = Array.from({ length: 3 }, (_, index) => ({ index, isEmpty: index > 0, Overflow: index === 0 ? overflow : "0".repeat(32), RawData: "{}", getFieldByKey: () => ({ thirdTableField: fields[index] }) }));
  const fields = records.map(() => ({ maxLength: 64, strategy }));
  const table = { records, header: { tableId: 10, nextRecordToUse: full ? 3 : 1 } };
  installVisualsWriteSafety(table);
  return { table, encode: value => fields[0].strategy.setUnformattedValueFromFormatted(JSON.stringify(value), null, 64, {}) };
}

test("visuals guard rejects silent truncation when overflow storage is full", () => {
  const { encode } = mockTable({ full: true });
  assert.doesNotThrow(() => encode({ small: true }));
  assert.throws(() => encode({ text: "a".repeat(80) }), /no free overflow storage/);
});
test("visuals guard rejects payloads larger than supported overflow capacity", () => {
  const { encode } = mockTable();
  assert.doesNotThrow(() => encode({ text: "a".repeat(80) }));
  assert.throws(() => encode({ text: "a".repeat(200) }), /exceeds safe CharacterVisuals storage/);
});
test("visuals guard rejects encoder data loss instead of saving a changed loadout", () => {
  const { encode } = mockTable({ encoder: () => Buffer.from('{"number":0}') });
  assert.throws(() => encode({ number: 512 }), /lost data during encoding/);
});
test("visuals guard rejects invalid or multiply owned overflow rows", () => {
  for (const overflow of [ref(11, 1), ref(10, 0), ref(10, 10), ref(10, 1)]) assert.throws(() => mockTable({ overflow }).encode({ small: true }), /unsafe shared or invalid overflow/);
  const { table } = mockTable();
  table.records[1].isEmpty = false; table.records[2].isEmpty = false;
  table.records[0].Overflow = ref(10, 1); table.records[2].Overflow = ref(10, 1);
  // Install on a fresh table with the shared pointers already present.
  const fresh = { records: table.records, header: table.header };
  installVisualsWriteSafety(fresh);
  assert.throws(() => fresh.records[0].getFieldByKey("RawData").thirdTableField.strategy.setUnformattedValueFromFormatted("{}", null, 64, {}), /unsafe shared/);
});
test("reopened save verification rejects unplanned changes and validates released overflow", () => {
  const table = { header: { tableId: 10 }, records: [{ index: 0, RawData: '{"x":1}', Overflow: "0".repeat(32), isEmpty: false }, { index: 1, RawData: "{}", Overflow: "0".repeat(32), isEmpty: true }] };
  const before = new Map([[0, '{"x":0}'], [1, "{}"]]); before.overflowOwners = new Map([[1, 0]]);
  const assignments = [{ table: "visuals", row: 0, newValue: '{"x":1}' }];
  assert.doesNotThrow(() => verifyVisualSnapshot(before, table, assignments));
  table.records[0].RawData = '{"x":2}';
  assert.throws(() => verifyVisualSnapshot(before, table, assignments), /does not match the validated preview/);
});

test("existing mouthpiece recoloring is opt-in and ignored when the pass is disabled", () => {
  assert.equal(normalizeEquipmentOptions({}, false).randomizeExistingMouthpieceColors, false);
  assert.equal(normalizeEquipmentOptions({ randomizeExistingMouthpieceColors: true }, false).randomizeExistingMouthpieceColors, false);
  assert.equal(normalizeEquipmentOptions({ unlockedMouthpieceFix: true, randomizeExistingMouthpieceColors: true }, false).randomizeExistingMouthpieceColors, true);
  const renderer = fs.readFileSync("src/renderer/renderer.js", "utf8");
  assert.match(renderer, /optionalPass\("randomize-existing-mouthpieces", "Reroll Existing Mouthpieces"/);
  assert.match(renderer, /Existing mouthpieces are preserved by default/);
});
const kind = asset => /PacifierDualHanging/.test(asset) ? "hanging" : /PacifierDual_/.test(asset) ? "standard" : "mouthguard";
const brand = item => /^(Battle|NXTRND|Nike|Shock)\b/i.exec(item.displayName)?.[1]?.toLowerCase() ?? "generic";
test("every existing mouthpiece color family keeps its brand and type with both color settings", () => {
  let supported = 0;
  for (const item of EQUIPMENT_ITEMS.filter(item => item.category === "Mouthpiece")) for (const random of [false, true]) {
    const variants = mouthpieceColorVariants(item.itemName, random);
    if (variants.length) supported++;
    for (const variant of variants) { assert.equal(brand(variant), brand(item)); assert.equal(kind(variant.itemName), kind(item.itemName)); }
  }
  assert.ok(supported > 100);
  assert.deepEqual(mouthpieceColorVariants("CustomUnknown_Mouthpiece"), []);
  assert.deepEqual(mouthpieceColorVariants("GearMouthpiece_None"), []);
});
test("existing mouthpiece recoloring is seeded, consistent across outfits and preserves other gear", () => {
  const source = [{ loadoutElements: [{ slotType: "MouthWear", itemAssetName: "GearMouthpiece_PacifierDualHanging_White" }, { slotType: "HeadWear", itemAssetName: "CustomHelmet" }, { slotType: "MouthWear", itemAssetName: "Unknown_Mouthpiece" }] }];
  source.push(structuredClone(source[0]));
  const a = structuredClone(source), b = structuredClone(source);
  const changes = randomizeExistingMouthpieceColors(a, mulberry32(807), true);
  assert.deepEqual(randomizeExistingMouthpieceColors(b, mulberry32(807), true), changes);
  assert.deepEqual(a, b); assert.equal(changes.length, 1);
  assert.equal(a[0].loadoutElements[0].itemAssetName, a[1].loadoutElements[0].itemAssetName);
  for (const loadout of a) assert.deepEqual(loadout.loadoutElements.slice(1), source[0].loadoutElements.slice(1));
});
const player = (row, visuals = row) => ({ isEmpty: false, FirstName: "Test", LastName: String(row), CharacterVisuals: ref(10, visuals), TeamIndex: 1, Position: "WR", SchoolYear: "Junior", IsNIL: false });
const visual = () => ({ isEmpty: false, RawData: JSON.stringify({ loadouts: [{ loadoutType: "PlayerOnField", loadoutElements: [{ slotType: "HeadWear", itemAssetName: "KeepHelmet" }, { slotType: "MouthWear", itemAssetName: "GearMouthpiece_None" }] }] }) });
test("existing color option can recolor equipped QB mouthpieces without adding one to bare QBs", () => {
  const players = [player(0), player(1)], visuals = [visual(), visual()]; players.forEach(item => item.Position = "QB");
  const equipped = JSON.parse(visuals[0].RawData); equipped.loadouts[0].loadoutElements[1].itemAssetName = "GearMouthpiece_PacifierDualHanging_White"; visuals[0].RawData = JSON.stringify(equipped);
  const bare = visuals[1].RawData;
  const result = applyGlobalEquipmentFixes(players, visuals, 10, { unlockedMouthpieceFix: true, randomizeExistingMouthpieceColors: true, seed: 1 });
  assert.equal(result.unlockedMouthpiecePlayersChanged, 0); assert.equal(result.existingMouthpieceColorsChanged, 1); assert.equal(visuals[1].RawData, bare);
});
test("mouthpiece-only pass leaves inactive roster rows and unselected shared visuals unchanged", () => {
  const players = [player(0), player(1, 0), player(2)], visuals = [visual(), visual(), visual()];
  const before = visuals.map(item => item.RawData);
  applyGlobalEquipmentFixes(players, visuals, 10, { unlockedMouthpieceFix: true, activePlayerRows: new Set([0]), seed: 1 });
  assert.deepEqual(visuals.map(item => item.RawData), before);
});
test("mouthpiece-only pass never edits helmets, other gear, body or metadata", () => {
  const players = Array.from({ length: 50 }, (_, row) => player(row)), visuals = players.map(() => visual());
  const result = applyGlobalEquipmentFixes(players, visuals, 10, { unlockedMouthpieceFix: true, seed: 42, activePlayerRows: new Set(players.map((_, row) => row)) });
  assert.ok(result.unlockedMouthpiecePlayersChanged > 0);
  for (const row of visuals) { const actual = JSON.parse(row.RawData); actual.loadouts[0].loadoutElements = actual.loadouts[0].loadoutElements.filter(item => item.slotType !== "MouthWear"); const wanted = JSON.parse(visual().RawData); wanted.loadouts[0].loadoutElements = wanted.loadouts[0].loadoutElements.filter(item => item.slotType !== "MouthWear"); assert.deepEqual(actual, wanted); }
});

for (const corruption of ["visuals", "players"]) test(`staged ${corruption} validation failure keeps the original save and removes the candidate`, { timeout: 30000 }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "equipment-safe-stage-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const savePath = path.join(directory, "DYNASTY-TEST"); fs.copyFileSync(fixture, savePath);
  const original = fs.readFileSync(savePath), loaded = await loadEquipmentTables(savePath, schemaPath);
  const before = snapshotVisualsForVerification(loaded.visuals, snapshotVisualRawData(loaded.visuals.records));
  const strategy = loaded.franchise.strategy, serialize = strategy.file.generateUnpackedContents;
  loaded.franchise.strategy = { ...strategy, file: { ...strategy.file, generateUnpackedContents: (...args) => {
    if (corruption === "players") loaded.players.records.find(record => record && !record.isEmpty).FirstName = "Unplanned";
    else { const record = loaded.visuals.records.find(record => record && !record.isEmpty && typeof record.RawData === "string"); const data = JSON.parse(record.RawData); data.safetyTestMarker = "unplanned"; record.RawData = JSON.stringify(data); }
    return serialize(...args);
  } } };
  await assert.rejects(saveEquipmentCandidate(loaded, schemaPath, before, []), /validated preview|Unexpected change/);
  assert.deepEqual(fs.readFileSync(savePath), original);
  assert.deepEqual(fs.readdirSync(directory), ["DYNASTY-TEST"]);
});

test("packed-container capacity failure keeps the original save and leaves no candidate", { timeout: 30000 }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "equipment-safe-capacity-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const savePath = path.join(directory, "DYNASTY-TEST"); fs.copyFileSync(fixture, savePath);
  const original = fs.readFileSync(savePath), loaded = await loadEquipmentTables(savePath, schemaPath);
  const before = snapshotVisualsForVerification(loaded.visuals, snapshotVisualRawData(loaded.visuals.records));
  const strategy = loaded.franchise.strategy;
  loaded.franchise.strategy = { ...strategy, file: { ...strategy.file, generateUnpackedContents: () => randomBytes(original.length + 1024) } };
  await assert.rejects(saveEquipmentCandidate(loaded, schemaPath, before, []), /cannot fit/);
  assert.deepEqual(fs.readFileSync(savePath), original);
  assert.deepEqual(fs.readdirSync(directory), ["DYNASTY-TEST"]);
});

test("real CharacterVisuals overflow allocation, reopening and release remain safe", { timeout: 30000 }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "equipment-safe-overflow-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const savePath = path.join(directory, "DYNASTY-TEST"); fs.copyFileSync(fixture, savePath);
  let loaded = await loadEquipmentTables(savePath, schemaPath);
  const record = loaded.visuals.records.find(record => record && !record.isEmpty && typeof record.RawData === "string");
  const original = record.RawData, payload = JSON.parse(original); payload.safetyTestMarker = randomBytes(320).toString("hex");
  const expanded = JSON.stringify(payload), before = snapshotVisualsForVerification(loaded.visuals, snapshotVisualRawData(loaded.visuals.records));
  record.RawData = expanded;
  assert.notEqual(record.Overflow, "0".repeat(32), "payload must exercise actual overflow storage");
  await saveEquipmentCandidate(loaded, schemaPath, before, [{ table: "visuals", row: record.index, newValue: expanded }]);
  loaded = await loadEquipmentTables(savePath, schemaPath);
  assert.deepEqual(JSON.parse(loaded.visuals.records[record.index].RawData), payload);
  const expandedBefore = snapshotVisualsForVerification(loaded.visuals, snapshotVisualRawData(loaded.visuals.records));
  loaded.visuals.records[record.index].RawData = original;
  await saveEquipmentCandidate(loaded, schemaPath, expandedBefore, [{ table: "visuals", row: record.index, newValue: original }]);
  loaded = await loadEquipmentTables(savePath, schemaPath);
  assert.deepEqual(JSON.parse(loaded.visuals.records[record.index].RawData), JSON.parse(original));
  assert.equal(loaded.visuals.records[record.index].Overflow, "0".repeat(32));
});
