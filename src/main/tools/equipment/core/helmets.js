import { POSITION_GROUPS, positionGroup } from "../../../../shared/positionGroups.js";
import { EQUIPMENT_ITEMS, equipmentItem } from "../catalog.js";

// Exact player ItemInfo families. F7 Pro and Zero 2 Trench share broad tags
// with other variants, so their mask subsets must be resolved explicitly.
const definitions = [
  ["GearHelmet_Speed_Flex", "Riddell Speedflex Facemasks"],
  ["GearHelmet_Axiom", "Riddell Axiom Facemasks"],
  ["GearHelmet_SchuttF7", "Schutt Facemasks", /^GearFaceMask_F7(?!Pro)/],
  ["GearHelmet_SchuttF7Pro", "Schutt Facemasks", /^GearFaceMask_F7Pro/],
  ["GearHelmet_LightGladiator", "LightGladiatorFacemasks"],
  ["GearHelmet_VicisZero1", "Vicis Zero1 Facemasks"],
  ["GearHelmet_VicisZero2", "Vicis Zero2 Facemasks", /^(?!.*Trench)/],
  ["GearHelmet_VicisZero2Trench", "Vicis Zero2 Facemasks", /Trench/],
  ["GearHelmet_Revolution", "Riddell Revo Facemasks"],
  ["GearHelmet_RevolutionSpeed", "Riddell Speed Facemasks"],
  ["GearHelmet_AirXP", "AirXP"],
  ["GearHelmet_Schutt", "AirXP"],
  ["GearHelmet_Standard", "AirXP"],
  ["GearHelmet_RiddellTK", "Vintage Facemasks"]
];
export const HELMET_POSITIONS = POSITION_GROUPS;
export const helmetPosition = positionGroup;
export const HELMET_MODELS = Object.freeze(definitions.map(([id, tag, pattern]) => {
  const item = equipmentItem(id);
  const masks = EQUIPMENT_ITEMS.filter(mask => mask.category === "Facemask" && mask.tags.includes(tag) && (!pattern || pattern.test(mask.itemName))).map(mask => mask.itemName);
  if (!item || !masks.length) throw new Error(`Incomplete helmet catalog: ${id}`);
  return Object.freeze({ id, label: item.displayName, masks: Object.freeze(masks), guardianCap: item.tags.includes("GuardianCap"), hangingMouthpiece: item.tags.includes("HangingMouthpiece"),
    positions: HELMET_POSITIONS, defaultMasks: Object.freeze(masks.filter(mask => !/Kicker|Trench/i.test(mask) && equipmentItem(mask).defaultSelected !== false).length ? masks.filter(mask => !/Kicker|Trench/i.test(mask) && equipmentItem(mask).defaultSelected !== false) : masks) });
}));
const byId = new Map(HELMET_MODELS.map(model => [model.id, model]));
export const helmetModel = id => byId.get(id);
export const helmetAllowed = (id, position) => Boolean(byId.get(id)?.positions.includes(helmetPosition(position)));
export function helmetAllowedInMix(configuration, id, position) {
  const key = helmetPosition(position);
  return helmetAllowed(id, key) && (configuration.positions[key] ?? configuration.global)[id] > 0;
}
export const facemaskFitsHelmet = (mask, helmet) => Boolean(byId.get(helmet)?.masks.includes(mask));
export const DEFAULT_HELMET_WEIGHTS = Object.freeze(Object.fromEntries(HELMET_MODELS.map(model => [model.id, ({ GearHelmet_Speed_Flex: 70, GearHelmet_Axiom: 10, GearHelmet_SchuttF7: 10, GearHelmet_SchuttF7Pro: 10 })[model.id] ?? 0])));

function normalizeWeights(input, label) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error(`${label}: enter helmet percentages totaling 100%.`);
  for (const id of Object.keys(input)) if (!byId.has(id)) throw new Error(`${label}: unknown helmet model ${id}.`);
  const weights = Object.fromEntries(HELMET_MODELS.map(model => [model.id, Number(input[model.id] ?? 0)]));
  if (Object.values(weights).some(value => !Number.isInteger(value) || value < 0 || value > 100)) throw new Error(`${label}: helmet percentages must be whole numbers from 0 to 100.`);
  if (Object.values(weights).reduce((sum, value) => sum + value, 0) !== 100) throw new Error(`${label}: helmet percentages must total 100%.`);
  return weights;
}
export function normalizeHelmetDistribution(input) {
  if (input === undefined || input === null || input.mode === "default") return null; // Preserve old presets and their exact legacy draws.
  if (input.mode !== "custom") throw new Error("Choose Default or Custom helmet distribution.");
  const global = normalizeWeights(input.global, "Default mix"), positions = {}, grouped = {};
  if (input.positions !== undefined && (!input.positions || typeof input.positions !== "object" || Array.isArray(input.positions))) throw new Error("Invalid helmet position settings.");
  for (const [position, values] of Object.entries(input.positions ?? {})) {
    const key = helmetPosition(position);
    if (!HELMET_POSITIONS.includes(key)) throw new Error(`Unknown helmet position group ${position}.`);
    const weights = normalizeWeights(values, `${key} mix`);
    (grouped[key] ??= []).push({ position, weights });
  }
  for (const [key, entries] of Object.entries(grouped)) {
    const explicit = entries.find(entry => entry.position === key);
    if (explicit) { positions[key] = explicit.weights; continue; }
    const ids = HELMET_MODELS.map(model => model.id), scaled = ids.map(id => entries.reduce((sum, entry) => sum + entry.weights[id], 0) / entries.length), whole = scaled.map(Math.floor);
    const order = scaled.map((value, index) => ({ index, remainder: value - whole[index] })).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    for (let n = 0, remaining = 100 - whole.reduce((sum, value) => sum + value, 0); n < remaining; n++) whole[order[n].index]++;
    positions[key] = Object.fromEntries(ids.map((id, index) => [id, whole[index]]));
  }
  return { mode: "custom", global, positions };
}
export function effectiveHelmetWeights(configuration, position) {
  const key = helmetPosition(position), source = configuration.positions[key] ?? configuration.global;
  const allowed = Object.fromEntries(Object.entries(source).filter(([id]) => helmetAllowed(id, key)));
  const total = Object.values(allowed).reduce((sum, value) => sum + value, 0);
  if (!total) throw new Error(`The helmet mix has no available helmets for ${key}. Add a compatible helmet or set a position override.`);
  return Object.fromEntries(Object.entries(allowed).map(([id, weight]) => [id, weight * 100 / total]));
}
export function rollCustomHelmet(configuration, positions, rng) {
  // Shared rows can only receive a model allowed by every linked position.
  const mixes = positions.map(position => effectiveHelmetWeights(configuration, position));
  const weights = Object.entries(mixes[0]).filter(([id, weight]) => weight > 0 && mixes.every(mix => mix[id] > 0));
  if (!weights.length) throw new Error("A shared equipment record has no helmet allowed by every linked player's helmet mix. Narrow the Player Pool or change the mixes.");
  let roll = rng() * weights.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [id, weight] of weights) { roll -= weight; if (roll < 0) return id; }
  return weights.at(-1)[0];
}
export function normalizeFacemaskPools(input) {
  if (input == null) return null;
  if (typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid facemask pools.");
  for (const id of Object.keys(input)) if (!byId.has(id)) throw new Error(`Unknown helmet in facemask pools: ${id}.`);
  return Object.fromEntries(HELMET_MODELS.map(model => {
    const pool = input[model.id] ?? model.defaultMasks;
    if (!Array.isArray(pool) || !pool.length || pool.some(mask => !model.masks.includes(mask))) throw new Error(`${model.label}: select at least one compatible facemask.`);
    return [model.id, [...new Set(pool)]];
  }));
}
export function rollCompatibleFacemask(helmet, position, rng, selections = null) {
  const model = byId.get(helmet);
  if (!model) throw new Error(`No verified facemask pool for ${helmet}.`);
  const key = helmetPosition(position);
  const available = selections?.[helmet] ?? model.masks.filter(mask => equipmentItem(mask).defaultSelected !== false);
  const filtered = selections ? available : available.filter(mask => key === "K/P" ? /Kicker/i.test(mask) : !/Kicker|Trench/i.test(mask));
  const pool = filtered.length ? filtered : available;
  if (!pool.length) throw new Error(`${model.label}: select at least one compatible facemask.`);
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}
