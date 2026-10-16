import { VALID_POSITIONS } from '../equipment/shared.js';
import { OFFENSE } from './shared.js';
import path from 'node:path';
import { getRetiredNumbers } from './core/retiredNumbers.js';
import { JERSEY_PERSONALITIES } from './personalities.js';

export function normalizeJerseyCustom(options = {}) {
  const lockedRows = options.lockedRows ?? [], customRetired = options.customRetired ?? {}, customTraditions = options.customTraditions ?? [];
  const lockIdentities = options.lockIdentities ?? {};
  if (!lockIdentities || typeof lockIdentities !== 'object' || Array.isArray(lockIdentities) || Object.entries(lockIdentities).some(([row, identity]) => !/^\d+$/.test(row) || !identity || typeof identity.name !== 'string' || typeof identity.team !== 'string')) throw new Error('Invalid player number lock identities. Choose players again.');
  if (!Array.isArray(lockedRows) || lockedRows.some(row => !/^\d+$/.test(String(row)))) throw new Error('Choose valid player number locks.');
  if (!customRetired || typeof customRetired !== 'object' || Array.isArray(customRetired) || Object.entries(customRetired).some(([team, numbers]) => !team || !Array.isArray(numbers) || numbers.some(number => !Number.isInteger(number) || number < 0 || number > 99))) throw new Error('Retired numbers must be whole numbers from 0 to 99.');
  if (!Array.isArray(customTraditions) || customTraditions.some(rule => !rule || typeof rule.team !== 'string' || !Number.isInteger(rule.number) || rule.number < 0 || rule.number > 99 || !['all', 'offense', 'defense'].includes(rule.side) || !Array.isArray(rule.positions) || rule.positions.some(position => !VALID_POSITIONS.includes(position)))) throw new Error('Choose a team, number, side, and supported positions for each tradition.');
  if (customTraditions.some(rule => rule.personality !== undefined && rule.personality !== '' && !JERSEY_PERSONALITIES.some(item => item.value === rule.personality))) throw new Error('Choose a supported personality type or Any Personality for each tradition.');
  if (customTraditions.length > 500 || lockedRows.length > 50000 || Object.keys(customRetired).length > 1000) throw new Error('This number-rule configuration is too large.');
  const seen = new Set();
  for (const rule of customTraditions) { const key = `${rule.team}|${rule.number}`; if (seen.has(key)) throw new Error(`${rule.team}: add only one custom tradition for #${rule.number}.`); seen.add(key); }
  return { lockedRows: [...new Set(lockedRows.map(String))], lockIdentities, lockSourcePath: typeof options.lockSourcePath === 'string' ? options.lockSourcePath : null, customRetired, customTraditions: customTraditions.map(rule => ({ teamNames: [rule.team], number: rule.number, side: rule.side === 'all' ? undefined : rule.side, eligiblePositions: rule.positions.length ? rule.positions : undefined, upperclassmenOnly: Boolean(rule.upperclassmenOnly), ...(rule.personality ? { eligiblePersonalities: [rule.personality] } : {}), label: `Custom ${rule.team} #${rule.number} tradition${rule.personality ? ' (' + JERSEY_PERSONALITIES.find(item => item.value === rule.personality).label + ')' : ''}` })) };
}
export function attachJerseyLocks(records, names, options, noDuplicates = false, savePath) {
  if (options.lockedRows.length && (!options.lockSourcePath || savePath && path.resolve(options.lockSourcePath).toLowerCase() !== path.resolve(savePath).toLowerCase())) throw new Error('Choose player number locks again for this active save. Locks are not portable between dynasties.');
  for (const name of Object.keys(options.customRetired)) if (![...names.values()].includes(name)) throw new Error(`Retired-number team ${name} is not in this save.`);
  const locks = new Set(options.lockedRows.map(Number)), held = new Map();
  for (const row of locks) {
    const player = records[row]; if (!player || player.isEmpty || !names.has(Number(player.TeamIndex))) throw new Error('A locked player is unavailable in this save.');
    const number = Number(player.JerseyNum), team = names.get(Number(player.TeamIndex));
    const identity = options.lockIdentities?.[row];
    if (identity && (identity.name !== `${player.FirstName} ${player.LastName}` || identity.team !== team)) throw new Error('A locked player changed since these settings were saved. Choose player number locks again before Preview.');
    if (options.enableRetiredNumbers && getRetiredNumbers(team, options.customRetired).has(number)) throw new Error(`${player.FirstName} ${player.LastName}: #${number} is both locked and retired. Remove one rule.`);
    const side = noDuplicates ? 'team' : OFFENSE.has(player.Position) ? 'offense' : 'defense';
    const key = `${player.TeamIndex}|${side}|${number}`;
    if (held.has(key)) throw new Error(`${team}: two protected players have #${number} on the same ${side}. Resolve the locks before Preview.`);
    held.set(key, row); player.userNumberLocked = true;
  }
  for (const rule of options.customTraditions) {
    const name = rule.teamNames[0]; if (![...names.values()].includes(name)) throw new Error(`Custom tradition team ${name} is not in this save.`);
    if (options.enableRetiredNumbers && getRetiredNumbers(name, options.customRetired).has(rule.number)) throw new Error(`${name}: #${rule.number} is both a tradition and retired.`);
    if (records.some(record => record?.userNumberLocked && names.get(Number(record.TeamIndex)) === name && Number(record.JerseyNum) === rule.number)) throw new Error(`${name}: #${rule.number} is locked to a player and reserved by a tradition. Remove one rule.`);
    if (!noDuplicates && !options.renumberNilPlayers && options.enableTeamRules !== false) {
      const protectedHolder = records.find(record => record && !record.isEmpty && record.IsNIL && names.get(Number(record.TeamIndex)) === name && Number(record.JerseyNum) === rule.number && (!rule.side || (OFFENSE.has(record.Position) ? 'offense' : 'defense') === rule.side));
      if (protectedHolder) throw new Error(`${name}: custom tradition #${rule.number} is held by protected NIL player ${protectedHolder.FirstName} ${protectedHolder.LastName}. Choose another number or explicitly allow NIL changes.`);
    }
  }
}
