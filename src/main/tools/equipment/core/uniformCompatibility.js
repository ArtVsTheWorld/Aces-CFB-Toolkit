// Exact ItemName values checked against live ItemInfo display-name records.
export const CUTOFF_PANTS = "GearPants_Cutoff";
export const ABOVE_KNEE_PANTS = "GearPants_AboveKnee";
export const STANDARD_PANTS = "GearPants_Standard";
export const CUTOFF_TOWEL_CONFLICT = "Towels cannot be worn with cutoff pants";
export const LOWER_JERSEY_REPLACEMENTS = Object.freeze({
  Gear_Low_TuckedUndershirt: "Gear_JerseyStyle_RolledLowest",
  Gear_JerseyStyle_RolledLow: "Gear_JerseyStyle_RolledLowest_Untucked"
});
export const CUTOFF_JERSEYS = new Set(["Gear_JerseyStyle_RolledLowest_Untucked", "Gear_JerseyStyle_RolledLow", "Gear_JerseyStyle_SleeveTight_Untucked", "Gear_JerseyStyle_Rolled"]);
export const uniformItem = (elements, slot) => elements.find(element => element.slotType === slot)?.itemAssetName;
const activeTowel = element => element.slotType === 'Towel' && typeof element.itemAssetName === 'string' && !/(?:^|_)None$/i.test(element.itemAssetName);
export function cutoffTowelConflict(elements) {
  return uniformItem(elements,'OuterPants') === CUTOFF_PANTS && elements.some(activeTowel) ? CUTOFF_TOWEL_CONFLICT : null;
}
export function removeCutoffTowels(elements) {
  if(uniformItem(elements,'OuterPants') !== CUTOFF_PANTS)return [];
  return elements.filter(activeTowel).map(element=>{
    const oldItem=element.itemAssetName;element.itemAssetName='Towel_None';
    return {kind:'cutoff-towel',slot:'Towel',oldItem,newItem:'Towel_None',reason:CUTOFF_TOWEL_CONFLICT};
  });
}
export function cutoffPantsConflict(elements, {allowLegLayers=false,allowTowels=false}={}) {
  const base = uniformItem(elements, "InnerPants");
  if (!allowLegLayers && base && !/(?:^|_)None$/i.test(base)) return "Cutoff pants require no leg base layer";
  const shirt = uniformItem(elements, "InnerShirt");
  if (!shirt || /(?:^|_)None$/i.test(shirt)) return "Cutoff pants require an undershirt";
  if (!CUTOFF_JERSEYS.has(uniformItem(elements, "OuterShirt"))) return "Cutoff pants require a compatible untucked jersey";
  if(!allowTowels && elements.some(activeTowel))return CUTOFF_TOWEL_CONFLICT;
  return null;
}
export function enforceCutoffPantsCompatibility(elements, options={}) {
  const pants = elements.find(element => element.slotType === "OuterPants");
  if(pants?.itemAssetName !== CUTOFF_PANTS)return [];
  // Shirt/leg restrictions still apply, but a towel must never downgrade valid
  // cutoff pants. Clear the towel instead, including copied/unknown variants.
  const reason = cutoffPantsConflict(elements, {...options,allowTowels:true});
  if (!reason) return removeCutoffTowels(elements);
  pants.itemAssetName = ABOVE_KNEE_PANTS;
  return [{ kind: "cutoff-pants", slot: "OuterPants", oldItem: CUTOFF_PANTS, newItem: ABOVE_KNEE_PANTS, reason }];
}
