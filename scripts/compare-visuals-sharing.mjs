// Read-only comparison: counts actual player/roster references, not gear edits.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { openCfb27Save, readTables, PLAYER_TABLE_UID, TEAM_TABLE_UID } from "../src/main/services/save.js";
import { VISUALS_TABLE_UID, ROSTER_TABLE_UID } from "../src/main/tools/equipment/shared.js";
import { overflowOwners, validateVisualStorageLayout } from "../src/main/tools/equipment/visualStorage.js";
import { parseRef, sf } from "../src/main/tools/equipment/openSave.js";
import { isPlaceholder } from "../src/main/tools/equipment/core/patcher.js";

const root = fileURLToPath(new URL("../", import.meta.url)), schema = path.join(root, "resources/engine-data/C27_486_6.gz");
const folder = fs.mkdtempSync(path.join(root, "outputs/visuals-sharing-comparison-"));
const files = process.argv.slice(2).length ? process.argv.slice(2) : [
  "C:/Users/Art/Documents/EA SPORTS College Football 27/saves/DYNASTY-TAPETEST",
  "C:/Users/Art/Documents/EA SPORTS College Football 27/saves/DYNASTY-CHEEBACKUP"
];
const hash = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const inputHashes = files.map(hash), results = [];
for (const file of files) {
  const opened = await openCfb27Save(file, schema);
  const { players, teams, rosters, visuals } = await readTables(opened.franchise, { players: PLAYER_TABLE_UID, teams: TEAM_TABLE_UID, rosters: ROSTER_TABLE_UID, visuals: VISUALS_TABLE_UID });
  const members = new Map(), teamRows = [];
  for (const team of teams.records) {
    if (team.isEmpty) continue;
    const ref = parseRef(sf(team, "Roster"));
    const entry = { row: team.index, team: sf(team, "DisplayName"), asset: sf(team, "AssetName"), teamIndex: sf(team, "TeamIndex"), players: [] };
    teamRows.push(entry);
    if (ref?.tableId !== rosters.header.tableId || !rosters.records[ref.row] || rosters.records[ref.row].isEmpty) continue;
    const roster = rosters.records[ref.row], size = Number.isInteger(Number(roster.arraySize)) ? Number(roster.arraySize) : Object.keys(roster._fields ?? {}).length;
    for (let index = 0; index < size; index++) {
      const playerRef = parseRef(sf(roster, `Player${index}`));
      if (playerRef?.tableId !== players.header.tableId || !players.records[playerRef.row] || players.records[playerRef.row].isEmpty) continue;
      entry.players.push(playerRef.row); const list = members.get(playerRef.row) ?? []; list.push({ row: entry.row, team: entry.team }); members.set(playerRef.row, list);
    }
  }
  const refs = new Map(), invalid = [], owners = overflowOwners(visuals);
  let activePlayers = 0, rosteredPlaceholders = 0, rosteredInvalid = 0, rosteredEmpty = 0, rosteredUnreadable = 0;
  for (const player of players.records) {
    if (player.isEmpty) continue;
    const rostered = members.has(player.index); if (rostered) { activePlayers++; if (isPlaceholder(player)) rosteredPlaceholders++; }
    const ref = parseRef(sf(player, "CharacterVisuals")), visual = ref?.tableId === visuals.header.tableId ? visuals.records[ref.row] : null;
    if (!visual || visual.isEmpty || owners.has(ref.row)) { invalid.push({ row: player.index, player: `${sf(player, "FirstName")} ${sf(player, "LastName")}`, rostered, ref }); if (rostered) rosteredInvalid++; continue; }
    const entry = { row: player.index, player: `${sf(player, "FirstName")} ${sf(player, "LastName")}`, position: sf(player, "Position"), year: sf(player, "SchoolYear"), nil: sf(player, "IsNIL"), placeholder: isPlaceholder(player), rostered, teams: members.get(player.index) ?? [] };
    const group = refs.get(ref.row) ?? []; group.push(entry); refs.set(ref.row, group);
  }
  const shared = [...refs].filter(([, group]) => group.length > 1).map(([row, group]) => ({ row, players: group }));
  const activeShared = shared.filter(group => group.players.filter(player => player.rostered).length > 1);
  const teamShared = teamRows.map(team => {
    const membersOnTeam = new Set(team.players), sharedMembers = shared.flatMap(group => group.players.filter(player => membersOnTeam.has(player.row))), grouped = activeShared.flatMap(group => group.players.filter(player => membersOnTeam.has(player.row)));
    return { ...team, players: team.players.length, onSharedRow: sharedMembers.length, wouldTriggerRandomizerSharedSkip: grouped.length };
  });
  for (const [row, group] of refs) {
    const raw = sf(visuals.records[row], "RawData");
    if (typeof raw !== "string" || !raw.trim()) { rosteredEmpty += group.filter(player => player.rostered).length; continue; }
    try { JSON.parse(raw); } catch { rosteredUnreadable += group.filter(player => player.rostered).length; }
  }
  let layout, layoutError = null;
  try { layout = validateVisualStorageLayout(visuals); } catch (error) { layoutError = error.message; }
  const offsets = new Map();
  for (const record of visuals.records) if (!record.isEmpty) { const offset = record.getFieldByKey("RawData").thirdTableField.index, group = offsets.get(offset) ?? []; group.push(record.index); offsets.set(offset, group); }
  const summary = { name: path.basename(file), teams: teamRows.length, nonemptyPlayerRecords: players.records.filter(record => !record.isEmpty).length, rosteredPlayers: activePlayers, visualCapacity: visuals.header.recordCapacity, freeVisualRecords: visuals.records.filter(record => record.isEmpty).length, overflowRecords: owners.size, sharedLogicalRows: shared.length, playersOnSharedLogicalRows: shared.reduce((n, group) => n + group.players.length, 0), sharedRosterLogicalRows: activeShared.length, rosteredPlayersOnSharedRows: activeShared.reduce((n, group) => n + group.players.filter(player => player.rostered).length, 0), extraRowsToSeparateAllValidPlayerReferences: shared.reduce((n, group) => n + group.players.length - 1, 0), extraRowsToSeparateRosterPlayerReferences: activeShared.reduce((n, group) => n + group.players.filter(player => player.rostered).length - 1, 0), invalidRosteredVisualReferences: rosteredInvalid, emptyRosteredRawData: rosteredEmpty, unreadableRosteredRawData: rosteredUnreadable, rosteredPlaceholders, physicalAliasGroups: [...offsets.values()].filter(group => group.length > 1).length, allocatedRosterMembersOnMultipleTeams: [...members.values()].filter(group => group.length > 1).length, layout, layoutError };
  results.push({ file, sha256: hash(file), summary, teams: teamShared, sharedRows: shared, invalid });
  console.log(JSON.stringify(summary));
}
if (results.length === 2) {
  const firstRows = new Set(results[0].teams.map(team => team.row)), extraTeams = results[1].teams.filter(team => !firstRows.has(team.row));
  const comparisons = { teamRecordsAbsentFromFirstSave: extraTeams.length, rosterPlayersOnThoseTeams: extraTeams.reduce((n, team) => n + team.players, 0), sharedRosterPlayersOnThoseTeams: extraTeams.reduce((n, team) => n + team.wouldTriggerRandomizerSharedSkip, 0), teamsInSecondWithSharing: results[1].teams.filter(team => team.wouldTriggerRandomizerSharedSkip).map(team => ({ row: team.row, team: team.team, asset: team.asset, players: team.players, shared: team.wouldTriggerRandomizerSharedSkip })), firstExamples: results[1].sharedRows.slice(0, 3) };
  console.log(JSON.stringify({ extraTeams: comparisons.teamRecordsAbsentFromFirstSave, extraRosterPlayers: comparisons.rosterPlayersOnThoseTeams, extraTeamSharedPlayers: comparisons.sharedRosterPlayersOnThoseTeams, sharedTeams: comparisons.teamsInSecondWithSharing.length }));
  fs.writeFileSync(path.join(folder, "comparison.json"), JSON.stringify(comparisons, null, 2));
}
if (files.some((file, index) => hash(file) !== inputHashes[index])) throw new Error("An input file changed during the read-only comparison");
fs.writeFileSync(path.join(folder, "results.json"), JSON.stringify(results, null, 2));
console.log(`Read-only comparison complete; originals unchanged. ${folder}`);
