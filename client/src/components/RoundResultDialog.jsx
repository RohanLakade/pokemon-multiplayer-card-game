import { useEffect, useRef } from 'react';
import { STATS } from '@pokemon-game/shared';
import { formatStatValue } from '../utils/statStyles.js';
import Button from './Button.jsx';

// Shows who won the round, using the browser's built-in modal <dialog>.
// The browser dims the page, keeps keyboard focus inside the dialog and closes it on Escape.
function RoundResultDialog({ result, players, youId, isGameOver, onContinue }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (result && !dialog.open) dialog.showModal();
    if (!result && dialog.open) dialog.close();
  }, [result]);

  const nameOf = (playerId) => players.find((player) => player.id === playerId)?.name ?? 'Someone';
  const stat = result ? STATS.find((candidate) => candidate.key === result.stat) : null;

  function getHeadline() {
    if (result.winnerId === null) return 'A tie: nobody scores';
    if (result.winnerId === youId) return 'You win this round!';
    return `${nameOf(result.winnerId)} wins this round`;
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="round-result-title"
      onClose={onContinue}
      className="m-auto w-[calc(100%_-_2rem)] max-w-lg animate-pop-in rounded-2xl border border-white/10 bg-panel p-6 text-slate-100 backdrop:bg-black/70"
    >
      {result && (
        <>
          <h2 id="round-result-title" className="text-2xl font-bold">
            {getHeadline()}
          </h2>
          <p className="mt-1 text-slate-300">
            Round {result.round}, stat: {stat.label}
            {stat.lowerWins && ' (the lowest number wins)'}
          </p>

          <ul className="mt-4 space-y-2">
            {result.plays.map((play) => {
              const isWinner = play.playerId === result.winnerId;
              return (
                <li
                  key={play.playerId}
                  className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${
                    isWinner ? 'bg-accent/20 ring-1 ring-accent' : 'bg-panel-light'
                  }`}
                >
                  <span>
                    {nameOf(play.playerId)}
                    {play.playerId === youId && ' (you)'} played{' '}
                    <strong>{play.card.displayName}</strong>
                  </span>
                  <span className="font-bold tabular-nums">
                    {formatStatValue(result.stat, play.value)}
                    {isWinner && <span className="ml-2 text-xs text-accent uppercase">Winner</span>}
                  </span>
                </li>
              );
            })}
          </ul>

          <Button onClick={onContinue} className="mt-6 w-full">
            {isGameOver ? 'See the final result' : 'Next round'}
          </Button>
        </>
      )}
    </dialog>
  );
}

export default RoundResultDialog;
