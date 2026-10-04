import { equipmentTags, recolorEquipmentItem } from "../catalog.js";

export const DEFAULT_ACCESSORY_COLOR_WEIGHTS = Object.freeze({ white: 65, black: 20, primary: 10, secondary: 5 });
export const DEFAULT_TAPE_COLOR_WEIGHTS = Object.freeze({ white: 95, black: 5, primary: 0, secondary: 0 });
const key = name => String(name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const TAPE_DEFAULTS = new Map();
for (const [names, values] of [
  [["Alabama", "Alabama Crimson Tide", "Bama", "Georgia", "Georgia Bulldogs", "UGA", "Missouri", "Mizzou", "Nebraska", "Northwestern", "Penn State", "Penn St", "Penn State Nittany Lions", "Purdue", "USC", "Southern California", "USC Trojans", "Wake Forest", "Cincinnati", "Texas Tech", "UCF", "Central Florida", "Army", "Army West Point", "Southern Miss", "Southern Mississippi", "Oregon State", "Oregon St", "Oklahoma State", "Oklahoma St", "NIU", "Northern Illinois", "N. Illinois", "App State", "App St", "Appalachian State", "Appalachian St", "Kennesaw State", "Kennesaw St"], [0, 100, 0, 0]],
  [["Vanderbilt", "Ohio State", "Colorado"], [100, 0, 0, 0]],
  [["Michigan"], [0, 0, 100, 0]],
  [["Boston College", "Miami", "Miami (FL)", "Pitt", "Pittsburgh", "Iowa State"], [70, 30, 0, 0]],
  [["Florida State", "Syracuse"], [55, 25, 20, 0]],
  [["Houston"], [70, 0, 30, 0]]
]) for (const name of names) TAPE_DEFAULTS.set(key(name), Object.fromEntries(Object.keys(DEFAULT_TAPE_COLOR_WEIGHTS).map((color, index) => [color, values[index]])));
export function defaultTeamTapeWeights(name) { return { ...(TAPE_DEFAULTS.get(key(name)) ?? DEFAULT_TAPE_COLOR_WEIGHTS) }; }
// Legacy callers may still request a single color; use the most likely default.
export function defaultTeamTapeColor(name) { return Object.entries(defaultTeamTapeWeights(name)).sort((a, b) => b[1] - a[1])[0][0]; }
export function normalizeAccessoryColorWeights(value = DEFAULT_ACCESSORY_COLOR_WEIGHTS) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Accessory color percentages must include White, Black, Team primary, and Team secondary.");
  const weights = Object.fromEntries(Object.keys(DEFAULT_ACCESSORY_COLOR_WEIGHTS).map(color => [color, Number(value[color])]));
  if (Object.values(weights).some(weight => !Number.isFinite(weight) || weight < 0 || weight > 100)) throw new Error("Accessory color percentages must be numbers from 0 through 100.");
  if (Math.abs(Object.values(weights).reduce((sum, weight) => sum + weight, 0) - 100) > 0.000001) throw new Error("Accessory color percentages must total 100%.");
  return weights;
}
export function normalizeTeamTapeColors(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Tape color percentages must be configured for each team.");
  return Object.fromEntries(Object.entries(value).map(([team, color]) => {
    try {
      if (typeof color === "string") {
        if (!Object.hasOwn(DEFAULT_TAPE_COLOR_WEIGHTS, color)) throw new Error("Choose White, Black, Primary, or Secondary.");
        color = Object.fromEntries(Object.keys(DEFAULT_TAPE_COLOR_WEIGHTS).map(name => [name, name === color ? 100 : 0]));
      }
      if (!color || typeof color !== "object" || Array.isArray(color) || Object.keys(DEFAULT_TAPE_COLOR_WEIGHTS).some(name => color[name] === null || color[name] === undefined || typeof color[name] === "boolean" || String(color[name]).trim() === "")) throw new Error("Enter all four percentages from 0 through 100.");
      const weights = normalizeAccessoryColorWeights(color);
      if (Object.values(weights).some(value => !Number.isInteger(value))) throw new Error("Use whole-number percentages. Balance to 100% can round your mix.");
      return [team.trim().toLowerCase(), weights];
    } catch (error) { throw new Error(`Tape color for ${team}: ${error.message.replaceAll("Accessory color", "Tape color")}`); }
  }));
}
export function teamTapeWeights(name, overrides = {}) { const team = String(name ?? "").trim().toLowerCase(); return Object.hasOwn(overrides, team) ? normalizeTeamTapeColors({ [team]: overrides[team] })[team] : defaultTeamTapeWeights(name); }
export function teamTapeColor(name, overrides = {}) { return Object.entries(teamTapeWeights(name, overrides)).sort((a, b) => b[1] - a[1])[0][0]; }
export function rollAccessoryColorTheme(rng, weights = DEFAULT_ACCESSORY_COLOR_WEIGHTS) {
  const roll = rng() * 100;
  let threshold = 0;
  for (const color of Object.keys(DEFAULT_ACCESSORY_COLOR_WEIGHTS)) { threshold += weights[color]; if (roll < threshold) return color; }
  return "secondary";
}
export function isWristTape(itemName, slot) { return ["LeftWristWear", "RightWristWear"].includes(slot) && (equipmentTags(itemName).includes("GearWrist_Tape") || /^(?:GearWrist_wristTaped(?:Lite|Normal|Max)_|G_WristTaped_Max_)/i.test(String(itemName))); }
export function isArmTape(itemName, slot) { return ["LeftArmWear", "RightArmWear"].includes(slot) && /^GearArmSleeve_(?:Undershirt|Quarter)_armTape_normal_(?:Black|OffWhite|TeamColor|SecondaryColor)$/i.test(String(itemName)); }
export function recolorTapeItem(itemName, color, slot) {
  if (!Object.hasOwn(DEFAULT_TAPE_COLOR_WEIGHTS, color)) throw new Error("Tape color must be White, Black, Primary, or Secondary.");
  const item = String(itemName ?? "");
  // GearSpats_override_* items control cleat colors; they are not ankle tape.
  if (["LeftSpat", "RightSpat"].includes(slot) && /^GearSpats_spatThin_/i.test(item)) return recolorEquipmentItem(item, color);
  if (!isWristTape(item, slot) && !isArmTape(item, slot)) return item;
  if (/^G_WristTaped_Max_/i.test(item)) return recolorEquipmentItem("GearWrist_wristTapedMax_TeamColor", color);
  return recolorEquipmentItem(item, color);
}
export function recolorPlayerAccessories(loadouts, theme, tapeColor) {
  const replacements = new Map();
  for (const loadout of loadouts) for (const element of loadout.loadoutElements) {
    const slot = element.slotType ?? element.slot, oldItem = element.itemAssetName;
    if (slot === "MouthWear") continue;
    const newItem = ["LeftSpat", "RightSpat"].includes(slot) || isWristTape(oldItem, slot) || isArmTape(oldItem, slot)
      ? recolorTapeItem(oldItem, tapeColor, slot) : recolorEquipmentItem(oldItem, theme);
    if (newItem !== oldItem) { element.itemAssetName = newItem; replacements.set(oldItem, newItem); }
  }
  return replacements;
}
