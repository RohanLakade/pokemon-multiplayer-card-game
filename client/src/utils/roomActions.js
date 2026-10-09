import { connectSocket, sendEvent, socket } from './socket.js';
import { clearSession, saveSession } from './session.js';
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
    // Remember the seat, so the player can come back to a running game
    saveSession({ code: response.roomCode, sessionToken: response.sessionToken });
  } catch (error) {
    dispatch(connectionChanged('idle'));
    throw error;
  }
}

// Takes the same seat again, with the private token (after a refresh, a reopened tab or a
// lost connection). The server then sends the whole room state, which restores the screen.
export async function rejoinRoom(dispatch, { code, sessionToken }) {
  await connectSocket();
  const response = await sendEvent('room:join', { code, sessionToken });

  dispatch(
    joined({
      code: response.roomCode,
      playerId: response.playerId,
      sessionToken: response.sessionToken,
    }),
  );
}

// Tells the server that we leave on PURPOSE. In a running game it keeps our seat, switches
// auto-play on for us (nobody waits for our turns) and remembers that we left. A dropped
// connection or a closed tab does none of this. Does nothing when the connection is already gone.
export async function announceLeaving() {
  if (!socket.connected) return;

  try {
    await sendEvent('room:leave');
  } catch {
    // The server did not answer: we are leaving anyway
  }
}

// Drops the connection and the screen state but KEEPS the saved seat. The home page uses this,
// so that a game that is still running can be rejoined from the "Rejoin" banner.
export function releaseRoom(dispatch) {
  socket.disconnect();
  dispatch(roomLeft());
  dispatch(gameReset());
}

// Leaving for good also forgets the saved seat.
export function leaveRoom(dispatch) {
  clearSession();
  releaseRoom(dispatch);
}
