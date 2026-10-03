import { connectSocket, sendEvent, socket } from './socket.js';
import { connectionChanged, joined, roomLeft } from '../store/roomSlice.js';
import { gameReset } from '../store/gameSlice.js';

// Connects to the server and joins a room. The server's answer contains this player's
// private session token, which only this browser ever receives.
export async function joinRoom(dispatch, code, playerName) {
  dispatch(connectionChanged('connecting'));
  try {
    await connectSocket();
    const response = await sendEvent('room:join', { code, playerName });
    dispatch(
      joined({
        code: response.roomCode,
        playerId: response.playerId,
        sessionToken: response.sessionToken,
      }),
    );
  } catch (error) {
    dispatch(connectionChanged('idle'));
    throw error;
  }
}

// Leaving is just disconnecting: the server removes the player from a lobby,
// or keeps their seat for a while during a game.
export function leaveRoom(dispatch) {
  socket.disconnect();
  dispatch(roomLeft());
  dispatch(gameReset());
}
