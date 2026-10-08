import { STAT_STYLES, formatStatValue, getBarPercent } from '../utils/statStyles.js';

// One line of a card: label, colored bar and value. The chosen stat is shown with a ring.
function StatRow({ stat, value, isChosen = false }) {
  return (
    <li
      aria-current={isChosen ? 'true' : undefined}
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
        isChosen ? 'bg-accent/20 ring-2 ring-accent' : ''
      }`}
    >
      <span className="w-24 shrink-0 text-left">{stat.label}</span>
      {/* The bar is decoration: the number next to it carries the meaning */}
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <span
          className={`block h-full rounded-full ${STAT_STYLES[stat.key].bar}`}
          style={{ width: `${getBarPercent(stat.key, value)}%` }}
        />
      </span>
      <span className="w-12 shrink-0 text-right font-semibold tabular-nums">
        {formatStatValue(stat.key, value)}
      </span>
    </li>
  );
}

export default StatRow;
