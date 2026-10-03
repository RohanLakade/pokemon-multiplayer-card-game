import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import Button from '../components/Button.jsx';
import PageMeta from '../components/PageMeta.jsx';
import { useRoomGuard } from '../hooks/useRoomGuard.js';
import { leaveRoom } from '../utils/roomActions.js';

// ['Ash'] -> "Ash", ['Ash', 'Misty'] -> "Ash and Misty", three names -> "Ash, Misty and Brock"
function joinNames(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

function ResultPage() {
  const { code = '' } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isInRoom = useRoomGuard(code);
  const finalResult = useSelector((state) => state.game.finalResult);
  const youId = useSelector((state) => state.room.playerId);

  // Nothing to show yet: go back to the game
  useEffect(() => {
    if (isInRoom && !finalResult) navigate(`/game/${code}`, { replace: true });
  }, [isInRoom, finalResult, code, navigate]);

  if (!isInRoom || !finalResult) return null;

  const { winnerIds, scores } = finalResult;
  const winners = scores.filter((score) => winnerIds.includes(score.playerId));
  const youWon = winnerIds.includes(youId);
  const standings = [...scores].sort((a, b) => b.roundWins - a.roundWins);

  const headline =
    winners.length === 1
      ? `${winners[0].name} wins the game!`
      : `It's a tie! ${joinNames(winners.map((winner) => winner.name))} share the win.`;

  function handlePlayAgain() {
    leaveRoom(dispatch);
    navigate('/');
  }

  return (
    <section className="mx-auto max-w-xl text-center">
      <PageMeta title="Final result" noIndex />

      <h1 className="text-4xl font-extrabold">{headline}</h1>
      <p className="mt-3 text-lg text-slate-300">
        {youWon ? 'Congratulations, you are a winner!' : 'Better luck next time.'}
      </p>

      <h2 className="mt-8 mb-3 text-left text-xl font-bold">Final standings</h2>
      <ol className="divide-y divide-white/10 rounded-xl border border-white/10 bg-panel text-left">
        {standings.map((score) => (
          <li key={score.playerId} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="font-medium">
              {score.name}
              {score.playerId === youId && (
                <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">You</span>
              )}
            </span>
            <span className="flex items-center gap-3">
              {winnerIds.includes(score.playerId) && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-ink">
                  Winner
                </span>
              )}
              <span className="font-bold text-accent tabular-nums">{score.roundWins}</span>
              <span className="text-sm text-slate-400">
                {score.roundWins === 1 ? 'round won' : 'rounds won'}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <Button onClick={handlePlayAgain} className="mt-8 w-full sm:w-auto">
        Play again
      </Button>
    </section>
  );
}

export default ResultPage;
