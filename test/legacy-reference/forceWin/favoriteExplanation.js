const IMPACT_BANDS = Object.freeze([
  Object.freeze({ min: 7, label: "major" }),
  Object.freeze({ min: 4, label: "strong" }),
  Object.freeze({ min: 2, label: "noticeable" }),
  Object.freeze({ min: 0.75, label: "slight" }),
  Object.freeze({ min: 0, label: "minimal" })
]);

export function impactBand(value) {
  const magnitude = Math.abs(value);
  return IMPACT_BANDS.find(band => magnitude >= band.min).label;
}

export function explainContribution(label, value) {
  const rounded = Number(value.toFixed(2));
  const band = impactBand(rounded);
  const direction = rounded > 0 ? "favorite edge" : rounded < 0 ? "opponent edge" : "even";
  return { label, value: rounded, band, direction };
}

export function buildFavoriteExplanation(breakdown, config) {
  const contributions = [
    explainContribution(
      "Starter-weighted talent",
      config.finalWeights.baseStrengthDifference * breakdown.baseStrengthDifference
    ),
    explainContribution(
      "Unit matchups",
      config.finalWeights.matchupAdvantage * breakdown.matchupEdge
    ),
    explainContribution("Coaching", breakdown.coachingAdvantage),
    explainContribution("Home field", breakdown.homeFieldAdjustment),
    explainContribution("Home environment", breakdown.homeContextAdjustment)
  ];
  const modifiers = [];
  if (breakdown.rivalry) modifiers.push({ label: "Rivalry", multiplier: breakdown.rivalryMultiplier });
  if (breakdown.fcsMismatch) modifiers.push({ label: "FCS opponent", multiplier: breakdown.fcsMultiplier });
  return { contributions, modifiers };
}

export function formatExplanationItem(item) {
  const sign = item.value > 0 ? "+" : "";
  if (item.direction === "even") return `${item.label}: minimal/even (${item.value.toFixed(1)})`;
  return `${item.label}: ${item.band} ${item.direction} (${sign}${item.value.toFixed(1)})`;
}
