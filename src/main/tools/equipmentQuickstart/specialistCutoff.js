import { applyGlobalEquipmentFixes } from '../equipment/core/globalFixes.js';
import { sf } from '../equipment/openSave.js';

// Specialists retain donor-only randomization and skip the general Quickstart
// corrections. The explicitly requested K/P cutoff frequency is the exception.
export function applyQuickstartSpecialistCutoff({ players, visuals, visualsTableId, settings, rosterRows, processedRows, teamNames, fcsTeamIndexes }, fixes) {
  if (!settings.mods.unlocked) return;
  const specialists = new Set([...rosterRows].filter(row => ['K', 'P'].includes(String(sf(players[row], 'Position')).toUpperCase())));
  if (![...specialists].some(row => processedRows.has(row))) return;
  const rows = new Map(players.map((record, row) => [record, row]));
  const result = applyGlobalEquipmentFixes(players, visuals, visualsTableId, {
    cutoffPantsFix: true,
    cutoffPantsCaps: settings.patcher.cutoffPantsCaps,
    adjustOutfitForCutoff: settings.patcher.adjustOutfitForCutoff,
    replaceStandardWithCutoff: settings.patcher.replaceStandardWithCutoff,
    fillFrequencies: settings.patcher.fillFrequencies,
    protectOriginalEaPlayers: settings.mods.protectOriginalEaPlayers,
    seed: settings.patcher.seed,
    teamNames, fcsTeamIndexes, activePlayerRows: specialists,
    eligiblePlayer: record => specialists.has(rows.get(record)) && processedRows.has(rows.get(record))
  });
  fixes.cutoffPantsChanges.push(...result.cutoffPantsChanges);
  fixes.uniformPopulation.push(...result.uniformPopulation);
  fixes.visualsChanged += result.visualsChanged;
}
