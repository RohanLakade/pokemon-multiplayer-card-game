import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import { createRoom, fetchRoom } from '../utils/api.js';
import { joinRoom, leaveRoom } from '../utils/roomActions.js';
import { sendEvent } from '../utils/socket.js';

// A game against the computer is a short one: 10 cards each, the computer added, started at once
async function startComputerGame() {
  await sendEvent('room:set-deck-size', { deckSize: 10 });
  await sendEvent('room:add-bot');
  await sendEvent('game:start');
}

// Everything the home page needs to get a player into a room, plus loading and error state.
export function useJoinRoom() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState(null);

  // getCode finds or makes the room code; then we join over the socket, run afterJoin if given,
  // and open the page that getPath chooses (the lobby unless told otherwise)
  async function run(
    getCode,
    playerName,
    { afterJoin, getPath = (code) => `/lobby/${code}` } = {},
  ) {
    setIsBusy(true);
    setError(null);
    try {
      const code = await getCode();
      await joinRoom(dispatch, code, playerName);

      if (afterJoin) {
        try {
          await afterJoin();
        } catch (afterJoinError) {
          leaveRoom(dispatch); // do not leave a half-set-up room behind
          throw afterJoinError;
        }
      }
      navigate(getPath(code));
    } catch (joinError) {
      setError(joinError.message);
    } finally {
      setIsBusy(false);
    }
  }

  return {
    isBusy,
    error,
    createAndJoin: (playerName) => run(async () => (await createRoom()).code, playerName),
    // Checking the room over REST first gives a clear "Room not found" before any socket is opened
    joinExisting: (code, playerName) =>
      run(async () => {
        await fetchRoom(code);
        return code;
      }, playerName),
    playVsComputer: (playerName) =>
      run(async () => (await createRoom()).code, playerName, {
        afterJoin: startComputerGame,
        getPath: (code) => `/game/${code}`,
      }),
  };
}
