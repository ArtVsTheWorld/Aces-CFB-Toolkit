export const UNLOCKED_SOCK_REPLACEMENTS = Object.freeze({ Gear_Socks_Mid: "Socks_CrewCut", Gear_Socks_High: "Socks_High" });
// Menu grouping is not save-slot ownership: body tattoos live in a Base layer
// and must never be written into InnerSocks, or vice versa.
export function replaceUnlockedSocks(loadouts) {
  const replacements = new Map();
  for (const loadout of loadouts) for (const element of loadout.loadoutElements) {
    if (element.slotType !== "InnerSocks") continue;
    const replacement = UNLOCKED_SOCK_REPLACEMENTS[element.itemAssetName];
    if (!replacement) continue;
    replacements.set(element.itemAssetName, replacement); element.itemAssetName = replacement;
  }
  return [...replacements].map(([oldItem, newItem]) => ({ oldItem, newItem, slot: "InnerSocks" }));
}
