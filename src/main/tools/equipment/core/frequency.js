export const FREQUENCY_PASSES = ['visors', 'mouthpieces', 'tattoos', 'lowerJersey', 'cutoffPants'];
export function normalizeFillFrequencies(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !FREQUENCY_PASSES.includes(key))) throw Error('Invalid fill-to-frequency settings.');
  return Object.fromEntries(FREQUENCY_PASSES.map(key => {
    if (value[key] !== undefined && typeof value[key] !== 'boolean') throw Error('Fill to Frequency must be on or off.');
    return [key, value[key] === true];
  }));
}
export function shuffledFrequencyCandidates(values, rng) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function selectFrequencyCandidates(values, available, percentage, fill, rng) {
  const selected = [];
  for (const entry of shuffledFrequencyCandidates(values, rng)) {
    if (selected.length >= available) break;
    if (percentage > 0 && (fill || rng() < percentage / 100)) selected.push(entry);
  }
  return selected;
}
