import { DECK_SIZES } from '@pokemon-game/shared';
import OptionPicker from './OptionPicker.jsx';

const OPTIONS = DECK_SIZES.map((size) => ({
  value: size,
  label: String(size),
  hint: `${size} rounds`,
}));

// The host chooses how many cards each player gets, which is also how many rounds are played.
function DeckSizePicker({ value, onChange, disabled = false }) {
  return (
    <OptionPicker
      legend="Cards per player"
      name="deck-size"
      options={OPTIONS}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
}

export default DeckSizePicker;
