import fs from "node:fs";

export const GENERATION_METADATA = JSON.parse(fs.readFileSync(new URL("./equipmentGenerationMetadata.json", import.meta.url), "utf8"));
const rules = GENERATION_METADATA.rules.map(({ pattern, ...metadata }) => ({ pattern: new RegExp(pattern, "i"), metadata }));
const footballModels = GENERATION_METADATA.footballFootwearPatterns.map(pattern => new RegExp(pattern, "i"));
export function uncataloguedEquipmentSemantics(itemName) {
  const rule = rules.find(rule => rule.pattern.test(String(itemName ?? "")));
  return rule ? { groups: [], excludedPositions: [], poolEligible: false, ...rule.metadata } : undefined;
}

// Slot/category is a storage concern, not a guarantee of physical fit or role.
// In particular, the exported Player role also appears on the Air Max sneaker.
export function describeEquipment(item) {
  const semantic = { actualType: item.category, bodyRegion: null, groups: [], excludedPositions: [], poolEligible: !item.displayOnly && item.origin !== "unverified" };
  const rule = rules.find(rule => rule.pattern.test(item.itemName));
  if (item.category === "Cleats") {
    const football = footballModels.some(pattern => pattern.test(item.itemName));
    Object.assign(semantic, { actualType: football ? "football-cleat" : "unverified-footwear", bodyRegion: "feet", playerEligible: football, poolEligible: football && semantic.poolEligible && item.authenticity !== "LoadoutAuthenticity_Fantasy" });
  }
  if (rule) Object.assign(semantic, rule.metadata);
  if (item.themeColors) semantic.colors = [...item.themeColors];
  else {
    const color = /_(TeamColor|Primary|SecondaryColor|Secondary|Black|White|OffWhite)$/i.exec(item.itemName)?.[1]?.toLowerCase();
    semantic.colors = color ? [{ teamcolor: "primary", secondarycolor: "secondary", offwhite: "white" }[color] ?? color] : [];
  }
  return Object.freeze(semantic);
}
