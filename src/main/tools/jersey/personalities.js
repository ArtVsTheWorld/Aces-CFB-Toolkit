// Player.Personality values verified in both bundled CFB 27 schemas. Enum
// boundary/sentinel names and CityPersonality values are not player choices.
export const JERSEY_PERSONALITIES = Object.freeze([
  { value: 'Leader', label: 'Leader' },
  { value: 'Intense', label: 'Intense' },
  { value: 'Entertainer', label: 'Entertainer' },
  { value: 'TeamPlayer', label: 'Team Player' },
  { value: 'Unpredictable', label: 'Unpredictable' }
].map(Object.freeze));

export function matchesTraditionPersonality(player, rule) {
  return !rule.eligiblePersonalities?.length || rule.eligiblePersonalities.includes(player.Personality);
}
