import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router';
import { playerNameSchema, roomCodeSchema } from '@pokemon-game/shared';
import Button from '../components/Button.jsx';
import PageMeta from '../components/PageMeta.jsx';
import SavedGameBanner from '../components/SavedGameBanner.jsx';
import TextField from '../components/TextField.jsx';
import { useJoinRoom } from '../hooks/useJoinRoom.js';
import { useSavedSeat } from '../hooks/useSavedSeat.js';
import { releaseRoom } from '../utils/roomActions.js';

function HomePage() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  // A shared invite link looks like /?code=ABC234 and fills the code in
  const [code, setCode] = useState((searchParams.get('code') ?? '').toUpperCase().slice(0, 6));
  const [nameError, setNameError] = useState(null);
  const [codeError, setCodeError] = useState(null);
  const { createAndJoin, joinExisting, playVsComputer, isBusy, error } = useJoinRoom();
  const { seat, forgetSeat } = useSavedSeat();

  // Being on the home page means "not in a room": drop any leftover connection and screen state.
  // The saved seat is kept, so a game that is still running can be rejoined from the banner.
  useEffect(() => {
    releaseRoom(dispatch);
  }, [dispatch]);

  // The same Zod schemas the server uses, so the browser and the server agree
  function checkName() {
    const result = playerNameSchema.safeParse(name);
    setNameError(result.success ? null : result.error.issues[0].message);
    return result.success ? result.data : null;
  }

  function checkCode() {
    const result = roomCodeSchema.safeParse(code);
    setCodeError(result.success ? null : 'Enter the 6-character room code from your friend');
    return result.success ? result.data : null;
  }

  async function handlePlayVsComputer() {
    const playerName = checkName();
    if (playerName) await playVsComputer(playerName);
  }

  async function handleCreate() {
    const playerName = checkName();
    if (playerName) await createAndJoin(playerName);
  }

  async function handleJoin(event) {
    event.preventDefault();
    const playerName = checkName();
    const roomCode = checkCode();
    if (playerName && roomCode) await joinExisting(roomCode, playerName);
  }

  return (
    <>
      <PageMeta />

      <section className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Pokémon Card Battle</h1>
        <p className="mt-4 text-lg text-slate-300">
          A free Top Trumps game for 1 to 8 players. Play against the computer, or invite friends.
          Choose the stat you think will win, pick the right card from your hand and beat them.
        </p>
      </section>

      {seat && <SavedGameBanner seat={seat} onForget={forgetSeat} />}

      <section
        aria-labelledby="play-heading"
        className="mx-auto mt-10 max-w-xl rounded-2xl border border-white/10 bg-panel p-6"
      >
        <h2 id="play-heading" className="text-xl font-bold">
          Start playing
        </h2>

        <form onSubmit={handleJoin} noValidate aria-busy={isBusy} className="mt-4 space-y-4">
          <TextField
            label="Your name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={nameError}
            hint="2 to 20 letters, numbers, spaces, dots, dashes or underscores"
            maxLength={20}
            autoComplete="nickname"
          />

          <TextField
            label="Room code (only if you are joining a friend)"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            error={codeError}
            maxLength={6}
            autoComplete="off"
            spellCheck={false}
          />

          {error && (
            <p role="alert" className="rounded-lg bg-rose-950 px-3 py-2 text-rose-200">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <Button
              variant={code ? 'secondary' : 'primary'}
              onClick={handlePlayVsComputer}
              disabled={isBusy}
            >
              {isBusy ? 'Connecting…' : 'Play vs computer'}
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="secondary"
                onClick={handleCreate}
                disabled={isBusy}
                className="flex-1"
              >
                Create a room for friends
              </Button>
              <Button
                type="submit"
                variant={code ? 'primary' : 'secondary'}
                disabled={isBusy}
                className="flex-1"
              >
                Join room
              </Button>
            </div>
          </div>
        </form>
      </section>

      <section aria-labelledby="rules-heading" className="mx-auto mt-10 max-w-xl">
        <h2 id="rules-heading" className="text-xl font-bold">
          How to play
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-300">
          <li>
            Each player gets a secret deck of Pokémon cards (10, 15 or 20, chosen by the host) and
            holds 5 of them in hand. Against the computer, a game is 10 cards each.
          </li>
          <li>The round leader chooses one stat, such as Attack or Speed.</li>
          <li>
            Everyone secretly picks one card from their hand. Then all the cards are revealed
            together.
          </li>
          <li>
            The best value in that stat wins the round. For Rank, the lower number wins. The winner
            leads next, and played cards are replaced from your deck.
          </li>
          <li>The player with the most round wins takes the game. Equal scores share the win.</li>
        </ol>
      </section>
    </>
  );
}

export default HomePage;
