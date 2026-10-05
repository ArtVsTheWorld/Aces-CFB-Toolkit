import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { UNLOCKED_TATTOO_POOL } from "./core/tattoos.js";
import { GENERATION_METADATA, describeEquipment, uncataloguedEquipmentSemantics } from "./semantics.js";

const catalogPath = fileURLToPath(new URL("./equipmentCatalog.json", import.meta.url));
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const modInventory = JSON.parse(fs.readFileSync(new URL("./equipmentModInventory.json", import.meta.url), "utf8"));
const colorInventory = JSON.parse(fs.readFileSync(new URL("./equipmentColorInventory.json", import.meta.url), "utf8"));
const sourcedInventory = JSON.parse(fs.readFileSync(new URL("./equipmentSourcedInventory.json", import.meta.url), "utf8"));
const raw204Inventory = JSON.parse(fs.readFileSync(new URL("./equipmentRaw204Inventory.json", import.meta.url), "utf8"));
const liveFacemasks = JSON.parse(fs.readFileSync(new URL("./equipmentLiveFacemasks.json", import.meta.url), "utf8"));
const modItems = Object.entries(modInventory.mods).flatMap(([origin, mod]) => (mod.equipmentItems ?? []).map(item => ({ ...item, origin })));
const mergedItems = new Map([...catalog.items, ...modItems, ...colorInventory.items, ...sourcedInventory.items, ...liveFacemasks.items, ...raw204Inventory.items].map(item => [item.itemName, item]));
export const EQUIPMENT_ITEMS = Object.freeze([...mergedItems.values()].map(item => {
  const resolved = { ...item, displayName: sourcedInventory.displayNames[item.itemName] ?? item.displayName, ...GENERATION_METADATA.itemOverrides[item.itemName] };
  return Object.freeze({ ...resolved, semantic: describeEquipment(resolved) });
}));
const BY_ITEM_NAME = new Map(EQUIPMENT_ITEMS.map(item => [item.itemName, item]));
const TATTOO_DISPLAY_NAMES = new Map(UNLOCKED_TATTOO_POOL.map(item => [item.value, item.label]));
export const equipmentItem = itemName => BY_ITEM_NAME.get(String(itemName ?? ""));
// Only reject positively catalogued wrong-slot items. Unknown custom mouthpiece
// assets are not sufficient evidence to remove gear from a modded save.
export function isInvalidMouthpieceAsset(asset) { const item = equipmentItem(asset); return Boolean(item && !item.slots.includes("MouthWear")); }
export function mouthpieceDisplayValue(value) { return String(value ?? "").split(/,\s*/).map(asset => isInvalidMouthpieceAsset(asset) ? `Invalid Mouthpiece (${equipmentDisplayName(asset)})` : equipmentDisplayName(asset)).join(", "); }
export const equipmentOrigin = itemName => equipmentItem(itemName)?.origin ?? "catalog";
export const equipmentSemantics = itemName => equipmentItem(itemName)?.semantic ?? uncataloguedEquipmentSemantics(itemName);
export const canGenerateItem = item => item?.semantic.poolEligible === true;

export function equipmentDisplayName(itemName) {
  const value = String(itemName ?? "");
  return TATTOO_DISPLAY_NAMES.get(value) || BY_ITEM_NAME.get(value)?.displayName || FACEPAINT_DISPLAY_NAMES.get(value) || value;
}

const FACEPAINT_DISPLAY_NAMES = new Map([
  ["FaceMarks_None", "No Facepaint"], ["FaceMarks_EyePaint", "Eye Black"], ["FaceMarks_EyePaint2", "Eye Black — Style 2"],
  ["FaceMarks_EyePaint3", "Eye Black — Style 3"], ["FaceMarks_EyePaintCross", "Cross Eye Black"], ["FaceMarks_EyeTape", "Eye Tape"],
  ["FaceMarks_EyeTapeLeft", "Left Eye Tape"], ["FaceMarks_EyeTapeRight", "Right Eye Tape"], ["FaceMarks_NoseEyeTape", "Nose and Eye Tape"],
  ["FaceMarks_NoseTape", "Nose Tape"], ["FaceMarks_NoseTapeEyePaint", "Nose Tape and Eye Black"],
  ...Array.from({ length: 10 }, (_, index) => [`FaceMarks_NoseTape_C${index + 1}`, `Nose Tape Custom ${index + 1}`]),
  ["FaceMarks_NoseTape_G", "Nose Tape — G"], ["FaceMarks_NoseTape_KE", "Nose Tape — KE"], ["FaceMarks_NoseTape_T", "Nose Tape — T"],
  ["FaceMarks_NoseTape_DP", "Nose Tape — DP"], ["FaceMarks_RawNoseEyeTape", "Raw Nose and Eye Tape"],
  ...Object.entries({ dontblink: "Don't Blink", imfnopen: "I'm F'n Open", "1hitta": "1 Hitta", "540baby": "540 Baby", builtdiff: "Built Different", fearnone: "Fear None", john316: "John 3:16", killall: "Kill All", luke137: "Luke 1:37", nolove: "No Love", notsorry: "Not Sorry", sickem: "Sick 'Em", talkcrazy: "Talk Crazy", theproblem: "The Problem", watchme: "Watch Me" }).map(([key, label]) => [`FaceMarks_RawNoseTape_${key}`, `Nose and Eye Tape — ${label}`])
]);

export function equipmentTags(itemName) {
  return [...(BY_ITEM_NAME.get(String(itemName ?? ""))?.tags ?? [])];
}

export function equipmentDisplayValue(value) {
  const text = String(value ?? "");
  if (BY_ITEM_NAME.has(text) || FACEPAINT_DISPLAY_NAMES.has(text)) return equipmentDisplayName(text);
  return text.replace(/[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+/g, token => equipmentDisplayName(token));
}

const COLOR_TOKEN = /_(TeamColor|SecondaryColor|Primary|Secondary|Black|White|OffWhite)(\d*)$/i;
const THEME_TOKENS = Object.freeze({
  primary: ["teamcolor", "primary"],
  secondary: ["secondarycolor", "secondary"],
  black: ["black"],
  white: ["white", "offwhite"]
});
const COLOR_FAMILIES = new Map();
for (const item of EQUIPMENT_ITEMS) {
  const match = item.itemName.match(COLOR_TOKEN);
  if (!match) continue;
  const key = `${item.itemName.slice(0, match.index)}_#${match[2] || ""}`.toLowerCase();
  const family = COLOR_FAMILIES.get(key) ?? new Map();
  family.set(match[1].toLowerCase(), item.itemName);
  COLOR_FAMILIES.set(key, family);
}

const EXPLICIT_COLOR_LOOKUP = new Map();
const registerExplicitFamily = family => {
  const targets = new Map(Object.entries(family));
  for (const itemName of new Set(Object.values(family))) EXPLICIT_COLOR_LOOKUP.set(itemName, targets);
};
raw204Inventory.colorFamilies.forEach(registerExplicitFamily);
registerExplicitFamily({
  white: "G_CompressionT_Crew_ShortSleeve_Basic_WHI",
  black: "G_CompressionT_Crew_ShortSleeve_Basic_BLA",
  secondary: "G_CompressionT_Crew_ShortSleeve_Basic_SEC",
  primary: "G_CompressionT_Crew_ShortSleeve_Basic_PRI"
});
registerExplicitFamily({
  primary: "G_CompressionT_Crew_LongSleeve_99Club_B_GOL",
  secondary: "G_CompressionT_Crew_LongSleeve_99Club_B_WHI",
  white: "G_CompressionT_Crew_ShortSleeve_99Club_B_GOL",
  black: "G_CompressionT_Crew_ShortSleeve_99Club_B_WHI",
  base: "Undershirt_Untucked"
});
registerExplicitFamily({
  white: "G_CompressionT_Crew_LongSleeve_NikeHQ_B_GLD",
  primary: "G_CompressionT_Crew_LongSleeve_NikeHQ_B_GRE",
  secondary: "G_CompressionT_Crew_LongSleeve_NikeHQ_B_BEI",
  black: "G_CompressionT_Crew_LongSleeve_NikeHQ_B_NAV"
});
registerExplicitFamily({
  white: "Gear_Undershirt_CompressionTCrewSleeveless_White",
  primary: "Gear_Undershirt_CompressionTCrewSleeveless",
  black: "Gear_Undershirt_CompressionTCrewSleeveless_Black",
  secondary: "Gear_Undershirt_CompressionTCrewSleeveless_Secondary"
});
// These menus call the unsuffixed item Primary. Do not apply that convention
// to numbered mod assets or mouthpieces whose names can disguise other colors.
for (const base of colorInventory.primaryBaseFamilies) registerExplicitFamily({
  primary: base, secondary: `${base}_Secondary`, black: `${base}_Black`, white: `${base}_White`
});
// The double sleeve is genuinely two-tone. There is no verified white variant.
// Select the first (outer) color, retain the existing design if it is unavailable.
registerExplicitFamily({
  black: "GearArmSleeve_NikeProDriFitSleeve2_Black",
  primary: "GearArmSleeve_NikeProDriFitSleeve2_TeamColor",
  secondary: "GearArmSleeve_NikeProDriFitSleeve2_SecondaryColor"
});
EXPLICIT_COLOR_LOOKUP.set("GearArmSleeve_NikeProDriFitSleeve2a_Black",
  EXPLICIT_COLOR_LOOKUP.get("GearArmSleeve_NikeProDriFitSleeve2_Black"));
registerExplicitFamily({
  black: "GearNeckpad_VintageNeckRoll", white: "GearNeckpad_VintageSingleNeckRoll"
});
registerExplicitFamily({ black: "FaceGear_BalaclavaOverNose", white: "FaceGear_BalaclavaOverNose_White", primary: "FaceGear_BalaclavaOverNose_Primary", secondary: "FaceGear_BalaclavaOverNose_Secondary" });
for (const family of sourcedInventory.partialColorFamilies) registerExplicitFamily(family);
// The menu calls this "Black", but CRASHTEST confirms blue/pink artwork.
// Only this legacy input is redirected; it must never be a safe-color target.
EXPLICIT_COLOR_LOOKUP.set("GearMouthpiece_PacifierDualHanging_Black4", new Map([
  ["primary", "GearMouthpiece_PacifierDualHanging_TeamColor5"], ["secondary", "GearMouthpiece_PacifierDualHanging_TeamColor9"],
  ["black", "GearMouthpiece_PacifierDualHanging_Black"], ["white", "GearMouthpiece_PacifierDualHanging_White"]
]));
// Black-logo shirts have no verified white-cloth/black-logo equivalent.
// Retain the exact item when its cloth color is unavailable.
registerExplicitFamily({ primary: "NeckWear_Turtleneck_Tight3" });
registerExplicitFamily({ primary: "NeckWear_Turtleneck_Tight5" });

export const EQUIPMENT_COLOR_THEMES = Object.freeze(["primary", "secondary", "black", "white"]);

export function recolorEquipmentItem(itemName, theme) {
  const value = String(itemName ?? "");
  if (equipmentItem(value)?.displayOnly) return value;
  const explicit = EXPLICIT_COLOR_LOOKUP.get(value);
  if (explicit) return explicit.get(theme) ?? value;
  const match = value.match(COLOR_TOKEN);
  const tokens = THEME_TOKENS[theme];
  if (!match || !tokens) return value;
  const family = COLOR_FAMILIES.get(`${value.slice(0, match.index)}_#${match[2] || ""}`.toLowerCase());
  if (!family) return value;
  for (const token of tokens) if (family.has(token)) return family.get(token);
  return value;
}

const MOUTHPIECE_COLOR_TOKENS = Object.freeze({
  primary: ["teamcolor", "primary"], secondary: ["secondarycolor", "secondary"], black: ["black"], white: ["white", "offwhite"]
});
const MOUTHPIECE_THEME_DEFAULTS = Object.freeze({
  primary: "GearMouthpiece_PacifierDualHanging_TeamColor",
  secondary: "GearMouthpiece_PacifierDualHanging_SecondaryColor",
  black: "GearMouthpiece_PacifierDualHanging_Black",
  white: "GearMouthpiece_PacifierDualHanging_White"
});
const MOUTHPIECE_FAMILIES = new Map();
for (const item of EQUIPMENT_ITEMS.filter(item => item.category === "Mouthpiece")) {
  const match = item.itemName.match(/^(.*_)([^_]+?)(\d*)$/);
  if (!match) continue;
  const key = `${match[1]}#${match[3]}`.toLowerCase();
  const family = MOUTHPIECE_FAMILIES.get(key) ?? new Map();
  family.set(match[2].toLowerCase(), item.itemName);
  MOUTHPIECE_FAMILIES.set(key, family);
}

export function recolorMouthpieceItem(itemName, theme) {
  const value = String(itemName ?? "");
  const explicit = EXPLICIT_COLOR_LOOKUP.get(value);
  if (explicit) return explicit.get(theme) ?? value;
  const match = value.match(/^(.*_)([^_]+?)(\d*)$/);
  const tokens = MOUTHPIECE_COLOR_TOKENS[theme];
  if (!match || !tokens) return value;
  const family = MOUTHPIECE_FAMILIES.get(`${match[1]}#${match[3]}`.toLowerCase());
  if (family) for (const token of tokens) {
    const candidate = family.get(token);
    if (candidate && isToolMouthpieceColor(candidate)) return candidate;
  }
  return MOUTHPIECE_THEME_DEFAULTS[theme] ?? value;
}

export function isToolMouthpieceColor(itemName) {
  const value = String(itemName ?? "");
  const item = BY_ITEM_NAME.get(value);
  if (!item || item.category !== "Mouthpiece") return false;
  if (item.themeColors) return item.themeColors.every(color => EQUIPMENT_COLOR_THEMES.includes(color));
  return /(?: Black| White| Primary| Secondary Color| Team Color)$/i.test(item.displayName);
}

export const normalBrand = value => {
  const compact = String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (compact === "jordanbrand") return "jordan";
  if (compact === "underarmour") return "underarmour";
  if (compact === "newbalance") return "newbalance";
  return compact;
};

export function itemBrand(item) {
  for (const tag of item?.tags ?? []) {
    const brand = normalBrand(tag);
    if (["nike", "adidas", "jordan", "underarmour", "newbalance", "generic"].includes(brand)) return brand;
  }
  return "";
}

export function equipmentItemsFor(category, predicate = () => true) {
  return EQUIPMENT_ITEMS.filter(item => item.category === category && predicate(item));
}

export function brandedEquipmentItems(category, teamBrand) {
  const brand = normalBrand(teamBrand);
  if (!brand) return [];
  return equipmentItemsFor(category, item => item.itemName.startsWith("Gear") && itemBrand(item) === brand && item.origin !== "unverified");
}

export const UNLOCKED_POOLS = Object.freeze({
  baggyArmSleeves: equipmentItemsFor("Arm Wear", item => /^GearArmSleeve_Baggy_/i.test(item.itemName)),
  armSleeves: equipmentItemsFor("Arm Wear", item => /^GearArmSleeve_(?:Baggy_|Elbow_armTape_normal_|NikeProDriFitSleeve2)/i.test(item.itemName)),
  bicepBands: equipmentItemsFor("Elbow Wear", item => /^GearBicepBand_/i.test(item.itemName)),
  elbowSweatbands: equipmentItemsFor("Elbow Wear", item => /^ElbowGear_(?:elbowSweatband|RubberBands)/i.test(item.itemName)),
  elbowPadsAndBraces: equipmentItemsFor("Elbow Wear", item => /^ElbowGear_(?:armBrace|elbowBrace|elbowpad)/i.test(item.itemName)),
  shoulderStabilizers: equipmentItemsFor("Elbow Wear", item => /ShoulderStabilizer/i.test(item.itemName)),
  legSleeves: equipmentItemsFor("Leg Sleeves", item => canGenerateItem(item) && (/^GearLegsBase_(?:Left|Right)Sleeve_/i.test(item.itemName) || item.origin === "unlocked")),
  unlockedMouthpieces: equipmentItemsFor("Mouthpiece", item => /^(?:Battle|NXTRND|Nike|Shock)\b/i.test(item.displayName) && isToolMouthpieceColor(item.itemName)),
  hangingMouthpieces: equipmentItemsFor("Mouthpiece", item => item.tags.includes("HangingMouthpiece") && isToolMouthpieceColor(item.itemName)),
  colorfulHangingMouthpieces: equipmentItemsFor("Mouthpiece", item => item.randomColorOnly || /^GearMouthpiece_PacifierDualHanging_(?:Yellow|Red|Orange|Green|Pink|Neon|Blue|LightBlue|Purple)(?:2|3)?$/.test(item.itemName) || /^GearMouthpiece_PacifierDualHanging_White(?:[4-9]|1[0-2])$/.test(item.itemName)),
  standardPacifiers: equipmentItemsFor("Mouthpiece", item => /^GearMouthpiece_PacifierDual_(?!Hanging)/i.test(item.itemName) && isToolMouthpieceColor(item.itemName)),
  mouthguards: equipmentItemsFor("Mouthpiece", item => /^GearMouthpiece_Mouthguard/i.test(item.itemName) && isToolMouthpieceColor(item.itemName)),
  // Deliberate allowlist: old neckpad IDs are repurposed by mods. Unknown styles
  // (including possible under-lip masks) must not leak into generated neckwear.
  neckwear: EQUIPMENT_ITEMS.filter(item =>
    (item.category === "Neckwear" && item.origin === "unlocked" && (!colorInventory.unclassifiedNeckwear.includes(item.itemName) || Object.hasOwn(sourcedInventory.displayNames, item.itemName)))
    && canGenerateItem(item)),
  balaclavas: equipmentItemsFor("Face Wear", item => item.origin === "unlocked" && !item.displayOnly && /^FaceGear_BalaclavaOverNose/.test(item.itemName)),
  thighPads: equipmentItemsFor("Thigh Pads", item => item.origin === "unlocked" && !item.displayOnly),
  towels: equipmentItemsFor("Towel", item => item.origin === "unlocked" && !item.displayOnly)
});

export const RAW_ACCESSORIES_POOLS = Object.freeze({
  neckwear: EQUIPMENT_ITEMS.filter(item => item.origin === "raw" && ["Neckwear", "Neck Pad"].includes(item.category)),
  skullcaps: EQUIPMENT_ITEMS.filter(item => item.origin === "raw" && item.category === "Guardian Cap")
});

// Preserve the mouthpiece's form and brand when changing existing colors.
// Unknown custom assets stay untouched rather than guessing their variants.
export function mouthpieceColorVariants(itemName, allowRandomColors = false) {
  const current = equipmentItem(itemName);
  if (!current || current.category !== "Mouthpiece" || /(?:^|_)None$/i.test(itemName)) return [];
  const kind = value => /PacifierDualHanging/i.test(value) ? "hanging" : /PacifierDual_/i.test(value) ? "pacifier" : /Mouthguard/i.test(value) ? "mouthguard" : null;
  const brand = value => /^(Battle|NXTRND|Nike|Shock)\b/i.exec(value.displayName)?.[1]?.toLowerCase() ?? "generic";
  const type = kind(itemName); if (!type) return [];
  const allowed = new Set([...UNLOCKED_POOLS.hangingMouthpieces, ...UNLOCKED_POOLS.standardPacifiers, ...UNLOCKED_POOLS.mouthguards, ...(allowRandomColors ? UNLOCKED_POOLS.colorfulHangingMouthpieces : [])].map(item => item.itemName));
  return EQUIPMENT_ITEMS.filter(item => allowed.has(item.itemName) && kind(item.itemName) === type && brand(item) === brand(current));
}
