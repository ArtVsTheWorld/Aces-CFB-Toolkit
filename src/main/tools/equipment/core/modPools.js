import { EQUIPMENT_ITEMS, RAW_ACCESSORIES_POOLS, UNLOCKED_POOLS, EQUIPMENT_TRUCK_POOLS, canGenerateItem, equipmentDisplayName, itemBrand } from "../catalog.js";
import { MOD_FACE_PAINT_ITEMS } from "./facepaint.js";

const unique = items => [...new Map(items.filter(canGenerateItem).map(item => [item.itemName, item])).values()];
const category = (id, label, items, extra = {}) => ({ id, label, items: unique(items), ...extra });
// One allowlisted catalog feeds validation, generation, and the editors. A mod
// manifest alone is never permission to generate an unknown asset or slot.
export function modPoolDefinitions() {
  const gloves = EQUIPMENT_ITEMS.filter(item => item.category === "Gloves" && /^GearHand_(?!None)/i.test(item.itemName) && canGenerateItem(item));
  const teamGloveBrands = new Set(gloves.filter(item => /_(?:TeamColor|SecondaryColor)$/i.test(item.itemName)).map(itemBrand));
  const definitions = {
    unlocked: [
      category("undershirts", "Irish Jamo Sleeves", UNLOCKED_POOLS.undershirts, { defaultChance: 0 }),
      category("wristTape", "Taped Wrist with Cross", UNLOCKED_POOLS.wristTape),
      category("armSleeves", "Arm Sleeves", UNLOCKED_POOLS.armSleeves),
      category("elbowGear", "Elbow Gear & Bands", [...UNLOCKED_POOLS.elbowSweatbands, ...UNLOCKED_POOLS.bicepBands, ...UNLOCKED_POOLS.elbowPadsAndBraces, ...UNLOCKED_POOLS.shoulderStabilizers]),
      category("cleats", "Additional Cleats", EQUIPMENT_ITEMS.filter(item => item.category === "Cleats" && item.itemName.startsWith("Gear"))),
      category("gloves", "Additional Gloves", gloves, { defaultItems: gloves.filter(item => !teamGloveBrands.has(itemBrand(item)) || /_(?:TeamColor|SecondaryColor)$/i.test(item.itemName)).map(item => item.itemName) }),
      category("mouthpieces", "Mouthpieces", [...UNLOCKED_POOLS.unlockedMouthpieces, ...UNLOCKED_POOLS.colorfulHangingMouthpieces], { defaultItems: UNLOCKED_POOLS.unlockedMouthpieces.map(item => item.itemName) }),
      category("neckwear", "Turtlenecks & Neckwear", UNLOCKED_POOLS.neckwear),
      category("legSleeves", "Leg Base Layers", UNLOCKED_POOLS.legSleeves),
      category("balaclavas", "Normal Balaclavas", UNLOCKED_POOLS.balaclavas),
      category("thighPads", "Thigh Pads", UNLOCKED_POOLS.thighPads),
      category("towels", "Towels", UNLOCKED_POOLS.towels),
      category("socks", "Sock Styles", UNLOCKED_POOLS.socks)
    ],
    raw: [category("neckwear", "Turtlenecks & Necklaces", RAW_ACCESSORIES_POOLS.neckwear), category("skullcaps", "Skullcaps", RAW_ACCESSORIES_POOLS.skullcaps), category("backplates", "Backplates — No Flak Jacket", RAW_ACCESSORIES_POOLS.backplates ?? [])],
    eljax: [category("armSleeves", "Team & Brand Arm Sleeves", EQUIPMENT_TRUCK_POOLS.armSleeves), category("visors", "Team & Brand Visors", EQUIPMENT_TRUCK_POOLS.visors),
      category("chinCovers", "Brand Logo Chin Covers", EQUIPMENT_TRUCK_POOLS.chinCovers),
      category("waistPlaycalls", "Waist Playcall Bands — QBs Only", EQUIPMENT_TRUCK_POOLS.waistPlaycalls),
      category("handwarmers", "Standard Logo Handwarmer", EQUIPMENT_TRUCK_POOLS.handwarmers, { defaultChance: 0, defaultItems: [] }),
      category("thighPads", "Jersey Number + Cross Thigh Pads", EQUIPMENT_TRUCK_POOLS.thighPads)]
  };
  return Object.fromEntries(Object.entries(definitions).map(([origin, categories]) => [origin, [...categories, ...(MOD_FACE_PAINT_ITEMS[origin] ? [{
    id: "facepaint", label: "Facepaint & Eye Tape", defaultChance: 100,
    items: MOD_FACE_PAINT_ITEMS[origin].map(itemName => ({ itemName, displayName: equipmentDisplayName(itemName) }))
  }] : [])].map(entry => ({ ...entry, defaultItems: entry.defaultItems ?? entry.items.map(item => item.itemName) }))]));
}

export function normalizeModPools(value, defaultPercent = 10) {
  if (value !== undefined && (value === null || typeof value !== "object" || Array.isArray(value))) throw new Error("Equipment pool settings must contain named mod pools.");
  const definitions = modPoolDefinitions();
  for (const origin of Object.keys(value ?? {})) if (!definitions[origin]) throw new Error(`Unknown equipment pool: ${origin}.`);
  return Object.fromEntries(Object.entries(definitions).map(([origin, categories]) => {
    const supplied = value?.[origin];
    if (supplied !== undefined && (supplied === null || typeof supplied !== "object" || Array.isArray(supplied))) throw new Error(`Invalid ${origin} pool settings.`);
    for (const id of Object.keys(supplied ?? {})) if (!categories.some(category => category.id === id)) throw new Error(`Unknown ${origin} equipment category: ${id}.`);
    return [origin, Object.fromEntries(categories.map(category => {
      const choice = supplied?.[category.id];
      if (choice !== undefined && (choice === null || typeof choice !== "object" || Array.isArray(choice))) throw new Error(`Invalid ${category.label} settings.`);
      const chance = choice && Object.hasOwn(choice, "chance") ? choice.chance : category.defaultChance ?? defaultPercent;
      if (!Number.isInteger(chance) || chance < 0 || chance > 100) throw new Error(`${category.label}: use a whole percentage from 0 through 100.`);
      const items = choice && Object.hasOwn(choice, "items") ? choice.items : category.defaultItems;
      if (!Array.isArray(items) || items.some(id => typeof id !== "string" || !category.items.some(item => item.itemName === id))) throw new Error(`${category.label}: choose only items in this mod's supported pool.`);
      return [category.id, { chance, items: [...new Set(items)] }];
    }))];
  }));
}

export function configuredModItems(pool, configuration, category) {
  const selected = configuration?.[category]?.items;
  return selected === undefined ? pool : pool.filter(item => selected.includes(item.itemName));
}
export const modCategoryChance = (configuration, category, fallback) => configuration?.[category]?.chance === undefined ? fallback : configuration[category].chance / 100;
export function modPoolEditorCatalog() {
  return Object.fromEntries(Object.entries(modPoolDefinitions()).map(([origin, categories]) => [origin, categories.map(category => ({ ...category, items: category.items.map(item => ({ value: item.itemName, label: item.displayName })) }))]));
}
