(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ToolkitRatingsDisplay = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  // Matches BeyondTheField/Source/EnhancementOptions.h gradeLabel. This is
  // presentation only: never feed these strings into editing or sorting logic.
  const modes = Object.freeze(['numeric', 'letters', 'plus-minus', 's-tier', 'descriptive', 'hidden']);
  const choices = Object.freeze([
    ['numeric', 'Numbers (Default)'], ['letters', 'Letters — A, B, C, D, F'],
    ['plus-minus', 'Letters with +/− — A+, A, A−…'], ['s-tier', 'S Tier — S, A, B, C, D, F'],
    ['descriptive', 'Words — Elite, Great, Good, Fair, Poor'], ['hidden', 'Hidden — No Ratings'],
  ].map(([value, label]) => Object.freeze({value, label})));
  const normalize = mode => modes.includes(mode) ? mode : 'numeric';
  function number(value) {
    if (!['number', 'string'].includes(typeof value) ||
        typeof value === 'string' && !/^\s*\d+(?:\.\d+)?\s*$/.test(value)) return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
  }
  function format(value, mode = 'numeric', {digits, missing = '—'} = {}) {
    mode = normalize(mode);
    if (mode === 'hidden') return '–';
    const n = number(value);
    if (n === null) return mode === 'numeric' ? missing : '?';
    if (mode === 'numeric') return digits === undefined ? String(value) : n.toFixed(digits);
    // BTF operates on integer game ratings. Fractional toolkit averages stay in
    // their existing band instead of rounding up into a stronger band.
    const rating = Math.floor(n);
    if (mode === 'plus-minus') {
      if (rating < 60) return 'F';
      if (rating >= 97) return 'A+';
      const labels = ['D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
      return labels[Math.min(3, Math.floor((rating - 60) / 10)) * 3 + (rating % 10 < 3 ? 0 : rating % 10 < 7 ? 1 : 2)];
    }
    const band = rating >= 90 ? 0 : rating >= 80 ? 1 : rating >= 70 ? 2 : rating >= 60 ? 3 : 4;
    if (mode === 'descriptive') return ['Elite', 'Great', 'Good', 'Fair', 'Poor'][band];
    return mode === 's-tier' && rating >= 95 ? 'S' : ['A', 'B', 'C', 'D', 'F'][band];
  }
  function range(low, high, mode = 'numeric') {
    if (normalize(mode) === 'hidden') return '–';
    const a = number(low), b = number(high);
    if (a === null || b === null || a > b) return '?';
    const first = format(Math.floor(a), mode), last = format(Math.ceil(b), mode);
    return first === last ? first : `${first}–${last}`;
  }
  // Only explicitly rating-labelled prose/selector labels. Never blanket-replace
  // numbers: jersey numbers, money, years, stats, IDs and equipment names matter.
  function text(value, mode = 'numeric') {
    const input = String(value ?? '');
    if (normalize(mode) === 'numeric') return input;
    const token = '(?:100|[1-9]?\\d)(?:\\.\\d+)?';
    let result = input.replace(/(\bOVR\s*)\((\d{1,3})(?:[–-](\d{1,3})|(\+))\)/gi,
      (_match, label, low, high, plus) => `${label}(${range(Number(low), plus ? 100 : Number(high), mode)})`);
    result = result.replace(new RegExp(`(^|[^\\w.])(${token})(\\s+(?:average\\s+(?:player\\s+)?OVR|avg\\.?\\s+OVR|OVR|OFF|DEF|overall(?:\\s+rating)?)\\b)`, 'gi'),
      (_match, prefix, rating, label) => prefix + format(rating, mode) + label);
    result = result.replace(new RegExp(`(\\b(?:current\\s+)?(?:average\\s+(?:player\\s+)?OVR|avg\\.?\\s+OVR|OVR|overall(?:\\s+rating)?)[ :]+)(${token})(?![\\d.])`, 'gi'),
      (_match, label, rating) => label + format(rating, mode));
    return result;
  }
  const isRatingField = field => /Rating$/.test(String(field)) || ['Overall', 'OVR'].includes(field);
  return Object.freeze({modes, choices, normalize, format, range, text, isRatingField});
});
