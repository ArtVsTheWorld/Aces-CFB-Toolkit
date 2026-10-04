import FORCE_WIN_CONFIG from "./config.js";
import { createModelConfig } from "./modelProfiles.js";
import { calculateCoachingScore, calculateHomeContext, resolveCoachingProfile } from "./contextualFactors.js";
import { determineMatchupFavorite, calculateDisparity } from "./disparityCalculator.js";
import { calculateBettingLines } from "./bettingLines.js";
import { pairKey } from "./protections.js";
import { resolveTeamReference } from "./teamRatings.js";
import { FORCE_WIN_SCHEMA } from "./schema.js";
import { sf } from "../openSave.js";

// Read-only projections for the full current regular-season schedule. This does
// not run force-win decisions or use the tool's eligibility/assignment logic.
export function projectSeasonLines({ records, teamTable, coachTable, context, rivalryPairs = new Set(), neutralPairs = new Set(), rosterRatings, modelProfile = FORCE_WIN_CONFIG.modelProfiles.default }) {
  const config = createModelConfig(modelProfile);
  const rows = [];
  for (const [row, record] of records.entries()) {
    if (!record || record.isEmpty || Number(sf(record, FORCE_WIN_SCHEMA.game.season)) !== context.currentSeasonRecord || sf(record, FORCE_WIN_SCHEMA.game.weekType) !== FORCE_WIN_SCHEMA.game.regularSeasonType) continue;
    const week = Number(sf(record, FORCE_WIN_SCHEMA.game.week));
    if (week < 1 || week > 14) continue;
    const homeRef = sf(record, FORCE_WIN_SCHEMA.game.homeTeam), awayRef = sf(record, FORCE_WIN_SCHEMA.game.awayTeam);
    const home = resolveTeamReference(homeRef, teamTable, rosterRatings), away = resolveTeamReference(awayRef, teamTable, rosterRatings);
    if (home.error || away.error || !home.team || !away.team) continue;
    const homeTeam = home.team, awayTeam = away.team, neutral = neutralPairs.has(pairKey(homeRef, awayRef)), rivalry = rivalryPairs.has(pairKey(homeRef, awayRef));
    const fcs = homeTeam.isBuiltInFcs || awayTeam.isBuiltInFcs;
    const homeCoaching = fcs ? null : calculateCoachingScore(resolveCoachingProfile(homeTeam, coachTable), config);
    const awayCoaching = fcs ? null : calculateCoachingScore(resolveCoachingProfile(awayTeam, coachTable), config);
    const coachingAvailable = homeCoaching?.available && awayCoaching?.available;
    const selectionContext = calculateHomeContext({ homeTeam, favoriteSide: "home", neutral }, config);
    const favorite = determineMatchupFavorite({ homeTeam, awayTeam, neutral, homeCoachingScore: coachingAvailable ? homeCoaching.value : 0, awayCoachingScore: coachingAvailable ? awayCoaching.value : 0, homeContextValue: selectionContext.value, config });
    if (!favorite) continue;
    const favoriteLocation = neutral ? "neutral" : favorite.side;
    const favoriteCoaching = favorite.side === "home" ? homeCoaching : awayCoaching;
    const underdogCoaching = favorite.side === "home" ? awayCoaching : homeCoaching;
    const coachingAdvantage = favoriteCoaching?.available && underdogCoaching?.available ? favoriteCoaching.value - underdogCoaching.value : 0;
    const homeContext = calculateHomeContext({ homeTeam, favoriteSide: favorite.side, neutral }, config);
    const breakdown = calculateDisparity({ favorite: favorite.favorite, underdog: favorite.underdog, favoriteLocation, rivalry, fcsMismatch: Boolean(favorite.underdog.isBuiltInFcs), coachingAdvantage, homeContextAdjustment: homeContext.value, config });
    const lines = calculateBettingLines({ homeTeam, awayTeam, favoriteSide: favorite.side, disparity: breakdown.finalDisparity, config });
    rows.push({ row, week, homeRank: homeTeam.mediaPollRank, awayRank: awayTeam.mediaPollRank, homeOverall: homeTeam.ratings.overall, awayOverall: awayTeam.ratings.overall, rivalry, awayTeam: awayTeam.name, homeTeam: homeTeam.name, favorite: favorite.favorite.name, underdog: favorite.underdog.name, favoriteSide: favorite.side, favoriteSpread: lines.favoriteSpread, total: lines.total, favoriteMoneyline: lines.favoriteMoneyline, underdogMoneyline: lines.underdogMoneyline, favoriteWinProbability: lines.favoriteWinProbability, neutral });
  }
  rows.sort((a, b) => a.week - b.week || a.awayTeam.localeCompare(b.awayTeam) || a.homeTeam.localeCompare(b.homeTeam) || a.row - b.row);
  return rows;
}
