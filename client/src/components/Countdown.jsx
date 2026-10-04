import { useEffect, useState } from 'react';

// Shows the seconds left in this turn. The SERVER owns the real clock (and acts when it runs
// out); this only displays it, counting down from the value the server last reported.
// Give it a new "key" for each new turn so that it starts again.
function Countdown({ seconds }) {
  const [secondsLeft, setSecondsLeft] = useState(seconds ?? 0);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;

    const timeout = setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => clearTimeout(timeout);
  }, [secondsLeft]);

  if (seconds === null || seconds === undefined) return null;

  // role="timer" is not announced every second by screen readers
  return (
    <p role="timer" className={`text-sm ${secondsLeft <= 5 ? 'text-rose-300' : 'text-slate-300'}`}>
      Time left: <span className="font-bold tabular-nums">{secondsLeft}</span>s
    </p>
  );
}

export default Countdown;
