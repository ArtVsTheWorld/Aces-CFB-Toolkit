import { sf } from "../openSave.js";
import { FORCE_WIN_SCHEMA } from "./schema.js";

const ZERO_REF = "00000000000000000000000000000000";

// Team-pair keys are order-independent so home/away direction cannot break matching.
export function pairKey(first, second) {
  return [first, second].sort().join("|");
}

export function buildPairSet(records, fields, enabledField = null) {
  const pairs = new Set();
  for (const record of records ?? []) {
    if (record?.isEmpty) continue;
    if (enabledField && ![true, "true", 1, "1"].includes(sf(record, enabledField))) continue;
    const first = sf(record, fields.team1);
    const second = sf(record, fields.team2);
    if (!first || !second || first === ZERO_REF || second === ZERO_REF) continue;
    pairs.add(pairKey(first, second));
  }
  return pairs;
}

// Postseason remains protected even when selected through an exact stored week.
export function isPostseasonGame(record, schema = FORCE_WIN_SCHEMA) {
  const bowlRef = sf(record, schema.game.bowlGame);
  const weekType = sf(record, schema.game.weekType);
  return (typeof bowlRef === "string" && bowlRef !== ZERO_REF) ||
    (weekType && weekType !== schema.game.regularSeasonType);
}

export function protectionReason({
  record,
  conferenceChampionshipWeek,
  schema = FORCE_WIN_SCHEMA
}) {
  if (isPostseasonGame(record, schema)) return "postseason/championship game";
  if (Number(sf(record, schema.game.week)) === Number(conferenceChampionshipWeek)) {
    return "conference championship week";
  }
  return null;
}
