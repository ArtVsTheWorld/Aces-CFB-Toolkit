import fs from "node:fs";

const inventory = JSON.parse(fs.readFileSync(new URL("../equipmentModInventory.json", import.meta.url), "utf8"));
export const VANILLA_FACE_PAINT_OPTIONS = Object.freeze(["FaceMarks_EyePaint", "FaceMarks_EyePaint2", "FaceMarks_EyePaint3", "FaceMarks_EyePaintCross", "FaceMarks_EyeTape", "FaceMarks_EyeTapeLeft", "FaceMarks_EyeTapeRight", "FaceMarks_NoseEyeTape", "FaceMarks_NoseTape", "FaceMarks_NoseTapeEyePaint"]);
// These exact-case names come from the live menu catalog, with equipped-save
// samples confirming the FacePaint slot. Donor ranking/NIL filters must not
// decide whether an installed mod's catalog is available for generation.
const modItems = Object.fromEntries(Object.entries(inventory.mods).map(([id, mod]) => [id, Object.freeze([...mod.facepaintItemNames])]));
const positionRules = new Map(inventory.facepaintPositionRules.map(rule => [rule.itemName, new Set(rule.positions)]));

export function buildFacePaintPool(_donors, { usingUnlockedMod = false, usingRawAccessoriesMod = false } = {}) {
  // Keep the donor argument for existing callers; facepaint is rolled
  // independently rather than copied from an equipment donor.
  const enabled = { unlocked: usingUnlockedMod, raw: usingRawAccessoriesMod }, options = [...VANILLA_FACE_PAINT_OPTIONS], diagnostics = {};
  for (const [id, values] of Object.entries(modItems)) {
    diagnostics[id] = { enabled: enabled[id], available: values.length, assets: [...values], inventoryCount: inventory.mods[id].facepaintResourceKeys.length, source: "catalog" };
    if (enabled[id]) for (const asset of values) if (!options.includes(asset)) options.push(asset);
  }
  return { options, diagnostics };
}

export function facePaintOptionsForPosition(pool, position) {
  if (position === undefined) return pool;
  const value = String(position).toUpperCase();
  return pool.filter(asset => !positionRules.has(asset) || positionRules.get(asset).has(value));
}

export function rollFacePaint(rng, pool = VANILLA_FACE_PAINT_OPTIONS, position) {
  const allowed = facePaintOptionsForPosition(pool, position);
  if (rng() < 0.60 || !allowed.length) return "FaceMarks_None";
  return allowed[Math.floor(rng() * allowed.length)];
}

export function facePaintSource(asset, diagnostics) {
  for (const [id, pool] of Object.entries(diagnostics)) if (pool.enabled && pool.assets.includes(asset)) return id === "raw" ? "Raw Accessories Equipment Pool" : "Unlocked Equipment Pool";
  return "Vanilla facepaint pool";
}
