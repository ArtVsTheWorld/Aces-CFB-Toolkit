import { mulberry32 } from "../longSnap/core.js";

export const DEALBREAKER_FIELD = "RecruitingDealbreaker";
export const PLAYING_STYLE_POSITIONS = Object.freeze(new Set(["HB", "RB", "TE", "WR"]));
export const ALLOWED_DEALBREAKERS = Object.freeze(["Invalid", "PlayingTime", "ProPotential", "PlayingStyle", "ChampionshipContender", "BrandExposure", "ProximityToHome", "CoachPrestige", "ConferencePrestige"]);
export const DEFAULT_DISTRIBUTION = Object.freeze({ Invalid: 15, PlayingTime: 18, ProPotential: 7, PlayingStyle: 5, ChampionshipContender: 16, BrandExposure: 10, ProximityToHome: 12, CoachPrestige: 10, ConferencePrestige: 7 });
export const CONTEXT_MODIFIERS = Object.freeze({
  overall85: Object.freeze({ ProPotential: 1.5, ChampionshipContender: 1.35, BrandExposure: 1.25, ConferencePrestige: 1.2 }),
  overall90: Object.freeze({ ProPotential: 2, ChampionshipContender: 1.6, BrandExposure: 1.45, ConferencePrestige: 1.4 }),
  lowOverall: Object.freeze({ PlayingStyle: 1.5, ProximityToHome: 1.4, CoachPrestige: 1.3 }),
  upperClassPlayingTime: 1.35,
  lowerClassProximity: 1.25,
  qbDepthPressure: 4
});

const read = (record, field) => { try { return record?.[field]; } catch { return undefined; } };
const classGroup = value => String(value ?? "").trim().toLowerCase();
const numeric = value => Number.isFinite(Number(value)) ? Number(value) : null;

export function normalizeDistribution(input = DEFAULT_DISTRIBUTION) {
  const distribution = {};
  for (const value of ALLOWED_DEALBREAKERS) {
    const amount = Number(input[value]);
    if (!Number.isFinite(amount) || amount < 0 || amount > 100) throw new Error(`${value} percentage must be from 0 through 100.`);
    distribution[value] = amount;
  }
  const total = Object.values(distribution).reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 100) > 1e-9) throw new Error(`Dealbreaker percentages must total exactly 100%. Current total: ${total}%.`);
  return distribution;
}

export function isRosteredPlayer(record, teamNames) {
  if (!record || record.isEmpty) return false;
  const teamIndex = Number(read(record, "TeamIndex"));
  const firstName = String(read(record, "FirstName") ?? "").trim(), lastName = String(read(record, "LastName") ?? "").trim(), position = String(read(record, "Position") ?? "");
  const placeholder = firstName === "Omar" && lastName === "Omar" && position === "QB";
  return Number.isInteger(teamIndex) && teamIndex >= 0 && teamIndex !== 255 && teamNames.has(teamIndex) && firstName !== "" && lastName !== "" && !placeholder;
}

export function hasYoungerHigherRatedQb(player, teamQbs) {
  if (String(read(player, "Position")) !== "QB") return false;
  const age = numeric(read(player, "Age")), overall = numeric(read(player, "OverallRating"));
  if (age === null || overall === null) return false;
  return teamQbs.some(candidate => candidate !== player && numeric(read(candidate, "Age")) !== null && numeric(read(candidate, "Age")) < age && numeric(read(candidate, "OverallRating")) > overall);
}

export function contextualWeights(player, distribution, { teamQbs = [], forcePlayingStyleIneligible = false } = {}) {
  const weights = Object.fromEntries(ALLOWED_DEALBREAKERS.slice(1).map(value => [value, distribution[value]]));
  const context = [];
  const position = String(read(player, "Position") ?? "").toUpperCase();
  const overall = numeric(read(player, "OverallRating")) ?? 0;
  const year = classGroup(read(player, "SchoolYear"));
  const styleEligible = PLAYING_STYLE_POSITIONS.has(position) && !forcePlayingStyleIneligible;
  if (!styleEligible) { weights.PlayingStyle = 0; context.push("Playing Style ineligible"); }
  const tier = overall >= 90 ? CONTEXT_MODIFIERS.overall90 : overall >= 85 ? CONTEXT_MODIFIERS.overall85 : null;
  if (tier) { for (const [value, multiplier] of Object.entries(tier)) weights[value] *= multiplier; context.push(overall >= 90 ? "Elite OVR (90+)" : "High OVR (85–89)"); }
  if (overall < 75) { if (styleEligible) weights.PlayingStyle *= CONTEXT_MODIFIERS.lowOverall.PlayingStyle; weights.ProximityToHome *= CONTEXT_MODIFIERS.lowOverall.ProximityToHome; weights.CoachPrestige *= CONTEXT_MODIFIERS.lowOverall.CoachPrestige; context.push("Low OVR"); }
  if (["junior", "senior"].includes(year)) { weights.PlayingTime *= CONTEXT_MODIFIERS.upperClassPlayingTime; context.push(year === "senior" ? "Senior" : "Junior"); }
  else if (["freshman", "sophomore"].includes(year)) { weights.ProximityToHome *= CONTEXT_MODIFIERS.lowerClassProximity; context.push(year === "freshman" ? "Freshman" : "Sophomore"); }
  if (hasYoungerHigherRatedQb(player, teamQbs)) { weights.PlayingTime *= CONTEXT_MODIFIERS.qbDepthPressure; context.push("Younger higher-rated QB on roster"); }
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) throw new Error("Valid dealbreaker weights must contain at least one positive value.");
  return { weights, normalized: Object.fromEntries(Object.entries(weights).map(([value, weight]) => [value, weight / total])), context };
}

export function weightedSelection(normalized, random) {
  const roll = random(); let cumulative = 0;
  for (const value of ALLOWED_DEALBREAKERS.slice(1)) { cumulative += normalized[value] ?? 0; if (roll < cumulative) return value; }
  return ALLOWED_DEALBREAKERS.slice(1).findLast(value => (normalized[value] ?? 0) > 0);
}

export function patchDealbreakers(records, { teamNames, distribution = DEFAULT_DISTRIBUTION, fixInvalidPlayingStyle = false, seed = 1, random = null, apply = false } = {}) {
  const base = normalizeDistribution(distribution); const rng = random ?? mulberry32(seed); const qbs = new Map();
  const legitimate = records.filter(record => isRosteredPlayer(record, teamNames));
  const startingNone = legitimate.filter(record => String(read(record, DEALBREAKER_FIELD) ?? "") === "Invalid").length;
  const noneFloorCount = Math.ceil(legitimate.length * base.Invalid / 100);
  let projectedNone = startingNone, floorLimited = false;
  for (const record of records) if (isRosteredPlayer(record, teamNames) && String(read(record, "Position")) === "QB") { const team = Number(read(record, "TeamIndex")); if (!qbs.has(team)) qbs.set(team, []); qbs.get(team).push(record); }
  const outcomes = [], changes = [];
  records.forEach((record, row) => {
    if (!isRosteredPlayer(record, teamNames)) return;
    const oldValue = String(read(record, DEALBREAKER_FIELD) ?? ""); const position = String(read(record, "Position") ?? "").toUpperCase();
    const invalid = oldValue === "Invalid", invalidStyle = oldValue === "PlayingStyle" && !PLAYING_STYLE_POSITIONS.has(position);
    if (!invalid && !(fixInvalidPlayingStyle && invalidStyle)) return;
    let newValue = "Invalid", reasons = [];
    if (rng() * 100 >= base.Invalid) {
      const context = contextualWeights(record, base, { teamQbs: qbs.get(Number(read(record, "TeamIndex"))) ?? [], forcePlayingStyleIneligible: invalidStyle });
      newValue = weightedSelection(context.normalized, rng); reasons = context.context;
    } else reasons = ["None roll"];
    if (invalid && newValue !== "Invalid" && projectedNone - 1 < noneFloorCount) { newValue = "Invalid"; reasons = ["None population floor"]; floorLimited = true; }
    if (invalid && newValue !== "Invalid") projectedNone -= 1;
    else if (invalidStyle && newValue === "Invalid") projectedNone += 1;
    if (!ALLOWED_DEALBREAKERS.includes(newValue)) throw new Error(`Generated unsupported dealbreaker value: ${newValue}.`);
    const outcome = { row, record, oldValue, newValue, reasons, scope: invalidStyle ? "Invalid Playing Style" : "Invalid" }; outcomes.push(outcome);
    if (newValue !== oldValue) { changes.push(outcome); if (apply) record[DEALBREAKER_FIELD] = newValue; }
  });
  return { outcomes, changes, population: { total: legitimate.length, startingNone, startingNonePercentage: legitimate.length ? startingNone / legitimate.length : 0, configuredFloorPercentage: base.Invalid / 100, noneFloorCount, projectedNone, projectedNonePercentage: legitimate.length ? projectedNone / legitimate.length : 0, floorLimited } };
}
