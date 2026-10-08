import { DECK_SIZES } from '@pokemon-game/shared';

// The host chooses how many cards each player gets, which is also how many rounds are played.
function DeckSizePicker({ value, onChange, disabled = false }) {
  return (
    <fieldset className="rounded-2xl border border-white/10 bg-panel p-4">
      <legend className="px-2 text-sm font-medium text-slate-200">Cards per player</legend>

      <div className="grid grid-cols-3 gap-2">
        {DECK_SIZES.map((size) => {
          const id = `deck-size-${size}`;

          return (
            <div key={size}>
              <input
                id={id}
                type="radio"
                name="deck-size"
                value={size}
                checked={value === size}
                disabled={disabled}
                onChange={() => onChange(size)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className="block cursor-pointer rounded-xl border border-white/15 bg-panel-light px-2 py-3 text-center peer-checked:border-accent peer-checked:ring-2 peer-checked:ring-accent peer-focus-visible:outline-2 peer-focus-visible:outline-white peer-disabled:cursor-not-allowed peer-disabled:opacity-60"
              >
                <span className="block text-lg font-bold">{size}</span>
                <span className="block text-xs text-slate-300">{size} rounds</span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

export default DeckSizePicker;
