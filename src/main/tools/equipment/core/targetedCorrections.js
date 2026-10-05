import { equipmentItem } from "../catalog.js";

// These exact families clip on the Standard Bear’s Pads body. Other full,
// rolled, quarter, baggy and undershirt sleeves are deliberately not matched.
export const bearsPadsIncompatibleSleeve = asset => /^GearArmSleeve_(?:NikeProDriFitSleeve2a?|NikeProDriFitSleeve|McDavidPaddedCompressionSleeve|NikeHyperstrongPaddedSleeve|NikePaddedElbowCompressionSleeve)_(?:Black|White|TeamColor|SecondaryColor)$/.test(asset ?? "");
export function correctBearsPadsSleeves(loadouts, bodyTypes, style, rng) {
  if (!bodyTypes.length || !bodyTypes.every(type => type === "Standard")) return [];
  if (!["shooter", "none", "mixed"].includes(style)) throw new Error("Choose Shooter Sleeve, No Sleeve, or a 50/50 mix for Bear’s Pads.");
  const changes = [];
  for (const loadout of loadouts) for (const element of loadout.loadoutElements) {
    if (!["LeftArmWear", "RightArmWear"].includes(element.slotType) || !bearsPadsIncompatibleSleeve(element.itemAssetName)) continue;
    const oldItem = element.itemAssetName, useShooter = style === "shooter" || style === "mixed" && rng() < .5;
    const color = oldItem.match(/_(Black|White|TeamColor|SecondaryColor)$/)[1];
    const newItem = useShooter ? `GearArmSleeve_Shooter_sleeveLongUnderarmor_normal_${color}` : "ArmSleeve_None";
    if (!equipmentItem(newItem)) throw new Error(`Missing verified sleeve replacement ${newItem}.`);
    element.itemAssetName = newItem;
    changes.push({ slot: element.slotType, oldItem, newItem });
  }
  return changes;
}
export function removeHandwarmers(loadouts) {
  const changes = [];
  for (const loadout of loadouts) for (const element of loadout.loadoutElements) {
    if (element.slotType !== "WaistWear" || !["Handwarmer_Standard", "Handwarmer_Standard_Logo"].includes(element.itemAssetName)) continue;
    changes.push({ slot: element.slotType, oldItem: element.itemAssetName, newItem: "Handwarmer_None" });
    element.itemAssetName = "Handwarmer_None";
  }
  return changes;
}
