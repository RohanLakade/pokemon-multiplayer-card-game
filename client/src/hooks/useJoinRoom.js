import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import { createRoom, fetchRoom } from '../utils/api.js';
import { joinRoom } from '../utils/roomActions.js';

// Everything the home page needs to get a player into a room, plus loading and error state.
export function useJoinRoom() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState(null);

  // getCode finds or makes the room code; then we join over the socket and open the lobby
  async function run(getCode, playerName) {
    setIsBusy(true);
    setError(null);
    try {
      const code = await getCode();
      await joinRoom(dispatch, code, playerName);
      navigate(`/lobby/${code}`);
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
  };
}
