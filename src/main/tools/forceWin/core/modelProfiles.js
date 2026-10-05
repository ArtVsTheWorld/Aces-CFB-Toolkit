import { applyCustomModel, customModelFromConfig } from "./customModel.js";
import FORCE_WIN_CONFIG from "./config.js";

export function modelProfileRule(profile = FORCE_WIN_CONFIG.modelProfiles.default, config = FORCE_WIN_CONFIG) {
  const key = String(profile).toLowerCase();
  const rule = config.modelProfiles.profiles[key];
  if (!rule) {
    throw new Error(`Model profile must be one of: ${Object.keys(config.modelProfiles.profiles).join(", ")}.`);
  }
  return { key, ...rule };
}

// Return an isolated configuration view so selecting a profile never mutates global defaults.
export function createModelConfig(profile = FORCE_WIN_CONFIG.modelProfiles.default, config = FORCE_WIN_CONFIG, customModel = null) {
  if (profile === "custom") return applyCustomModel(createModelConfig(customModel?.basePreset ?? "balanced", config), customModel);
  const rule = modelProfileRule(profile, config);
  const probabilityCurve = config.probabilityCurve.map(point => ({
    ...point,
    probability: 0.5 + (point.probability - 0.5) * rule.probabilityCompression
  }));
  return {
    ...config,
    activeModelProfile: rule,
    finalWeights: {
      baseStrengthDifference: rule.baseWeight,
      matchupAdvantage: rule.matchupWeight
    },
    coaching: {
      ...config.coaching,
      disparityMultiplier: config.coaching.disparityMultiplier * rule.coachingScale
    },
    probabilityCurve
  };
}
export function customModelPresets() { return Object.fromEntries(Object.keys(FORCE_WIN_CONFIG.modelProfiles.profiles).map(key => [key, customModelFromConfig(createModelConfig(key), key)])); }

