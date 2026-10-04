import FORCE_WIN_CONFIG from "./config.js";

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const halfPoint = value => Math.round(value * 2) / 2;
const roundTo = (value, step) => Math.round(value / step) * step;

export function americanMoneyline(probability, step = 5) {
  if (!Number.isFinite(probability) || probability <= 0 || probability >= 1) return null;
  const raw = probability >= 0.5
    ? -100 * probability / (1 - probability)
    : 100 * (1 - probability) / probability;
  return roundTo(raw, step);
}

// These are transparent model estimates for context, not scraped or sportsbook-issued lines.
export function calculateBettingLines({
  homeTeam,
  awayTeam,
  favoriteSide,
  disparity,
  config = FORCE_WIN_CONFIG
}) {
  const c = config.bettingLines;
  const spread = halfPoint(clamp(
    Math.abs(disparity) * c.spreadPointsPerDisparity,
    0.5,
    c.maximumSpread
  ));
  const rawTotal = c.totalBaseline +
    c.offenseTotalWeight * (homeTeam.ratings.offense + awayTeam.ratings.offense - 150) -
    c.defenseTotalWeight * (homeTeam.ratings.defense + awayTeam.ratings.defense - 150);
  const total = halfPoint(clamp(rawTotal, c.minimumTotal, c.maximumTotal));
  const favoriteWinProbability = clamp(
    1 / (1 + Math.exp(-spread / c.moneylineSpreadScale)),
    c.moneylineProbabilityFloor,
    c.moneylineProbabilityCap
  );
  const underdogWinProbability = 1 - favoriteWinProbability;
  return {
    spread,
    total,
    favoriteSide,
    homeSpread: favoriteSide === "home" ? -spread : spread,
    awaySpread: favoriteSide === "away" ? -spread : spread,
    favoriteSpread: -spread,
    favoriteWinProbability,
    underdogWinProbability,
    favoriteMoneyline: americanMoneyline(favoriteWinProbability, c.moneylineRoundingStep),
    underdogMoneyline: americanMoneyline(underdogWinProbability, c.moneylineRoundingStep)
  };
}
