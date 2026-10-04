import { equipmentDisplayName, mouthpieceDisplayValue } from "./catalog.js";

export const MAX_EQUIPMENT_PREVIEW_ROWS = 1000;

const SLOT_LABELS = Object.freeze({ HeadWear: "Helmet", FaceMask: "Facemask", FaceWear: "Face Covering", FacePaint: "Facepaint", MouthWear: "Mouthpiece", NeckWear: "Turtleneck", Neckpad: "Neckwear", InnerShirt: "Undershirt", OuterShirt: "Jersey", OuterPants: "Pants", InnerPants: "Leg Base Layer", InnerSocks: "Socks", LeftArmWear: "Left Arm Sleeve", RightArmWear: "Right Arm Sleeve", LeftElbowWear: "Left Elbow Gear", RightElbowWear: "Right Elbow Gear", LeftHandWear: "Left Glove / Hand Gear", RightHandWear: "Right Glove / Hand Gear", LeftShoe: "Left Cleat", RightShoe: "Right Cleat", LeftThighWear: "Left Thigh Pad", RightThighWear: "Right Thigh Pad" });
const gearLabel = (asset, slot) => { const label = slot === "MouthWear" ? mouthpieceDisplayValue(asset) : equipmentDisplayName(asset); return label === asset && /(?:^|_)None$/i.test(asset) ? "None" : label; };

// Presentation only. Exact saved IDs and complete blobs stay in the CSV audit.
export function equipmentPreviewChanges(beforeRaw, afterRaw) {
  const describe = raw => {
    const entries = new Map(), counts = new Map();
    for (const loadout of JSON.parse(raw)?.loadouts ?? []) {
      const identity = `${loadout.loadoutCategory ?? ""}|${loadout.loadoutType ?? ""}`, number = (counts.get(identity) ?? 0) + 1;
      counts.set(identity, number);
      const slots = new Map();
      for (const element of loadout.loadoutElements ?? []) {
        if (!element.slotType || typeof element.itemAssetName !== "string") continue;
        const ordinal = (slots.get(element.slotType) ?? 0) + 1; slots.set(element.slotType, ordinal);
        entries.set(`${identity}|${number}|${element.slotType}|${ordinal}`, { slot: element.slotType, asset: element.itemAssetName });
      }
    }
    return entries;
  };
  try {
    const before = describe(beforeRaw), after = describe(afterRaw), changes = new Map();
    for (const key of new Set([...before.keys(), ...after.keys()])) {
      const oldItem = before.get(key), newItem = after.get(key);
      if (oldItem?.asset === newItem?.asset) continue;
      const slot = newItem?.slot ?? oldItem.slot;
      const type = SLOT_LABELS[slot] ?? slot.replace(/([a-z])([A-Z])/g, "$1 $2");
      const change = { type, currentValue: oldItem ? gearLabel(oldItem.asset, slot) : "Not Equipped", proposedValue: newItem ? gearLabel(newItem.asset, slot) : "Not Equipped" };
      // Collapse identical changes across duplicate on-field loadouts.
      changes.set(JSON.stringify(change), change);
    }
    return [...changes.values()];
  } catch { return []; }
}

export function limitEquipmentPreview(rows) {
  return rows.slice(0, MAX_EQUIPMENT_PREVIEW_ROWS);
}

export function groupPatcherPreviewRows(rows) {
  const players = new Map();
  for (const change of rows) {
    const key = change.row;
    let player = players.get(key);
    if (!player) {
      player = { row: change.row, team: change.team, player: change.player, position: change.position, classYear: change.classYear, redshirtStatus: change.redshirtStatus, overall: change.overall, changes: [] };
      players.set(key, player);
    }
    player.changes.push({ type: change.type, currentValue: change.currentValue, proposedValue: change.proposedValue });
  }
  return [...players.values()];
}

// Keep exact source/target blobs in the CSV; this shorter column makes the
// affected gear slots scannable while also exposing loadout metadata changes.
export function summarizeVisualChanges(beforeRaw, afterRaw) {
  if (typeof beforeRaw !== "string" || typeof afterRaw !== "string") return "";
  try {
    const before = JSON.parse(beforeRaw), after = JSON.parse(afterRaw);
    const describe = parsed => {
      const entries = [], loadoutCounts = new Map();
      for (const loadout of parsed?.loadouts ?? []) {
        const identity = String(loadout?.loadoutType ?? loadout?.loadoutCategory ?? "Unnamed loadout");
        const number = (loadoutCounts.get(identity) ?? 0) + 1;
        loadoutCounts.set(identity, number);
        const prefix = `${identity} #${number}`;
        entries.push([`${prefix} category`, loadout?.loadoutCategory], [`${prefix} type`, loadout?.loadoutType]);
        const slotCounts = new Map();
        for (const element of loadout?.loadoutElements ?? []) {
          const slot = String(element?.slotType ?? "Unnamed slot");
          const slotNumber = (slotCounts.get(slot) ?? 0) + 1;
          slotCounts.set(slot, slotNumber);
          entries.push([`${prefix} ${slot} #${slotNumber}`, element?.itemAssetName]);
        }
      }
      return entries;
    };
    const oldEntries = describe(before), newEntries = describe(after);
    const oldByKey = new Map(oldEntries), newByKey = new Map(newEntries);
    const summary = [...new Set([...oldByKey.keys(), ...newByKey.keys()])]
      .filter(key => oldByKey.get(key) !== newByKey.get(key))
      .map(key => `${key}: ${oldByKey.get(key) ?? "∅"} → ${newByKey.get(key) ?? "∅"}`)
      .join("; ");
    return summary || (beforeRaw !== afterRaw ? "Equipment item names unchanged; RawData structure, metadata, or formatting changed (see BeforeRawData / AfterRawData)" : "");
  } catch { return "RawData changed (unable to summarize slots)"; }
}
