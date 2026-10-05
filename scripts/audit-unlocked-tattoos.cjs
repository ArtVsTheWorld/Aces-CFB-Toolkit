// Read-only mod inventory: resource names are not proof of valid save ItemName casing.
// Data-table layout reference: FrostyPlugin/IO/FrostyModReader.cs in FrostyToolsuite.
const fs = require("node:fs"), crypto = require("node:crypto");
const file = process.argv[2];
if (!file) throw new Error("Usage: node scripts/audit-unlocked-tattoos.cjs <fbmod>");
const buffer = fs.readFileSync(file);
if (buffer.subarray(0, 8).toString("hex") !== "46524f5354590001") throw new Error("Not a binary Frosty mod.");
const dataOffset = Number(buffer.readBigInt64LE(12)), dataCount = buffer.readInt32LE(20);
const strings = buffer.subarray(0, dataOffset).toString("latin1").match(/[ -~]{4,}/g) ?? [];
const resources = [...new Set(strings.filter(value => /(?:^|\/)items\/(?:armtattoo_|cujomatty_armtats_|body\/legtattoo\/legtattoo_)/i.test(value)))].sort();
let encryptedPayloads = 0;
for (let index = 0; index < dataCount; index++) {
  const offset = Number(buffer.readBigInt64LE(dataOffset + index * 16));
  if (buffer.subarray(dataOffset + dataCount * 16 + offset, dataOffset + dataCount * 16 + offset + 8).toString() === "FMENC001") encryptedPayloads++;
}
console.log(JSON.stringify({ file, sha256: crypto.createHash("sha256").update(buffer).digest("hex"), formatVersion: buffer.readUInt32LE(8), dataCount, encryptedPayloads, cujoMatty: resources.filter(value => /cujomatty/i.test(value)), legs: resources.filter(value => /legtattoo/i.test(value)), polynesian: resources.filter(value => /polynesian/i.test(value)), japaneseExcluded: resources.filter(value => /japanese/i.test(value)), limitation: "Resource inventory only; encrypted payloads prevent verification of prefab ItemName, slot, and render behavior." }, null, 2));
