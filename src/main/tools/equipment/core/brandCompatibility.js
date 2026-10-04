import { equipmentItem, itemBrand, normalBrand } from "../catalog.js";

export const BRAND_SLOTS = new Set(["LeftHandWear", "RightHandWear", "LeftShoe", "RightShoe", "LeftShoeOverride", "RightShoeOverride"]);
const GROUPS = [{ name: "gloves", slots: ["LeftHandWear", "RightHandWear"] }, { name: "cleats", slots: ["LeftShoe", "RightShoe", "LeftShoeOverride", "RightShoeOverride"] }];
const BASE_CLEATS = Object.freeze({ nike: "GearFootwear_shoe_low_NikeVaporEdge", adidas: "GearFootwear_shoe_low_AdidasAdizero_LTA58", underarmour: "GearFootwear_shoe_low_UnderArmourBlurPro2025", jordan: "GearFootwear_shoe_low_AirJordan1VaporEdge", newbalance: "GearFootwear_shoe_low_NewBalance_Prodigy" });
const baseSlot = slot => slot.replace(/Override$/, "");
const isShoe = slot => /Shoe/.test(slot);

export function isBrandCompatibleItem(slot, asset, teamBrand) {
  const brand = normalBrand(teamBrand), item = equipmentItem(asset);
  if (!brand || !item || !item.slots.includes(baseSlot(slot))) return false;
  if (isShoe(slot)) return item.category === "Cleats" && itemBrand(item) === brand && item.itemName.startsWith("GearFootwear_");
  if (item.category !== "Gloves") return false;
  return itemBrand(item) === brand || ["", "generic"].includes(itemBrand(item));
}

// This stage runs after every donor mode. Only shoe/hand fields need a branded
// source; helmets, sleeves, pants, and other universal gear retain donor variety.
export function assignCompatibleBrandEquipment(loadouts, target, candidates, preferred, rng) {
  const audits = [], donorUses = [];
  if (!normalBrand(target.branding)) return { audits, donorUses };
  for (const group of GROUPS) {
    const usable = donor => donor.visuals.loadouts.some(loadout => loadout.loadoutElements.some(element => group.slots.includes(element.slotType) && isBrandCompatibleItem(element.slotType, element.itemAssetName, target.branding)));
    const favorites = preferred.filter(usable), pool = favorites.length ? favorites : candidates.filter(usable);
    const donor = pool.length ? pool[Math.floor(rng() * pool.length)] : null;
    if (donor) donorUses.push({ group: `brand-compatible ${group.name}`, donor });
    loadouts.forEach((loadout, index) => {
      const source = donor?.visuals.loadouts[index]?.loadoutElements ?? [];
      for (const slot of group.slots) {
        const element = source.find(item => item.slotType === slot);
        if (!element || !isBrandCompatibleItem(slot, element.itemAssetName, target.branding)) continue;
        const existing = loadout.loadoutElements.find(item => item.slotType === slot), oldItem = existing?.itemAssetName;
        if (existing) loadout.loadoutElements[loadout.loadoutElements.indexOf(existing)] = structuredClone(element);
        else loadout.loadoutElements.push(structuredClone(element));
        if (oldItem !== element.itemAssetName) audits.push({ slot, oldItem: oldItem ?? "Missing", newItem: element.itemAssetName, reason: "Compatible donor item", donorRow: donor.row });
      }
    });
  }
  return { audits, donorUses };
}

export function guardBrandEquipment(loadouts, target, originalLoadouts) {
  const audits = [], brand = normalBrand(target.branding);
  if (!brand) return audits;
  loadouts.forEach((loadout, index) => {
    for (const slot of BRAND_SLOTS) {
      const element = loadout.loadoutElements.find(item => item.slotType === slot);
      if (!element || isBrandCompatibleItem(slot, element.itemAssetName, brand)) continue;
      const original = originalLoadouts[index]?.loadoutElements.find(item => item.slotType === slot);
      // Uncatalogued original custom gear is not evidence of an invalid item.
      // Retain it exactly, but never newly copy an unverified donor value.
      if (original?.itemAssetName === element.itemAssetName && !equipmentItem(element.itemAssetName)) continue;
      const oldItem = element.itemAssetName;
      if (original && isBrandCompatibleItem(slot, original.itemAssetName, brand)) loadout.loadoutElements[loadout.loadoutElements.indexOf(element)] = structuredClone(original);
      else if (slot.endsWith("Override")) loadout.loadoutElements.splice(loadout.loadoutElements.indexOf(element), 1);
      else {
        const replacement = isShoe(slot) ? BASE_CLEATS[brand] : "GearHand_None";
        if (!replacement || !isBrandCompatibleItem(slot, replacement, brand)) continue;
        element.itemAssetName = replacement;
      }
      audits.push({ slot, oldItem, newItem: loadout.loadoutElements.find(item => item.slotType === slot)?.itemAssetName ?? "Removed override", reason: "Blocked incompatible gear; restored compatible original or safe base item" });
    }
  });
  return audits;
}
