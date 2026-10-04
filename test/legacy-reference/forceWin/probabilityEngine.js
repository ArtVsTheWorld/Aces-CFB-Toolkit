import FORCE_WIN_CONFIG from "./config.js";

export function probabilityForDisparity(disparity, config = FORCE_WIN_CONFIG) {
  if (!Number.isFinite(disparity)) throw new Error("Disparity must be a finite number.");
  const curve = config.probabilityCurve;
  const clampProbability = probability => Math.min(
    config.involvement.probabilityCap,
    Math.max(config.involvement.probabilityFloor, probability)
  );
  if (disparity <= curve[0].score) return clampProbability(curve[0].probability);
  if (disparity >= curve.at(-1).score) return clampProbability(curve.at(-1).probability);
  const upperIndex = curve.findIndex(point => disparity <= point.score);
  const upper = curve[upperIndex];
  if (disparity === upper.score || upperIndex === 0) return upper.probability;
  const lower = curve[upperIndex - 1];
  const progress = (disparity - lower.score) / (upper.score - lower.score);
  const interpolated = lower.probability + progress * (upper.probability - lower.probability);
  return clampProbability(interpolated);
}

export function involvementRule(involvement = FORCE_WIN_CONFIG.involvement.default, config = FORCE_WIN_CONFIG) {
  const key = String(involvement).toLowerCase();
  const rule = config.involvement.levels[key];
  if (!rule) {
    throw new Error(`Tool involvement must be one of: ${Object.keys(config.involvement.levels).join(", ")}.`);
  }
  return { key, ...rule };
}

function hashSeed(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) return seed >>> 0;
  const text = String(seed);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRandom(seed) {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRandom(seed) {
  return seed === undefined || seed === null || seed === "" ? Math.random : createSeededRandom(seed);
}

// Involvement selects categories. It never inflates the model's probability.
export function decideForceWin(
  disparity,
  random,
  config = FORCE_WIN_CONFIG,
  involvement = config.involvement.default
) {
  const probability = probabilityForDisparity(disparity, config);
  const category = disparityCategory(disparity, config);
  const rule = involvementRule(involvement, config);
  const selected = rule.categories.includes(category.label);
  if (!selected) {
    return { baseProbability: probability, probability, roll: null, forced: false, selected, automatic: false };
  }
  if (rule.automatic) {
    return { baseProbability: probability, probability, roll: null, forced: true, selected, automatic: true };
  }
  const roll = random();
  return {
    baseProbability: probability,
    probability,
    roll,
    forced: roll < probability,
    selected,
    automatic: false
  };
}

export function disparityCategory(disparity, config = FORCE_WIN_CONFIG) {
  return config.disparityLevels.find(level => disparity >= level.min) ??
    config.disparityLevels.at(-1);
}
