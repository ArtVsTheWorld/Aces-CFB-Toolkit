import FORCE_WIN_CONFIG from "./config.js";

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const halfPoint = value => Math.round(value * 2) / 2;

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
  return {
    spread,
    total,
    favoriteSide,
    homeSpread: favoriteSide === "home" ? -spread : spread,
    awaySpread: favoriteSide === "away" ? -spread : spread,
    favoriteSpread: -spread
  };
}
