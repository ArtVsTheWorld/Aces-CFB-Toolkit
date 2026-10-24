import { POSITION_GROUPS, positionGroup } from "../../../../shared/positionGroups.js";
import { selectFrequencyCandidates } from './frequency.js';
import { ABOVE_KNEE_PANTS, CUTOFF_PANTS, STANDARD_PANTS, LOWER_JERSEY_REPLACEMENTS, cutoffPantsConflict, uniformItem } from "./uniformCompatibility.js";

export const DEFAULT_LOWER_JERSEY_CAPS = Object.freeze(Object.fromEntries(POSITION_GROUPS.map(group => [group, ["OL", "DT"].includes(group) ? 0 : 100])));
export const DEFAULT_CUTOFF_PANTS_CAPS = Object.freeze(Object.fromEntries(POSITION_GROUPS.map(group => [group, ["WR", "CB", "FS", "SS"].includes(group) ? 5 : 0])));
export function normalizeUniformCaps(value, defaults, label) {
  if (value !== undefined && (!value || typeof value !== "object" || Array.isArray(value))) throw new Error(`${label}: invalid position caps.`);
  for (const group of Object.keys(value ?? {})) if (!POSITION_GROUPS.includes(group)) throw new Error(`${label}: unknown position group ${group}.`);
  return Object.fromEntries(POSITION_GROUPS.map(group => {
    const number = value?.[group] ?? defaults[group];
    if (!Number.isInteger(number) || number < 0 || number > 100 || value?.[group] === null) throw new Error(`${label}: use whole percentages from 0 through 100.`);
    return [group, number];
  }));
}
const fieldOutfits = raw => { try { return JSON.parse(raw).loadouts.filter(outfit => outfit.loadoutType === "PlayerOnField" && Array.isArray(outfit.loadoutElements)); } catch { return []; } };
const has = (outfits, slot, assets) => outfits.some(outfit => assets.has(uniformItem(outfit.loadoutElements, slot)));
const lowest = new Set(Object.values(LOWER_JERSEY_REPLACEMENTS));
const eligibleJerseys = new Set(Object.keys(LOWER_JERSEY_REPLACEMENTS));
// Includes protected players in the chosen population, but never selects them.
// Single-owner rows only: a capped addition must not silently affect siblings.
export function buildUniformStylePlan(entries, options, rng) {
  const lowerCaps = normalizeUniformCaps(options.lowerJerseyCaps, DEFAULT_LOWER_JERSEY_CAPS, "Lower Rolled Jersey");
  const pantsCaps = normalizeUniformCaps(options.cutoffPantsCaps, DEFAULT_CUTOFF_PANTS_CAPS, "Cutoff Pants");
  const lower = new Set(), pants = new Set(), stats = [];
  const groups = new Map();
  for (const entry of entries) {
    const group = positionGroup(entry.position); if (!POSITION_GROUPS.includes(group)) continue;
    const outfits = fieldOutfits(entry.raw); if (!outfits.length) continue;
    const key = JSON.stringify([entry.cohort, entry.teamIndex ?? null, group]), values = groups.get(key) ?? [];
    values.push({ ...entry, outfits }); groups.set(key, values);
  }
  for (const [key, values] of groups) {
    const [cohort, teamIndex, group] = JSON.parse(key), total = values.length;
    const existingLower = values.filter(entry => has(entry.outfits, "OuterShirt", lowest)).length;
    const existingCutoff = values.filter(entry => has(entry.outfits, "OuterPants", new Set([CUTOFF_PANTS]))).length;
    const lowerTarget = Math.floor(total * lowerCaps[group] / 100), cutoffTarget = Math.floor(total * pantsCaps[group] / 100);
    const lowerCandidates = values.filter(entry => entry.editable && !has(entry.outfits, "OuterShirt", lowest) && has(entry.outfits, "OuterShirt", eligibleJerseys));
    if (options.lowerRolledJerseyFix) for (const entry of selectFrequencyCandidates(lowerCandidates, Math.max(0, lowerTarget - existingLower), lowerCaps[group], options.fillFrequencies?.lowerJersey, rng)) lower.add(entry.visualsRow);
    const candidates = [], standards = []; let incompatible = 0;
    for (const entry of values) {
      if (!entry.editable || has(entry.outfits, "OuterPants", new Set([CUTOFF_PANTS]))) continue;
      const projected = structuredClone(entry.outfits);
      // Rolled-Jersey Undershirts runs before lowering jerseys and cutoff
      // pants. Plan for a possible shirt addition; Apply checks the actual
      // rolled result again, including the optional no-undershirt outcome.
      if(options.rolledJerseyFix)for(const outfit of projected){const elements=outfit.loadoutElements,shirt=elements.find(e=>e.slotType==='InnerShirt');if(uniformItem(elements,'OuterShirt')==='Gear_JerseyStyle_RolledLow'&&shirt&&['Undershirt_None','Gear_Undershirt_Hoodie'].includes(shirt.itemAssetName))shirt.itemAssetName='Gear_Undershirt_CompressionTCrewSleeveless';}
      if (lower.has(entry.visualsRow)) for (const outfit of projected) for (const element of outfit.loadoutElements) if (element.slotType === "OuterShirt" && LOWER_JERSEY_REPLACEMENTS[element.itemAssetName]) element.itemAssetName = LOWER_JERSEY_REPLACEMENTS[element.itemAssetName];
      const source = outfit => uniformItem(outfit.loadoutElements, "OuterPants");
      const applicable = projected.filter(outfit => source(outfit) === ABOVE_KNEE_PANTS || options.replaceStandardWithCutoff && source(outfit) === STANDARD_PANTS);
      if (!applicable.length) continue;
      if (applicable.some(outfit => cutoffPantsConflict(outfit.loadoutElements))) { incompatible++; continue; }
      (applicable.some(outfit => source(outfit) === STANDARD_PANTS) ? standards : candidates).push(entry);
    }
    if (options.cutoffPantsFix) {
      if (options.replaceStandardWithCutoff) for (const entry of standards) pants.add(entry.visualsRow);
      for (const entry of selectFrequencyCandidates(candidates, Math.max(0, cutoffTarget - existingCutoff - (options.replaceStandardWithCutoff ? standards.length : 0)), pantsCaps[group], options.fillFrequencies?.cutoffPants, rng)) pants.add(entry.visualsRow);
    }
    stats.push({ scope: "team", teamIndex, team: values[0].team ?? `Team ${teamIndex ?? "Unknown"}`, cohort, group, total, lowerCap: lowerCaps[group], existingLower, lowerTarget, lowerSelected: values.filter(entry => lower.has(entry.visualsRow)).length, cutoffCap: pantsCaps[group], existingCutoff, cutoffTarget, cutoffSelected: values.filter(entry => pants.has(entry.visualsRow)).length, standardReplacements: options.cutoffPantsFix && options.replaceStandardWithCutoff ? standards.length : 0, incompatible, protectedPlayers: values.filter(entry => !entry.editable).length });
  }
  return { lower, pants, stats };
}
export function applyUniformStylePlan(loadouts, originalOutfits, visualsRow, plan, options) {
  const changes = [];
  loadouts.forEach((outfit, index) => {
    for (const element of outfit.loadoutElements) {
      const oldItem = element.itemAssetName;
      if (element.slotType === "OuterShirt" && plan.lower.has(visualsRow) && LOWER_JERSEY_REPLACEMENTS[oldItem]) {
        element.itemAssetName = LOWER_JERSEY_REPLACEMENTS[oldItem];
        changes.push({ type: "lower", slot: element.slotType, oldItem, newItem: element.itemAssetName });
      }
    }
    if (!plan.pants.has(visualsRow) || cutoffPantsConflict(outfit.loadoutElements)) return;
    const original = uniformItem(originalOutfits[index]?.loadoutElements ?? [], "OuterPants");
    if (original !== ABOVE_KNEE_PANTS && !(options.replaceStandardWithCutoff && original === STANDARD_PANTS)) return;
    const element = outfit.loadoutElements.find(element => element.slotType === "OuterPants");
    if (!element || ![ABOVE_KNEE_PANTS, STANDARD_PANTS].includes(element.itemAssetName)) return;
    const oldItem = element.itemAssetName; element.itemAssetName = CUTOFF_PANTS;
    changes.push({ type: "cutoff", slot: "OuterPants", oldItem, newItem: CUTOFF_PANTS, originalItem: original });
  });
  return changes;
}
