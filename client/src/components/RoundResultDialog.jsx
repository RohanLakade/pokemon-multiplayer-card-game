import { useEffect, useRef } from 'react';
import { STATS } from '@pokemon-game/shared';
import Button from './Button.jsx';
import Countdown from './Countdown.jsx';
import RevealedCard from './RevealedCard.jsx';

// The result closes by itself after this many seconds, so the game keeps moving
const AUTO_CLOSE_SECONDS = 5;

// The moment all cards are revealed together. It uses the browser's built-in modal <dialog>:
// the browser dims the page, keeps keyboard focus inside and closes it on Escape for us.
// "onContinue" should be a stable function (useCallback), otherwise the 5 second timer restarts
// every time the page re-renders.
function RoundResultDialog({ result, players, youId, isGameOver, onContinue }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (result && !dialog.open) dialog.showModal();
    if (!result && dialog.open) dialog.close();
  }, [result]);

  useEffect(() => {
    if (!result) return undefined;

    const timeout = setTimeout(onContinue, AUTO_CLOSE_SECONDS * 1000);
    return () => clearTimeout(timeout);
  }, [result, onContinue]);

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
      className="m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-xl animate-pop-in overflow-y-auto rounded-2xl border border-white/10 bg-panel p-5 text-slate-100 backdrop:bg-black/70"
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

          <ul aria-label="Revealed cards" className="mt-4 grid gap-2 sm:grid-cols-2">
            {result.plays.map((play) => (
              <RevealedCard
                key={play.playerId}
                card={play.card}
                value={play.value}
                stat={result.stat}
                playerName={nameOf(play.playerId)}
                isYou={play.playerId === youId}
                isWinner={play.playerId === result.winnerId}
              />
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Countdown
              key={result.round}
              seconds={AUTO_CLOSE_SECONDS}
              label={isGameOver ? 'Final result in' : 'Next round in'}
            />
            <Button onClick={onContinue}>
              {isGameOver ? 'See the final result' : 'Continue now'}
            </Button>
          </div>
        </>
      )}
    </dialog>
  );
}

export default RoundResultDialog;
