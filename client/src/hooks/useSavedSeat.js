import { useEffect, useState } from 'react';
import { fetchRoom } from '../utils/api.js';
import { clearSession, loadSession } from '../utils/session.js';

// On the home page: is there a game still running that this browser has a seat in?
// Returns { seat, forgetSeat }. The seat is { code, sessionToken }, or null.
// A seat for a room that is gone, or still in its lobby, is forgotten: lobby players are
// removed when they disconnect, so such a seat can never be used again.
export function useSavedSeat() {
  const [seat, setSeat] = useState(null);

  useEffect(() => {
    const saved = loadSession();
    if (!saved) return undefined;

    let isCurrent = true;

    fetchRoom(saved.code)
      .then((room) => {
        if (!isCurrent) return;
        if (room.status === 'playing') setSeat(saved);
        else clearSession();
      })
      .catch((error) => {
        // Only a missing room means the seat is gone. A network problem may pass.
        if (error.code === 'ROOM_NOT_FOUND') clearSession();
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  function forgetSeat() {
    clearSession();
    setSeat(null);
  }

  return { seat, forgetSeat };
}
