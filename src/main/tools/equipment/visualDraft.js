import { sf } from './openSave.js';
import { prepareVisualWrite, tryPreparedVisualWrite } from './visualStorage.js';
import { toolProgressCount } from '../../services/toolProgress.js';

export const isNonePlaceholder = element => typeof element?.itemAssetName === 'string' && /(?:^|_)None$/i.test(element.itemAssetName);
export function removeNonePlaceholders(parsed) {
  let removed = 0;
  for (const loadout of parsed?.loadouts ?? []) {
    if (!Array.isArray(loadout?.loadoutElements)) continue;
    loadout.loadoutElements = loadout.loadoutElements.filter(element => {
      if (!isNonePlaceholder(element)) return true;
      removed++; return false;
    });
  }
  return removed;
}

// Passes share drafts, not the fixed native pool. A player's complete proposed
// appearance is either accepted once or left entirely unchanged.
export function createVisualDraft(table) {
  const pending = new Map();
  const records = table.records.map(record => !record ? record : new Proxy(record, {
    get(target, key) { return key === 'RawData' && pending.has(target.index) ? pending.get(target.index) : Reflect.get(target, key, target); },
    set(target, key, value) {
      if (key !== 'RawData') throw new Error('An equipment draft may only change appearance data.');
      pending.set(target.index, value); return true;
    }
  }));
  return { table: new Proxy(table, { get(target, key) { return key === 'records' ? records : Reflect.get(target, key, target); } }), original: table, pending };
}

export function finalizeVisualDraft(draft) {
  const proposals = [], skippedRows = new Set(), assignments = [];
  let removed = 0, visited = 0;
  for (const [row, raw] of draft.pending) {
    const parsed = JSON.parse(raw); removed += removeNonePlaceholders(parsed);
    const value = JSON.stringify(parsed), record = draft.original.records[row], oldValue = sf(record, 'RawData');
    draft.pending.set(row, value);
    if (value !== oldValue) proposals.push({ ...prepareVisualWrite(record, value), oldValue });
    toolProgressCount(++visited, draft.pending.size, 'Checking equipment storage…');
  }
  // Release unneeded continuations before considering growing appearances.
  // Apply receives this same accepted order and never makes new skip decisions.
  proposals.sort((a, b) => a.delta - b.delta || a.record.index - b.record.index);
  visited = 0;
  for (const proposal of proposals) {
    const row = proposal.record.index;
    if (!tryPreparedVisualWrite(proposal)) { skippedRows.add(row); draft.pending.delete(row); }
    else assignments.push({ table: 'visuals', row, field: 'RawData', oldValue: proposal.oldValue, newValue: proposal.value });
    toolProgressCount(++visited, proposals.length, 'Fitting equipment changes…');
  }
  return { skippedRows, assignments, placeholdersRemoved: removed };
}

export function sortVisualAssignments(assignments, accepted) {
  const order = new Map(accepted.map((change, index) => [change.row, index]));
  return assignments.sort((a, b) => order.get(a.row) - order.get(b.row));
}

export function retainRandomizerResults(result, skippedRows) {
  const skipped = result.changes.filter(change => skippedRows.has(change.visualsRow));
  result.changes = result.changes.filter(change => !skippedRows.has(change.visualsRow));
  // Capacity skips are represented by a count, never individual player notices.
  result.storageSkipped = skipped.length;
  for (const [counter, predicate] of Object.entries({
    fcsChanged: change => change.isFcs, vanillaPlayersChanged: change => change.vanillaChanges?.length, unlockedPlayersChanged: change => change.unlockedChanges?.length,
    rawPlayersChanged: change => change.rawChanges?.length, equipmentTruckPlayersChanged: change => change.equipmentTruckChanges?.length,
    noDripPlayers: change => change.noDrip
  })) if (counter in result) result[counter] = result.changes.filter(predicate).length;
  result.brandCorrections = result.changes.reduce((sum, change) => sum + (change.brandCorrections?.length ?? 0), 0);
  return skipped;
}

export function retainPatcherResults(fixes, players, visualsTableId, skippedRows, assignments) {
  if (!skippedRows.size) return;
  const skippedPlayers = new Set(players.flatMap((record, row) => {
    if (!record || record.isEmpty) return [];
    const ref = record.CharacterVisuals;
    if (typeof ref !== 'string' || !/^[01]{32}$/.test(ref)) return [];
    return parseInt(ref.slice(0, 15), 2) === visualsTableId && skippedRows.has(parseInt(ref.slice(15), 2)) ? [row] : [];
  }));
  for (const [key, value] of Object.entries(fixes)) if (key.endsWith('Changes') && Array.isArray(value)) fixes[key] = value.filter(change => !skippedPlayers.has(change.row));
  const counters = { pantsPlayersChanged:'pantsChanges', helmetPlayersChanged:'helmetChanges', rolledJerseyPlayersChanged:'rolledJerseyChanges', sockPlayersChanged:'sockChanges', unlockedSockPlayersChanged:'unlockedSockChanges', sleeveCompatibilityPlayersChanged:'sleeveCompatibilityChanges', nikeThighPadPlayersChanged:'nikeThighPadChanges', visorPlayersChanged:'visorChanges', oakleyVisorPlayersChanged:'oakleyVisorChanges', unlockedRecolorPlayersChanged:'unlockedRecolorChanges', unlockedMouthpiecePlayersChanged:'unlockedMouthpieceChanges', existingMouthpieceColorsChanged:'existingMouthpieceColorChanges', unlockedTattooPlayersChanged:'unlockedTattooChanges', clearedTattooPlayers:'clearedTattooChanges' };
  for (const [counter, list] of Object.entries(counters)) fixes[counter] = new Set((fixes[list] ?? []).map(change => change.row)).size;
  fixes.visualsChanged = assignments.length;
  // Pre-fit population projections no longer describe the accepted run.
  for (const key of ['populationSafeguards','unlockedTattooPopulation','helmetPopulation','helmetBalance']) fixes[key] = null;
  fixes.uniformPopulation = [];
}
