// Read-only Frosty resource inventory. Encrypted EBX payloads are not decrypted.
const fs = require("node:fs"), crypto = require("node:crypto");
const files = process.argv.slice(2);
if (!files.length) throw new Error("Usage: node scripts/audit-equipment-mods.cjs <fbmod> [fbmod]");
for (const file of files) {
  const buffer = fs.readFileSync(file);
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== "46524f5354590001") throw new Error("Not a binary Frosty mod: " + file);
  const dataOffset = Number(buffer.readBigInt64LE(12)), dataCount = buffer.readInt32LE(20), payloadStart = dataOffset + dataCount * 16;
  if (!Number.isSafeInteger(dataOffset) || dataOffset < 24 || dataCount < 0 || payloadStart > buffer.length) throw new Error("Invalid mod data table: " + file);
  const strings = buffer.subarray(0, dataOffset).toString("latin1").match(/[ -~]{4,}/g) ?? [];
  const resources = [...new Set(strings.filter(value => /(?:^|\/)items\//i.test(value)))].sort();
  const facepaint = resources.filter(value => /\/facemarks_/i.test(value));
  let encryptedPayloads = 0;
  for (let index = 0; index < dataCount; index++) {
    const relative = Number(buffer.readBigInt64LE(dataOffset + index * 16)), start = payloadStart + relative;
    if (!Number.isSafeInteger(relative) || relative < 0 || start + 8 > buffer.length) throw new Error("Invalid mod payload offset: " + file);
    if (buffer.subarray(start, start + 8).toString() === "FMENC001") encryptedPayloads++;
  }
  console.log(JSON.stringify({ file, sha256: crypto.createHash("sha256").update(buffer).digest("hex"), formatVersion: buffer.readUInt32LE(8), dataCount, encryptedPayloads,
    facepaintOnly: facepaint.filter(value => !/earring/i.test(value)), excludedEarringCombinations: facepaint.filter(value => /earring/i.test(value)),
    otherEquipment: resources.filter(value => !/facemarks_|armtattoo_|cujomatty_armtats_|legtattoo_/i.test(value)),
    limitation: "Manifest resource names only. Exact save ItemName casing, slots, tags, and artwork are not verified by encrypted resource paths. Use a readable merged ItemInfo export or an equipped donor save." }, null, 2));
}
