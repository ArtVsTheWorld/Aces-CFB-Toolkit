import { POSITION_GROUPS, positionGroup } from "../../../../shared/positionGroups.js";
export const DEFAULT_VISOR_FREQUENCIES = Object.freeze({ QB: 20, HB: 40, FB: 0, WR: 60, TE: 40, OL: 0, EDGE: 20, DT: 20, LB: 40, CB: 60, FS: 40, SS: 40, "K/P": 0 });
export const UNDERSHIRT_ASSETS = Object.freeze({ hoodie: "Gear_Undershirt_HoodieSleeveless", secondary: "Gear_Undershirt_CompressionTCrewSleeveless_Secondary", primary: "Gear_Undershirt_CompressionTCrewSleeveless", white: "Gear_Undershirt_CompressionTCrewSleeveless_White", black: "Gear_Undershirt_CompressionTCrewSleeveless_Black", none: "Undershirt_None" });
export const DEFAULT_UNDERSHIRT_WEIGHTS = Object.freeze({ regular: { hoodie: 5, secondary: 30, primary: 25, white: 35, black: 5, none: 0 }, large: { hoodie: 5, secondary: 30, primary: 25, white: 30, black: 5, none: 5 } });
function percentages(input, defaults, label, totalRequired) {
  if (input != null && (typeof input !== "object" || Array.isArray(input))) throw new Error(`${label}: invalid percentage settings.`);
  for (const key of Object.keys(input ?? {})) if (!(key in defaults)) throw new Error(`${label}: unknown option ${key}.`);
  const result = Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, Number(input?.[key] ?? fallback)]));
  if (Object.values(result).some(value => !Number.isInteger(value) || value < 0 || value > 100) || Object.values(input ?? {}).some(value => value === "" || value === null)) throw new Error(`${label}: use whole percentages from 0 to 100.`);
  if (totalRequired && Object.values(result).reduce((sum, value) => sum + value, 0) !== 100) throw new Error(`${label}: percentages must total 100%.`);
  return result;
}
export function normalizeVisorFrequencies(input) { return percentages(input, DEFAULT_VISOR_FREQUENCIES, "Visor frequency", false); }
export const visorFrequency = (input, position) => normalizeVisorFrequencies(input)[positionGroup(position)] / 100;
export function normalizeUndershirtWeights(input) {
  for (const key of Object.keys(input ?? {})) if (!["regular", "large"].includes(key)) throw new Error(`Unknown undershirt body group ${key}.`);
  return Object.fromEntries(Object.entries(DEFAULT_UNDERSHIRT_WEIGHTS).map(([group, defaults]) => [group, percentages(input?.[group], defaults, `${group === "large" ? "Muscular / Standard" : "Other Builds"} undershirts`, true)]));
}
export { POSITION_GROUPS, positionGroup };
