// Exact ItemName values checked against live ItemInfo display-name records.
export const CUTOFF_PANTS = "GearPants_Cutoff";
export const ABOVE_KNEE_PANTS = "GearPants_AboveKnee";
export const STANDARD_PANTS = "GearPants_Standard";
export const LOWER_JERSEY_REPLACEMENTS = Object.freeze({
  Gear_Low_TuckedUndershirt: "Gear_JerseyStyle_RolledLowest",
  Gear_JerseyStyle_RolledLow: "Gear_JerseyStyle_RolledLowest_Untucked"
});
export const CUTOFF_JERSEYS = new Set(["Gear_JerseyStyle_RolledLowest_Untucked", "Gear_JerseyStyle_RolledLow", "Gear_JerseyStyle_SleeveTight_Untucked", "Gear_JerseyStyle_Rolled"]);
export const uniformItem = (elements, slot) => elements.find(element => element.slotType === slot)?.itemAssetName;
export function cutoffPantsConflict(elements) {
  const base = uniformItem(elements, "InnerPants");
  if (base && !/(?:^|_)None$/i.test(base)) return "Cutoff pants require no leg base layer";
  const shirt = uniformItem(elements, "InnerShirt");
  if (!shirt || /(?:^|_)None$/i.test(shirt)) return "Cutoff pants require an undershirt";
  if (!CUTOFF_JERSEYS.has(uniformItem(elements, "OuterShirt"))) return "Cutoff pants require a compatible untucked jersey";
  return null;
}
export function enforceCutoffPantsCompatibility(elements) {
  const pants = elements.find(element => element.slotType === "OuterPants");
  const reason = pants?.itemAssetName === CUTOFF_PANTS && cutoffPantsConflict(elements);
  if (!reason) return [];
  pants.itemAssetName = ABOVE_KNEE_PANTS;
  return [{ kind: "cutoff-pants", slot: "OuterPants", oldItem: CUTOFF_PANTS, newItem: ABOVE_KNEE_PANTS, reason }];
}
