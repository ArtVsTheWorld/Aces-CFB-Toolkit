import { POSITION_GROUPS, positionGroup } from '../../../../shared/positionGroups.js';
export { POSITION_GROUPS as MOUTHPIECE_POSITION_GROUPS };
export const DEFAULT_MOUTHPIECE_LIMITS=Object.freeze(Object.fromEntries(POSITION_GROUPS.map(group=>[group,Object.freeze({applicationChance:85,populationCap:85})])));
export function normalizeMouthpieceLimits(value){
  if(value===undefined||value===null)return structuredClone(DEFAULT_MOUTHPIECE_LIMITS);
  if(typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!POSITION_GROUPS.includes(key)))throw Error('Mouthpiece limits contain an unknown position group.');
  return Object.fromEntries(POSITION_GROUPS.map(group=>{
    const entry=value[group]??DEFAULT_MOUTHPIECE_LIMITS[group];
    if(!entry||typeof entry!=='object'||Array.isArray(entry))throw Error(`${group}: enter a mouthpiece frequency.`);
    // Legacy presets had two controls. Retain the old population limit as
    // the unified frequency so migration never silently raises that limit.
    const frequency=entry.frequency??entry.populationCap??entry.applicationChance??85;
    if(!Number.isInteger(frequency)||frequency<0||frequency>100)throw Error(`${group}: mouthpiece frequency must be a whole percentage from 0 through 100.`);
    return [group,{applicationChance:frequency,populationCap:frequency}];
  }));
}
const skill = new Set(['HB', 'WR', 'TE', 'LB', 'CB', 'FS', 'SS']);
export const DEFAULT_MOUTHPIECE_POSITIONS = Object.freeze(Object.fromEntries(POSITION_GROUPS.map(group => [group, Object.freeze({ enabled: !['QB', 'K/P'].includes(group), standard: skill.has(group) ? 5 : 25, pacifier: skill.has(group) ? 20 : 60, hanging: skill.has(group) ? 75 : 15 })])));
export function normalizeMouthpiecePositions(value) {
  if (value === undefined || value === null) return null; // Legacy presets retain their original brand-first distribution.
  if (typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !POSITION_GROUPS.includes(key))) throw new Error('Mouthpiece settings contain an unknown position group.');
  return Object.fromEntries(POSITION_GROUPS.map(group => {
    const entry = value[group] ?? DEFAULT_MOUTHPIECE_POSITIONS[group];
    if (typeof entry.enabled !== 'boolean') throw new Error(`${group}: choose whether mouthpieces are enabled.`);
    const weights = Object.fromEntries(['standard', 'pacifier', 'hanging'].map(key => [key, entry[key]]));
    if (Object.values(weights).some(number => !Number.isInteger(number) || number < 0 || number > 100) || Object.values(weights).reduce((a, b) => a + b, 0) !== 100) throw new Error(`${group}: mouthpiece styles must use whole percentages totaling 100%.`);
    return [group, { enabled: entry.enabled, ...weights }];
  }));
}
export function mouthpieceProfile(position, configuration) { return configuration?.[positionGroup(position)] ?? null; }
