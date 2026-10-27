import fs from 'node:fs';
import zlib from 'node:zlib';
import { decodeRosterTdf } from './rosterTdf.js';
import { saveFingerprint } from '../jersey/planStore.js';
import { loadEquipmentTables, buildRosterPlayerRows, buildRosterPlayerApparel, buildTeamNames, buildTeamApparel, buildFcsTeamIndexes } from './shared.js';
import { collectEquipmentDonors } from './core/patcher.js';
import { displayPosition } from '../../../shared/localization.js';
import { equipmentItem } from './catalog.js';

const enums = JSON.parse(fs.readFileSync(new URL('./rosterEnums.json', import.meta.url), 'utf8'));
const slots = new Map(Object.entries(enums.LoadoutSlotEnum).map(([key, value]) => [value, key.replace('LoadoutSlot_', '')]));
const positions = new Map(Object.entries(enums.FootballPosition).map(([key, value]) => [value, key.replace('FootballPosition_', '')]));
const bodies = new Map(Object.entries(enums.CharacterBodyType_DBE).filter(([key]) => /_(Standard|Thin|Muscular|Heavy|Freshman)$/.test(key)).map(([key, value]) => [value, key.replace('CharacterBodyType_', '')]));
const normalizedName = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const years = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
const reference = (tableId, row) => tableId.toString(2).padStart(15, '0') + row.toString(2).padStart(17, '0');
const paletteTypes = ['Custom', 'TeamPrimary', 'TeamSecondary', 'TeamTertiary', 'AlphaOnly', 'Preset', 'DetRandom', 'Random', 'Black', 'White', 'Default'];

export function decodeRosterEquipmentElement(pin) {
  const slotType = slots.get(pin.SLOT ?? 0);
  if (!slotType || ['Invalid', 'Max'].includes(slotType) || typeof pin.ITAN !== 'string' || !pin.ITAN || (slotType === 'Reserved' && equipmentItem(pin.ITAN)?.category !== 'Chin Cover')) throw new Error('Unrecognized equipment slot or asset');
  if (Object.keys(pin).some(key => !['SLOT', 'ITAN', 'IBLD', 'PALM', 'FBIN', 'ITAE', 'ITAG', 'ZORD'].includes(key)) || ['FBIN', 'ITAE', 'ITAG'].some(key => pin[key] !== undefined && pin[key] !== '') || pin.ZORD !== undefined && pin.ZORD !== 0) throw new Error('Unsupported equipment metadata');
  const element = { slotType, itemAssetName: pin.ITAN };
  if (pin.IBLD !== undefined) {
    if (!Array.isArray(pin.IBLD)) throw new Error('Invalid equipment blends');
    element.blends = pin.IBLD.map(blend => {
      if (Object.keys(blend).some(key => !['BARY', 'BASE', 'BSOV', 'BYOV'].includes(key)) || ['BSOV', 'BYOV'].some(key => blend[key] !== undefined && blend[key] !== '') || !Number.isFinite(blend.BARY ?? 0) || !Number.isFinite(blend.BASE ?? 0)) throw new Error('Unsupported equipment blend metadata');
      return { barycentricBlend: blend.BARY ?? 0, baseBlend: blend.BASE ?? 0 };
    });
  }
  if (pin.PALM !== undefined) {
    if (!Array.isArray(pin.PALM)) throw new Error('Invalid equipment palette');
    element.paletteMods = pin.PALM.map(palette => {
      // ItemPalette is the default binding in dynasty JSON. Do not guess a
      // conversion for named non-default palette bindings or unknown enum values.
      if (Object.keys(palette).some(key => !['PALV', 'PLAN', 'PLTY'].includes(key)) || palette.PLAN !== 'ItemPalette' || typeof palette.PALV !== 'string' || !paletteTypes[palette.PLTY ?? 0]) throw new Error('Unsupported equipment palette metadata');
      return { paletteValue: palette.PALV, paletteType: paletteTypes[palette.PLTY ?? 0] };
    });
  }
  return element;
}

export function decodeRosterDonors(bytes) {
  if (bytes.subarray(0, 8).toString() !== 'FBCHUNKS' || !/^College-27-RL\d+(?:_\d+)?-\d+\0/.test(bytes.subarray(46, 74).toString())) throw new Error('This is not a supported College Football 27 roster container.');
  const data = decodeRosterTdf(zlib.inflateSync(bytes.subarray(74), { maxOutputLength: 256 * 1024 * 1024 }));
  if (!Array.isArray(data.PLAY) || !Array.isArray(data.TEAM) || !Array.isArray(data.BLOB?.BLOB)) throw new Error('Roster player, team, or equipment records are missing.');
  const playerBlobs = data.BLOB.BLOB.filter(entry => (entry.OTID ?? 0) === 0);
  if (playerBlobs.length !== 1 || !Array.isArray(playerBlobs[0].BLBM)) throw new Error('Roster player equipment mapping is ambiguous.');
  const blobs = new Map(playerBlobs[0].BLBM);
  if (blobs.size !== playerBlobs[0].BLBM.length) throw new Error('Roster contains duplicate equipment identities.');
  const teams = { header: { tableId: 32001 }, records: data.TEAM.map(team => ({ isEmpty: false, TeamIndex: team.TGID, DisplayName: team.TDNA ?? team.TLNA, TeamApparel: '' })) };
  if (teams.records.some(team => !Number.isSafeInteger(team.TeamIndex) || typeof team.DisplayName !== 'string')) throw new Error('Roster contains an invalid team identity.');
  const teamIndexes = new Set(teams.records.map(team => team.TeamIndex));
  if (teamIndexes.size !== teams.records.length) throw new Error('Roster contains duplicate team identities.');
  const players = { header: { tableId: 32000 }, records: [] }, visuals = { header: { tableId: 32002 }, records: [] }, warnings = [];
  const identities = new Set();
  for (const player of data.PLAY) {
    if (!Number.isSafeInteger(player.PGID) || identities.has(player.PGID)) throw new Error('Roster contains an invalid or duplicate player identity.');
    identities.add(player.PGID);
    if (!teamIndexes.has(player.TGID)) continue; // Not on a playable roster.
    try {
      const blob = blobs.get(player.PGID); if (!Buffer.isBuffer(blob)) throw new Error('No equipment blob');
      const visual = decodeRosterTdf(zlib.gunzipSync(blob, { maxOutputLength: 4 * 1024 * 1024 })).CHVI;
      if (!visual || (visual.CNID ?? 0) !== player.PGID || normalizedName(visual.CFNM) !== normalizedName(player.PFNA) || normalizedName(visual.CLNM) !== normalizedName(player.PLNA)) throw new Error('Equipment/player identity does not agree');
      const position = positions.get(player.PPOS ?? 0), body = bodies.get(player.PCBT ?? 0), year = years[player.PYEA ?? 0];
      if (!position || !body || !year || (visual.BTYP ?? 0) !== (player.PCBT ?? 0)) throw new Error('Unknown or inconsistent player classification');
      const loadouts = (visual.LOUT ?? []).filter(loadout => loadout.LDTY === 1).map(loadout => ({ loadoutType: 'PlayerOnField', loadoutElements: (loadout.PINS ?? []).map(decodeRosterEquipmentElement) }));
      if (!loadouts.length || loadouts.some(loadout => !loadout.loadoutElements.length || new Set(loadout.loadoutElements.map(element => element.slotType)).size !== loadout.loadoutElements.length)) throw new Error('Missing or duplicate on-field equipment slots');
      const row = players.records.length, visualRow = visuals.records.length;
      visuals.records.push({ isEmpty: false, RawData: JSON.stringify({ loadouts }) });
      players.records.push({ isEmpty: false, FirstName: player.PFNA, LastName: player.PLNA, Position: position, SchoolYear: year, CharacterBodyType: body, TeamIndex: player.TGID, OverallRating: player.POVR ?? 0, JerseyNum: player.PJEN ?? 0, CharacterVisuals: reference(visuals.header.tableId, visualRow), RosterPlayerId: player.PGID });
    } catch (error) { warnings.push({ playerId: player.PGID, player: `${player.PFNA ?? ''} ${player.PLNA ?? ''}`, reason: error.message }); }
  }
  const rosters = { header: { tableId: 32003 }, records: [] };
  for (const team of teams.records) {
    const rows = players.records.map((player, row) => player.TeamIndex === team.TeamIndex ? row : -1).filter(row => row >= 0), row = rosters.records.length;
    rosters.records.push({ isEmpty: false, arraySize: rows.length, ...Object.fromEntries(rows.map((value, index) => [`Player${index}`, reference(players.header.tableId, value)])) });
    team.Roster = reference(rosters.header.tableId, row);
  }
  return { players, visuals, teams, rosters, donorKind: 'roster', warnings };
}

export async function loadEquipmentDonorSource(savePath, schemaPath, expectedFingerprint = '') {
  const fingerprint = saveFingerprint(savePath);
  if (expectedFingerprint && expectedFingerprint !== fingerprint) throw new Error('The donor file changed since you chose players. Reload the donor file and choose players again.');
  const header = Buffer.alloc(80), descriptor = fs.openSync(savePath, 'r');
  try { fs.readSync(descriptor, header, 0, header.length, 0); } finally { fs.closeSync(descriptor); }
  const loaded = header.subarray(46, 57).toString() === 'College-27-' ? decodeRosterDonors(fs.readFileSync(savePath)) : await loadEquipmentTables(savePath, schemaPath, true, false);
  if (saveFingerprint(savePath) !== fingerprint) throw new Error('The donor file changed while it was being read. Try again.');
  return { ...loaded, donorKind: loaded.donorKind ?? 'dynasty', donorFingerprint: fingerprint };
}

export async function prepareEquipmentDonors({ savePath, schemaPath }) {
  const loaded = await loadEquipmentDonorSource(savePath, schemaPath);
  const donorPlayers = collectEquipmentDonors(loaded.players.records, loaded.visuals.records, loaded.visuals.header.tableId, { rosterRows: buildRosterPlayerRows(loaded.players, loaded.teams, loaded.rosters), fcsTeamIndexes: buildFcsTeamIndexes(loaded.teams.records), teamNames: buildTeamNames(loaded.teams.records), teamApparel: buildTeamApparel(loaded.teams.records), playerApparel: buildRosterPlayerApparel(loaded.players, loaded.teams, loaded.rosters) })
    .sort((a, b) => a.team.localeCompare(b.team) || a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName) || a.row - b.row)
    .map(player => ({ value: String(player.row), position: player.position, overall: player.overall, team: player.team, name: `${player.firstName} ${player.lastName}`, label: `${player.firstName} ${player.lastName} · ${player.team} · ${displayPosition(player.position)} · ${player.classYear} · #${player.jersey} · ${player.overall} OVR` }));
  if (!donorPlayers.length) throw new Error('This file has no eligible on-roster upperclassman equipment donors.');
  return { donorPlayers, donorFingerprint: loaded.donorFingerprint, donorKind: loaded.donorKind, warnings: loaded.warnings ?? [] };
}
