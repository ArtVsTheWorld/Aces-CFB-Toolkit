import FORCE_WIN_CONFIG from "./config.js";

const average = (...values) => values.reduce((sum, value) => sum + value, 0) / values.length;

function passingPersonnel(ratings, config) {
  const weights = config.passingPersonnelWeights;
  return ratings.qb * weights.qb + ratings.wr * weights.wr + ratings.te * weights.te;
}

// Normalize the 0.80 position-weight total before using it in base strength.
export function calculatePositionComposite(ratings, config = FORCE_WIN_CONFIG) {
  const weighted = Object.entries(config.positionWeights)
    .reduce((sum, [key, weight]) => sum + ratings[key] * weight, 0);
  const weightTotal = Object.values(config.positionWeights).reduce((sum, weight) => sum + weight, 0);
  return weighted / weightTotal;
}

export function calculateBaseStrength(ratings, config = FORCE_WIN_CONFIG) {
  const positionComposite = calculatePositionComposite(ratings, config);
  const w = config.baseStrengthWeights;
  return {
    positionComposite,
    value: w.overall * ratings.overall +
      w.offense * ratings.offense +
      w.defense * ratings.defense +
      w.positionComposite * positionComposite
  };
}

// Compare complementary units, such as passing offense against coverage.
export function calculateMatchupAdvantage(favorite, underdog, config = FORCE_WIN_CONFIG) {
  const components = {
    passingOffense: passingPersonnel(favorite, config) - average(underdog.lb, underdog.db),
    rushingOffense: average(favorite.rb, favorite.ol) - average(underdog.dl, underdog.lb),
    passDefense: favorite.db - passingPersonnel(underdog, config),
    runDefense: average(favorite.dl, favorite.lb) - average(underdog.rb, underdog.ol),
    specialTeams: favorite.st - underdog.st
  };
  const value = Object.entries(config.matchupWeights)
    .reduce((sum, [key, weight]) => sum + components[key] * weight, 0);
  return { ...components, value };
}

// Combine team strength, matchup fit, location, and the optional rivalry compression.
export function calculateDisparity({
  favorite,
  underdog,
  favoriteLocation,
  rivalry = false,
  fcsMismatch = false,
  coachingAdvantage = 0,
  homeContextAdjustment = 0,
  config = FORCE_WIN_CONFIG
}) {
  const favoriteBase = calculateBaseStrength(favorite.ratings, config);
  const underdogBase = calculateBaseStrength(underdog.ratings, config);
  const baseStrengthDifference = favoriteBase.value - underdogBase.value;
  const matchup = calculateMatchupAdvantage(favorite.ratings, underdog.ratings, config);
  const opponentMatchup = calculateMatchupAdvantage(underdog.ratings, favorite.ratings, config);
  // Comparing both directions lets matchup fit help identify the favorite instead of merely
  // reinforcing whichever team has the higher starter-weighted composite.
  const matchupEdge = (matchup.value - opponentMatchup.value) / 2;
  const homeFieldAdjustment = config.homeField[favoriteLocation];
  if (!Number.isFinite(homeFieldAdjustment)) throw new Error(`Invalid favorite location: ${favoriteLocation}`);
  const rawFinalDisparity =
    config.finalWeights.baseStrengthDifference * baseStrengthDifference +
    config.finalWeights.matchupAdvantage * matchupEdge +
    homeFieldAdjustment;
  const contextualDisparity = rawFinalDisparity + coachingAdvantage + homeContextAdjustment;
  const rivalryMultiplier = rivalry ? config.rivalry.disparityMultiplier : 1;
  const fcsMultiplier = fcsMismatch ? config.fcs.disparityMultiplier : 1;
  const disparityMultiplier = rivalryMultiplier * fcsMultiplier;
  // Profile-wide calibration targets non-FCS model strength. FCS games use one
  // shared multiplier so their long-run unforced rate stays consistent across profiles.
  const profileDisparityScale = fcsMismatch ? 1 : (config.activeModelProfile?.disparityScale ?? 1);
  const finalDisparity = contextualDisparity * disparityMultiplier * profileDisparityScale;
  return {
    favoriteBase,
    underdogBase,
    baseStrengthDifference,
    matchup,
    opponentMatchup,
    matchupEdge,
    homeFieldAdjustment,
    rivalry,
    fcsMismatch,
    rivalryMultiplier,
    fcsMultiplier,
    disparityMultiplier,
    profileDisparityScale,
    rawFinalDisparity,
    coachingAdvantage,
    homeContextAdjustment,
    contextualDisparity,
    finalDisparity
  };
}

// Select the favorite from the complete projected edge: ratings, matchup fit, staff, and venue.
export function determineMatchupFavorite({
  homeTeam,
  awayTeam,
  neutral = false,
  homeCoachingScore = 0,
  awayCoachingScore = 0,
  homeContextValue = 0,
  config = FORCE_WIN_CONFIG
}) {
  const homeProjection = calculateDisparity({
    favorite: homeTeam,
    underdog: awayTeam,
    favoriteLocation: neutral ? "neutral" : "home",
    coachingAdvantage: homeCoachingScore - awayCoachingScore,
    homeContextAdjustment: homeContextValue,
    config
  });
  if (Math.abs(homeProjection.contextualDisparity) < Number.EPSILON) return null;
  if (homeProjection.contextualDisparity > 0) {
    return { favorite: homeTeam, underdog: awayTeam, side: "home", projection: homeProjection };
  }
  const awayProjection = calculateDisparity({
    favorite: awayTeam,
    underdog: homeTeam,
    favoriteLocation: neutral ? "neutral" : "away",
    coachingAdvantage: awayCoachingScore - homeCoachingScore,
    homeContextAdjustment: -homeContextValue,
    config
  });
  return { favorite: awayTeam, underdog: homeTeam, side: "away", projection: awayProjection };
}

export function determineFavorite(homeTeam, awayTeam, config = FORCE_WIN_CONFIG) {
  const homeBase = calculateBaseStrength(homeTeam.ratings, config);
  const awayBase = calculateBaseStrength(awayTeam.ratings, config);
  if (Math.abs(homeBase.value - awayBase.value) < Number.EPSILON) return null;
  return homeBase.value > awayBase.value
    ? { favorite: homeTeam, underdog: awayTeam, side: "home" }
    : { favorite: awayTeam, underdog: homeTeam, side: "away" };
}

