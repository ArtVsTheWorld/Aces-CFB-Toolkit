import RULES from './core/rules.js';

export const DEFAULT_PROMOTION_CHANCES = Object.freeze(Object.fromEntries(Object.entries(RULES).map(([position, rule]) => [position, Math.round((rule.promoteChance ?? 0) * 100)])));
const settings = new WeakMap();
export function normalizePromotionChances(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.entries(value).some(([position, chance]) => !Object.hasOwn(DEFAULT_PROMOTION_CHANCES, position) || !Number.isInteger(chance) || chance < 0 || chance > 100)) throw Error('Promotion chances must use supported positions and whole percentages from 0 to 100.');
  return { ...value };
}
export function applyPromotionSettings(players, value, random) {
  const chances = normalizePromotionChances(value);
  for (const player of players) {
    const configured = Object.hasOwn(chances, player.Position), chance = (configured ? chances[player.Position] : DEFAULT_PROMOTION_CHANCES[player.Position] ?? 0) / 100;
    settings.set(player, { chance, allowed: configured ? chance === 1 || chance > 0 && random() < chance : undefined });
  }
}
export const promotionChance = player => settings.get(player)?.chance ?? RULES[player.Position]?.promoteChance ?? 0;
export const promotionAllowed = player => settings.get(player)?.allowed !== false;
export const rollPromotion = (player, random = Math.random) => settings.get(player)?.allowed ?? random() < promotionChance(player);
