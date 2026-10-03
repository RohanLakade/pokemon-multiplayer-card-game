import { STAT_STYLES, formatStatValue, getBarPercent } from '../utils/statStyles.js';

// One line of a card: label, colored bar and value.
// It becomes a real button when the player is allowed to pick this stat.
function StatRow({ stat, value, isChosen = false, shortcut, onSelect, compact = false }) {
  const rowClasses = `flex items-center gap-2 rounded-lg px-2 ${
    compact ? 'py-0.5 text-xs' : 'py-1.5 text-sm'
  } ${isChosen ? 'bg-accent/20 ring-2 ring-accent' : ''}`;

  const content = (
    <>
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
    </>
  );

  if (onSelect) {
    const description = stat.lowerWins ? `number ${value}, lower wins` : `value ${value}`;

    return (
      <li>
        <button
          type="button"
          onClick={() => onSelect(stat.key)}
          aria-label={`Choose ${stat.label}, ${description}`}
          aria-keyshortcuts={String(shortcut)}
          className={`${rowClasses} w-full hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-accent`}
        >
          <kbd className="rounded bg-white/10 px-1.5 text-xs text-slate-300">{shortcut}</kbd>
          {content}
        </button>
      </li>
    );
  }

  return (
    <li className={rowClasses} aria-current={isChosen ? 'true' : undefined}>
      {content}
    </li>
  );
}

export default StatRow;
