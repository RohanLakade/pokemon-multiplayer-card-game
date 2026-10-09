import Button from './Button.jsx';

// The optional turn timer. Any player may start it. Only the player who started it may stop it,
// unless that player is offline: then everybody sees the Stop button, so it can never get stuck.
// (The server makes the same decision, so this only decides what to show.)
function TimerPanel({ timer, turnSeconds, youId, players, disabled = false, onToggle }) {
  const starter = players.find((player) => player.id === timer.startedBy);
  const starterIsHere = starter?.connected === true;
  const canStop = timer.on && (timer.startedBy === youId || !starterIsHere);

  return (
    <section aria-label="Turn timer" className="rounded-xl border border-white/10 bg-panel p-4">
      {timer.on ? (
        <>
          {/* role="status" makes screen readers announce who started the timer */}
          <p role="status" className="font-semibold text-amber-200">
            Timer started by {timer.startedByName}
            {timer.startedBy === youId && ' (you)'}
          </p>
          <p className="mt-1 text-sm text-slate-300">Each step lasts {turnSeconds} seconds.</p>

          {canStop ? (
            <Button
              variant="secondary"
              className="mt-3"
              disabled={disabled}
              onClick={() => onToggle(false)}
            >
              Stop the timer
            </Button>
          ) : (
            <p className="mt-3 text-sm text-slate-400">Only {timer.startedByName} can stop it.</p>
          )}
        </>
      ) : (
        <>
          <p role="status" className="font-semibold">
            The timer is off
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Nobody is skipped, so the game waits for everyone. Any player can start the timer.
          </p>
          <Button
            variant="secondary"
            className="mt-3"
            disabled={disabled}
            onClick={() => onToggle(true)}
          >
            Start the timer ({turnSeconds}s per step)
          </Button>
        </>
      )}
    </section>
  );
}

export default TimerPanel;
