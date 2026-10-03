// Tailwind only generates classes it can find written out in full in the source code,
// so every class name here is complete (no "bg-stat-" + name tricks).
export const STAT_STYLES = {
  hp: { bar: 'bg-stat-hp' },
  attack: { bar: 'bg-stat-attack' },
  defense: { bar: 'bg-stat-defense' },
  specialAttack: { bar: 'bg-stat-special-attack' },
  specialDefense: { bar: 'bg-stat-special-defense' },
  speed: { bar: 'bg-stat-speed' },
  rank: { bar: 'bg-stat-rank' },
};

// The badge uses a darker shade so its white text stays easy to read
export const CATEGORY_STYLES = {
  base: { label: 'Base', border: 'border-category-base', badge: 'bg-slate-600' },
  mega: { label: 'Mega', border: 'border-category-mega', badge: 'bg-purple-700' },
  regional: { label: 'Regional', border: 'border-category-regional', badge: 'bg-emerald-700' },
  gigantamax: { label: 'Gigantamax', border: 'border-category-gigantamax', badge: 'bg-rose-700' },
};

const MAX_BASE_STAT = 255;
const HIGHEST_RANK = 1025;

// How full a stat bar is, from 4 to 100 percent.
// For rank a LOWER number wins, so its bar is flipped: rank 1 is almost full.
export function getBarPercent(statKey, value) {
  const percent =
    statKey === 'rank' ? 100 - (value / HIGHEST_RANK) * 100 : (value / MAX_BASE_STAT) * 100;
  return Math.min(100, Math.max(4, Math.round(percent)));
}

export function formatStatValue(statKey, value) {
  return statKey === 'rank' ? `#${value}` : String(value);
}
