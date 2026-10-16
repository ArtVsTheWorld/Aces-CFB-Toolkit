import { positionGroup } from '../../../../shared/positionGroups.js';

export const CROSS_DONOR_GROUPS = Object.freeze(['QB', 'HB', 'FB', 'WR', 'TE', 'OL', 'LB', 'DT', 'EDGE', 'CB', 'S']);
const positions = { QB: ['QB'], HB: ['HB'], FB: ['FB'], WR: ['WR'], TE: ['TE'], OL: ['LT', 'LG', 'C', 'RG', 'RT'], LB: ['LOLB', 'MLB', 'ROLB', 'LB'], DT: ['DT'], EDGE: ['LE', 'RE'], CB: ['CB'], S: ['FS', 'SS', 'SAFETY'] };
export const crossDonorGroup = position => ['FS', 'SS', 'SAFETY'].includes(String(position).toUpperCase()) ? 'S' : positionGroup(position);
export const DEFAULT_CROSS_DONOR_GROUPS = Object.freeze(Object.fromEntries(CROSS_DONOR_GROUPS.map(group => [group, Object.freeze(({ WR: ['CB', 'S', 'HB'], HB: ['CB', 'S', 'WR'], TE: ['LB', 'WR'], LB: ['TE', 'S', 'HB'], CB: ['WR', 'HB'], S: ['WR', 'HB', 'LB'] })[group] ?? [])])));
export function normalizeCrossDonorGroups(value) {
  if (value === undefined || value === null) return structuredClone(DEFAULT_CROSS_DONOR_GROUPS);
  if (typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !CROSS_DONOR_GROUPS.includes(key))) throw new Error('Cross-position sources contain an unknown position group.');
  return Object.fromEntries(CROSS_DONOR_GROUPS.map(group => {
    const selected = value[group] ?? DEFAULT_CROSS_DONOR_GROUPS[group];
    if (!Array.isArray(selected) || selected.some(source => source === group || !CROSS_DONOR_GROUPS.includes(source))) throw new Error(`Choose valid other position groups for ${group}.`);
    return [group, [...new Set(selected)]];
  }));
}
export function configuredCrossPositions(position, configuration) {
  return (configuration[crossDonorGroup(position)] ?? []).flatMap(group => positions[group]);
}
