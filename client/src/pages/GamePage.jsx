import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import { STATS } from '@pokemon-game/shared';
import Button from '../components/Button.jsx';
import Countdown from '../components/Countdown.jsx';
import PageMeta from '../components/PageMeta.jsx';
import PlayedCards from '../components/PlayedCards.jsx';
import PokemonCard from '../components/PokemonCard.jsx';
import RoundResultDialog from '../components/RoundResultDialog.jsx';
import Scoreboard from '../components/Scoreboard.jsx';
import { useGameActions } from '../hooks/useGameActions.js';
import { useGameShortcuts } from '../hooks/useGameShortcuts.js';
import { useRoomGuard } from '../hooks/useRoomGuard.js';
import { roundResultDismissed } from '../store/gameSlice.js';
import { leaveRoom } from '../utils/roomActions.js';
import { getTurnMessage } from '../utils/turnMessage.js';

function GamePage() {
  const { code = '' } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isInRoom = useRoomGuard(code);
  const game = useSelector((state) => state.game);
  const room = useSelector((state) => state.room);
  const { isSending, chooseStat, playCard } = useGameActions();

  const {
    phase,
    round,
    totalRounds,
    leaderId,
    chosenStat,
    players,
    playedCards,
    myCard,
    canChooseStat,
    canPlayCard,
    turnSecondsLeft,
    lastResult,
    finalResult,
  } = game;

  // Keyboard play is off while a request is in flight or the result dialog is open
  const controlsEnabled = !isSending && !lastResult;
  useGameShortcuts({
    canChooseStat: canChooseStat && controlsEnabled,
    canPlayCard: canPlayCard && controlsEnabled,
    onChooseStat: chooseStat,
    onPlayCard: playCard,
  });

  // After the last round's result is closed, show the final standings.
  // A visitor whose game has not started yet goes back to the lobby.
  useEffect(() => {
    if (!isInRoom) return;
    if (finalResult && !lastResult) {
      navigate(`/result/${code}`, { replace: true });
    } else if (phase === null && room.status === 'lobby') {
      navigate(`/lobby/${code}`, { replace: true });
    }
  }, [isInRoom, finalResult, lastResult, phase, room.status, code, navigate]);

  if (!isInRoom || phase === null) return null;

  function handleLeave() {
    if (window.confirm('Leave this game? Your seat stays open for a short while.')) {
      leaveRoom(dispatch);
      navigate('/');
    }
  }

  const leaderName = players.find((player) => player.id === leaderId)?.name ?? '';
  const statLabel = STATS.find((stat) => stat.key === chosenStat)?.label ?? '';
  const offlineIds = room.players.filter((player) => !player.connected).map((player) => player.id);
  const turnMessage = getTurnMessage({
    phase,
    canChooseStat,
    canPlayCard,
    leaderName,
    statLabel,
    playedCount: playedCards.length,
    playerCount: players.length,
  });

  return (
    <>
      <PageMeta title={`Round ${round}`} noIndex />

      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-extrabold">
          Round {round} of {totalRounds}
        </h1>
        <p className="text-slate-400">Room {code}</p>
      </header>

      <section aria-labelledby="scores-heading" className="mt-4">
        <h2 id="scores-heading" className="sr-only">
          Scoreboard
        </h2>
        <Scoreboard
          players={players}
          leaderId={leaderId}
          youId={room.playerId}
          offlineIds={offlineIds}
        />
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-panel-light px-4 py-3">
        {/* role="status" makes screen readers announce each change of whose turn it is */}
        <p role="status" className="text-lg font-semibold">
          {turnMessage}
        </p>
        {/* A new key for each step makes the countdown start again from the server's time */}
        <Countdown key={`${round}-${phase}`} seconds={turnSecondsLeft} />
      </div>

      <section aria-labelledby="table-heading" className="mt-6">
        <h2 id="table-heading" className="mb-3 text-xl font-bold">
          On the table
        </h2>
        <PlayedCards
          players={players}
          playedCards={playedCards}
          chosenStat={chosenStat}
          leaderId={leaderId}
          youId={room.playerId}
        />
      </section>

      <section aria-labelledby="hand-heading" className="mt-8">
        <h2 id="hand-heading" className="mb-3 text-xl font-bold">
          Your card
        </h2>

        {myCard ? (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* key={myCard.id} makes React draw a new card, which replays the flip animation */}
            <PokemonCard
              key={myCard.id}
              card={myCard}
              onSelectStat={canChooseStat ? chooseStat : undefined}
            />

            <div className="space-y-3">
              {canChooseStat && (
                <p className="text-slate-300">
                  Click a stat on your card, or press the key <kbd>1</kbd> to <kbd>7</kbd>.
                </p>
              )}
              {canPlayCard && (
                <>
                  <Button onClick={playCard} disabled={isSending}>
                    Play your card
                  </Button>
                  <p className="text-sm text-slate-400">
                    You can also press the key <kbd>P</kbd>.
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="text-slate-300">Your card is on the table.</p>
        )}
      </section>

      <div className="mt-10">
        <Button variant="secondary" onClick={handleLeave}>
          Leave game
        </Button>
      </div>

      <RoundResultDialog
        result={lastResult}
        players={players}
        youId={room.playerId}
        isGameOver={Boolean(finalResult)}
        onContinue={() => dispatch(roundResultDismissed())}
      />
    </>
  );
}

export default GamePage;
