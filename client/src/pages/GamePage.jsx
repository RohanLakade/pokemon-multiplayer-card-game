import { useSelector } from 'react-redux';
import { useParams } from 'react-router';
import PageMeta from '../components/PageMeta.jsx';
import { useRoomGuard } from '../hooks/useRoomGuard.js';

// Temporary placeholder: it only proves that the game started and that this player
// received their own private card. The real game board comes in Step 6B.
function GamePage() {
  const { code = '' } = useParams();
  const isInRoom = useRoomGuard(code);
  const { round, totalRounds, myCard } = useSelector((state) => state.game);

  if (!isInRoom) return null;

  return (
    <section className="mx-auto max-w-xl text-center">
      <PageMeta title="Game" noIndex />
      <h1 className="text-3xl font-extrabold">The game has started</h1>
      <p className="mt-3 text-slate-300">
        Round {round} of {totalRounds}
      </p>
      {myCard && (
        <p className="mt-6 text-lg">
          Your first card: <strong className="text-accent">{myCard.displayName}</strong>
        </p>
      )}
      <p className="mt-6 text-sm text-slate-400">The full game board arrives in the next part.</p>
    </section>
  );
}

export default GamePage;
