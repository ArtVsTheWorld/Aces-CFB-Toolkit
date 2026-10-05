import CONFIG from "./config.js";
const fields = [];
function field(path, label, group, min, max, step = .01) { fields.push({ path, label, group, min, max, step, description: sliderDescription(path, label) }); }
function sliderDescription(path, label) {
  if (path.startsWith("baseStrengthWeights.")) return `How much ${label.toLowerCase()} contributes to team strength. Increase to favor teams stronger in this rating; decrease to rely more on the other ratings. Keep this group's total at 100%.`;
  if (path.startsWith("positionWeights.")) return `The relative importance of ${label} in the position composite. Increase to give this unit more influence on team strength; decrease to give it less. These weights are scaled together automatically.`;
  if (path.startsWith("passingPersonnelWeights.")) return `How much ${label.toLowerCase()} contribute to passing personnel strength. Increase to emphasize this unit; decrease to emphasize the other passing units. Keep this group's total at 100%.`;
  const units = { passingOffense: "passing personnel versus opposing linebackers and coverage", rushingOffense: "running backs and blockers versus the opposing front seven", passDefense: "coverage versus opposing passing personnel", runDefense: "the defensive front versus opposing runners and blockers", specialTeams: "the two special-teams units" };
  if (path.startsWith("matchupWeights.")) return `Weight of ${units[path.split(".").at(-1)]}. Increase to make this matchup matter more; decrease to make it matter less. Keep this group's total at 100%.`;
  if (path.startsWith("finalWeights.")) return `How much ${label.toLowerCase()} contribute to the final ratings/matchup blend. Increase to prioritize this source of advantage; decrease to prioritize the other. Keep this group's total at 100%.`;
  if (path.startsWith("coaching.roleWeights.")) return `Share of the coach-level score supplied by the ${label.toLowerCase()}. Increase to emphasize this coach's level; decrease to emphasize the other coaches. Keep this group's total at 100%.`;
  if (path.startsWith("coaching.archetypeRoleWeights.")) return `Strength of the ${label.toLowerCase()}'s skill-tree bonus. Increase for a larger effect on the matchup edge; decrease for a smaller effect. Zero ignores this coach's skill tree.`;
  if (path.startsWith("coaching.archetypeBonuses.")) return `Bonus for a coach with the ${label} skill tree. Increase to favor teams with that coach type more; decrease to reduce its advantage. Staff-role weights and overall coaching influence also apply.`;
  if (path.startsWith("coaching.continuity.roleWeights.")) return `Share of the staff-continuity score supplied by the ${label.toLowerCase()}. Increase to emphasize this coach's time with the team; decrease to emphasize the others. Keep this group's total at 100%.`;
  if (path.startsWith("homeContext.atmosphereBonuses.")) return `Extra home advantage for an ${label.split(" ")[0]} stadium atmosphere grade. Increase to help that home team more; decrease to help it less. No effect at a neutral site.`;
  if (path.startsWith("disparityLevels.")) return `Mismatch score where the ${label.split(" ")[0]} category begins. Increase to require a bigger mismatch; decrease to classify more games at this level. Changes category labels, not the score or force-win probability curve.`;
  if (path.startsWith("probabilityCurve.")) return `Chance of assigning the favorite a force win at mismatch score ${CONFIG.probabilityCurve[Number(path.split(".")[1])].score}. Increase for more assignments; decrease for more unforced games. Intermediate scores blend neighboring values. Does not set moneyline odds.`;
  const descriptions = {
    "coaching.disparityMultiplier": "Strength of the total coaching advantage in the matchup edge. Increase to make staff differences matter more; decrease to matter less. Zero removes coaching influence.",
    "coaching.levelPointScale": "Matchup influence per weighted coach-level point. Increase to favor higher-level staffs more; decrease to reduce the effect. Skill-tree and continuity bonuses are separate.",
    "coaching.continuity.pointScale": "Bonus per credited season a coach has spent with the team. Increase to favor established staffs more; decrease to reduce their advantage. The continuity cap still applies.",
    "coaching.continuity.maximumBonus": "Upper limit on the staff-continuity bonus before overall coaching influence. Increase to allow a larger experience advantage; decrease to cap it sooner. Zero removes this bonus.",
    "coaching.continuity.neutralSeasons": "Seasons with the team that earn no continuity credit. Increase to delay the bonus for newer staffs; decrease to award it sooner.",
    "coaching.continuity.maximumCreditedSeasons": "Maximum credited seasons per coach after neutral seasons. Increase to reward longer-serving staffs; decrease to stop rewarding tenure sooner. The overall continuity cap still applies.",
    "homeField.home": "Base advantage for the home team; the visiting team gets the opposite adjustment. Increase to make venue matter more; decrease to matter less. Neutral sites receive no home-field advantage.",
    "homeContext.topRankedMaximum": "Lowest eligible media-poll rank for the ranked home-team bonus. Increase to include more ranked home teams; decrease to restrict the bonus to higher-ranked teams.",
    "homeContext.topRankedBonus": "Extra advantage for home teams inside the ranking cutoff. Increase to help those home teams more; decrease to help them less. No effect at a neutral site.",
    "rivalry.disparityMultiplier": "Scales the matchup gap in rivalry games. Increase for larger gaps and stronger favorite projections; decrease for closer projections. Below 1 compresses the gap; 1 leaves it unchanged.",
    "fcs.disparityMultiplier": "Scales the gap against a built-in directional FCS underdog. Increase for stronger favorite projections; decrease for smaller gaps. Does not identify mod-added FCS teams by name.",
    "activeModelProfile.disparityScale": "Scales the final gap in non-FCS games. Increase for larger mismatches, wider spreads and usually more force wins; decrease for closer projections. Does not change which team is favored.",
    "bettingLines.spreadPointsPerDisparity": "Spread points per matchup-gap point. Increase for wider projected spreads; decrease for narrower spreads. Also changes derived moneylines, but not force-win decisions.",
    "bettingLines.maximumSpread": "Largest projected spread allowed. Increase to allow wider lines in extreme mismatches; decrease to cap them sooner. Also limits derived moneylines, not force-win decisions.",
    "bettingLines.totalBaseline": "Starting combined score for the over/under before offense and defense adjustments. Increase to raise projected totals; decrease to lower them. Does not affect winners or force wins.",
    "bettingLines.offenseTotalWeight": "Strength of the offense adjustment to the over/under. Increase to raise totals more for above-baseline offenses and lower them more for weaker offenses; decrease for a smaller adjustment.",
    "bettingLines.defenseTotalWeight": "Strength of the defense adjustment to the over/under. Increase to lower totals more for above-baseline defenses and raise them more for weaker defenses; decrease for a smaller adjustment.",
    "bettingLines.minimumTotal": "Lowest projected over/under allowed. Increase to raise the floor for low-scoring projections; decrease to permit lower totals. Does not affect winners or force wins.",
    "bettingLines.maximumTotal": "Highest projected over/under allowed. Increase to allow higher-scoring projections; decrease to cap totals sooner. Does not affect winners or force wins.",
    "bettingLines.moneylineSpreadScale": "How spreads convert to moneyline odds. Increase to bring implied win chances closer to 50/50; decrease to make favorites stronger at the same spread. Does not affect force-win decisions."
  };
  if (!descriptions[path]) throw new Error(`Missing custom model explanation: ${path}`);
  return descriptions[path];
}
function weights(path, labels, group) { for (const [key, label] of Object.entries(labels)) field(`${path}.${key}`, label, group, 0, 1); }
weights("baseStrengthWeights", { overall: "Starter Overall", offense: "Offense", defense: "Defense", positionComposite: "Position Composite" }, "Team Ratings");
weights("positionWeights", { qb: "QB", ol: "OL", dl: "DL", db: "DB", lb: "LB", wr: "WR", rb: "HB", te: "TE", st: "Special Teams" }, "Position Composite");
weights("passingPersonnelWeights", { qb: "Quarterbacks", wr: "Wide Receivers", te: "Tight Ends" }, "Passing Personnel");
weights("matchupWeights", { passingOffense: "Passing Offense", rushingOffense: "Rushing Offense", passDefense: "Pass Defense", runDefense: "Run Defense", specialTeams: "Special Teams" }, "Unit Matchups");
weights("finalWeights", { baseStrengthDifference: "Team Ratings", matchupAdvantage: "Unit Matchups" }, "Final Ratings / Matchup Blend");
field("coaching.disparityMultiplier", "Overall Coaching Influence", "Coaching", 0, 6);
field("coaching.levelPointScale", "Coach Level Influence", "Coaching", 0, .5);
for (const section of ["roleWeights", "archetypeRoleWeights"]) weights(`coaching.${section}`, { headCoach: "Head Coach", offensiveCoordinator: "Offensive Coordinator", defensiveCoordinator: "Defensive Coordinator" }, section === "roleWeights" ? "Coach Level Blend" : "Coach Skill Tree Influence");
for (const key of Object.keys(CONFIG.coaching.archetypeBonuses)) field(`coaching.archetypeBonuses.${key}`, key.replace(/([a-z])([A-Z])/g, "$1 $2"), "Coach Skill Tree Bonuses", 0, 3);
field("coaching.continuity.pointScale", "Influence Per Credited Season", "Coach Continuity", 0, .5);
field("coaching.continuity.maximumBonus", "Maximum Continuity Bonus", "Coach Continuity", 0, 3);
field("coaching.continuity.neutralSeasons", "Neutral Seasons", "Coach Continuity", 0, 10, 1);
field("coaching.continuity.maximumCreditedSeasons", "Maximum Credited Seasons", "Coach Continuity", 0, 10, 1);
weights("coaching.continuity.roleWeights", { headCoach: "Head Coach", offensiveCoordinator: "Offensive Coordinator", defensiveCoordinator: "Defensive Coordinator" }, "Continuity Staff Blend");
field("homeField.home", "Home-Field Advantage", "Venue", 0, 5);
for (const key of ["Aminus", "A", "Aplus"]) field(`homeContext.atmosphereBonuses.${key}`, `${key.replace("minus", "−").replace("plus", "+")} Atmosphere Bonus`, "Venue", 0, 3);
field("homeContext.topRankedMaximum", "Home Ranking Cutoff", "Venue", 1, 25, 1);
field("homeContext.topRankedBonus", "Ranked Home-Team Bonus", "Venue", 0, 3);
field("rivalry.disparityMultiplier", "Rivalry Mismatch Multiplier", "Mismatch Calibration", 0, 2, .05);
field("fcs.disparityMultiplier", "FCS Mismatch Multiplier", "Mismatch Calibration", 1, 5, .05);
field("activeModelProfile.disparityScale", "Overall Non-FCS Mismatch Scale", "Mismatch Calibration", .1, 3);
for (const [index, label] of [[2, "Medium"], [1, "High"], [0, "Extreme"]]) field(`disparityLevels.${index}.min`, `${label} Mismatch Begins At`, "Mismatch Categories", .5, 50, .5);
for (let index = 0; index < CONFIG.probabilityCurve.length; index++) field(`probabilityCurve.${index}.probability`, `Force-Win Chance at Mismatch ${CONFIG.probabilityCurve[index].score}`, "Force-Win Probability Curve", .01, .999, .001);
for (const [key, min, max, step] of [["spreadPointsPerDisparity", .1, 3, .05], ["maximumSpread", 1, 70, 1], ["totalBaseline", 20, 80, .5], ["offenseTotalWeight", 0, 1, .01], ["defenseTotalWeight", 0, 1, .01], ["minimumTotal", 10, 90, .5], ["maximumTotal", 10, 100, .5], ["moneylineSpreadScale", 1, 20, .1]]) field(`bettingLines.${key}`, ({ spreadPointsPerDisparity: "Spread Points Per Mismatch Point", maximumSpread: "Maximum Spread", totalBaseline: "Baseline Over/Under", offenseTotalWeight: "Offense Total Influence", defenseTotalWeight: "Defense Total Influence", minimumTotal: "Minimum Over/Under", maximumTotal: "Maximum Over/Under", moneylineSpreadScale: "Moneyline Spread Scale" })[key], "Projected Lines", min, max, step);
export const CUSTOM_MODEL_FIELDS = Object.freeze(fields.map(Object.freeze));
const get = (object, path) => path.split(".").reduce((value, key) => value[key], object);
const set = (object, path, value) => { const keys = path.split("."), key = keys.pop(); keys.reduce((item, part) => item[part], object)[key] = value; };
export function customModelFromConfig(config, basePreset) { return { version: 1, basePreset, maxForceWinsPerWeek: 0, values: Object.fromEntries(fields.map(field => [field.path, get(config, field.path)])) }; }
export function normalizeCustomModel(input) {
  if (input == null) return null;
  if (input.version !== 1 || !CONFIG.modelProfiles.profiles[input.basePreset] || !input.values || typeof input.values !== "object" || Array.isArray(input.values)) throw new Error("Invalid custom matchup model. Choose a starting preset and save the model again.");
  const known = new Set(fields.map(field => field.path));
  for (const path of Object.keys(input.values)) if (!known.has(path)) throw new Error(`Unknown custom model setting: ${path}.`);
  const values = {};
  for (const field of fields) {
    const raw = input.values[field.path], value = Number(raw);
    if (raw === undefined || raw === null || raw === "" || !Number.isFinite(value) || value < field.min || value > field.max) throw new Error(`${field.label}: choose a value between ${field.min} and ${field.max}.`);
    if (field.step === 1 && !Number.isInteger(value)) throw new Error(`${field.label}: enter a whole number.`);
    values[field.path] = value;
  }
  for (const path of ["baseStrengthWeights", "passingPersonnelWeights", "matchupWeights", "finalWeights", "coaching.roleWeights", "coaching.continuity.roleWeights"]) {
    const total = fields.filter(field => field.path.startsWith(path + ".")).reduce((sum, field) => sum + values[field.path], 0);
    if (Math.abs(total - 1) > 1e-8) throw new Error(`${fields.find(field => field.path.startsWith(path + ".")).group}: weights must total 100%.`);
  }
  if (fields.filter(field => field.path.startsWith("positionWeights.")).reduce((sum, field) => sum + values[field.path], 0) <= 0) throw new Error("Give at least one position composite a positive weight.");
  if (!(values["disparityLevels.2.min"] < values["disparityLevels.1.min"] && values["disparityLevels.1.min"] < values["disparityLevels.0.min"])) throw new Error("Mismatch thresholds must increase from Medium to High to Extreme.");
  for (let index = 1; index < CONFIG.probabilityCurve.length; index++) if (values[`probabilityCurve.${index}.probability`] < values[`probabilityCurve.${index - 1}.probability`]) throw new Error("Force-win chances must not decrease as the mismatch grows.");
  if (values["bettingLines.minimumTotal"] > values["bettingLines.maximumTotal"]) throw new Error("Minimum Over/Under cannot exceed Maximum Over/Under.");
  const maxForceWinsPerWeek = Number(input.maxForceWinsPerWeek ?? 0);
  if (!Number.isInteger(maxForceWinsPerWeek) || maxForceWinsPerWeek < 0 || maxForceWinsPerWeek > 100) throw new Error("Weekly force-win limit must be a whole number from 0 to 100; 0 means no limit.");
  return { version: 1, basePreset: input.basePreset, maxForceWinsPerWeek, values };
}
export function applyCustomModel(baseConfig, input) {
  const model = normalizeCustomModel(input), config = structuredClone(baseConfig);
  if (!model) throw new Error("Configure and save your custom matchup model before Preview.");
  for (const [path, value] of Object.entries(model.values)) set(config, path, value);
  config.homeField.away = -config.homeField.home; config.homeField.neutral = 0;
  config.activeModelProfile = { ...config.activeModelProfile, key: "custom", label: `Custom (${CONFIG.modelProfiles.profiles[model.basePreset].label})` };
  config.customModel = model;
  return config;
}
