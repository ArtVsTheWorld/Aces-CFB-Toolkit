import { sf } from "../openSave.js";
import { FORCE_WIN_SCHEMA } from "./schema.js";

export function buildSaveDiagnostics(records, context, schema = FORCE_WIN_SCHEMA) {
  const currentWeekRecords = records.filter(record =>
    record && !record.isEmpty &&
    Number(sf(record, schema.game.season)) === context.currentSeasonRecord &&
    Number(sf(record, schema.game.week)) === context.currentWeek
  );
  let unplayed = 0;
  let stagedCpuResults = 0;
  let existingForceWins = 0;
  let otherStatuses = 0;
  for (const record of currentWeekRecords) {
    const status = sf(record, schema.game.status);
    if (status === schema.game.unplayedStatus) unplayed += 1;
    else if (status === schema.game.homeWonStatus || status === schema.game.awayWonStatus) {
      stagedCpuResults += 1;
    } else otherStatuses += 1;
    if (sf(record, schema.game.forceWin) !== schema.game.noForceWin) existingForceWins += 1;
  }
  return {
    currentWeek: context.currentWeek,
    currentWeekGames: currentWeekRecords.length,
    stagedCpuResults,
    unplayed,
    existingForceWins,
    otherStatuses
  };
}

