// Terminal colors are enabled only for an interactive console and respect NO_COLOR.
const COLOR_ENABLED = Boolean(process.stdout.isTTY && !process.env.NO_COLOR);
const ANSI = Object.freeze({
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  cyan: "\u001b[36m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  magenta: "\u001b[35m",
  red: "\u001b[31m"
});

const paint = (code, text) => COLOR_ENABLED ? `${ANSI[code]}${text}${ANSI.reset}` : text;
const percent = value => `${(value * 100).toFixed(1)}%`;
export const countWithPercent = (count, total) =>
  `${count} (${total > 0 ? percent(count / total) : "n/a"})`;
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

// A tiny delay keeps interactive output readable without making a season run feel slow.
async function emit(line = "", delay = 0) {
  console.log(line);
  if (process.stdout.isTTY && delay > 0) await sleep(delay);
}

function formatCoreRatings(team) {
  const r = team.ratings;
  return `COMPOSITE ${r.overall} | OFF ${r.offense} | DEF ${r.defense}`;
}

const SCHOOL_YEAR_RANK = Object.freeze({ Freshman: 0, Sophomore: 1, Junior: 2, Senior: 3 });

export function selectImpactPlayers(starters = {}) {
  const unique = [];
  const seen = new Set();
  for (const [depthPosition, player] of Object.entries(starters)) {
    const key = player.row ?? `${player.name}|${player.rating}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ depthPosition, ...player });
  }
  const quarterback = unique.find(player => player.depthPosition === "QB");
  const others = unique
    .filter(player => player !== quarterback && !["K", "P"].includes(player.depthPosition) && !["K", "P"].includes(player.position))
    .sort((left, right) =>
      right.rating - left.rating ||
      Number(right.awareness ?? 0) - Number(left.awareness ?? 0) ||
      (SCHOOL_YEAR_RANK[right.schoolYear] ?? -1) - (SCHOOL_YEAR_RANK[left.schoolYear] ?? -1) ||
      Number(right.redshirtStatus === "Previous") - Number(left.redshirtStatus === "Previous") ||
      Number(right.age ?? 0) - Number(left.age ?? 0) ||
      left.name.localeCompare(right.name)
    )
    .slice(0, 2);
  return [...(quarterback ? [quarterback] : []), ...others];
}

function formatTeamName(team) {
  const rank = Number(team.mediaPollRank);
  return rank >= 1 && rank <= 25 ? `#${rank} ${team.name}` : team.name;
}

function formatCoach(coach) {
  if (!coach) return "unavailable";
  const archetype = coach.archetype.replace(/([a-z])([A-Z])/g, "$1 $2");
  return `${coach.level} ${archetype}`;
}

function formatCoaching(coaching) {
  if (coaching?.ignoredForFcs) return "not used (FCS matchup)";
  if (!coaching?.available) return "unavailable";
  const staff = coaching.staff;
  return `HC ${formatCoach(staff.headCoach)}, OC ${formatCoach(staff.offensiveCoordinator)}, ` +
    `DC ${formatCoach(staff.defensiveCoordinator)}`;
}

function formatBettingLine(result) {
  const line = result.bettingLines;
  return `Spread: ${formatTeamName(result.favorite)} ${line.favoriteSpread.toFixed(1)} | ` +
    `O/U ${line.total.toFixed(1)}`;
}

const proposedResults = results => results
  .filter(result => result.assignment)
  .sort((left, right) => left.week - right.week || left.index - right.index);

function levelColor(level) {
  return { small: "green", medium: "yellow", high: "magenta", extreme: "red" }[level] || "cyan";
}

function formatDecision(decision) {
  if (decision.automatic) {
    const reason = decision.automaticReason ? ` — ${decision.automaticReason}` : "";
    return `Model chance: ${percent(decision.probability)} | Automatic decision${reason}`;
  }
  return `Chance: ${percent(decision.probability)} | Roll: ${percent(decision.roll)}`;
}

export async function printSaveDiagnostics(diagnostics) {
  await emit(`\n${paint("bold", "Save-state check")}`);
  await emit(
    `Week ${diagnostics.currentWeek}: ${diagnostics.currentWeekGames} games | ` +
    `${diagnostics.stagedCpuResults} staged CPU results (locked) | ${diagnostics.unplayed} unplayed | ` +
    `${diagnostics.existingForceWins} existing force wins`
  );
  if (diagnostics.otherStatuses) {
    await emit(paint("yellow", `${diagnostics.otherStatuses} record(s) use another status and will be checked conservatively.`));
  }
}

// Print the requested boxed title progressively at startup.
export async function printOpeningBanner(title) {
  const horizontal = "-".repeat(title.length + 2);
  await emit(paint("cyan", `+${horizontal}+`), 2);
  await emit(paint("bold", `| ${title} |`), 2);
  await emit(paint("cyan", `+${horizontal}+`), 2);
  await emit("");
}

// This compact guide acts as a terminal-friendly replacement for hover tooltips.
export async function printLogGuide() {
  await emit(paint("dim", "Mismatch: SMALL close | MEDIUM clear | HIGH large | EXTREME overwhelming"));
  await emit(paint("dim", "COMPOSITE/OFF/DEF are calibrated starter-depth-chart ratings, not the game's full-team OVR."));
  await emit(paint("dim", "Calibration keeps weak lineups near the 50s/60s and expands elite lineups into the 90s."));
  await emit(paint("dim", "Weighting: QB highest; offensive and defensive lines next; remaining units lower. Fullbacks are excluded."));
  await emit(paint("dim", "A force win is proposed only when the model roll falls below its calculated chance."));
  await emit(paint("dim", "Rivalry, coaching, home field, and FCS context adjust the matchup projection."));
}

// Detailed ratings are intentionally shown only for games that propose a force win.
export async function printGameResults(results, { dryRun = true, expanded = false } = {}) {
  const proposed = proposedResults(results);
  await emit(`\n${paint("bold", dryRun ? "Proposed force wins" : "Applied force wins")}`);
  if (!proposed.length) {
    await emit(paint("dim", "None."));
    return;
  }
  for (const result of proposed) {
    const matchup = `${formatTeamName(result.awayTeam)} at ${formatTeamName(result.homeTeam)}`;
    if (!expanded) {
      await emit(`[${result.index}] W${result.week} ${matchup} | ${formatTeamName(result.favorite)} | ${formatBettingLine(result)} | ${result.level.label.toUpperCase()} | ${(result.decision.probability * 100).toFixed(1)}%`);
      continue;
    }
    await emit(`\n${paint("cyan", `[${result.index}] Week ${result.week} | ${matchup}`)}`);
    await emit(
      `${paint("bold", "Favorite:")} ${formatTeamName(result.favorite)} ` +
      `(${result.favoriteLocation}) | ${formatBettingLine(result)}`
    );
    const explanationText = result.explanation.contributions
      .filter(item => Math.abs(item.value) >= 0.05)
      .map(item => {
        const sign = item.value > 0 ? "+" : "";
        const text = `${item.label}: ${item.band} ${item.direction} (${sign}${item.value.toFixed(1)})`;
        const color = item.value > 0 ? "green" : item.value < 0 ? "red" : "dim";
        return paint(color, text);
      });
    const modifierText = result.explanation.modifiers
      .map(item => paint("yellow", `${item.label} x${item.multiplier}`));
    await emit(`${paint("bold", "Why this favorite:")} ${[...explanationText, ...modifierText].join(" | ")}`);
    await emit(
      `  Favorite starter-weighted ratings: ${formatCoreRatings(result.favorite)} | ` +
      `Coaches: ${formatCoaching(result.favoriteCoaching)}`
    );
    await emit(
      `  Opponent starter-weighted ratings: ${formatCoreRatings(result.underdog)} | ` +
      `Coaches: ${formatCoaching(result.underdogCoaching)}`
    );
    const formatImpactPlayers = team => selectImpactPlayers(team.starters)
      .map(player => `${player.depthPosition} ${player.name} (${player.rating})`).join("; ") || "unavailable";
    await emit(`  Favorite impact players: ${formatImpactPlayers(result.favorite)}`);
    await emit(`  Opponent impact players: ${formatImpactPlayers(result.underdog)}`);
    for (const warning of result.favorite.depthWarnings ?? []) await emit(paint("yellow", `  Warning — ${result.favorite.name}: ${warning}`));
    for (const warning of result.underdog.depthWarnings ?? []) await emit(paint("yellow", `  Warning — ${result.underdog.name}: ${warning}`));
    const level = result.level.label;
    const adjustments = [
      result.rivalry && "rivalry",
      result.fcsMismatch && "FCS",
      Math.abs(result.breakdown.coachingAdvantage) > 0.005 && "coaching",
      Math.abs(result.homeContext.atmosphere) > 0.005 && "atmosphere",
      Math.abs(result.homeContext.top15) > 0.005 && "top 15 at home"
    ].filter(Boolean);
    await emit(
      `${paint("bold", "Mismatch:")} ` +
      `${paint(levelColor(level), `${level.toUpperCase()} — ${result.level.description}`)} ` +
      `(${result.breakdown.finalDisparity.toFixed(1)})` +
      `${adjustments.length ? paint("yellow", ` [${adjustments.join(" + ")} adjusted]`) : ""}`
    );
    await emit(`${paint("bold", "Decision:")} ${formatDecision(result.decision)}`);
    await emit(paint(
      "green",
      `Result: ${formatTeamName(result.favorite)} force win ${dryRun ? "proposed" : "applied"}`
    ));
  }
}

// The summary reports the whole run without repeating untouched game details.
export async function printSummary(result, { backupPath = null, outputPath = null, dryRun = true } = {}) {
  const s = result.summary;
  await emit(`\n${paint("bold", "Summary")}`);
  await emit(`Games found: ${s.gamesFound}`);
  await emit(`Tool involvement: ${s.involvement[0].toUpperCase()}${s.involvement.slice(1)}`);
  await emit(`Matchup model: ${s.modelProfileLabel}`);
  await emit(`Coach modifiers: ${s.coachingModifiersEnabled ? "enabled" : "off (coach Unique ID not configured)"}`);
  await emit(`Games eligible: ${countWithPercent(s.gamesEligible, s.gamesFound)} of games found`);
  await emit(`Games rolled: ${countWithPercent(s.gamesRolled, s.gamesEligible)} of eligible games`);
  await emit(`Outside involvement level: ${countWithPercent(s.gamesOutsideInvolvement, s.gamesEligible)} of eligible games`);
  await emit(`Automatic decisions: ${countWithPercent(s.automaticDecisions, s.gamesEligible)} of eligible games`);
  await emit(`Games skipped/protected: ${countWithPercent(s.gamesSkipped, s.gamesFound)} of games found`);
  await emit(`Small mismatches: ${countWithPercent(s.smallDisparity, s.gamesEligible)} of eligible games`);
  await emit(`Medium mismatches: ${countWithPercent(s.mediumDisparity, s.gamesEligible)} of eligible games`);
  await emit(`High mismatches: ${countWithPercent(s.highDisparity, s.gamesEligible)} of eligible games`);
  await emit(`Extreme mismatches: ${countWithPercent(s.extremeDisparity, s.gamesEligible)} of eligible games`);
  await emit(paint("green", `Force wins ${dryRun ? "proposed" : "applied"}: ${countWithPercent(s.forceWinsApplied, s.gamesEligible)} of eligible games`));
  await emit(paint("green", `FCS games force-winned: ${s.fcsForceWinsApplied} of ${s.fcsGamesEligible} (${s.fcsGamesEligible > 0 ? percent(s.fcsForceWinsApplied / s.fcsGamesEligible) : "n/a"})`));
  const nonFcsEligible = s.gamesEligible - s.fcsGamesEligible;
  const nonFcsForced = s.forceWinsApplied - s.fcsForceWinsApplied;
  await emit(`Non-FCS games force-winned: ${nonFcsForced} of ${nonFcsEligible} (${nonFcsEligible > 0 ? percent(nonFcsForced / nonFcsEligible) : "n/a"})`);
  await emit(`Upset chances preserved: ${countWithPercent(s.upsetChancesPreserved, s.gamesRolled)} of rolled games`);
  await emit(`Records modified: ${dryRun ? 0 : s.recordsModified}`);
  await emit(`Backup: ${backupPath ?? (dryRun ? "not created in preview mode" : "none")}`);
  await emit(`Output: ${outputPath ?? (dryRun ? "save was not changed" : "none")}`);
}

const csvCell = value => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const CSV_HEADERS = Object.freeze([
  "RowType", "GeneratedAt", "Save", "Mode", "Scope", "Season", "CurrentWeek", "RandomSource",
  "Involvement", "ModelProfile", "Record", "Week", "AwayTeam", "HomeTeam", "Favorite",
  "FavoriteLocation", "Outcome", "SkipReason", "Mismatch", "Disparity", "ProbabilityPercent",
  "RollPercent", "Automatic", "AutomaticReason", "ForceWinValue", "FavoriteStarterComposite", "OpponentStarterComposite",
  "FavoriteRawStarterComposite", "OpponentRawStarterComposite", "FavoriteOFF", "OpponentOFF",
  "FavoriteRawOFF", "OpponentRawOFF", "FavoriteDEF", "OpponentDEF", "FavoriteRawDEF", "OpponentRawDEF",
  "FavoriteCoaches", "OpponentCoaches",
  "WhyFavorite", "TeamTalentImpact", "TeamTalentScale", "MatchupImpact", "MatchupScale",
  "CoachingImpact", "CoachingScale", "HomeFieldImpact", "HomeEnvironmentImpact",
  "RivalryMultiplier", "FCSMultiplier", "FavoriteSpread", "OverUnder", "SummaryMetric", "SummaryValue"
]);

const csvRow = values => CSV_HEADERS.map(header => csvCell(values[header])).join(",");

// One CSV replaces the old text log and includes every evaluated/skipped game plus the run summary.
export function buildCsvReport(result, {
  savePath,
  mode,
  scope,
  season,
  currentWeek,
  seed,
  backupPath = null,
  outputPath = null,
  dryRun = true,
  generatedAt = new Date(),
  modelProfile = result.summary.modelProfileLabel
} = {}) {
  const generated = generatedAt.toISOString();
  const common = {
    GeneratedAt: generated,
    Save: savePath ?? "unknown",
    Mode: mode ?? (dryRun ? "dry run" : "write"),
    Scope: scope ?? "unknown",
    Season: season ?? "unknown",
    CurrentWeek: currentWeek ?? "unknown",
    RandomSource: seed === undefined ? "standard randomness" : `seed ${seed}`,
    Involvement: result.summary.involvement,
    ModelProfile: modelProfile
  };
  const lines = [CSV_HEADERS.join(",")];
  for (const game of [...result.results].sort((a, b) => a.week - b.week || a.index - b.index)) {
    const contributions = Object.fromEntries(
      (game.explanation?.contributions ?? []).map(item => [item.label, item])
    );
    const whyFavorite = (game.explanation?.contributions ?? [])
      .map(item => {
        const sign = item.value > 0 ? "+" : "";
        return `${item.label}: ${item.band} ${item.direction} (${sign}${item.value.toFixed(1)})`;
      })
      .join(" | ");
    lines.push(csvRow({
      ...common,
      RowType: "GAME",
      Record: game.index,
      Week: game.week,
      AwayTeam: game.awayTeam ? formatTeamName(game.awayTeam) : "",
      HomeTeam: game.homeTeam ? formatTeamName(game.homeTeam) : "",
      Favorite: game.favorite ? formatTeamName(game.favorite) : "",
      FavoriteLocation: game.favoriteLocation,
      Outcome: game.status,
      SkipReason: game.reason,
      Mismatch: game.level?.label,
      Disparity: game.breakdown?.finalDisparity?.toFixed(2),
      ProbabilityPercent: game.decision ? (game.decision.probability * 100).toFixed(1) : "",
      RollPercent: game.decision?.roll === null || game.decision?.roll === undefined
        ? ""
        : (game.decision.roll * 100).toFixed(1),
      Automatic: game.decision?.automatic ?? "",
      AutomaticReason: game.decision?.automaticReason ?? "",
      ForceWinValue: game.assignment,
      FavoriteStarterComposite: game.favorite?.ratings.overall,
      OpponentStarterComposite: game.underdog?.ratings.overall,
      FavoriteRawStarterComposite: game.favorite?.ratings.rawComposite,
      OpponentRawStarterComposite: game.underdog?.ratings.rawComposite,
      FavoriteOFF: game.favorite?.ratings.offense,
      OpponentOFF: game.underdog?.ratings.offense,
      FavoriteRawOFF: game.favorite?.ratings.rawOffense,
      OpponentRawOFF: game.underdog?.ratings.rawOffense,
      FavoriteDEF: game.favorite?.ratings.defense,
      OpponentDEF: game.underdog?.ratings.defense,
      FavoriteRawDEF: game.favorite?.ratings.rawDefense,
      OpponentRawDEF: game.underdog?.ratings.rawDefense,
      FavoriteCoaches: game.favoriteCoaching ? formatCoaching(game.favoriteCoaching) : "",
      OpponentCoaches: game.underdogCoaching ? formatCoaching(game.underdogCoaching) : "",
      WhyFavorite: whyFavorite,
      TeamTalentImpact: contributions["Starter-weighted talent"]?.value,
      TeamTalentScale: contributions["Starter-weighted talent"]?.band,
      MatchupImpact: contributions["Unit matchups"]?.value,
      MatchupScale: contributions["Unit matchups"]?.band,
      CoachingImpact: contributions.Coaching?.value,
      CoachingScale: contributions.Coaching?.band,
      HomeFieldImpact: contributions["Home field"]?.value,
      HomeEnvironmentImpact: contributions["Home environment"]?.value,
      RivalryMultiplier: game.breakdown?.rivalryMultiplier,
      FCSMultiplier: game.breakdown?.fcsMultiplier,
      FavoriteSpread: game.bettingLines?.favoriteSpread,
      OverUnder: game.bettingLines?.total
    }));
  }
  const s = result.summary;
  const summaryRows = {
    gamesFound: s.gamesFound,
    gamesEligible: s.gamesEligible,
    gamesRolled: s.gamesRolled,
    gamesRolledPercent: s.gamesEligible > 0 ? percent(s.gamesRolled / s.gamesEligible) : "n/a",
    outsideInvolvement: s.gamesOutsideInvolvement,
    outsideInvolvementPercent: s.gamesEligible > 0 ? percent(s.gamesOutsideInvolvement / s.gamesEligible) : "n/a",
    automaticDecisions: s.automaticDecisions,
    automaticDecisionPercent: s.gamesEligible > 0 ? percent(s.automaticDecisions / s.gamesEligible) : "n/a",
    gamesSkipped: s.gamesSkipped,
    forceWins: s.forceWinsApplied,
    forceWinPercent: s.gamesEligible > 0 ? percent(s.forceWinsApplied / s.gamesEligible) : "n/a",
    fcsGamesEligible: s.fcsGamesEligible,
    fcsForceWins: s.fcsForceWinsApplied,
    fcsForceWinPercent: s.fcsGamesEligible > 0 ? percent(s.fcsForceWinsApplied / s.fcsGamesEligible) : "n/a",
    nonFcsForceWinPercent: s.gamesEligible - s.fcsGamesEligible > 0 ? percent((s.forceWinsApplied - s.fcsForceWinsApplied) / (s.gamesEligible - s.fcsGamesEligible)) : "n/a",
    eligiblePercent: s.gamesFound > 0 ? percent(s.gamesEligible / s.gamesFound) : "n/a",
    skippedPercent: s.gamesFound > 0 ? percent(s.gamesSkipped / s.gamesFound) : "n/a",
    smallMismatchPercent: s.gamesEligible > 0 ? percent(s.smallDisparity / s.gamesEligible) : "n/a",
    mediumMismatchPercent: s.gamesEligible > 0 ? percent(s.mediumDisparity / s.gamesEligible) : "n/a",
    highMismatchPercent: s.gamesEligible > 0 ? percent(s.highDisparity / s.gamesEligible) : "n/a",
    extremeMismatchPercent: s.gamesEligible > 0 ? percent(s.extremeDisparity / s.gamesEligible) : "n/a",
    upsetChancesPreserved: s.upsetChancesPreserved,
    upsetPreservedPercent: s.gamesRolled > 0 ? percent(s.upsetChancesPreserved / s.gamesRolled) : "n/a",
    recordsModified: dryRun ? 0 : s.recordsModified,
    backup: backupPath ?? (dryRun ? "not created in preview mode" : "none"),
    output: outputPath ?? (dryRun ? "save was not changed" : "none")
  };
  for (const [metric, value] of Object.entries(summaryRows)) {
    lines.push(csvRow({ ...common, RowType: "SUMMARY", SummaryMetric: metric, SummaryValue: value }));
  }
  return `${lines.join("\r\n")}\r\n`;
}
