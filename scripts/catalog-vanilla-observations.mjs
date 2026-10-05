// Emits a filtered catalog for review; never dumps process bytes or modifies
// source data. Pass ItemInfo probe JSON files from an unmodded game session.
import fs from "node:fs";
const items = new Map();
for (const file of process.argv.slice(2)) {
  const probe = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const record of probe.Records ?? []) {
    if (!record.RepeatedNameFields || !/^(?:Gear|ArmSleeve|ElbowGear|Handwarmer|Waist|GuardianCap|Towel|ThighPad|G_|Backplate|Flakjacket|KneePad|OakleyPrizm|Neckwear|NeckWear|ArmTattoo|LegTattoo|Face)/.test(record.ItemName)) continue;
    const label = record.Labels.find(label => label.FieldOffset === 56)?.Value;
    if (!label || label === record.ItemName || /^(?:LoadoutSlot|CharacterRoleType)_/.test(label)) continue;
    const old = items.get(record.ItemName);
    if (old && old.displayName !== label) throw new Error(`Conflicting labels for ${record.ItemName}. Review the evidence.`);
    items.set(record.ItemName, { itemName: record.ItemName, displayName: label });
  }
}
console.log(JSON.stringify({ observed: "2026-10-05", source: "Structurally checked ItemInfo records from a user-confirmed unmodded College Football 27 process.",
  scope: "Observation only, not proof of menu availability. Built-in locked items can be loaded without a mod. Do not automatically move these into vanilla generation pools or replace mod-specific display labels.",
  recordCheck: "Repeated ItemName fields and the DisplayName field at +56 agree. Process addresses and raw memory are not distributed.",
  items: [...items.values()].sort((a, b) => a.itemName.localeCompare(b.itemName)) }, null, 2));
