import { useId } from 'react';

// A labelled input. The label is linked to the input, and an error is linked too,
// so screen readers announce "invalid" and the message when the field is focused.
function TextField({ label, error, hint, className = '', ...inputProps }) {
  const id = useId();
  const messageId = `${id}-message`;
  const hasMessage = Boolean(error || hint);

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-200">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={hasMessage ? messageId : undefined}
        className="w-full rounded-lg border border-white/15 bg-panel-light px-3 py-2.5 text-slate-100 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-accent aria-invalid:border-rose-400"
        {...inputProps}
      />
      {hasMessage && (
        <p id={messageId} className={`mt-1 text-sm ${error ? 'text-rose-300' : 'text-slate-400'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export default TextField;
