import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { packFixedSaveContainer, validateSaveContainer, writeFixedSaveCandidate } from "../src/main/services/saveContainer.js";
function container(payload, capacity) {
  const compressed = zlib.deflateSync(payload), bytes = Buffer.alloc(82 + capacity, 0xa5);
  bytes.write("FBCHUNKS", 0, "ascii"); bytes.writeUIntLE(compressed.length, 0x4a, 3); compressed.copy(bytes, 82);
  return bytes;
}
const payload = Buffer.from(Array.from({ length: 5000 }, (_, i) => JSON.stringify({ player: i, team: i % 138, helmet: "GearHelmet_Speed_Flex", color: i % 4, gear: Array.from({ length: 5 }, (_, j) => `Gear_Arm_${(i + j) % 50}`) })).join(""));
test("an oversized candidate is rejected instead of being made to fit only through stronger outer compression", () => {
  const defaultPacked = zlib.deflateSync(payload), stronger = zlib.deflateSync(payload, { level: 9 });
  assert.ok(stronger.length < defaultPacked.length);
  const original = container(Buffer.from("original"), Math.floor((defaultPacked.length + stronger.length) / 2)), savedOriginal = Buffer.from(original);
  assert.throws(() => packFixedSaveContainer(original, defaultPacked), {code: 'SAVE_CONTAINER_CAPACITY'});
  assert.deepEqual(original, savedOriginal);
});
test("ordinary candidates retain their compression and the original reserved padding", () => {
  const original = container(Buffer.from("old"), 500), compressed = zlib.deflateSync(Buffer.from("new equipment"));
  const packed = packFixedSaveContainer(original, compressed);
  assert.deepEqual(packed.subarray(82, 82 + compressed.length), compressed);
  assert.deepEqual(packed.subarray(82 + compressed.length), original.subarray(82 + compressed.length));
  assert.equal(packed.length, original.length);
});
test("unfit data, changed file size, wrong length metadata and malformed containers fail closed", () => {
  assert.throws(() => packFixedSaveContainer(container(Buffer.from("old"), 40), zlib.deflateSync(payload)), /cannot fit/);
  const original = container(Buffer.from("old"), 500);
  assert.throws(() => validateSaveContainer(original, original.length - 1), /reserved file size/);
  const invalid = Buffer.from(original); invalid.writeUIntLE(499, 0x4a, 3);
  assert.throws(() => validateSaveContainer(invalid), /does not match/);
  assert.throws(() => validateSaveContainer(Buffer.alloc(500)), /Unsupported/);
});
test("candidate serialization propagates capacity errors without writing a partial file or modifying global strategies", async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fixed-save-container-")); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const destination = path.join(dir, "candidate"), strategy = { file: { generateUnpackedContents: () => payload } };
  const franchise = { strategy, tables: [], unpackedFileContents: payload, packedFileContents: container(Buffer.from("old"), 40), save: () => assert.fail("Generic growing writer must not be called") };
  await assert.rejects(writeFixedSaveCandidate(franchise, destination), /cannot fit/); assert.equal(fs.existsSync(destination), false);
  const cap = zlib.deflateSync(payload).length + 100; franchise.packedFileContents = container(Buffer.from("old"), cap);
  await writeFixedSaveCandidate(franchise, destination); assert.equal(fs.statSync(destination).size, cap + 82);
  assert.equal(franchise.strategy, strategy); assert.deepEqual(zlib.inflateSync(fs.readFileSync(destination).subarray(82)), payload);
});

test('the production writer requires normal compression to fit, even if an optional stronger stream would fit', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'normal-save-budget-')); t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  const destination = path.join(dir, 'candidate'), original = container(Buffer.from('old'), zlib.deflateSync(payload, {level: 9}).length + 10), before = Buffer.from(original);
  const franchise = {tables: [], packedFileContents: original, strategy: {file: {generateUnpackedContents: () => payload}}};
  await assert.rejects(writeFixedSaveCandidate(franchise, destination, {allowStrongCompression: true}), {code: 'SAVE_CONTAINER_CAPACITY'});
  assert.equal(fs.existsSync(destination), false); assert.deepEqual(original, before);
});

test('capacity failure cannot invoke a legacy storage mutation hook or replace the reviewed payload', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fixed-save-recovery-')); t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  const destination = path.join(dir, 'candidate'), original = Buffer.from('original');
  let calls = 0, recoveries = 0;
  const franchise = {tables: [], unpackedFileContents: original, packedFileContents: container(original, 100), strategy: {file: {generateUnpackedContents: (tables, baseline) => {
    calls++;
    assert.deepEqual(baseline, original);
    return payload;
  }}}};
  await assert.rejects(writeFixedSaveCandidate(franchise, destination, {onCapacityFailure: () => {recoveries++; return true;}}), {code: 'SAVE_CONTAINER_CAPACITY'});
  assert.equal(calls, 1); assert.equal(recoveries, 0);
  assert.equal(fs.existsSync(destination), false);
});
