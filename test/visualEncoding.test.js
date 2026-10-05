import test from "node:test";
import assert from "node:assert/strict";
import { preserveIsonStringCase } from "../src/main/tools/equipment/visualEncoding.js";

const lookup = { 0: "slotType", 1: "itemAssetName", 2: "GearLegsBase_LeftSleeve", 3: "GearLegsBase_RightSleeve" };
const interned = id => Buffer.from([0x0a, id, 0]);
const literal = text => { const data = Buffer.from(text), header = Buffer.alloc(5); header[0] = 0x0b; header.writeUInt32LE(data.length, 1); return Buffer.concat([header, data]); };
const object = pairs => Buffer.concat([Buffer.from([0x0d, 0x0f]), ...pairs.flatMap(([key, value]) => [Buffer.from([0x10]), key, value]), Buffer.from([0x13, 0x11])]);

test("noncanonical game string spellings use literal ISON strings without changing other tokens", () => {
  for (const [id, item] of [[2, "GearLegsBase_leftsleeve"], [3, "GearLegsBase_rightsleeve"]]) {
    const before = object([[interned(0), literal("LegBase")], [interned(1), interned(id)]]);
    const expected = { slotType: "LegBase", itemAssetName: item };
    const result = preserveIsonStringCase(before, expected, lookup);
    assert.deepEqual(result, object([[interned(0), literal("LegBase")], [interned(1), literal(item)]]));
    assert.equal(preserveIsonStringCase(result, expected, lookup), result, "Already exact literal spellings need no rewrite");
  }
});
test("canonical equipment strings keep the original binary representation", () => {
  const data = object([[interned(1), interned(2)]]);
  assert.equal(preserveIsonStringCase(data, { itemAssetName: lookup[2] }, lookup), data);
});
test("nested arrays, case-sensitive keys and Unicode remain exact", () => {
  const data = object([[interned(1), Buffer.concat([Buffer.from([0x0e, 0x0f, 0x10]), interned(0), literal("腕 Δ"), Buffer.from([0x13, 0x12])])]]);
  const result = preserveIsonStringCase(data, { ITEMASSETNAME: [{ slotType: "腕 Δ" }] }, lookup);
  const expected = object([[literal("ITEMASSETNAME"), Buffer.concat([Buffer.from([0x0e, 0x0f, 0x10]), interned(0), literal("腕 Δ"), Buffer.from([0x13, 0x12])])]]);
  assert.deepEqual(result, expected);
});
test("case preservation cannot excuse actual string loss, numeric truncation or structural loss", () => {
  assert.throws(() => preserveIsonStringCase(object([[interned(1), interned(2)]]), { itemAssetName: "DifferentGear" }, lookup), /beyond its capitalization/);
  assert.throws(() => preserveIsonStringCase(object([[literal("number"), Buffer.from([0x03, 0])]]), { number: 512 }, lookup), /numeric value/);
  assert.throws(() => preserveIsonStringCase(object([[interned(1), interned(2)]]), { itemAssetName: null }, lookup), /unsupported value type/);
  assert.throws(() => preserveIsonStringCase(Buffer.from([0x0d, 0x0f, 0x10, 0x0b, 99, 0, 0, 0]), { itemAssetName: "Gear" }, lookup), /Truncated/);
});
