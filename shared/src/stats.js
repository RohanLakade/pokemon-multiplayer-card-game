// The 7 stats a card can be played on.
// "lowerWins" is true only for rank: rank is the Pokédex number, so lower beats higher.
export const STATS = [
  { key: 'hp', label: 'HP', lowerWins: false },
  { key: 'attack', label: 'Attack', lowerWins: false },
  { key: 'defense', label: 'Defense', lowerWins: false },
  { key: 'specialAttack', label: 'Sp. Attack', lowerWins: false },
  { key: 'specialDefense', label: 'Sp. Defense', lowerWins: false },
  { key: 'speed', label: 'Speed', lowerWins: false },
  { key: 'rank', label: 'Rank', lowerWins: true },
];

export const STAT_KEYS = STATS.map((stat) => stat.key);

export function isStatKey(value) {
  return STAT_KEYS.includes(value);
}

export function lowerWins(statKey) {
  return STATS.find((stat) => stat.key === statKey)?.lowerWins === true;
}
