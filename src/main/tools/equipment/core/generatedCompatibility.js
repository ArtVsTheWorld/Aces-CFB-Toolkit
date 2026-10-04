import { canGenerateItem, equipmentItem, equipmentSemantics } from "../catalog.js";
import { armAccessoryRestrictions, isElbowLengthUndershirt, isRolledArmSleeve } from "./compatibility.js";

const active = value => typeof value === "string" && !/(?:^|_)None$/i.test(value) && value !== "FaceGear_BalaclavaNone";
const get = (elements, slot) => elements.find(element => element.slotType === slot)?.itemAssetName;
const coverage = asset => {
  if (!active(asset)) return [];
  const known = equipmentSemantics(asset)?.coverage;
  // Uncatalogued sleeve values are not evidence that the body region is free.
  return known ?? ["bicep", "wrist"];
};

export function generatedItemConflict(elements, item, slots = item.slots, position = "") {
  if (!canGenerateItem(item)) return "Item is not eligible for pool generation";
  const semantic = item.semantic;
  if (semantic.excludedPositions.includes(String(position).toUpperCase())) return "Item is not generated for this position";
  for (const slot of slots.filter(slot => /^(Left|Right)ElbowWear$/.test(slot))) {
    const side = slot.startsWith("Left") ? "Left" : "Right";
    const sleeve = get(elements, `${side}ArmWear`);
    if (!isElbowLengthUndershirt(sleeve) && !isRolledArmSleeve(sleeve)) continue;
    const blocked = armAccessoryRestrictions(sleeve, get(elements, `${side}WristWear`), get(elements, "InnerShirt"));
    if (semantic.bodyRegion === "wrist" ? blocked.wrist : blocked.elbow) return "Sleeve covers the accessory's physical location";
  }
  for (const element of elements) {
    if (slots.includes(element.slotType) || !active(element.itemAssetName)) continue;
    const other = equipmentSemantics(element.itemAssetName);
    if (other?.groups.some(group => semantic.groups.includes(group))) return "Overlapping neckwear, headwear or shoulder equipment";
    // Unknown donor neckwear is kept; do not assume that it is a free layer.
    if (semantic.groups.includes("neckwear") && ["NeckWear", "Neckpad"].includes(element.slotType) && !other) return "Existing neckwear occupies this region";
  }
  if (["bicep-band", "rubber-wristband"].includes(semantic.actualType)) {
    for (const slot of slots) {
      const side = slot.startsWith("Left") ? "Left" : "Right";
      const covered = [...coverage(get(elements, `${side}ArmWear`)), ...coverage(get(elements, "InnerShirt")), ...coverage(get(elements, "OuterShirt"))];
      if (covered.includes(semantic.bodyRegion)) return "Sleeve covers the accessory's physical location";
      if (semantic.bodyRegion === "wrist" && active(get(elements, `${side}WristWear`))) return "Existing wrist equipment occupies this region";
    }
  }
  return null;
}

export const canGenerateEquipment = (loadouts, item, slots = item.slots, position = "") => loadouts.every(loadout => !generatedItemConflict(loadout.loadoutElements, item, slots, position));

// Provenance is local to one recipient, not stored in a global cache. Only new
// pool additions may be restored. Existing donor items are never removed here.
export function createGeneratedEquipmentState(loadouts) {
  return { before: structuredClone(loadouts), added: loadouts.map(() => new Map()) };
}
export function recordGeneratedEquipment(state, slots, itemName) {
  if (!state) return;
  for (const added of state.added) for (const slot of slots) added.set(slot, itemName);
}

export function enforceGeneratedEquipmentCompatibility(loadouts, state, position = "") {
  if (!state) return [];
  const corrections = [];
  loadouts.forEach((loadout, index) => {
    for (const [slot, asset] of state.added[index]) {
      const elements = loadout.loadoutElements;
      if (get(elements, slot) !== asset) continue;
      const item = equipmentItem(asset), reason = item && generatedItemConflict(elements, item, [slot], position);
      // A paired band/cleat shares a type on two sides but is not a conflict.
      if (!reason) continue;
      const at = elements.findIndex(element => element.slotType === slot);
      const old = state.before[index].loadoutElements.find(element => element.slotType === slot);
      if (old) elements[at] = structuredClone(old); else elements.splice(at, 1);
      corrections.push({ loadout: index, slot, oldItem: asset, newItem: old?.itemAssetName ?? "Removed generated item", reason });
    }
  });
  return corrections;
}

// Optional-pool descriptions must describe what survived No Drip and final
// compatibility checks, not earlier rolls that were subsequently removed.
export function finalGeneratedChanges(loadouts, changes) {
  return changes.flatMap(change => {
    const names = [...new Set(change.newItem.split(" + "))].filter(name => loadouts.some(loadout => loadout.loadoutElements.some(element => change.slots.includes(element.slotType) && element.itemAssetName === name)));
    if (!names.length) return [];
    return [{ ...change, newItem: names.join(" + "), displayName: names.map(name => equipmentItem(name)?.displayName ?? name).join(" + ") }];
  });
}
