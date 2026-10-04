import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { openCfb27Save, readTables } from "../src/main/services/save.js";
import { VISUALS_TABLE_UID, snapshotVisualRawData } from "../src/main/tools/equipment/shared.js";
import { installVisualsWriteSafety, snapshotVisualsForVerification, saveEquipmentCandidate, verifyVisualSnapshot } from "../src/main/tools/equipment/visualsSafety.js";
import { isVisualOverflowStorage } from "../src/main/tools/equipment/visualStorage.js";
import { parseRef, sf } from "../src/main/tools/equipment/openSave.js";
const fixture = path.resolve("../EXAMPLE SAVES VANILLA GAME/DYNASTY-LSUTESTSAVEPRESZN"), schema = path.resolve("resources/engine-data/C27_486_6.gz"), residual = JSON.parse(fs.readFileSync(new URL("./fixtures/equipmentOverflowResidual.json", import.meta.url), "utf8"));
const field = record => record.getFieldByKey("RawData").thirdTableField;
const ref = (table, row) => table.toString(2).padStart(15, "0") + row.toString(2).padStart(17, "0");
async function read(savePath, safety = true) { const opened = await openCfb27Save(savePath, schema), tables = await readTables(opened.franchise, { visuals: VISUALS_TABLE_UID }); if (safety) installVisualsWriteSafety(tables.visuals); return { ...opened, ...tables }; }
function setup(t) { const directory = fs.mkdtempSync(path.join(os.tmpdir(), "v182-visual-storage-")), savePath = path.join(directory, "DYNASTY-TEST"); t.after(() => fs.rmSync(directory, { recursive: true, force: true })); fs.copyFileSync(fixture, savePath); return savePath; }
const eligible = table => table.records.filter(record => !record.isEmpty && !parseRef(record.Overflow) && field(record).index > 0 && typeof sf(record, "RawData") === "string");
const setOffset = (record, offset) => { field(record).offset = offset; record.isChanged = true; };
async function commit(loaded, row, expected) { const before = snapshotVisualsForVerification(loaded.visuals, snapshotVisualRawData(loaded.visuals.records)); loaded.visuals.records[row].RawData = expected; await saveEquipmentCandidate(loaded, schema, before, [{ table: "visuals", row, newValue: expected }]); }
for (const shared of [false, true]) test(`physical aliases detach on write without changing another row (overflow ${shared})`, { timeout: 60000 }, async t => {
  const savePath = setup(t); let loaded = await read(savePath, false);
  const [owner, alias] = eligible(loaded.visuals), ownerRow = owner.index, aliasRow = alias.index;
  if (shared) {
    installVisualsWriteSafety(loaded.visuals);
    const original = JSON.parse(owner.RawData); original.safetyTestMarker = randomBytes(320).toString("hex");
    await commit(loaded, ownerRow, JSON.stringify(original));
    loaded = await read(savePath, false);
    assert.ok(parseRef(loaded.visuals.records[ownerRow].Overflow));
  }
  setOffset(loaded.visuals.records[aliasRow], field(loaded.visuals.records[ownerRow]).index);
  loaded.visuals.records[aliasRow].Overflow = loaded.visuals.records[ownerRow].Overflow;
  await loaded.franchise.save();
  loaded = await read(savePath);
  const poolLength = loaded.visuals.header.table3Length;
  const wantedOwner = loaded.visuals.records[ownerRow].RawData;
  assert.equal(loaded.visuals.records[aliasRow].RawData, wantedOwner);
  const expected = JSON.parse(wantedOwner); expected.safetyTestMarker = shared ? randomBytes(320).toString("hex") : "detached alias";
  await commit(loaded, aliasRow, JSON.stringify(expected));
  loaded = await read(savePath);
  assert.deepEqual(JSON.parse(loaded.visuals.records[ownerRow].RawData), JSON.parse(wantedOwner));
  assert.deepEqual(JSON.parse(loaded.visuals.records[aliasRow].RawData), expected);
  assert.notEqual(field(loaded.visuals.records[aliasRow]).index, field(loaded.visuals.records[ownerRow]).index);
  if (shared) assert.notEqual(loaded.visuals.records[aliasRow].Overflow, loaded.visuals.records[ownerRow].Overflow);
  assert.equal(loaded.visuals.header.table3Length, poolLength, "Copy-on-write must stay inside the game's preallocated pool");
  for (const record of loaded.visuals.records) if (!record.isEmpty) assert.ok(field(record).index + field(record).maxLength + 2 <= poolLength);
  // A second saved edit and identical replay must preserve both logical rows.
  await commit(loaded, aliasRow, JSON.stringify(expected));
  loaded = await read(savePath);
  assert.deepEqual(JSON.parse(loaded.visuals.records[aliasRow].RawData), expected);
  assert.deepEqual(JSON.parse(loaded.visuals.records[ownerRow].RawData), JSON.parse(wantedOwner));
});
test("real two-byte continuation with a residual frame is never treated as another loadout or preview assignment", { timeout: 60000 }, async t => {
  const savePath = setup(t); let loaded = await read(savePath, false), table = loaded.visuals;
  const main = eligible(table)[0], row = main.index, spillRow = table.header.nextRecordToUse, spill = table.records[spillRow];
  spill.Overflow = "0".repeat(32);
  Buffer.from(residual.main, "base64").copy(table.data, table.header.table3StartIndex + field(main).index);
  Buffer.from(residual.spill, "base64").copy(table.data, table.header.table3StartIndex + field(spill).index);
  main.Overflow = ref(table.header.tableId, spillRow);
  await loaded.franchise.save();
  loaded = await read(savePath, false); table = loaded.visuals;
  assert.deepEqual(JSON.parse(table.records[row].RawData), residual.expected);
  assert.equal(field(table.records[row]).unformattedValue.readUInt16LE(0) - field(table.records[row]).maxLength, 2);
  assert.ok(sf(table.records[spillRow], "RawData")?.includes("PlayerOnField"), "Legacy decoder finds an unrelated residual frame in the continuation");
  // Clear the old incidental decoded cache before installing the production reader.
  loaded = await read(savePath); table = loaded.visuals;
  assert.equal(isVisualOverflowStorage(table.records[spillRow]), true);
  assert.equal(snapshotVisualRawData(table.records).get(spillRow), undefined);
  const expected = structuredClone(residual.expected);
  for (const loadout of expected.loadouts) if (loadout.loadoutType === "PlayerOnField") for (const item of loadout.loadoutElements) if (item.slotType === "MouthWear") item.itemAssetName = "GearMouthpiece_PacifierDual_SecondaryColor";
  await commit(loaded, row, JSON.stringify(expected));
  loaded = await read(savePath);
  assert.deepEqual(JSON.parse(loaded.visuals.records[row].RawData), expected);
  assert.equal(parseRef(loaded.visuals.records[row].Overflow), null);
  assert.equal(loaded.visuals.records[spillRow].isEmpty, true);
});
test("same-table consecutive overflow growth and shrink do not shift adjacent equipment bytes", { timeout: 60000 }, async t => {
  const savePath = setup(t), loaded = await read(savePath), row = eligible(loaded.visuals)[0].index;
  const original = loaded.visuals.records[row].RawData, expected = JSON.parse(original); expected.safetyTestMarker = randomBytes(320).toString("hex");
  await commit(loaded, row, JSON.stringify(expected));
  assert.ok(parseRef(loaded.visuals.records[row].Overflow));
  await commit(loaded, row, original);
  const reopened = await read(savePath);
  assert.deepEqual(JSON.parse(reopened.visuals.records[row].RawData), JSON.parse(original));
  assert.equal(parseRef(reopened.visuals.records[row].Overflow), null);
});

test("a compact inline loadout keeps all previewed fields when an adjacent changed loadout grows into overflow", { timeout: 60000 }, async t => {
  const savePath = setup(t), loaded = await read(savePath), table = loaded.visuals;
  const rows = eligible(table).sort((a, b) => field(a).index - field(b).index);
  const upstream = rows.find((record, index) => rows[index + 1] && field(rows[index + 1]).index === field(record).index + field(record).maxLength + 2);
  assert.ok(upstream, "Find genuinely adjacent physical blocks, without relying on specific row IDs");
  const target = rows[rows.indexOf(upstream) + 1];
  // The supplied Patcher case is a compact, inline loadout with sparse elements
  // (including a facemask without slotType). Keep this actual data shape intact.
  const compact = JSON.parse(fs.readFileSync(new URL("./fixtures/equipmentShortInline.json", import.meta.url), "utf8"));
  await commit(loaded, target.index, JSON.stringify(compact));
  assert.equal(parseRef(target.Overflow), null);
  const before = snapshotVisualsForVerification(table, snapshotVisualRawData(table.records)), targetOffset = field(target).index;
  const expanded = JSON.parse(upstream.RawData);
  expanded.safetyTestMarker = Array.from({ length: 10 }, (_, index) => createHash("sha256").update(`adjacent-overflow-${index}`).digest("hex")).join("");
  const proposed = structuredClone(compact), onField = proposed.loadouts.find(loadout => loadout.loadoutType === "PlayerOnField");
  for (const item of onField.loadoutElements) {
    if (["LeftArmWear", "RightArmWear"].includes(item.slotType)) item.itemAssetName = "GearArmSleeve_NikeProDriFitSleeve_White";
    if (["LeftHandWear", "RightHandWear"].includes(item.slotType)) item.itemAssetName = "GearHand_glove_JordanVaporJet7_White";
    if (item.slotType === "MouthWear") item.itemAssetName = "GearMouthpiece_PacifierDualHanging_TeamColor7";
  }
  const assignments = [{ table: "visuals", row: upstream.index, newValue: JSON.stringify(expanded) }, { table: "visuals", row: target.index, newValue: JSON.stringify(proposed) }];
  for (const change of assignments) table.records[change.row].RawData = change.newValue;
  assert.ok(parseRef(upstream.Overflow), "Exercise combined main/continuation buffers alongside an inline mutation");
  assert.equal(field(target).index, targetOffset, "Storage growth must not shift the adjacent inline block");
  await saveEquipmentCandidate(loaded, schema, before, assignments);
  const reopened = await read(savePath);
  assert.deepEqual(JSON.parse(reopened.visuals.records[upstream.index].RawData), expanded);
  assert.deepEqual(JSON.parse(reopened.visuals.records[target.index].RawData), proposed);
  assert.equal(field(reopened.visuals.records[target.index]).index, targetOffset);
});
test("true invalid links, exhaustion and oversize payloads still fail before publishing", { timeout: 60000 }, async t => {
  const savePath = setup(t), loaded = await read(savePath), record = eligible(loaded.visuals)[0], original = fs.readFileSync(savePath), raw = record.RawData;
  record.Overflow = ref(loaded.visuals.header.tableId + 1, 1);
  assert.throws(() => { record.RawData = raw; }, /invalid overflow reference/);
  assert.deepEqual(fs.readFileSync(savePath), original);
  record.Overflow = "0".repeat(32);
  const huge = JSON.parse(raw); huge.safetyTestMarker = randomBytes(3000).toString("hex");
  assert.throws(() => { record.RawData = JSON.stringify(huge); }, /exceeds safe CharacterVisuals storage/);
  assert.deepEqual(fs.readFileSync(savePath), original);
  for (const candidate of loaded.visuals.records) candidate.isEmpty = false;
  const expanded = JSON.parse(raw); expanded.safetyTestMarker = randomBytes(320).toString("hex");
  assert.throws(() => { record.RawData = JSON.stringify(expanded); }, /no free overflow storage/);
  assert.deepEqual(fs.readFileSync(savePath), original);
});
test("reopened verification allows original shared tails but rejects new sharing and chains", () => {
  const records = [{ index: 0, RawData: "{}", Overflow: ref(10, 2), isEmpty: false }, { index: 1, RawData: "{}", Overflow: ref(10, 2), isEmpty: false }, { index: 2, RawData: null, Overflow: "0".repeat(32), isEmpty: false }], table = { header: { tableId: 10 }, records };
  const before = snapshotVisualsForVerification(table, new Map([[0, "{}"], [1, "{}"], [2, undefined]]));
  assert.doesNotThrow(() => verifyVisualSnapshot(before, table, []));
  before.originalOverflowOwners = new Map([[2, new Set([0])]]);
  assert.throws(() => verifyVisualSnapshot(before, table, []), /introduced shared overflow/);
  records[2].Overflow = ref(10, 0);
  assert.throws(() => verifyVisualSnapshot(before, table, []), /storage is invalid/);
});
test("the complete physical continuation capacity round-trips without truncation", { timeout: 60000 }, async t => {
  const savePath = setup(t), loaded = await read(savePath), record = eligible(loaded.visuals)[0], codec = field(record);
  const payload = JSON.parse(record.RawData), capacity = 2 * (codec.maxLength + 2);
  let expected;
  // A random prefix can jump over the exact compressed size, making a valid
  // writer fail this test intermittently. Search repeatable marker variants;
  // retain the strict assertion that both physical blocks are completely full.
  for (let variant = 0; variant < 32 && !expected; variant++) {
    const marker = Array.from({ length: 32 }, (_, block) => createHash("sha256").update(`v182-full-capacity:${variant}:${block}`).digest("hex")).join("");
    for (let size = 300; size < marker.length; size++) {
      payload.safetyTestMarker = marker.slice(0, size);
      const json = JSON.stringify(payload), encoded = codec.strategy.setUnformattedValueFromFormatted(json, codec.unformattedValue, codec.maxLength, codec.strategyContext);
      if (encoded.length === capacity) { expected = json; break; }
      if (encoded.length > capacity + 5) break;
    }
  }
  assert.ok(expected, "Exercise every byte of both physical blocks, including the continuation's final two bytes");
  await commit(loaded, record.index, expected);
  const saved = await read(savePath);
  assert.deepEqual(JSON.parse(saved.visuals.records[record.index].RawData), JSON.parse(expected));
});
