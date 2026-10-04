export const LONG_SNAP_POSITIONS = Object.freeze(new Set(["C", "LG", "RG", "TE"]));

export function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// Truncated N(60, 12): about 60% of values land from 50-70, while the
// 25/99 boundaries remain possible but uncommon.
export function rollLongSnapRating(random = Math.random) {
  while (true) {
    const first = Math.max(Number.EPSILON, random());
    const second = random();
    const standardNormal = Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
    const rating = Math.round(60 + standardNormal * 12);
    if (rating >= 25 && rating <= 99) return rating;
  }
}

export function isEligibleLongSnapPlayer(record) {
  if (!record || record.isEmpty || !LONG_SNAP_POSITIONS.has(String(record.Position ?? ""))) return false;
  const teamIndex = Number(record.TeamIndex);
  if (!Number.isInteger(teamIndex) || teamIndex < 0 || teamIndex === 255) return false;
  const current = Number(record.LongSnapRating);
  return Number.isFinite(current) && current <= 15;
}

export function patchLongSnapRatings(records, { seed = 1, apply = false } = {}) {
  const random = mulberry32(seed);
  const changes = [];
  records.forEach((record, row) => {
    if (!isEligibleLongSnapPlayer(record)) return;
    const oldRating = Number(record.LongSnapRating);
    const newRating = rollLongSnapRating(random);
    if (apply) record.LongSnapRating = newRating;
    changes.push({ row, record, oldRating, newRating });
  });
  return changes;
}

export function summarizeDistribution(changes) {
  const values = changes.map(change => change.newRating).sort((a, b) => a - b);
  const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const median = values.length ? values.length % 2 ? values[Math.floor(values.length / 2)] : (values[values.length / 2 - 1] + values[values.length / 2]) / 2 : 0;
  const bins = [[25, 39], [40, 49], [50, 59], [60, 70], [71, 80], [81, 89], [90, 99]].map(([minimum, maximum]) => ({
    range: `${minimum}-${maximum}`,
    count: values.filter(value => value >= minimum && value <= maximum).length
  }));
  return { count: values.length, minimum: values[0] ?? null, maximum: values.at(-1) ?? null, mean, median, bins };
}
