// Container-only probe: retain the exact decompressed hanging save, but pack
// it inside the working backup's original reserved file size.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const working = process.argv[2], hanging = process.argv[3], offset = 82;
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const original = fs.readFileSync(working), bad = fs.readFileSync(hanging), hashes = [hash(original), hash(bad)];
const unpacked = zlib.inflateSync(bad.subarray(offset)), compressed = zlib.deflateSync(unpacked, { level: 9 });
assert.ok(compressed.length <= original.length - offset);
const repaired = Buffer.from(original); bad.subarray(0, offset).copy(repaired); compressed.copy(repaired, offset); repaired.writeUIntLE(compressed.length, 0x4a, 3);
assert.deepEqual(zlib.inflateSync(repaired.subarray(offset)), unpacked, "Every unpacked byte, not just equipment, stays identical");
const directory = fs.mkdtempSync(path.resolve("outputs/patcher-container-probe-")), savePath = path.join(directory, "DYNASTY-PATCHER-CONTAINER-PROBE"); fs.writeFileSync(savePath, repaired);
assert.deepEqual([hash(fs.readFileSync(working)), hash(fs.readFileSync(hanging))], hashes);
const result = { savePath, originalSize: original.length, hangingSize: bad.length, repairedSize: repaired.length, compressedSize: compressed.length, identicalUnpackedBytes: true, originalsUnchanged: true };
fs.writeFileSync(path.join(directory, "result.json"), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
