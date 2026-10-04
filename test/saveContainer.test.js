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
test("a default-compressed candidate exceeding the reserve is recompressed losslessly without growing the save", () => {
  const defaultPacked = zlib.deflateSync(payload), stronger = zlib.deflateSync(payload, { level: 9 });
  assert.ok(stronger.length < defaultPacked.length);
  const original = container(Buffer.from("original"), Math.floor((defaultPacked.length + stronger.length) / 2)), savedOriginal = Buffer.from(original);
  const packed = packFixedSaveContainer(original, defaultPacked);
  assert.equal(packed.length, original.length); assert.deepEqual(zlib.inflateSync(packed.subarray(82)), payload);
  assert.equal(validateSaveContainer(packed, original.length).compressedLength, stronger.length);
  assert.deepEqual(original, savedOriginal); assert.deepEqual(packed.subarray(82 + stronger.length), original.subarray(82 + stronger.length));
  assert.deepEqual(packed.subarray(0, 0x4a), original.subarray(0, 0x4a));
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
  const cap = zlib.deflateSync(payload, { level: 9 }).length + 100; franchise.packedFileContents = container(Buffer.from("old"), cap);
  await writeFixedSaveCandidate(franchise, destination); assert.equal(fs.statSync(destination).size, cap + 82);
  assert.equal(franchise.strategy, strategy); assert.deepEqual(zlib.inflateSync(fs.readFileSync(destination).subarray(82)), payload);
});
