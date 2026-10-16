import { VALID_CLASSES, VALID_POSITIONS } from './equipment/shared.js';
import { displayPosition } from '../../shared/localization.js';

export function normalizePlayerScope(options = {}) {
  const list = (key, allowed) => {
    const values = options[key] ?? [];
    if (!Array.isArray(values) || values.some(value => typeof value !== 'string' || allowed && !allowed.includes(value))) throw new Error(`Choose valid ${key}.`);
    return [...new Set(values)];
  };
  const playerRows = list('playerRows');
  if (playerRows.some(value => !/^\d+$/.test(value))) throw new Error('Choose players from the active save.');
  return { teams: list('teams'), positions: list('positions', VALID_POSITIONS), classes: list('classes', VALID_CLASSES), redshirtStatuses: list('redshirtStatuses', ['Eligible', 'Current', 'Previous']), playerRows };
}
export function matchesPlayerScope(record, row, scope, teamNames = new Map()) {
  return (!scope.teams?.length || scope.teams.includes(teamNames.get(Number(record.TeamIndex)))) &&
    (!scope.positions?.length || scope.positions.includes(record.Position)) &&
    (!scope.classes?.length || scope.classes.includes(record.SchoolYear)) &&
    (!scope.redshirtStatuses?.length || scope.redshirtStatuses.includes(record.RedshirtStatus)) &&
    (!scope.playerRows?.length || scope.playerRows.includes(String(row)));
}
export function playerScopeCatalog(records, teamNames) {
  return { classes: VALID_CLASSES, positions: VALID_POSITIONS, redshirtStatuses: ['Eligible', 'Current', 'Previous'],
    players: records.flatMap((record, row) => !record || record.isEmpty || !teamNames.has(Number(record.TeamIndex)) || Number(record.TeamIndex) === 255 || record.FirstName === 'Omar' && record.LastName === 'Omar' ? [] : [{ value: String(row), label: `${record.FirstName} ${record.LastName} · ${teamNames.get(Number(record.TeamIndex))} · ${displayPosition(record.Position)} · ${record.RedshirtStatus === 'Previous' ? 'RS ' : ''}${record.SchoolYear} · ${record.OverallRating} OVR`, name: `${record.FirstName} ${record.LastName}`, team: teamNames.get(Number(record.TeamIndex)), position: record.Position, classYear: record.SchoolYear, redshirtStatus: record.RedshirtStatus, nil: Boolean(record.IsNIL) }]) };
}
