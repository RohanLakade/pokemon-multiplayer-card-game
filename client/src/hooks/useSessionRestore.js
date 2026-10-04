import { useEffect, useRef } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { useNavigate } from 'react-router';
import { noticeShown, restoreFinished } from '../store/roomSlice.js';
import { leaveRoom, rejoinRoom } from '../utils/roomActions.js';
import { getSessionToRestore } from '../utils/session.js';
import { socket } from '../utils/socket.js';

// The seat is gone (the room ended, the server restarted...): say so and go home.
function giveUpSeat(dispatch, navigate, error) {
  leaveRoom(dispatch);
  dispatch(noticeShown(`Could not rejoin your game: ${error.message}`));
  navigate('/');
}

// Takes the player's seat again when they come back. Called once, in App. Two cases:
//   1. the page was refreshed: rejoin with the seat saved in sessionStorage
//   2. the connection dropped and Socket.IO reconnected: rejoin with the token we hold
export function useSessionRestore() {
  const dispatch = useDispatch();
  const store = useStore();
  const navigate = useNavigate();
  const hasStarted = useRef(false);
  const isRejoining = useRef(false);

  // 1. After a page refresh
  useEffect(() => {
    // React StrictMode runs effects twice in development: only the first run may act
    if (hasStarted.current) return;
    hasStarted.current = true;

    const saved = getSessionToRestore();
    if (!saved) return; // the "restoring" flag in the store is false too, so screens are not waiting

    rejoinRoom(dispatch, saved)
      .catch((error) => giveUpSeat(dispatch, navigate, error))
      .finally(() => dispatch(restoreFinished()));
  }, [dispatch, navigate]);

  // 2. After a dropped connection. The "connect" event also fires for every automatic reconnect.
  useEffect(() => {
    async function handleConnect() {
      const { code, sessionToken } = store.getState().room;
      // Not in a room yet (the first connection of a normal join), or already rejoining
      if (!code || !sessionToken || isRejoining.current) return;

      isRejoining.current = true;
      try {
        await rejoinRoom(dispatch, { code, sessionToken });
      } catch (error) {
        giveUpSeat(dispatch, navigate, error);
      } finally {
        isRejoining.current = false;
      }
    }

    socket.on('connect', handleConnect);
    return () => socket.off('connect', handleConnect);
  }, [dispatch, navigate, store]);
}
