import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import { noticeShown } from '../store/roomSlice.js';
import { rejoinRoom } from '../utils/roomActions.js';
import Button from './Button.jsx';

// If the server says one of these, the seat can never be used again
const SEAT_GONE_CODES = new Set(['ROOM_NOT_FOUND', 'INVALID_SESSION']);

// Shown on the home page when this browser has a seat in a game that is still running.
function SavedGameBanner({ seat, onForget }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleRejoin() {
    setIsBusy(true);
    setError(null);
    try {
      await rejoinRoom(dispatch, seat);
      navigate(`/game/${seat.code}`);
    } catch (rejoinError) {
      if (SEAT_GONE_CODES.has(rejoinError.code)) {
        dispatch(noticeShown('That game is no longer available.'));
        onForget();
      } else {
        setError(rejoinError.message);
      }
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="saved-game-heading"
      className="mx-auto mt-10 max-w-xl rounded-2xl border border-accent/50 bg-panel p-5"
    >
      <h2 id="saved-game-heading" className="text-xl font-bold">
        You have a game in progress
      </h2>
      <p className="mt-1 text-slate-300">
        Room <span className="font-mono font-bold text-accent">{seat.code}</span> is still being
        played.
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-rose-950 px-3 py-2 text-rose-200">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button onClick={handleRejoin} disabled={isBusy} className="flex-1">
          {isBusy ? 'Rejoining…' : 'Rejoin the game'}
        </Button>
        <Button variant="secondary" onClick={onForget} disabled={isBusy} className="flex-1">
          Leave that game
        </Button>
      </div>
    </section>
  );
}

export default SavedGameBanner;
