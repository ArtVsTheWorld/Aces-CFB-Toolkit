import { mulberry32 } from "./longSnap.js";
import { ARCHETYPE_WEIGHTS, PHYSICAL_RATING_FIELDS, RATING_LABELS } from "./ratingWeights.js";

export const RATING_MODES = Object.freeze(new Set(["all", "nonphysical", "physical"]));

const clamp = value => Math.max(0, Math.min(99, value));

export function validateBoostRange(minimum, maximum) {
  if (!Number.isInteger(minimum) || minimum < -99 || minimum > 99) return "Minimum must be a whole number from -99 through 99.";
  if (!Number.isInteger(maximum) || maximum < -99 || maximum > 99) return "Maximum must be a whole number from -99 through 99.";
  if (maximum < minimum) return "Maximum must be greater than or equal to minimum.";
  return true;
}

export function ratingModeLabel(mode) {
  if (mode === "all") return "all relevant ratings";
  if (mode === "physical") return "physical ratings only";
  return "non-physical ratings only";
}

function profileKey(record) {
  return `${String(record.Position ?? "")}|${String(record.PlayerType ?? "")}`;
}

function averagePositionWeights(position) {
  const profiles = Object.entries(ARCHETYPE_WEIGHTS)
    .filter(([key]) => key.startsWith(`${position}|`))
    .map(([, weights]) => weights);
  if (!profiles.length) return null;
  const totals = new Map();
  for (const weights of profiles) {
    for (const [field, weight] of Object.entries(weights)) {
      totals.set(field, (totals.get(field) ?? 0) + weight);
    }
  }
  return Object.fromEntries([...totals].map(([field, total]) => [field, total / profiles.length]));
}

export function weightsForPlayer(record) {
  return ARCHETYPE_WEIGHTS[profileKey(record)] ?? averagePositionWeights(String(record.Position ?? ""));
}

function eligibleWeights(record, mode) {
  const weights = weightsForPlayer(record);
  if (!weights) return [];
  const meaningful = Object.entries(weights).filter(([, weight]) => weight > 1);
  const source = meaningful.length ? meaningful : Object.entries(weights).filter(([, weight]) => weight > 0);
  return source.filter(([field]) => {
    if (!Number.isFinite(Number(record[field]))) return false;
    if (mode === "physical") return PHYSICAL_RATING_FIELDS.has(field);
    if (mode === "nonphysical") return !PHYSICAL_RATING_FIELDS.has(field);
    return true;
  });
}

function rollInteger(random, minimum, maximum) {
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

export function patchTeamRatings(records, {
  teamIndex,
  minimum = 1,
  maximum = 3,
  mode = "nonphysical",
  seed = 1,
  apply = false
} = {}) {
  const validation = validateBoostRange(minimum, maximum);
  if (validation !== true) throw new Error(validation);
  if (!RATING_MODES.has(mode)) throw new Error("Rating mode must be all, nonphysical, or physical.");
  if (!Number.isInteger(Number(teamIndex))) throw new Error("A valid team index is required.");
  const random = mulberry32(seed);
  const players = [];
  const ratingChanges = [];

  records.forEach((record, row) => {
    if (!record || record.isEmpty || Number(record.TeamIndex) !== Number(teamIndex)) return;
    const weightedFields = eligibleWeights(record, mode);
    if (!weightedFields.length) return;
    const maximumWeight = Math.max(...weightedFields.map(([, weight]) => weight));
    const playerChanges = [];
    for (const [field, weight] of weightedFields) {
      if (random() > weight / maximumWeight) continue;
      const requestedDelta = rollInteger(random, minimum, maximum);
      const oldRating = Number(record[field]);
      const newRating = clamp(oldRating + requestedDelta);
      if (newRating === oldRating) continue;
      if (apply) record[field] = newRating;
      const change = {
        row,
        record,
        field,
        label: RATING_LABELS[field] ?? field,
        weight,
        oldRating,
        newRating,
        delta: newRating - oldRating
      };
      playerChanges.push(change);
      ratingChanges.push(change);
    }
    players.push({ row, record, profileFound: Boolean(ARCHETYPE_WEIGHTS[profileKey(record)]), changes: playerChanges });
  });

  return { players, ratingChanges };
}
