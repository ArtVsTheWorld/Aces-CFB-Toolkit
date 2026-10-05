import path from "node:path";
import { createBackup, nextBackupPath } from "../../services/files.js";
import { openCfb27Save, readTables, availableTeams } from "../../services/save.js";
import { completePlan, saveFingerprint, storePlan, takePlan } from "../jersey/planStore.js";
import { CUSTOM_MODEL_FIELDS, normalizeCustomModel } from "./core/customModel.js";
import { customModelPresets, createModelConfig } from "./core/modelProfiles.js";
import FORCE_WIN_CONFIG from "./core/config.js";
import { buildCsvReport } from "./core/logger.js";
import { createRandom } from "./core/probabilityEngine.js";
import { buildPairSet } from "./core/protections.js";
import { processSchedule } from "./core/scheduleProcessor.js";
import { FORCE_WIN_SCHEMA, validateTableSchema } from "./core/schema.js";
import { availableTeamOptions, resolveSkippedTeamNames, resolveTeamRowIds } from "./core/userTeams.js";
import { buildRosterRatings } from "./core/rosterRatings.js";
import { resolveTeamReference } from "./core/teamRatings.js";
import { sf } from "./openSave.js";
import { projectSeasonLines } from "./core/seasonLines.js";

const TOOL_ID = "automatic-force-win";
const TOOL_NAME = "Smart Force Win";
export const TABLE_UIDS = Object.freeze({
  seasonInfo: 3123991521,
  seasonGame: 4049338978,
  team: 3359508968,
  coach: 1860529246,
  rivalry: 1822870912,
  scheduleNeutralStadium: 2588978308,
  player: 1612938518
});

async function load(savePath, schemaPath, keys = Object.keys(TABLE_UIDS)) {
  const opened = await openCfb27Save(savePath, schemaPath);
  const tables = await readTables(opened.franchise, Object.fromEntries(keys.map(key => [key, TABLE_UIDS[key]])));
  for (const key of keys) validateTableSchema(key, tables[key].records);
  return { ...opened, tables };
}

function seasonContext(records) {
  const record = records.find(candidate => candidate && !candidate.isEmpty);
  if (!record) throw new Error("SeasonInfo has no active record.");
  const f = FORCE_WIN_SCHEMA.seasonInfo;
  const context = {
    currentSeasonRecord: Number(sf(record, f.currentSeasonRecord)),
    currentSeasonDisplay: Number(sf(record, f.currentSeasonDisplay)),
    currentWeek: Number(sf(record, f.currentWeek)),
    currentWeekType: sf(record, f.currentWeekType),
    conferenceChampionshipWeek: Number(sf(record, f.conferenceChampionshipWeek))
  };
  for (const key of ["currentSeasonRecord", "currentSeasonDisplay", "currentWeek", "conferenceChampionshipWeek"]) {
    if (!Number.isFinite(context[key])) throw new Error(`SeasonInfo ${key} value is invalid.`);
  }
  if (context.currentWeekType !== FORCE_WIN_SCHEMA.game.regularSeasonType ||
      context.currentWeek < 0 || context.currentWeek > 15) {
    throw new Error(
      `Force Win Tool supports saves currently in regular-season Week 0 through Week 15. ` +
      `This save is ${context.currentWeekType}, week ${context.currentWeek}.`
    );
  }
  return context;
}

export function userControlledTeamNames(records, teams = availableTeams(records)) {
  return [...new Set(records
    .filter(record => record && !record.isEmpty && typeof sf(record, "UserCharacter") === "string" &&
      /[1-9]/.test(sf(record, "UserCharacter")))
    .map(record => teams.find(team => team.teamIndex === Number(sf(record, "TeamIndex")))?.name)
    .filter(Boolean))].sort();
}

export function userControlledTeamIds(records) {
  return records.flatMap((record, row) =>
    record && !record.isEmpty && typeof sf(record, "UserCharacter") === "string" &&
    /[1-9]/.test(sf(record, "UserCharacter")) ? [String(row)] : []
  );
}

export async function prepareForceWin({ savePath, schemaPath }) {
  const loaded = await load(savePath, schemaPath, ["seasonInfo", "team"]);
  const context = seasonContext(loaded.tables.seasonInfo.records);
  const teams = availableTeamOptions(loaded.tables.team);
  const userControlledTeamIdsValue = userControlledTeamIds(loaded.tables.team.records);
  return {
    teams,
    userControlledTeamIds: userControlledTeamIdsValue,
    userControlledTeams: teams.filter(team => userControlledTeamIdsValue.includes(team.value)).map(team => team.label),
    currentWeek: context.currentWeek,
    season: context.currentSeasonDisplay,
    customModelFields: CUSTOM_MODEL_FIELDS, customModelPresets: customModelPresets(),
    fcsDisparityMultiplier: FORCE_WIN_CONFIG.fcs.disparityMultiplier,
    involvement: Object.entries(FORCE_WIN_CONFIG.involvement.levels)
      .map(([value, item]) => ({ value, label: item.label })),
    profiles: Object.entries(FORCE_WIN_CONFIG.modelProfiles.profiles)
      .map(([value, item]) => ({ value, label: item.label, description: item.description }))
  };
}

export async function readSeasonLines({ savePath, schemaPath, modelProfile = FORCE_WIN_CONFIG.modelProfiles.default, customModel = null }) {
  const savedCustomModel = normalizeCustomModel(customModel);
  if (modelProfile === "custom" && !savedCustomModel) throw new Error("Create and save your custom model in Smart Force Win first.");
  if (modelProfile !== "custom" && !FORCE_WIN_CONFIG.modelProfiles.profiles[modelProfile]) throw new Error("Unknown matchup model.");
  const loaded = await load(savePath, schemaPath);
  const record = loaded.tables.seasonInfo.records.find(item => item && !item.isEmpty);
  if (!record) throw new Error("SeasonInfo has no active record.");
  const season = Number(sf(record, FORCE_WIN_SCHEMA.seasonInfo.currentSeasonRecord));
  const displaySeason = Number(sf(record, FORCE_WIN_SCHEMA.seasonInfo.currentSeasonDisplay));
  if (!Number.isFinite(season)) throw new Error("Current season is unavailable in this save.");
  const rows = projectSeasonLines({
    records: loaded.tables.seasonGame.records,
    teamTable: loaded.tables.team,
    coachTable: loaded.tables.coach,
    context: { currentSeasonRecord: season },
    rivalryPairs: buildPairSet(loaded.tables.rivalry.records, FORCE_WIN_SCHEMA.rivalry),
    neutralPairs: buildPairSet(loaded.tables.scheduleNeutralStadium.records, FORCE_WIN_SCHEMA.neutral, FORCE_WIN_SCHEMA.neutral.enabled),
    rosterRatings: buildRosterRatings({ teamTable: loaded.tables.team, playerTable: loaded.tables.player }),
    modelProfile, customModel: savedCustomModel
  });
  const profiles = Object.entries(FORCE_WIN_CONFIG.modelProfiles.profiles).map(([value, profile]) => ({ value, label: profile.label }));
  if (savedCustomModel) profiles.push({ value: "custom", label: "Saved Custom Model" });
  return { season: displaySeason, modelProfile, profiles, rows };
}

function normalized(options = {}) {
  const action = options.action === "clear" ? "clear" : "evaluate";
  const scope = String(options.scope ?? "regular");
  const specificWeek = options.week === "" || options.week === undefined ? null : Number(options.week);
  const involvement = String(options.involvement ?? FORCE_WIN_CONFIG.involvement.default);
  const modelProfile = String(options.modelProfile ?? FORCE_WIN_CONFIG.modelProfiles.default);
  const seed = options.seed === "" ? undefined : options.seed;
  if (!FORCE_WIN_CONFIG.involvement.levels[involvement]) {
    throw new Error(`Tool involvement must be one of: ${Object.keys(FORCE_WIN_CONFIG.involvement.levels).join(", ")}.`);
  }
  if (modelProfile !== "custom" && !FORCE_WIN_CONFIG.modelProfiles.profiles[modelProfile]) {
    throw new Error("Choose an existing or Custom matchup model.");
  }
  if (!["regular", "next", "week"].includes(scope)) {
    throw new Error("Schedule scope must be regular, next, or week.");
  }
  const clearScope = String(options.clearScope ?? "remaining");
  const clearWeek = options.clearWeek === "" || options.clearWeek === undefined ? null : Number(options.clearWeek);
  const clearTeamId = String(options.clearTeamId ?? "").trim();
  if (!["remaining", "week", "team"].includes(clearScope)) {
    throw new Error("Clear scope must be remaining, week, or team.");
  }
  if (clearScope === "week" && (!Number.isInteger(clearWeek) || clearWeek < 0 || clearWeek > 15)) {
    throw new Error("Clear week must be a whole number from 0 through 15.");
  }
  return {
    action,
    scope,
    specificWeek,
    involvement,
    modelProfile,
    customModel: modelProfile === "custom" ? normalizeCustomModel(options.customModel) : null,
    seed,
    forceAllFcs: Boolean(options.forceAllFcs),
    skippedTeamIds: Array.isArray(options.skippedTeamIds) ? options.skippedTeamIds.map(String) : [],
    skippedTeams: Array.isArray(options.skippedTeams) ? options.skippedTeams : [],
    clearScope,
    clearWeek,
    clearTeamId
  };
}

function teamSnapshot(team) {
  return team ? {
    id: String(team.id),
    name: team.name,
    overall: team.ratings?.overall ?? null,
    offense: team.ratings?.offense ?? null,
    defense: team.ratings?.defense ?? null,
    ratingSource: team.ratingSource ?? "save aggregate fallback"
  } : null;
}

function stableGame(game, existing = FORCE_WIN_SCHEMA.game.noForceWin) {
  const reason = game.reason ?? game.decision?.reason ?? game.explanation?.summary ?? "Model decision";
  return {
    row: game.index,
    week: game.week,
    awayTeam: game.awayTeam?.name ?? "Unknown",
    away: teamSnapshot(game.awayTeam),
    homeTeam: game.homeTeam?.name ?? "Unknown",
    home: teamSnapshot(game.homeTeam),
    forcedWinner: game.assignment ? game.favorite?.name ?? "Unknown" : "—",
    favorite: game.favorite?.name ?? "—",
    underdog: game.underdog?.name ?? "—",
    favoriteSide: game.favoriteSide ?? null,
    favoriteLocation: game.favoriteLocation ?? null,
    rule: reason,
    reason,
    status: game.status,
    existingForceWin: existing,
    proposedForceWin: game.assignment ?? existing,
    disparity: game.breakdown?.finalDisparity ?? null,
    mismatch: game.level?.label ?? null,
    probability: game.decision?.probability ?? null,
    roll: game.decision?.roll ?? null,
    rivalry: Boolean(game.rivalry),
    neutral: Boolean(game.neutral),
    automatic: Boolean(game.decision?.automatic),
    affected: Boolean(game.assignment),
    bettingLines: game.bettingLines ? {
      favoriteSpread: game.bettingLines.favoriteSpread,
      total: game.bettingLines.total,
      favoriteWinProbability: game.bettingLines.favoriteWinProbability,
      favoriteMoneyline: game.bettingLines.favoriteMoneyline,
      underdogMoneyline: game.bettingLines.underdogMoneyline
    } : null,
    calculation: game.breakdown ? {
      rosterTalent: game.breakdown.baseStrengthDifference,
      rosterTalentWeighted: game.explanation?.contributions?.[0]?.value ?? null,
      unitMatchups: game.breakdown.matchupEdge,
      unitMatchupsWeighted: game.explanation?.contributions?.[1]?.value ?? null,
      coaching: game.breakdown.coachingAdvantage,
      homeField: game.breakdown.homeFieldAdjustment,
      homeEnvironment: game.breakdown.homeContextAdjustment,
      rivalryMultiplier: game.breakdown.rivalryMultiplier,
      fcsMultiplier: game.breakdown.fcsMultiplier,
      profileScale: game.breakdown.profileDisparityScale,
      finalDisparity: game.breakdown.finalDisparity
    } : null,
    favoriteContinuity: game.favoriteCoaching?.continuityScore ?? null,
    opponentContinuity: game.underdogCoaching?.continuityScore ?? null
  };
}

async function applyPlan(context) {
  const plan = takePlan(context.options?.planId);
  if (plan.toolId !== TOOL_ID || path.resolve(plan.savePath) !== path.resolve(context.savePath)) {
    throw new Error("The preview does not belong to Smart Force Win and this Active Save.");
  }
  if (saveFingerprint(plan.savePath) !== plan.saveFingerprint) {
    throw new Error("The save changed after Preview. Run Preview again before Apply.");
  }
  const loaded = await load(context.savePath, context.schemaPath, ["seasonGame"]);
  for (const change of plan.assignments) {
    const record = loaded.tables.seasonGame.records[change.row];
    if (!record || record.isEmpty || sf(record, FORCE_WIN_SCHEMA.game.forceWin) !== change.oldValue) {
      throw new Error(`Schedule record ${change.row} changed after Preview. Run Preview again.`);
    }
  }
  let backupPath = null;
  if (plan.assignments.length) {
    backupPath = createBackup(loaded.savePath);
    for (const change of plan.assignments) {
      loaded.tables.seasonGame.records[change.row][FORCE_WIN_SCHEMA.game.forceWin] = change.newValue;
    }
    await loaded.franchise.save();
  }
  const reportPath = context.reports.createRaw({
    toolId: TOOL_ID,
    toolName: TOOL_NAME,
    prefix: plan.reportPrefix,
    content: plan.applyReport
  });
  completePlan(context.options.planId);
  return {
    ...plan.result,
    status: plan.assignments.length ? "completed" : "no-changes",
    mode: "apply",
    backupPath,
    reportPath,
    planId: context.options.planId
  };
}

function clearPreview(options, tables, season) {
  const clearTeamRows = options.clearScope === "team"
    ? resolveTeamRowIds([options.clearTeamId], tables.team, "Clear team")
    : new Set();
  const assigned = tables.seasonGame.records
    .map((record, row) => ({ record, row }))
    .filter(({ record }) => record && !record.isEmpty &&
      sf(record, FORCE_WIN_SCHEMA.game.forceWin) !== FORCE_WIN_SCHEMA.game.noForceWin)
    .filter(({ record }) => {
      if (options.clearScope === "week") {
        return Number(sf(record, FORCE_WIN_SCHEMA.game.week)) === options.clearWeek;
      }
      if (options.clearScope === "remaining") {
        return Number(sf(record, FORCE_WIN_SCHEMA.game.season)) === season.currentSeasonRecord &&
          Number(sf(record, FORCE_WIN_SCHEMA.game.week)) >= season.currentWeek;
      }
      const home = resolveTeamReference(sf(record, FORCE_WIN_SCHEMA.game.homeTeam), tables.team).team;
      const away = resolveTeamReference(sf(record, FORCE_WIN_SCHEMA.game.awayTeam), tables.team).team;
      return clearTeamRows.has(String(home?.id)) || clearTeamRows.has(String(away?.id));
    });
  const assignments = assigned.map(({ record, row }) => ({
    row,
    oldValue: sf(record, FORCE_WIN_SCHEMA.game.forceWin),
    newValue: FORCE_WIN_SCHEMA.game.noForceWin
  }));
  const rows = assigned.map(({ record, row }) => {
    const home = resolveTeamReference(sf(record, FORCE_WIN_SCHEMA.game.homeTeam), tables.team).team;
    const away = resolveTeamReference(sf(record, FORCE_WIN_SCHEMA.game.awayTeam), tables.team).team;
    return {
      row,
      week: Number(sf(record, FORCE_WIN_SCHEMA.game.week)),
      awayTeam: away?.name ?? "Unknown",
      away: teamSnapshot(away),
      homeTeam: home?.name ?? "Unknown",
      home: teamSnapshot(home),
      forcedWinner: "Clear",
      favorite: "—",
      rule: `Clear ${options.clearScope}`,
      reason: `Clear ${options.clearScope}`,
      status: "proposed clear",
      existingForceWin: sf(record, FORCE_WIN_SCHEMA.game.forceWin),
      proposedForceWin: FORCE_WIN_SCHEMA.game.noForceWin,
      affected: true,
      rivalry: false,
      neutral: false
    };
  });
  const report = {
    headings: ["Record", "Week", "PreviousForceWin", "Scope"],
    rows: assignments.map(change => [
      change.row,
      rows.find(row => row.row === change.row)?.week,
      change.oldValue,
      options.clearScope
    ])
  };
  return { assignments, rows, previewReport: report, applyReport: report };
}

async function preview(context) {
  const options = normalized(context.options);
  const loaded = await load(context.savePath, context.schemaPath);
  const tables = loaded.tables;
  const season = seasonContext(tables.seasonInfo.records);
  let assignments;
  let rows;
  let reportPrefix = "force-win-report";
  let previewReport;
  let applyReport;
  let coreResult = null;

  if (options.action === "clear") {
    ({ assignments, rows, previewReport, applyReport } = clearPreview(options, tables, season));
    reportPrefix = "force-win-clear-report";
  } else {
    if (options.scope === "week") {
      if (!Number.isInteger(options.specificWeek) || options.specificWeek < 1 || options.specificWeek > 14) {
        throw new Error("Specific week must be a whole number from 1 through 14.");
      }
      if (options.specificWeek <= season.currentWeek) {
        throw new Error(`Week ${options.specificWeek} is current or completed. Choose a week after ${season.currentWeek}.`);
      }
    }
    const rosterRatings = buildRosterRatings({ teamTable: tables.team, playerTable: tables.player });
    const skippedTeamIds = resolveTeamRowIds(options.skippedTeamIds, tables.team, "Skipped team");
    const skippedTeamNames = options.skippedTeams.length
      ? resolveSkippedTeamNames(options.skippedTeams.join(","), tables.team)
      : new Set();
    coreResult = processSchedule({
      records: tables.seasonGame.records,
      teamTable: tables.team,
      coachTable: tables.coach,
      context: season,
      scope: options.scope,
      specificWeek: options.specificWeek,
      rivalryPairs: buildPairSet(tables.rivalry.records, FORCE_WIN_SCHEMA.rivalry),
      neutralPairs: buildPairSet(
        tables.scheduleNeutralStadium.records,
        FORCE_WIN_SCHEMA.neutral,
        FORCE_WIN_SCHEMA.neutral.enabled
      ),
      skippedTeamIds,
      skippedTeamNames,
      random: createRandom(options.seed),
      involvement: options.involvement,
      modelProfile: options.modelProfile,
      customModel: options.customModel,
      rosterRatings,
      forceAllFcs: options.forceAllFcs
    });
    assignments = coreResult.changes.map(change => ({
      row: change.index,
      oldValue: sf(change.record, FORCE_WIN_SCHEMA.game.forceWin),
      newValue: change.assignment
    }));
    rows = coreResult.results.map(game => stableGame(game, sf(game.record, FORCE_WIN_SCHEMA.game.forceWin)));
    const scopeLabel = options.scope === "week" ? `specific week ${options.specificWeek}` :
      options.scope === "next" ? "next actionable week" : "remaining regular season";
    const reportDetails = dryRun => ({
      savePath: loaded.savePath,
      mode: dryRun ? "dry run" : "write",
      scope: scopeLabel,
      season: season.currentSeasonDisplay,
      currentWeek: season.currentWeek,
      seed: options.seed,
      modelProfile: createModelConfig(options.modelProfile, FORCE_WIN_CONFIG, options.customModel).activeModelProfile.label,
      customModel: options.customModel,
      backupPath: dryRun ? null : nextBackupPath(loaded.savePath),
      outputPath: dryRun ? null : loaded.savePath,
      dryRun
    });
    previewReport = buildCsvReport(coreResult, reportDetails(true));
    applyReport = buildCsvReport(coreResult, reportDetails(false));
  }

  const reportPath = Array.isArray(previewReport?.headings)
    ? context.reports.create({ toolId: TOOL_ID, toolName: TOOL_NAME, prefix: reportPrefix, ...previewReport })
    : context.reports.createRaw({ toolId: TOOL_ID, toolName: TOOL_NAME, prefix: reportPrefix, content: previewReport });
  const summary = options.action === "clear"
    ? [
        { label: "Assignments to clear", value: assignments.length },
        { label: "Current week", value: season.currentWeek }
      ]
    : [
        { label: "Games analyzed", value: coreResult.summary.gamesFound },
        { label: "Games affected", value: assignments.length },
        { label: "Games left untouched", value: coreResult.summary.gamesFound - assignments.length },
        { label: "Force wins: Medium / High / Extreme", value: `${coreResult.changes.filter(game => game.level?.label === "medium").length} / ${coreResult.changes.filter(game => game.level?.label === "high").length} / ${coreResult.changes.filter(game => game.level?.label === "extreme").length}` }
      ];
  const sortedRows = rows.sort((left, right) =>
    Number(left.week) - Number(right.week) ||
    String(left.awayTeam).localeCompare(String(right.awayTeam)) ||
    String(left.homeTeam).localeCompare(String(right.homeTeam)) ||
    left.row - right.row
  );
  const result = {
    status: "preview",
    mode: "preview",
    savePath: loaded.savePath,
    backupPath: null,
    reportPath,
    summary,
    historySummary: [{
      label: options.action === "clear" ? "Assignments cleared" : "Force wins proposed",
      value: assignments.length
    }],
    resultKind: TOOL_ID,
    details: {
      action: options.action, customModel: options.customModel, modelProfile: options.modelProfile,
      currentWeek: season.currentWeek,
      totalPreviewRows: sortedRows.length,
      changes: sortedRows.slice(0, 1000)
    }
  };
  const applyReportText = Array.isArray(applyReport?.headings)
    ? `${applyReport.headings.join(",")}\r\n${applyReport.rows.map(row => row.join(",")).join("\r\n")}\r\n`
    : applyReport;
  const planId = storePlan({
    toolId: TOOL_ID,
    toolName: TOOL_NAME,
    savePath: loaded.savePath,
    saveFingerprint: saveFingerprint(loaded.savePath),
    assignments,
    previewRows: sortedRows,
    reportPrefix,
    applyReport: applyReportText,
    result
  });
  return { ...result, planId };
}

export async function runForceWin(context) {
  if (context.mode === "apply") return applyPlan(context);
  if (context.mode !== "preview") throw new Error("Run mode must be preview or apply.");
  return preview(context);
}
