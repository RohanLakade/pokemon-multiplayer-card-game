import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import { STATS } from '@pokemon-game/shared';
import AutoPlayPanel from '../components/AutoPlayPanel.jsx';
import Button from '../components/Button.jsx';
import Countdown from '../components/Countdown.jsx';
import HandPanel from '../components/HandPanel.jsx';
import PageMeta from '../components/PageMeta.jsx';
import RoundResultDialog from '../components/RoundResultDialog.jsx';
import Scoreboard from '../components/Scoreboard.jsx';
import StatPicker from '../components/StatPicker.jsx';
import TimerPanel from '../components/TimerPanel.jsx';
import { useGameActions } from '../hooks/useGameActions.js';
import { useRoomGuard } from '../hooks/useRoomGuard.js';
import { roundResultDismissed } from '../store/gameSlice.js';
import { selectMyAutoPlay } from '../store/roomSlice.js';
import { announceLeaving } from '../utils/roomActions.js';
import { getTurnMessage } from '../utils/turnMessage.js';

function GamePage() {
  const { code = '' } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isInRoom = useRoomGuard(code);
  const game = useSelector((state) => state.game);
  const room = useSelector((state) => state.room);
  const myAutoPlay = useSelector(selectMyAutoPlay);
  const { isSending, chooseStat, chooseCard, setTimer, setAutoPlay } = useGameActions();

  const {
    phase,
    round,
    totalRounds,
    leaderId,
    chosenStat,
    players,
    hand,
    pickedCardId,
    canChooseStat,
    canChooseCard,
    turnSecondsLeft,
    lastResult,
    finalResult,
  } = game;

  // Stable, so the result dialog's 5 second timer does not restart on every render
  const handleContinue = useCallback(() => dispatch(roundResultDismissed()), [dispatch]);

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

  // Leaving on purpose: the server keeps the seat and plays our cards for us. The saved seat
  // stays in this browser, so the home page offers "Rejoin" while the game is running.
  async function handleLeave() {
    const message =
      'Leave this game? Your cards will be played for you, and you can rejoin from the home page while the game is running.';
    if (!window.confirm(message)) return;

    await announceLeaving();
    navigate('/');
  }

  const leaderName = players.find((player) => player.id === leaderId)?.name ?? '';
  const stat = STATS.find((candidate) => candidate.key === chosenStat);
  const offlineIds = room.players.filter((player) => !player.connected).map((player) => player.id);
  const autoPlayIds = room.players.filter((player) => player.autoPlay).map((player) => player.id);
  const turnMessage = getTurnMessage({
    phase,
    canChooseStat,
    canChooseCard,
    leaderName,
    statLabel: stat?.label ?? '',
    pickedCount: players.filter((player) => player.hasPicked).length,
    playerCount: players.length,
  });

  // Moves are paused while a request is on its way or the result dialog is open
  const isPaused = isSending || Boolean(lastResult);

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
          phase={phase}
          offlineIds={offlineIds}
          autoPlayIds={autoPlayIds}
        />
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-panel-light px-4 py-3">
        {/* role="status" makes screen readers announce each change of whose turn it is */}
        <p role="status" className="text-lg font-semibold">
          {turnMessage}
        </p>
        {/* Shown only while the timer is on. A new key restarts it from the server's time. */}
        <Countdown
          key={`${round}-${phase}-${turnSecondsLeft ?? 'off'}`}
          seconds={turnSecondsLeft}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <TimerPanel
          timer={room.timer}
          turnSeconds={room.turnSeconds}
          youId={room.playerId}
          players={room.players}
          disabled={isSending}
          onToggle={setTimer}
        />
        <AutoPlayPanel isOn={myAutoPlay} disabled={isSending} onToggle={setAutoPlay} />
      </div>

      {canChooseStat && (
        <section aria-labelledby="stat-heading" className="mt-6">
          <h2 id="stat-heading" className="mb-3 text-xl font-bold">
            Choose a stat
          </h2>
          <StatPicker onChoose={chooseStat} disabled={isPaused} />
        </section>
      )}

      {stat && (
        <p className="mt-6 text-lg">
          Chosen stat: <strong className="text-accent">{stat.label}</strong>
          {stat.lowerWins && ' (the lowest number wins)'}
        </p>
      )}

      <section aria-labelledby="hand-heading" className="mt-6">
        <h2 id="hand-heading" className="mb-3 text-xl font-bold">
          Your hand
        </h2>
        {/* key={round}: a new round starts with a fresh selection */}
        <HandPanel
          key={round}
          hand={hand}
          chosenStat={chosenStat}
          pickedCardId={pickedCardId}
          canChooseCard={canChooseCard && !lastResult}
          isSending={isSending}
          onPlay={chooseCard}
        />
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
        onContinue={handleContinue}
      />
    </>
  );
}

export default GamePage;
