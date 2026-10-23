import fs from "node:fs";

const inventory = JSON.parse(fs.readFileSync(new URL("../equipmentModInventory.json", import.meta.url), "utf8"));
const offline = JSON.parse(fs.readFileSync(new URL("../equipmentOfflineInventory.json", import.meta.url), "utf8"));
export const VANILLA_FACE_PAINT_OPTIONS = Object.freeze(["FaceMarks_EyePaint", "FaceMarks_EyePaint2", "FaceMarks_EyePaint3", "FaceMarks_EyePaintCross", "FaceMarks_EyeTape", "FaceMarks_EyeTapeLeft", "FaceMarks_EyeTapeRight", "FaceMarks_NoseEyeTape", "FaceMarks_NoseTape", "FaceMarks_NoseTapeEyePaint"]);
// These exact-case names come from the live menu catalog, with equipped-save
// samples confirming the FacePaint slot. Donor ranking/NIL filters must not
// decide whether an installed mod's catalog is available for generation.
const modItems = Object.fromEntries(Object.entries(inventory.mods).map(([id, mod]) => [id, Object.freeze([...new Set([...mod.facepaintItemNames, ...(id === "raw" ? offline.rawFacepaintItems : [])])])]));
export const MOD_FACE_PAINT_ITEMS = Object.freeze(modItems);
const positionRules = new Map(inventory.facepaintPositionRules.map(rule => [rule.itemName, new Set(rule.positions)]));

export function buildFacePaintPool(_donors, { usingUnlockedMod = false, usingRawAccessoriesMod = false, modPools } = {}) {
  // Keep the donor argument for existing callers; facepaint is rolled
  // independently rather than copied from an equipment donor.
  const enabled = { unlocked: usingUnlockedMod, raw: usingRawAccessoriesMod }, options = [...VANILLA_FACE_PAINT_OPTIONS], diagnostics = {};
  for (const [id, values] of Object.entries(modItems)) {
    const selected = modPools?.[id]?.facepaint?.items ?? values, chance = modPools?.[id]?.facepaint?.chance ?? 100;
    const assets = values.filter(value => selected.includes(value));
    const resourceKeys = [...inventory.mods[id].facepaintResourceKeys, ...(id === "raw" ? offline.rawFacepaintItems.map(value => value.toLowerCase()) : [])];
    diagnostics[id] = { enabled: enabled[id], chance, available: values.length, assets, inventoryCount: new Set(resourceKeys).size, source: "catalog" };
    if (enabled[id] && chance > 0) for (const asset of assets) if (!options.includes(asset)) options.push(asset);
  }
  return { options, diagnostics };
}

export function facePaintOptionsForPosition(pool, position) {
  if (position === undefined) return pool;
  const value = String(position).toUpperCase();
  return pool.filter(asset => {
    const base = offline.facepaintBaseAssets[asset] ?? asset;
    return !positionRules.has(base) || positionRules.get(base).has(value);
  });
}

export function rollFacePaint(rng, pool = VANILLA_FACE_PAINT_OPTIONS, position, diagnostics) {
  if (rng() < 0.60) return "FaceMarks_None";
  const excluded = new Set(Object.values(diagnostics ?? {}).filter(group => group.enabled && (group.chance === 0 || group.chance < 100 && rng() >= group.chance / 100)).flatMap(group => group.assets));
  const allowed = facePaintOptionsForPosition(pool, position).filter(asset => !excluded.has(asset) || VANILLA_FACE_PAINT_OPTIONS.includes(asset));
  if (!allowed.length) return "FaceMarks_None";
  return allowed[Math.floor(rng() * allowed.length)];
}

export function facePaintSource(asset, diagnostics) {
  for (const [id, pool] of Object.entries(diagnostics)) if (pool.enabled && pool.assets.includes(asset)) return id === "raw" ? "RAW Accessories Equipment Pool" : "Unlocked Equipment Pool";
  return "Vanilla facepaint pool";
}
