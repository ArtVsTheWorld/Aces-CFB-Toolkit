import { sf } from "../openSave.js";
import FORCE_WIN_CONFIG from "./config.js";
import { calculateDisparity, determineMatchupFavorite } from "./disparityCalculator.js";
import { calculateBettingLines } from "./bettingLines.js";
import { decideForceWin, disparityCategory } from "./probabilityEngine.js";
import { buildFavoriteExplanation } from "./favoriteExplanation.js";
import { createModelConfig } from "./modelProfiles.js";
import { pairKey, protectionReason } from "./protections.js";
import { FORCE_WIN_SCHEMA, getForceWinValue } from "./schema.js";
import { resolveTeamReference } from "./teamRatings.js";
import {
  calculateCoachingScore,
  calculateHomeContext,
  resolveCoachingProfile
} from "./contextualFactors.js";

function recordIndex(record, fallback) {
  const value = record?._index ?? record?.index ?? fallback;
  return Number.isInteger(Number(value)) ? Number(value) : fallback;
}

export function isFcsMismatch(favorite, underdog) {
  return Boolean(underdog?.isBuiltInFcs);
}

// Only genuinely unplayed games are writable. Active-week CPU results may be
// staged before advancement, but changing their winner creates inconsistent stats.
export function gameEligibilityState(record, context, schema = FORCE_WIN_SCHEMA) {
  const status = sf(record, schema.game.status);
  const homeScore = Number(sf(record, schema.game.homeScore));
  const awayScore = Number(sf(record, schema.game.awayScore));
  if (status === schema.game.unplayedStatus) return { eligible: true, status };
  return {
    eligible: false,
    status,
    reason: `game is completed (${status ?? "missing"}, score ${homeScore}-${awayScore})`
  };
}

export function findNextActionableWeek(records, context, schema = FORCE_WIN_SCHEMA) {
  const weeks = records
    .filter(record => record && !record.isEmpty)
    .filter(record => Number(sf(record, schema.game.season)) === context.currentSeasonRecord)
    .filter(record => {
      const week = Number(sf(record, schema.game.week));
      return week >= 1 && week <= 15 && week > context.currentWeek;
    })
    .filter(record => sf(record, schema.game.weekType) === schema.game.regularSeasonType)
    .filter(record => sf(record, schema.game.status) === schema.game.unplayedStatus)
    .map(record => Number(sf(record, schema.game.week)))
    .filter(Number.isFinite);
  return weeks.length ? Math.min(...weeks) : null;
}

export function inSelectedScope(record, context, scope, specificWeek, schema = FORCE_WIN_SCHEMA, actionableWeek = null) {
  const season = Number(sf(record, schema.game.season));
  const week = Number(sf(record, schema.game.week));
  if (season !== context.currentSeasonRecord) return false;
  // Week 0 saves are valid inputs, but Week 0 games are never eligible for a
  // proposed or applied force win under any schedule scope.
  if (week < 1 || week > 15) return false;
  // The active week is always locked. Assigning it can corrupt staged sim
  // results or produce statistics that do not match the simulated outcome.
  if (week === context.currentWeek) return false;
  if (week < context.currentWeek) return false;
  if (scope === "week") return week === Number(specificWeek);
  if (scope === "next") return actionableWeek !== null && week === actionableWeek;
  if (scope === "regular") {
    return sf(record, schema.game.weekType) === schema.game.regularSeasonType;
  }
  throw new Error(`Unknown schedule scope: ${scope}`);
}

// Evaluate schedule records without mutating them. Writes happen later, after confirmation.
export function processSchedule({
  records,
  teamTable,
  coachTable = null,
  context,
  scope = "regular",
  specificWeek,
  rivalryPairs = new Set(),
  neutralPairs = new Set(),
  skippedTeamNames = new Set(),
  random = Math.random,
  involvement = FORCE_WIN_CONFIG.involvement.default,
  modelProfile = FORCE_WIN_CONFIG.modelProfiles.default,
  depthRatings = null,
  forceAllFcs = false,
  schema = FORCE_WIN_SCHEMA
}) {
  const modelConfig = createModelConfig(modelProfile);
  const results = [];
  const changes = [];
  const skippedTeamNamesLower = new Set(
    [...skippedTeamNames].map(name => String(name).toLowerCase())
  );
  const summary = {
    involvement,
    modelProfile,
    modelProfileLabel: modelConfig.activeModelProfile.label,
    coachingModifiersEnabled: Boolean(coachTable),
    gamesFound: 0,
    gamesEligible: 0,
    gamesRolled: 0,
    gamesOutsideInvolvement: 0,
    automaticDecisions: 0,
    gamesSkipped: 0,
    smallDisparity: 0,
    mediumDisparity: 0,
    highDisparity: 0,
    extremeDisparity: 0,
    forceWinsApplied: 0,
    fcsGamesEligible: 0,
    fcsForceWinsApplied: 0,
    upsetChancesPreserved: 0,
    recordsModified: 0
  };
  const actionableWeek = scope === "next" ? findNextActionableWeek(records, context, schema) : null;

  // Evaluate chronologically so seeded rolls and output consistently follow the schedule.
  const orderedRecords = records
    .map((record, fallbackIndex) => ({ record, fallbackIndex }))
    .sort((left, right) => {
      const leftWeek = Number(sf(left.record, schema.game.week));
      const rightWeek = Number(sf(right.record, schema.game.week));
      const weekDifference = (Number.isFinite(leftWeek) ? leftWeek : Number.MAX_SAFE_INTEGER) -
        (Number.isFinite(rightWeek) ? rightWeek : Number.MAX_SAFE_INTEGER);
      return weekDifference || recordIndex(left.record, left.fallbackIndex) -
        recordIndex(right.record, right.fallbackIndex);
    });

  orderedRecords.forEach(({ record, fallbackIndex }) => {
    if (record?.isEmpty || !inSelectedScope(record, context, scope, specificWeek, schema, actionableWeek)) return;
    summary.gamesFound += 1;
    const index = recordIndex(record, fallbackIndex);
    const week = Number(sf(record, schema.game.week));
    const baseResult = { index, week, record, status: "skipped" };
    const eligibility = gameEligibilityState(record, context, schema);
    if (!eligibility.eligible) {
      results.push({ ...baseResult, reason: eligibility.reason });
      summary.gamesSkipped += 1;
      return;
    }
    const existingForceWin = sf(record, schema.game.forceWin);
    if (existingForceWin !== schema.game.noForceWin) {
      results.push({ ...baseResult, reason: `existing force-win assignment is ${existingForceWin ?? "missing"}` });
      summary.gamesSkipped += 1;
      return;
    }
    const homeReference = sf(record, schema.game.homeTeam);
    const awayReference = sf(record, schema.game.awayTeam);
    const homeResolution = resolveTeamReference(homeReference, teamTable, depthRatings);
    const awayResolution = resolveTeamReference(awayReference, teamTable, depthRatings);
    if (homeResolution.error || awayResolution.error) {
      const reasons = [
        homeResolution.error && `home ${homeResolution.error}`,
        awayResolution.error && `away ${awayResolution.error}`
      ].filter(Boolean);
      results.push({ ...baseResult, reason: reasons.join("; ") });
      summary.gamesSkipped += 1;
      return;
    }
    const homeTeam = homeResolution.team;
    const awayTeam = awayResolution.team;
    if (skippedTeamNamesLower.has(homeTeam.name.toLowerCase()) ||
        skippedTeamNamesLower.has(awayTeam.name.toLowerCase())) {
      results.push({ ...baseResult, homeTeam, awayTeam, reason: "user-selected team game" });
      summary.gamesSkipped += 1;
      return;
    }
    const protectedReason = protectionReason({
      record,
      conferenceChampionshipWeek: context.conferenceChampionshipWeek,
      schema
    });
    if (protectedReason) {
      results.push({ ...baseResult, homeTeam, awayTeam, reason: protectedReason });
      summary.gamesSkipped += 1;
      return;
    }
    const neutral = neutralPairs.has(pairKey(homeReference, awayReference));
    const rivalry = rivalryPairs.has(pairKey(homeReference, awayReference));
    const fcsGame = homeTeam.isBuiltInFcs || awayTeam.isBuiltInFcs;
    const fcsCoaching = {
      available: false,
      staff: null,
      levelScore: 0,
      archetypeScore: 0,
      value: 0,
      ignoredForFcs: true
    };
    // Built-in FCS teams have placeholder staff, so coaching is neutral for the entire matchup.
    const homeCoaching = fcsGame
      ? fcsCoaching
      : calculateCoachingScore(resolveCoachingProfile(homeTeam, coachTable), modelConfig);
    const awayCoaching = fcsGame
      ? fcsCoaching
      : calculateCoachingScore(resolveCoachingProfile(awayTeam, coachTable), modelConfig);
    const coachingAvailable = homeCoaching.available && awayCoaching.available;
    const homeContextForSelection = calculateHomeContext(
      { homeTeam, favoriteSide: "home", neutral },
      modelConfig
    );
    let favoriteResult = determineMatchupFavorite({
      homeTeam,
      awayTeam,
      neutral,
      homeCoachingScore: coachingAvailable ? homeCoaching.value : 0,
      awayCoachingScore: coachingAvailable ? awayCoaching.value : 0,
      homeContextValue: homeContextForSelection.value,
      config: modelConfig
    });
    const automaticFcsGame = forceAllFcs && homeTeam.isBuiltInFcs !== awayTeam.isBuiltInFcs;
    if (automaticFcsGame) {
      const nonFcsIsHome = !homeTeam.isBuiltInFcs;
      favoriteResult = {
        favorite: nonFcsIsHome ? homeTeam : awayTeam,
        underdog: nonFcsIsHome ? awayTeam : homeTeam,
        side: nonFcsIsHome ? "home" : "away"
      };
    }
    if (!favoriteResult) {
      results.push({ ...baseResult, homeTeam, awayTeam, reason: "complete matchup projection is exactly tied" });
      summary.gamesSkipped += 1;
      return;
    }
    summary.gamesEligible += 1;
    if (fcsGame) summary.fcsGamesEligible += 1;
    const underdogIsFcs = favoriteResult.underdog.isBuiltInFcs;
    const fcsMismatch = isFcsMismatch(favoriteResult.favorite, favoriteResult.underdog);
    const favoriteLocation = neutral ? "neutral" : favoriteResult.side;
    const favoriteCoaching = favoriteResult.side === "home" ? homeCoaching : awayCoaching;
    const underdogCoaching = favoriteResult.side === "home" ? awayCoaching : homeCoaching;
    const coachingAdvantage = favoriteCoaching.available && underdogCoaching.available
      ? favoriteCoaching.value - underdogCoaching.value
      : 0;
    const homeContext = calculateHomeContext(
      { homeTeam, favoriteSide: favoriteResult.side, neutral },
      modelConfig
    );
    const breakdown = calculateDisparity({
      favorite: favoriteResult.favorite,
      underdog: favoriteResult.underdog,
      favoriteLocation,
      rivalry,
      fcsMismatch,
      coachingAdvantage,
      homeContextAdjustment: homeContext.value,
      config: modelConfig
    });
    const bettingLines = calculateBettingLines({
      homeTeam,
      awayTeam,
      favoriteSide: favoriteResult.side,
      disparity: breakdown.finalDisparity,
      config: modelConfig
    });
    const modeledDecision = decideForceWin(breakdown.finalDisparity, random, modelConfig, involvement);
    const decision = automaticFcsGame
      ? {
          baseProbability: modeledDecision.baseProbability,
          probability: FORCE_WIN_CONFIG.involvement.probabilityCap,
          roll: null,
          forced: true,
          selected: true,
          automatic: true,
          automaticReason: "FCS opponent option"
        }
      : modeledDecision;
    const level = disparityCategory(breakdown.finalDisparity, modelConfig);
    const explanation = buildFavoriteExplanation(breakdown, modelConfig);
    if (level.label === "small") summary.smallDisparity += 1;
    if (level.label === "medium") summary.mediumDisparity += 1;
    if (level.label === "high") summary.highDisparity += 1;
    if (level.label === "extreme") summary.extremeDisparity += 1;
    if (!decision.selected) summary.gamesOutsideInvolvement += 1;
    if (decision.selected && decision.automatic) summary.automaticDecisions += 1;
    if (decision.selected && !decision.automatic) summary.gamesRolled += 1;
    if (decision.selected && !decision.automatic && !decision.forced) {
      summary.upsetChancesPreserved += 1;
    }
    const assignment = decision.forced
      ? getForceWinValue({
        favoriteTeamId: favoriteResult.favorite.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        schema
      })
      : null;
    const result = {
      ...baseResult,
      status: decision.forced ? "proposed" : "untouched",
      homeTeam,
      awayTeam,
      favorite: favoriteResult.favorite,
      underdog: favoriteResult.underdog,
      favoriteSide: favoriteResult.side,
      favoriteLocation,
      neutral,
      rivalry,
      fcsMismatch,
      fcsGame,
      automaticFcsGame,
      favoriteCoaching,
      underdogCoaching,
      homeContext,
      bettingLines,
      explanation,
      breakdown,
      level,
      decision,
      assignment,
      evaluationSnapshot: Object.fromEntries(
        SNAPSHOT_FIELDS.map(field => [field, sf(record, field)])
      )
    };
    results.push(result);
    if (assignment) {
      changes.push(result);
      summary.forceWinsApplied += 1;
      if (fcsGame) summary.fcsForceWinsApplied += 1;
    }
  });

  return { results, changes, summary, actionableWeek };
}

const SNAPSHOT_FIELDS = Object.freeze([
  "HomeTeam", "AwayTeam", "SeasonYear", "SeasonWeek", "SeasonWeekType",
  "GameStatus", "HomeScore", "AwayScore", "ForceWin", "BowlGame"
]);

export function verifyEvaluationSnapshots(changes) {
  for (const change of changes) {
    for (const field of SNAPSHOT_FIELDS) {
      const expected = change.evaluationSnapshot?.[field];
      const current = sf(change.record, field);
      if (current !== expected) {
        throw new Error(
          `Schedule record ${change.index} changed after evaluation (${field}: ` +
          `${expected ?? "missing"} -> ${current ?? "missing"}). Rerun the tool before saving.`
        );
      }
    }
  }
}

export function applyAssignments(changes, schema = FORCE_WIN_SCHEMA) {
  verifyEvaluationSnapshots(changes);
  const snapshots = changes.map(change => ({
    change,
    before: Object.fromEntries(SNAPSHOT_FIELDS.map(field => [field, sf(change.record, field)]))
  }));
  for (const { change } of snapshots) change.record[schema.game.forceWin] = change.assignment;
  validateAssignments(snapshots, schema);
  return snapshots;
}

export function validateAssignments(snapshots, schema = FORCE_WIN_SCHEMA) {
  for (const { change, before } of snapshots) {
    if (sf(change.record, schema.game.forceWin) !== change.assignment) {
      throw new Error(`ForceWin validation failed for schedule record ${change.index}.`);
    }
    for (const field of SNAPSHOT_FIELDS) {
      if (field === schema.game.forceWin) continue;
      if (sf(change.record, field) !== before[field]) {
        throw new Error(`Unexpected ${field} change in schedule record ${change.index}.`);
      }
    }
  }
}
