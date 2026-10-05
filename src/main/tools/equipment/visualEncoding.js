import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import zlib from "node:zlib";

const require = createRequire(import.meta.url), magic = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
let assets;
function collegeVisualAssets() {
  if (!assets) {
    const data = path.resolve(path.dirname(require.resolve("madden-franchise")), "../data");
    const lookup = JSON.parse(fs.readFileSync(path.join(data, "interned-strings/c27/lookup.json"), "utf8"));
    assets = {
      lookup, canonical: new Map(Object.values(lookup).map(value => [value.toLowerCase(), value])),
      dictionary: fs.readFileSync(path.join(data, "zstd-dicts/c27/dict.bin"))
    };
  }
  return assets;
}
function hasCaseAlias(value, canonical) {
  const alias = string => canonical.has(string.toLowerCase()) && canonical.get(string.toLowerCase()) !== string;
  if (typeof value === "string") return alias(value);
  if (Array.isArray(value)) return value.some(item => hasCaseAlias(item, canonical));
  if (value && typeof value === "object") return Object.entries(value).some(([key, item]) => alias(key) || hasCaseAlias(item, canonical));
  return false;
}

// The upstream encoder interns strings case-insensitively. Game-generated
// loadouts also contain literal spellings such as GearLegsBase_leftsleeve,
// which must not turn into GearLegsBase_LeftSleeve when an unrelated item is
// changed. Use ISON's existing literal-string representation for these aliases.
// Every other token stays intact; this is not a relaxed equality comparison.
export function preserveIsonStringCase(ison, expected, lookup) {
  let offset = 0, changed = false;
  const chunks = [];
  const take = size => {
    if (offset + size > ison.length) throw new Error("Truncated equipment ISON data.");
    const bytes = ison.subarray(offset, offset + size); offset += size; return bytes;
  };
  const marker = value => { const bytes = take(1); if (bytes[0] !== value) throw new Error("Equipment ISON structure differs from the proposed loadout."); chunks.push(bytes); };
  const string = wanted => {
    const start = offset, type = take(1)[0];
    let actual;
    if (type === 0x0a) actual = lookup[take(2).readUInt16LE()];
    else if (type === 0x0b) actual = take(take(4).readUInt32LE()).toString("utf8");
    else throw new Error("Equipment ISON string has an unsupported representation.");
    if (actual === wanted) chunks.push(ison.subarray(start, offset));
    else if (typeof actual === "string" && actual.toLowerCase() === wanted.toLowerCase()) {
      const bytes = Buffer.from(wanted, "utf8"), header = Buffer.alloc(5);
      header[0] = 0x0b; header.writeUInt32LE(bytes.length, 1);
      chunks.push(header, bytes); changed = true;
    } else throw new Error("Equipment encoder changed a string beyond its capitalization.");
  };
  const value = wanted => {
    if (typeof wanted === "string") { string(wanted); return; }
    if (Array.isArray(wanted)) { marker(0x0e); for (const item of wanted) value(item); marker(0x12); return; }
    if (wanted && typeof wanted === "object") {
      marker(0x0f);
      for (const [key, item] of Object.entries(wanted)) { marker(0x10); string(key); value(item); }
      marker(0x13); return;
    }
    // Do not repair coercion/truncation or invent representations for null,
    // booleans, or unknown types. The strict round-trip guard still rejects them.
    if (typeof wanted !== "number") throw new Error("Equipment encoder changed an unsupported value type.");
    const start = offset, type = take(1)[0];
    const actual = type === 0x03 ? take(1).readUInt8() : type === 0x00 ? take(1).readInt8() : type === 0x09 ? take(8).readDoubleLE() : NaN;
    if (!Object.is(actual, wanted)) throw new Error("Equipment encoder changed a numeric value.");
    chunks.push(ison.subarray(start, offset));
  };
  marker(0x0d); value(expected); marker(0x11);
  if (offset !== ison.length) throw new Error("Equipment ISON has unexpected trailing data.");
  return changed ? Buffer.concat(chunks) : ison;
}

export function encodeVisualData(codec, value, old, maxLength, context) {
  const encoded = codec.setUnformattedValueFromFormatted(value, old, maxLength, context);
  if (context?.gameYear !== 27 || context?.gameType !== "college" || context?.tableName !== "CharacterVisuals") return encoded;
  const { lookup, dictionary, canonical } = collegeVisualAssets(), expected = JSON.parse(value);
  if (!hasCaseAlias(expected, canonical)) return encoded;
  const start = encoded.indexOf(magic);
  if (start !== 2) return encoded;
  const ison = zlib.zstdDecompressSync(encoded.subarray(start, start + encoded.readUInt16LE()), { dictionary });
  let preserved;
  try { preserved = preserveIsonStringCase(ison, expected, lookup); }
  catch { return encoded; } // Leave any other mismatch for the existing strict guard.
  if (preserved === ison) return encoded;
  let compressed = zlib.zstdCompressSync(preserved, { dictionary });
  if (compressed.length > maxLength) compressed = zlib.zstdCompressSync(preserved, { dictionary, params: { [zlib.constants.ZSTD_c_compressionLevel]: 19 } });
  if (compressed.length > 0xffff) throw new Error("Encoded equipment exceeds its supported length field.");
  const result = Buffer.alloc(2 + Math.max(compressed.length, maxLength));
  result.writeUInt16LE(compressed.length); compressed.copy(result, 2);
  return result;
}
