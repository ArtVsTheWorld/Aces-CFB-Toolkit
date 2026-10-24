import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {encodeSaveFriendlyVisualFrame} from '../src/main/tools/equipment/visualEncoding.js';

const payload = Buffer.from(Array.from({length: 100}, (_, i) => JSON.stringify({player: i % 11, gear: `GearHelmet_SpeedFlex_${i % 17}`, color: i % 4, extra: Array.from({length: 5}, (_, j) => `Arm_${(i + j) % 7}`)})).join(''));
const compressed = level => zlib.zstdCompressSync(payload, {params: {[zlib.constants.ZSTD_c_compressionLevel]: level}});
function frame(data, maxLength) { const bytes = Buffer.alloc(2 + Math.max(data.length, maxLength)); bytes.writeUInt16LE(data.length); data.copy(bytes, 2); return bytes; }
const decode = bytes => zlib.zstdDecompressSync(bytes.subarray(2, 2 + bytes.readUInt16LE()));

test('visual compression preserves every encoded byte and its complete physical-storage class', () => {
  const input = frame(compressed(19), 1024), saved = Buffer.from(input), output = encodeSaveFriendlyVisualFrame(input, 1024);
  assert.deepEqual(decode(output), payload); assert.deepEqual(input, saved);
  assert.equal(output.length, 1026); assert.ok(output.readUInt16LE() <= 1024);
});

test('a different frame representation cannot turn an inline visual into an overflow allocation', () => {
  const native = compressed(19), fast = compressed(1); assert.ok(fast.length > native.length);
  const input = frame(native, native.length);
  assert.equal(encodeSaveFriendlyVisualFrame(input, native.length), input);
});

test('a different frame representation cannot release an existing overflow allocation', () => {
  const native = zlib.zstdCompressSync(payload, {params: {[zlib.constants.ZSTD_c_compressionLevel]: 1, [zlib.constants.ZSTD_c_checksumFlag]: 1}}), fast = compressed(1);
  assert.ok(native.length > fast.length && native.length <= 2 * fast.length + 2);
  const input = frame(native, fast.length);
  assert.equal(encodeSaveFriendlyVisualFrame(input, fast.length), input);
});

test('a representation exceeding the two existing blocks is rejected even when both versions need overflow', () => {
  const native = compressed(19), fast = compressed(1), maxLength = Math.floor((fast.length - 4) / 2);
  assert.ok(native.length > maxLength && native.length <= 2 * maxLength + 2);
  assert.ok(fast.length > 2 * maxLength + 2);
  const input = frame(native, maxLength);
  assert.equal(encodeSaveFriendlyVisualFrame(input, maxLength), input);
});

test('unrecognized frames remain untouched and truncated frame data fails closed', () => {
  const opaque = Buffer.from('unknown codec'); assert.equal(encodeSaveFriendlyVisualFrame(opaque, 1024), opaque);
  const input = frame(compressed(3), 1024); input.writeUInt16LE(input.length, 0);
  assert.throws(() => encodeSaveFriendlyVisualFrame(input, 1024), /Truncated encoded equipment/);
});
