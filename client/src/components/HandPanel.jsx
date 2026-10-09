import { useState } from 'react';
import { STATS } from '@pokemon-game/shared';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import { formatStatValue } from '../utils/statStyles.js';
import Button from './Button.jsx';
import CardArt from './CardArt.jsx';
import PokemonCard from './PokemonCard.jsx';

// The player's hand: a strip with all 5 cards, so they can be compared at a glance, and the
// selected card in full below. Once the stat is chosen, every card in the strip shows its value
// for that stat. The strip is a group of real radio buttons: tap, arrow keys and screen readers
// work, and the keys 1 to 5 select a card while P plays it (the key hint is hidden on phones).
function HandPanel({ hand, chosenStat, pickedCardId, canChooseCard, isSending = false, onPlay }) {
  const [selectedId, setSelectedId] = useState(pickedCardId ?? hand[0]?.id ?? null);
  const selected = hand.find((card) => card.id === selectedId) ?? hand[0];
  const stat = STATS.find((candidate) => candidate.key === chosenStat);
  const pickedCard = hand.find((card) => card.id === pickedCardId);
  const canPlay = canChooseCard && !isSending;

  const shortcuts = Object.fromEntries(
    hand.map((card, index) => [String(index + 1), () => setSelectedId(card.id)]),
  );
  shortcuts.p = () => {
    if (selected) onPlay(selected.id);
  };
  useKeyboardShortcuts(shortcuts, canPlay);

  if (!selected) return null;

  return (
    <div>
      <fieldset>
        <legend className="sr-only">Your hand: choose a card</legend>
        <ul className="grid grid-cols-5 gap-2">
          {hand.map((card) => {
            const id = `hand-card-${card.id}`;
            const statValue = stat ? formatStatValue(stat.key, card.stats[stat.key]) : null;

            return (
              <li key={card.id}>
                <input
                  id={id}
                  type="radio"
                  name="hand-card"
                  value={card.id}
                  checked={card.id === selected.id}
                  onChange={() => setSelectedId(card.id)}
                  aria-label={`${card.displayName}, tier ${card.tier}${
                    stat ? `, ${stat.label} ${statValue}` : ''
                  }`}
                  className="peer sr-only"
                />
                <label
                  htmlFor={id}
                  className="flex h-full cursor-pointer flex-col items-center gap-1 rounded-xl border border-white/10 bg-panel p-1.5 text-center peer-checked:border-accent peer-checked:ring-2 peer-checked:ring-accent peer-focus-visible:outline-2 peer-focus-visible:outline-white"
                >
                  <CardArt card={card} size={40} decorative />
                  <span className="w-full truncate text-[11px] font-medium">
                    {card.displayName}
                  </span>
                  <span className="text-[11px] text-slate-300">Tier {card.tier}</span>
                  {stat && (
                    <span className="text-sm font-extrabold text-accent tabular-nums">
                      {statValue}
                    </span>
                  )}
                  {card.id === pickedCardId && (
                    <span className="text-[11px] font-semibold text-emerald-300">Picked</span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="mt-4 flex flex-col items-center gap-4">
        {/* key={selected.id} makes React draw a new card, which replays the flip animation */}
        <PokemonCard key={selected.id} card={selected} highlightStat={chosenStat} />

        {canChooseCard && (
          <>
            <Button
              onClick={() => onPlay(selected.id)}
              disabled={isSending}
              className="w-full max-w-xs"
            >
              Play {selected.displayName}
            </Button>
            <p className="hidden text-center text-sm text-slate-400 sm:block">
              Keys: <kbd>1</kbd> to <kbd>{hand.length}</kbd> select a card, <kbd>P</kbd> plays it.
            </p>
          </>
        )}

        {pickedCard && !canChooseCard && (
          <p role="status" className="text-center text-slate-300">
            You picked {pickedCard.displayName}. Waiting for the other players…
          </p>
        )}
      </div>
    </div>
  );
}

export default HandPanel;
