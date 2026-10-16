import { HELMET_MODELS, DEFAULT_HELMET_WEIGHTS, effectiveHelmetWeights } from './helmets.js';
import { positionGroup } from '../../../../shared/positionGroups.js';
import { canUseVicis } from './helmetBalance.js';

// Diagnostics only: actual post-correction equipment, never a simulated reroll.
export function helmetPopulationAudit(entries, afterByRow, options = {}) {
  const buckets = new Map();
  for (const entry of entries) for (const dimension of ['position', 'team']) {
    const value = dimension === 'position' ? positionGroup(entry.position) : entry.team;
    const key = `${entry.cohort}|${dimension}|${value}`, bucket = buckets.get(key) ?? { cohort: entry.cohort, dimension, value, total: 0, before: {}, after: {}, target: {} };
    bucket.total++;
    const before = entry.helmet, after = afterByRow.get(entry.visualsRow) ?? before;
    bucket.before[before] = (bucket.before[before] ?? 0) + 1; bucket.after[after] = (bucket.after[after] ?? 0) + 1;
    const legacy = { GearHelmet_Speed_Flex: 68, GearHelmet_SchuttF7: 7.5, GearHelmet_SchuttF7Pro: 7.5, GearHelmet_Axiom: 14, GearHelmet_VicisZero2: canUseVicis(entry.position) ? 3 : 0 };
    const total = Object.values(legacy).reduce((sum, value) => sum + value, 0);
    const weights = options.helmetDistribution ? effectiveHelmetWeights(options.helmetDistribution, entry.position) : options.allowVicisZero2 ? Object.fromEntries(Object.entries(legacy).map(([id, value]) => [id, value * 100 / total])) : DEFAULT_HELMET_WEIGHTS;
    for (const [id, weight] of Object.entries(weights)) bucket.target[id] = (bucket.target[id] ?? 0) + weight / 100;
    buckets.set(key, bucket);
  }
  return { explanation: 'Counts cover eligible single-owner equipment rows. Protected, shared, and out-of-scope players are not balancing candidates. Team targets are an average of their eligible position mixes, not enforced team quotas. Repair Only replaces excluded gear without balancing existing allowed helmets. Small groups require whole-player rounding.', groups: [...buckets.values()].map(bucket => ({ ...bucket, models: [...new Set([...Object.keys(bucket.before), ...Object.keys(bucket.after), ...Object.keys(bucket.target)])].map(id => ({ id, label: HELMET_MODELS.find(model => model.id === id)?.label ?? 'Other / Mixed', before: bucket.before[id] ?? 0, after: bucket.after[id] ?? 0, targetPercent: bucket.total ? (bucket.target[id] ?? 0) * 100 / bucket.total : 0, beforePercent: (bucket.before[id] ?? 0) * 100 / bucket.total, afterPercent: (bucket.after[id] ?? 0) * 100 / bucket.total })) })) };
}
