import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import { HAND_SIZE, MAX_PLAYERS, MIN_PLAYERS } from '@pokemon-game/shared';
import Button from '../components/Button.jsx';
import DeckSizePicker from '../components/DeckSizePicker.jsx';
import PageMeta from '../components/PageMeta.jsx';
import PlayerList from '../components/PlayerList.jsx';
import { useRoomGuard } from '../hooks/useRoomGuard.js';
import { noticeShown, selectIsHost } from '../store/roomSlice.js';
import { leaveRoom } from '../utils/roomActions.js';
import { sendEvent } from '../utils/socket.js';

const COPIED_MESSAGES = {
  code: 'Room code copied',
  link: 'Invite link copied',
};

function LobbyPage() {
  const { code = '' } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isInRoom = useRoomGuard(code);
  const { players, hostId, playerId, status, deckSize } = useSelector((state) => state.room);
  const isHost = useSelector(selectIsHost);
  const [copied, setCopied] = useState(null); // 'code', 'link' or null

  // When the host starts the game, everybody moves to the game screen
  useEffect(() => {
    if (isInRoom && status === 'playing') navigate(`/game/${code}`, { replace: true });
  }, [isInRoom, status, code, navigate]);

  if (!isInRoom) return null; // useRoomGuard is already sending this visitor to the home page

  // Copies the room code alone, or the full invite link, depending on the button
  async function copyText(text, kind) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied((current) => (current === kind ? null : current)), 2000);
    } catch {
      dispatch(noticeShown(`Could not copy. Share the room code instead: ${code}`));
    }
  }

  async function handleDeckSize(size) {
    try {
      await sendEvent('room:set-deck-size', { deckSize: size });
    } catch (error) {
      dispatch(noticeShown(error.message));
    }
  }

  async function handleStart() {
    try {
      await sendEvent('game:start');
    } catch (error) {
      dispatch(noticeShown(error.message));
    }
  }

  function handleLeave() {
    leaveRoom(dispatch);
    navigate('/');
  }

  const enoughPlayers = players.length >= MIN_PLAYERS;

  return (
    <>
      <PageMeta title={`Lobby ${code}`} noIndex />

      <section className="mx-auto max-w-xl">
        <h1 className="text-3xl font-extrabold">Lobby</h1>
        <p className="mt-2 text-slate-300">Share this code with your friends so they can join.</p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-panel p-6 text-center">
          <p className="text-sm text-slate-400">Room code</p>
          <p className="mt-1 font-mono text-4xl font-bold tracking-[0.3em] text-accent">{code}</p>

          <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="secondary" onClick={() => copyText(code, 'code')}>
              Copy code
            </Button>
            <Button
              variant="secondary"
              onClick={() => copyText(`${window.location.origin}/?code=${code}`, 'link')}
            >
              Copy invite link
            </Button>
          </div>

          <p role="status" className="mt-2 h-5 text-sm text-emerald-300">
            {COPIED_MESSAGES[copied] ?? ''}
          </p>
        </div>

        <h2 className="mt-8 mb-3 text-xl font-bold">
          Players{' '}
          <span aria-live="polite" className="text-base font-normal text-slate-400">
            ({players.length} of {MAX_PLAYERS})
          </span>
        </h2>
        <PlayerList players={players} hostId={hostId} youId={playerId} />

        <div className="mt-6">
          {isHost ? (
            <DeckSizePicker value={deckSize} onChange={handleDeckSize} />
          ) : (
            <p className="rounded-2xl border border-white/10 bg-panel p-4 text-slate-300">
              The host chose <strong className="text-accent">{deckSize} cards</strong> per player,
              so the game lasts {deckSize} rounds.
            </p>
          )}
          <p className="mt-2 text-sm text-slate-400">
            Each player holds {HAND_SIZE} cards at a time. A played card is replaced from the deck.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {isHost ? (
            <>
              <Button onClick={handleStart} disabled={!enoughPlayers} className="w-full">
                Start the game
              </Button>
              {!enoughPlayers && (
                <p role="status" className="text-center text-sm text-slate-400">
                  Waiting for at least {MIN_PLAYERS} players
                </p>
              )}
            </>
          ) : (
            <p role="status" className="text-center text-slate-300">
              Waiting for the host to start the game…
            </p>
          )}
          <Button variant="secondary" onClick={handleLeave} className="w-full">
            Leave room
          </Button>
        </div>
      </section>
    </>
  );
}

export default LobbyPage;
