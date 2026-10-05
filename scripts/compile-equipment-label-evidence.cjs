// Compile filtered, structurally checked evidence. No game/app/save changes.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../outputs');
const input = JSON.parse(fs.readFileSync(path.join(root, 'runtime-equipment-label-records-2026-10-02.json')));
const byName = new Map();
for (const record of input.Records) {
  if (!record.RepeatedNameFields) continue;
  for (const label of record.Labels) {
    if (label.FieldOffset !== 56 || /[_/]/.test(label.Value)) continue;
    const displayName = label.Value.trim();
    const existing = byName.get(record.ItemName);
    if (existing && existing.displayName !== displayName) throw new Error(`Conflicting labels: ${record.ItemName}`);
    const entry = existing ?? { itemName: record.ItemName, displayName, records: [] };
    if (!entry.records.some(value => value.itemNameField === record.NamePointerAddress)) {
      entry.records.push({ itemNameField: record.NamePointerAddress, displayNameOffset: 56, labelAddress: label.Address });
    }
    byName.set(record.ItemName, entry);
  }
}
const anchors = {
  GearArmSleeve_NikeProDriFitSleeve2_Black: 'Double Sleeve Black and Primary',
  GearArmSleeve_NikeProDriFitSleeve2a_Black: 'Double Sleeve Black and Secondary',
  GearArmSleeve_NikeProDriFitSleeve2_SecondaryColor: 'Double Sleeve Secondary and Primary',
  GearArmSleeve_NikeProDriFitSleeve2_TeamColor: 'Double Sleeve Primary and Secondary',
  GearMouthpiece_PacifierDualHanging_White4: 'Hanging Mouthpiece Pacifier Black and Green',
  GearMouthpiece_PacifierDualHanging_White5: 'Hanging Mouthpiece Pacifier Smoke Blue and Pink',
  GearMouthpiece_PacifierDualHanging_White6: 'Hanging Mouthpiece Pacifier Cosmic Peach',
  GearMouthpiece_PacifierDualHanging_White7: 'Hanging Mouthpiece Pacifier Neon Blue and Pink',
  GearMouthpiece_PacifierDualHanging_White8: 'Hanging Mouthpiece Pacifier Smoke Blue',
  GearMouthpiece_PacifierDualHanging_White9: 'Hanging Mouthpiece Pacifier Pink and Green',
  ArmTattoo_Tattoos_Japanese_08_ArmSleeve_v02: 'CM Generic 19',
};
for (const [name, expected] of Object.entries(anchors)) {
  if (byName.get(name)?.displayName !== expected) throw new Error(`Workbook anchor failed: ${name}`);
}
const result = {
  date: '2026-10-02',
  processId: 54224,
  method: 'Ordinary read-only process queries. Candidate labels require matching repeated ItemName fields 96 and 160 bytes before the ItemName field, and the display label at offset +56. Long-string pointers and short inline strings are supported. Eleven known labels independently match the original ItemInfo export. Arbitrary neighboring strings are not accepted.',
  evidence: 'runtime-equipment-label-records-2026-10-02.json',
  scan: { bytesRead: input.BytesRead, seconds: input.Seconds, readFailures: input.ReadFailures, stopReason: input.StopReason },
  verified: [...byName.values()].sort((a, b) => a.itemName.localeCompare(b.itemName)),
  limits: [
    'These are display-label associations, not proof of per-item slot, mod provenance, color availability, artwork, or actual in-game rendering.',
    'No white double-sleeve variant was found in the available loaded catalog or exports; absence from these sources does not prove no asset exists anywhere.',
    'Rubber Bands 1/2/3 do not describe colors or style in their source labels.',
    'Japanese 08 v03 remains a manifest-only candidate without a verified selectable ItemName/display-label pair.',
    'Normal and under-lip FaceGear balaclavas are distinct from the older repurposed GearNeckpad masks. Do not infer the same slot or source classification from their appearance.',
  ],
};
fs.writeFileSync(path.join(root, 'equipment-displaynames-sourced-2026-10-02.json'), JSON.stringify(result, null, 2) + '\n');
console.log(`${result.verified.length} unique verified display labels; ${Object.keys(anchors).length} workbook anchors passed.`);
