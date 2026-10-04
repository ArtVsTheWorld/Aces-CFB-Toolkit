const SUFFIX = /(?:[\s,]+)(?:jr\.?|sr\.?|ii|iii|iv|v)$/i;

export function normalizeName(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
}

export function stripSuffix(value) {
  let result = String(value ?? "").trim();
  while (SUFFIX.test(result)) result = result.replace(SUFFIX, "").trim();
  return result;
}

// A conservative phonetic fingerprint. Vowel groups collapse and common English
// spellings normalize, allowing homophones such as Ware/Wear without fuzzy guessing.
export function phoneticKey(value) {
  let word = normalizeName(stripSuffix(value));
  if (!word) return "";
  word = word
    .replace(/^kn/, "n").replace(/^wr/, "r").replace(/^wh/, "w")
    .replace(/ph/g, "f").replace(/ght/g, "t").replace(/gh/g, "")
    .replace(/qu/g, "k").replace(/ck/g, "k").replace(/dg(?=[eiy])/g, "j")
    .replace(/tch/g, "ch").replace(/sch/g, "sk").replace(/sh/g, "x")
    .replace(/ch/g, "x").replace(/[cq]/g, "k").replace(/x/g, "ks")
    .replace(/c(?=[eiy])/g, "s").replace(/g(?=[eiy])/g, "j")
    .replace(/([a-z])\1+/g, "$1");
  const first = word[0];
  const tail = word.slice(1).replace(/[aeiouy]/g, "");
  return (first + tail).replace(/([a-z])\1+/g, "$1");
}

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const old = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = old;
    }
  }
  return row[b.length];
}

function homophoneSpellingKey(value) {
  return normalizeName(stripSuffix(value))
    .replace(/^kn/, "n").replace(/^wr/, "r")
    .replace(/ph/g, "f").replace(/ck/g, "k")
    .replace(/ear$/, "are").replace(/ey$/, "y");
}

export function createCommentaryMatcher(commentaryMap, { allowPhonetic = false, allowFirstName = true } = {}) {
  const entries = [...commentaryMap].map(([name, id], order) => ({ name, id, order, normalized: normalizeName(name), phonetic: phoneticKey(name) }));
  const exact = new Map();
  const phonetic = new Map();
  for (const entry of entries) {
    if (!exact.has(entry.normalized)) exact.set(entry.normalized, entry);
    if (entry.phonetic) {
      if (!phonetic.has(entry.phonetic)) phonetic.set(entry.phonetic, []);
      phonetic.get(entry.phonetic).push(entry);
    }
  }

  function matchOne(rawName, { phoneticAllowed = allowPhonetic } = {}) {
    const original = String(rawName ?? "").trim();
    const stripped = stripSuffix(original);
    for (const candidate of [original, stripped]) {
      const hit = exact.get(normalizeName(candidate));
      if (hit) return { ...hit, method: candidate === original ? "exact" : "suffix" };
    }
    if (!phoneticAllowed) return null;
    const normalized = normalizeName(stripped);
    const candidates = phonetic.get(phoneticKey(stripped)) || [];
    if (!normalized || !candidates.length) return null;
    const ranked = candidates.map(entry => ({ entry, distance: distance(normalized, entry.normalized) }))
      .sort((a, b) => a.distance - b.distance || a.entry.order - b.entry.order);
    const best = ranked[0];
    // Accept only explicit conservative spelling equivalences. Generic edits
    // and transpositions cause false matches such as March/Marsh, Bain/Babin,
    // Castor/Castro, Crater/Carter, Palu/Paul, and Marino/Marion.
    return homophoneSpellingKey(normalized) === homophoneSpellingKey(best.entry.normalized)
      ? { ...best.entry, method: "phonetic" }
      : null;
  }

  return function matchPlayer(firstName, lastName) {
    const last = matchOne(lastName);
    if (last) return { ...last, source: "last" };
    if (!allowFirstName) return { name: null, id: 0, method: "none", source: "none" };
    const first = matchOne(firstName, { phoneticAllowed: false });
    if (first) return { ...first, source: "first" };
    return { name: null, id: 0, method: "none", source: "none" };
  };
}


