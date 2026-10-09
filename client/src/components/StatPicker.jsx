import { STATS } from '@pokemon-game/shared';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import { STAT_STYLES } from '../utils/statStyles.js';

// The leader chooses the stat for the round. Big buttons are easy to hit on a phone.
// The keys 1 to 7 do the same on a keyboard, and their hints are hidden on small screens.
function StatPicker({ onChoose, disabled = false }) {
  const shortcuts = Object.fromEntries(
    STATS.map((stat, index) => [String(index + 1), () => onChoose(stat.key)]),
  );
  useKeyboardShortcuts(shortcuts, !disabled);

  return (
    <div>
      <div
        role="group"
        aria-label="Choose a stat"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {STATS.map((stat, index) => (
          <button
            key={stat.key}
            type="button"
            disabled={disabled}
            onClick={() => onChoose(stat.key)}
            aria-label={`Choose ${stat.label}${stat.lowerWins ? ', lowest number wins' : ''}`}
            aria-keyshortcuts={String(index + 1)}
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-panel-light px-3 py-3 text-left font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span
              aria-hidden="true"
              className={`h-3 w-3 shrink-0 rounded-full ${STAT_STYLES[stat.key].bar}`}
            />
            <span className="flex-1">
              {stat.label}
              {stat.lowerWins && (
                <span className="block text-xs font-normal text-slate-300">lowest wins</span>
              )}
            </span>
            <kbd className="hidden rounded bg-white/10 px-1.5 text-xs text-slate-300 sm:inline">
              {index + 1}
            </kbd>
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm text-slate-400">
        Rank is the number of the card, and the lowest number wins. Mega, regional and Gigantamax
        forms have numbers above 10000, so plain Pokémon always beat them in a Rank round.
      </p>
    </div>
  );
}

export default StatPicker;
