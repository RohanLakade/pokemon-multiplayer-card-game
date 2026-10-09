import { TURN_SECONDS_OPTIONS } from '@pokemon-game/shared';
import OptionPicker from './OptionPicker.jsx';

const OPTIONS = TURN_SECONDS_OPTIONS.map((seconds) => ({
  value: seconds,
  label: `${seconds}s`,
  hint: 'per step',
}));

// The host chooses how long each step lasts once somebody starts the turn timer.
function TurnSecondsPicker({ value, onChange, disabled = false }) {
  return (
    <OptionPicker
      legend="Time per step, once the timer is on"
      name="turn-seconds"
      options={OPTIONS}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
}

export default TurnSecondsPicker;
