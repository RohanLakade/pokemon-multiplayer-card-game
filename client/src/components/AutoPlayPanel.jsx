import Button from './Button.jsx';

// For a player who has to step away: while auto-play is on, the server chooses their stat and
// cards straight away, so nobody waits for them.
function AutoPlayPanel({ isOn, disabled = false, onToggle }) {
  return (
    <section aria-label="Auto-play" className="rounded-xl border border-white/10 bg-panel p-4">
      {isOn ? (
        <>
          <p role="status" className="font-semibold text-amber-200">
            Auto-play is on. Your moves are made for you.
          </p>
          <Button className="mt-3" disabled={disabled} onClick={() => onToggle(false)}>
            Take control back
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-300">
            Need to step away? Auto-play chooses your stat and cards straight away, so nobody has to
            wait for you.
          </p>
          <Button
            variant="secondary"
            className="mt-3"
            disabled={disabled}
            onClick={() => onToggle(true)}
          >
            I need to step away
          </Button>
        </>
      )}
    </section>
  );
}

export default AutoPlayPanel;
