// Filtered, read-only diagnostic catalog. No process addresses/raw bytes are
// distributed, and observations never automatically enter generation pools.
import fs from "node:fs";
import path from "node:path";
import { UNLOCKED_TATTOO_POOL } from "../src/main/tools/equipment/core/tattoos.js";
import { EQUIPMENT_ITEMS, equipmentDisplayName, equipmentItem } from "../src/main/tools/equipment/catalog.js";

const root = path.resolve("outputs"), probes = process.argv.slice(2);
if (!probes.length) throw new Error("Pass modded-session ItemInfo probe JSON files.");
const baseline = JSON.parse(fs.readFileSync("src/main/tools/equipment/equipmentVanillaObservation.json", "utf8"));
const vanillaNames = new Set(baseline.items.map(item => item.itemName));
const vanillaLabels = new Map(baseline.items.map(item => [item.itemName, item.displayName]));
const inventory = JSON.parse(fs.readFileSync("src/main/tools/equipment/equipmentModInventory.json", "utf8"));
const rawUpdate = JSON.parse(fs.readFileSync("src/main/tools/equipment/equipmentRaw204Inventory.json", "utf8"));
const faceOrigins = new Map(Object.entries(inventory.mods).flatMap(([origin, mod]) => mod.facepaintItemNames.map(name => [name, origin])));
const manifestText = fs.readFileSync(path.join(root, "v190-current-mod-manifests.json"), "utf8");
const manifests = manifestText.trim().split(/(?<=\})\s*(?=\{\s*"file")/).map(JSON.parse);
const manifestNames = manifests.map(manifest => ({ mod: /Raw Accessories/i.test(manifest.file) ? "raw" : "unlocked", names: new Set([...manifest.facepaintOnly, ...manifest.otherEquipment, ...manifest.excludedEarringCombinations].map(resource => resource.split("/").at(-1).toLowerCase())) }));
const records = new Map();
for (const probe of probes) for (const record of JSON.parse(fs.readFileSync(probe, "utf8")).Records ?? []) {
  if (!record.RepeatedNameFields) continue;
  const label = record.Labels.find(label => label.FieldOffset === 56)?.Value;
  if (!label || label === record.ItemName || /^(?:LoadoutSlot|CharacterRoleType)_/.test(label)) continue;
  const previous = records.get(record.ItemName);
  if (previous && previous.displayName !== label) throw new Error(`Conflicting live labels for ${record.ItemName}.`);
  const known = equipmentItem(record.ItemName), resources = manifestNames.filter(manifest => manifest.names.has(record.ItemName.toLowerCase())).map(manifest => manifest.mod);
  const knownOrigin = faceOrigins.get(record.ItemName) ?? known?.origin ?? (known ? "catalog" : undefined);
  const origin = knownOrigin && knownOrigin !== "unverified" ? knownOrigin : resources.length === 1 ? resources[0] : "unresolved";
  const evidence = rawUpdate.items.some(item => item.itemName === record.ItemName) ? "Checked live labels; user-confirmed RAW provenance/GuardianCap slot; older RAW manifest confirms black variants."
    : knownOrigin && knownOrigin !== "unverified" ? "Established Toolkit catalog / mod inventory; live label cross-check."
    : resources.length === 1 ? "Exact resource in one supplied mod manifest; checked live ID/label. Slot/generation suitability still needs verification."
    : "Both mods are loaded; exclusive provenance is not established. Not added to generation pools.";
  records.set(record.ItemName, { itemName: record.ItemName, displayName: label, origin, evidence, observedWithoutMods: vanillaNames.has(record.ItemName), ...(vanillaLabels.has(record.ItemName) ? { vanillaDisplayName: vanillaLabels.get(record.ItemName), labelChangedFromVanilla: vanillaLabels.get(record.ItemName) !== label } : {}), resourceManifests: resources, ...(known ? { slots: known.slots, generationEligible: known.semantic.poolEligible } : { generationEligible: false }) });
}
const items = [...records.values()].sort((a, b) => a.origin.localeCompare(b.origin) || a.displayName.localeCompare(b.displayName));
const result = {
  observed: "2026-10-05", session: { unlocked: "0.96", raw: "v2.0.4", source: "Versions and active mods confirmed by the user." },
  suppliedManifests: manifests.map(manifest => ({ mod: /Raw Accessories/i.test(manifest.file) ? "RAW Accessories" : "CFB27 Unlocked", version: /Raw Accessories/i.test(manifest.file) ? inventory.mods.raw.version : inventory.mods.unlocked.version, sha256: manifest.sha256 })),
  scope: "Structurally checked live ItemName/DisplayName pairs only. Not a guarantee every menu item is loaded. Loaded vanilla observations include locked assets; differences alone cannot establish mod provenance. Known vanilla/catalog assets changed by a mod remain marked as overrides, not claimed as new additions. Unresolved observations are not generated.",
  recordCheck: "Repeated ItemName fields; DisplayName at +56. No process addresses or raw bytes.",
  knownModPools: Object.fromEntries(["unlocked","raw"].map(origin => [origin, [
    ...EQUIPMENT_ITEMS.filter(item => item.origin === origin).map(item => ({ itemName:item.itemName, displayName:item.displayName, category:item.category, slots:item.slots, generationEligible:item.semantic.poolEligible, observedInCurrentSession:records.has(item.itemName) })),
    ...inventory.mods[origin].facepaintItemNames.map(itemName => ({ itemName, displayName:records.get(itemName)?.displayName ?? equipmentDisplayName(itemName), category:"Facepaint", slots:["FaceMarks"], observedInCurrentSession:records.has(itemName), source:"Existing verified mod/facepaint mapping; not inferred from memory differences." })),
    ...(origin === "unlocked" ? UNLOCKED_TATTOO_POOL.map(tattoo => ({ itemName:tattoo.value, displayName:tattoo.label, category:"Tattoo", observedInCurrentSession:records.has(tattoo.value), source:"Existing verified Unlocked tattoo catalog; not newly verified by this session." })) : [])
  ] ])),
  counts: Object.fromEntries([...new Set(items.map(item => item.origin))].map(origin => [origin, items.filter(item => item.origin === origin).length])),
  items
};
console.log(JSON.stringify(result, null, 2));
