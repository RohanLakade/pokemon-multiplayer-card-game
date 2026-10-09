// A group of big radio buttons for choosing one value, such as the number of cards.
// Native radio inputs give keyboard (arrow keys) and screen reader support for free.
// options looks like [{ value, label, hint }].
function OptionPicker({ legend, name, options, value, onChange, disabled = false }) {
  return (
    <fieldset className="rounded-2xl border border-white/10 bg-panel p-4">
      <legend className="px-2 text-sm font-medium text-slate-200">{legend}</legend>

      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const id = `${name}-${option.value}`;

          return (
            <div key={option.value}>
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className="block cursor-pointer rounded-xl border border-white/15 bg-panel-light px-2 py-3 text-center peer-checked:border-accent peer-checked:ring-2 peer-checked:ring-accent peer-focus-visible:outline-2 peer-focus-visible:outline-white peer-disabled:cursor-not-allowed peer-disabled:opacity-60"
              >
                <span className="block text-lg font-bold">{option.label}</span>
                <span className="block text-xs text-slate-300">{option.hint}</span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

export default OptionPicker;
