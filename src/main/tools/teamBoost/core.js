import { matchesPlayerScope } from "../playerScope.js";
import { positionGroup } from "../../../shared/positionGroups.js";
import { mulberry32 } from "../longSnap/core.js";
import { ARCHETYPE_WEIGHTS, PHYSICAL_RATING_FIELDS, RATING_LABELS } from "./ratingWeights.js";

export const RATING_MODES = Object.freeze(new Set(["all", "nonphysical", "physical", "specific"]));
export const SUPPORTED_ATTRIBUTES = Object.freeze(Object.keys(RATING_LABELS));
export const PLAYER_SCOPES = Object.freeze(new Set(["all", "below-average", "above-average"]));
const clamp = value => Math.max(0, Math.min(99, value));
export function validateBoostRange(minimum, maximum) { if (!Number.isInteger(minimum) || minimum < -99 || minimum > 99) return "Minimum must be a whole number from -99 through 99."; if (!Number.isInteger(maximum) || maximum < -99 || maximum > 99) return "Maximum must be a whole number from -99 through 99."; if (maximum < minimum) return "Maximum must be greater than or equal to minimum."; return true; }
export function ratingModeLabel(mode) { if (mode === "specific") return "specific attributes"; if (mode === "all") return "all relevant ratings"; if (mode === "physical") return "physical ratings only"; return "non-physical ratings only"; }
const profileKey = record => `${String(record.Position ?? "")}|${String(record.PlayerType ?? "")}`;
function averagePositionWeights(position) { const profiles = Object.entries(ARCHETYPE_WEIGHTS).filter(([key]) => key.startsWith(`${position}|`)).map(([, weights]) => weights); if (!profiles.length) return null; const totals = new Map(); for (const weights of profiles) for (const [field, weight] of Object.entries(weights)) totals.set(field, (totals.get(field) ?? 0) + weight); return Object.fromEntries([...totals].map(([field, total]) => [field, total / profiles.length])); }
export function weightsForPlayer(record) { return ARCHETYPE_WEIGHTS[profileKey(record)] ?? averagePositionWeights(String(record.Position ?? "")); }
// A rating important to any archetype at a position belongs to that position's
// complete skill set. The workbook's baseline weight of 1 is not relevance.
const positionFields=new Map();
for(const [profile,weights] of Object.entries(ARCHETYPE_WEIGHTS)){
  const position=profile.split('|')[0],fields=positionFields.get(position)??new Set();
  for(const [field,weight] of Object.entries(weights))if(weight>1&&Object.hasOwn(RATING_LABELS,field))fields.add(field);
  positionFields.set(position,fields);
}
export const POSITION_RELEVANT_RATINGS=Object.freeze(Object.fromEntries([...positionFields].map(([position,fields])=>[position,Object.freeze([...fields].sort())])));
function eligibleWeights(record,mode,attributes){
  const fields=mode==='specific'?attributes:POSITION_RELEVANT_RATINGS[String(record.Position??'')]??[];
  return fields.filter(field=>{
    if(record[field]===undefined||record[field]===null||typeof record[field]==='boolean'||String(record[field]).trim()===''||!Number.isFinite(Number(record[field])))return false;
    return mode==='specific'||mode==='all'||(mode==='physical'?PHYSICAL_RATING_FIELDS.has(field):!PHYSICAL_RATING_FIELDS.has(field));
  }).map(field=>[field,1]);
}
const rollInteger = (random, minimum, maximum) => minimum + Math.floor(random() * (maximum - minimum + 1));
export function positionRoomAverages(records, selectedTeams, excludedTeamIndexes = new Set()) { const rooms = new Map(); records.forEach(record => { if (!record || record.isEmpty || !selectedTeams.has(Number(record.TeamIndex)) || excludedTeamIndexes.has(Number(record.TeamIndex))) return; const overall = Number(record.OverallRating), position = String(record.Position ?? ""); if (!position || !Number.isFinite(overall)) return; const key = `${Number(record.TeamIndex)}|${position}`, room = rooms.get(key) ?? { total: 0, count: 0 }; room.total += overall; room.count += 1; rooms.set(key, room); }); return new Map([...rooms].map(([key, room]) => [key, room.total / room.count])); }
export function patchTeamRatings(records, { teamIndex, teamIndexes, excludedTeamIndexes = new Set(), minimum = 1, maximum = 3, mode = "nonphysical", playerScope = "all", positions = [], attributes = [], seed = 1, apply = false, scope = {}, positionRanges = {} } = {}) {
  if (!Array.isArray(positions) || positions.some(position => !["QB", "HB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "LE", "RE", "DT", "LOLB", "MLB", "ROLB", "CB", "FS", "SS", "K", "P"].includes(position))) throw new Error("Choose valid player positions.");
  if (mode === "specific" && (!Array.isArray(attributes) || !attributes.length || attributes.some(field => !SUPPORTED_ATTRIBUTES.includes(field)))) throw new Error("Choose at least one supported attribute.");
  attributes = [...new Set(attributes)];
  const selectedPositions = new Set(positions);
  const validation = validateBoostRange(minimum, maximum); if (validation !== true) throw new Error(validation); if (!RATING_MODES.has(mode)) throw new Error("Rating mode must be all, nonphysical, or physical."); if (!PLAYER_SCOPES.has(playerScope)) throw new Error("Player scope must be all, below-average, or above-average."); const selectedTeams = new Set((teamIndexes ?? [teamIndex]).map(Number)); if (!selectedTeams.size || [...selectedTeams].some(value => !Number.isInteger(value))) throw new Error("At least one valid team index is required.");
  for (const index of excludedTeamIndexes) selectedTeams.delete(Number(index));
  const roomAverages = positionRoomAverages(records, selectedTeams, excludedTeamIndexes); const random = mulberry32(seed); const players = []; const ratingChanges = [];
records.forEach((record, row) => { if (!record || record.isEmpty || !selectedTeams.has(Number(record.TeamIndex)) || excludedTeamIndexes.has(Number(record.TeamIndex))) return; if (!matchesPlayerScope(record, row, scope)) return; if (selectedPositions.size && !selectedPositions.has(record.Position)) return; const roomAverage = roomAverages.get(`${Number(record.TeamIndex)}|${String(record.Position ?? "")}`), overall = Number(record.OverallRating); if (playerScope === "below-average" && !(overall < roomAverage)) return; if (playerScope === "above-average" && !(overall > roomAverage)) return; const weightedFields = eligibleWeights(record, mode, attributes); if (!weightedFields.length) return; const playerChanges = []; for (const [field, weight] of weightedFields) { const requestedDelta = rollInteger(random, positionRanges[positionGroup(record.Position)]?.minimum ?? minimum, positionRanges[positionGroup(record.Position)]?.maximum ?? maximum); const oldRating = Number(record[field]); const newRating = clamp(oldRating + requestedDelta); if (newRating === oldRating) continue; if (apply) record[field] = newRating; const change = { row, record, field, label: RATING_LABELS[field] ?? field, weight, oldRating, newRating, delta: newRating - oldRating, roomAverage, playerScope }; playerChanges.push(change); ratingChanges.push(change); } players.push({ row, record, profileFound: Boolean(ARCHETYPE_WEIGHTS[profileKey(record)]), roomAverage, playerScope, changes: playerChanges }); });
  return { players, ratingChanges };
}
