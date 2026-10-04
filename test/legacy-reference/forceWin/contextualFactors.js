import FORCE_WIN_CONFIG from "./config.js";
import { parseRef, sf } from "../openSave.js";
import { FORCE_WIN_SCHEMA } from "./schema.js";

const STAFF_ROLES = Object.freeze([
  Object.freeze({ key: "headCoach", position: "HeadCoach" }),
  Object.freeze({ key: "offensiveCoordinator", position: "OffensiveCoordinator" }),
  Object.freeze({ key: "defensiveCoordinator", position: "DefensiveCoordinator" })
]);

function tableId(table) {
  const value = Number(table?.header?.tableId ?? table?.tableId);
  return Number.isInteger(value) ? value : null;
}

// Resolve staff references only against the coach table already selected by Unique ID.
export function resolveCoachingProfile(team, coachTable, schema = FORCE_WIN_SCHEMA) {
  if (!coachTable) return { available: false, reason: "coach table Unique ID is not configured" };
  const expectedTableId = tableId(coachTable);
  if (expectedTableId === null) return { available: false, reason: "coach table has no runtime table ID" };
  const staff = {};
  for (const role of STAFF_ROLES) {
    const reference = team.coachReferences?.[role.key];
    const parsed = parseRef(reference);
    if (!parsed || parsed.tableId !== expectedTableId) {
      return { available: false, reason: `${role.position} reference is missing or targets another table` };
    }
    const record = coachTable.records[parsed.row];
    if (!record || record.isEmpty) return { available: false, reason: `${role.position} record is missing` };
    const level = Number(sf(record, schema.coach.level));
    const position = sf(record, schema.coach.position);
    const archetype = sf(record, schema.coach.dominantArchetype);
    if (!Number.isFinite(level) || level < 0 || position !== role.position) {
      return { available: false, reason: `${role.position} data is invalid` };
    }
    staff[role.key] = { level, archetype: String(archetype ?? "Invalid_") };
  }
  return { available: true, staff };
}

export function calculateCoachingScore(profile, config = FORCE_WIN_CONFIG) {
  if (!profile?.available) return { available: false, staff: null, levelScore: 0, archetypeScore: 0, value: 0 };
  let weightedLevel = 0;
  let archetypeScore = 0;
  for (const [role, coach] of Object.entries(profile.staff)) {
    const boundedLevel = Math.min(config.coaching.maximumLevel, coach.level);
    weightedLevel += boundedLevel * config.coaching.roleWeights[role];
    const treeBonus = config.coaching.archetypeBonuses[coach.archetype] ?? 0;
    archetypeScore += treeBonus * config.coaching.archetypeRoleWeights[role];
  }
  const levelScore = weightedLevel * config.coaching.levelPointScale;
  const unscaledValue = levelScore + archetypeScore;
  return {
    available: true,
    staff: profile.staff,
    levelScore,
    archetypeScore,
    unscaledValue,
    value: unscaledValue * config.coaching.disparityMultiplier
  };
}

// Stadium atmosphere and a top-15 ranking benefit whichever team is actually at home.
export function calculateHomeContext({ homeTeam, favoriteSide, neutral }, config = FORCE_WIN_CONFIG) {
  if (neutral) return { atmosphere: 0, top15: 0, value: 0 };
  const direction = favoriteSide === "home" ? 1 : -1;
  const atmosphere = config.homeContext.atmosphereBonuses[homeTeam.stadiumAtmosphereGrade] ?? 0;
  const rank = Number(homeTeam.mediaPollRank);
  const top15 = rank >= 1 && rank <= config.homeContext.topRankedMaximum
    ? config.homeContext.topRankedBonus
    : 0;
  return { atmosphere: direction * atmosphere, top15: direction * top15, value: direction * (atmosphere + top15) };
}
