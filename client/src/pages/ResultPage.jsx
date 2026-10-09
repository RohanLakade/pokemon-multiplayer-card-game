import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import Button from '../components/Button.jsx';
import PageMeta from '../components/PageMeta.jsx';
import { useRoomGuard } from '../hooks/useRoomGuard.js';
import { noticeShown, selectIsHost } from '../store/roomSlice.js';
import { announceLeaving, leaveRoom } from '../utils/roomActions.js';
import { sendEvent } from '../utils/socket.js';

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
  const room = useSelector((state) => state.room);
  const isHost = useSelector(selectIsHost);

  // "Play again" sends everybody back to the lobby of this room (the room's status becomes
  // "lobby"). With no result to show, we go back to the game screen instead.
  useEffect(() => {
    if (!isInRoom) return;
    if (room.status === 'lobby') navigate(`/lobby/${code}`, { replace: true });
    else if (!finalResult) navigate(`/game/${code}`, { replace: true });
  }, [isInRoom, room.status, finalResult, code, navigate]);

  if (!isInRoom || !finalResult) return null;

  const youId = room.playerId;
  const { winnerIds, scores } = finalResult;
  const winners = scores.filter((score) => winnerIds.includes(score.playerId));
  const youWon = winnerIds.includes(youId);
  const standings = [...scores].sort((a, b) => b.roundWins - a.roundWins);

  // The host starts the next game. If the host is offline, any player may (the server allows it).
  const host = room.players.find((player) => player.id === room.hostId);
  const canPlayAgain = isHost || !host?.connected;

  const headline =
    winners.length === 1
      ? `${winners[0].name} wins the game!`
      : `It's a tie! ${joinNames(winners.map((winner) => winner.name))} share the win.`;

  async function handlePlayAgain() {
    try {
      await sendEvent('game:play-again');
    } catch (error) {
      dispatch(noticeShown(error.message));
    }
  }

  async function handleLeave() {
    await announceLeaving();
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

      <div className="mt-8 space-y-3">
        {canPlayAgain ? (
          <Button onClick={handlePlayAgain} className="w-full">
            Play again with the same players
          </Button>
        ) : (
          <p role="status" className="text-slate-300">
            Waiting for the host to start a new game…
          </p>
        )}
        <Button variant="secondary" onClick={handleLeave} className="w-full">
          Leave room
        </Button>
      </div>
    </section>
  );
}

export default ResultPage;
