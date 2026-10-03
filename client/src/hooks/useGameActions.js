import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { noticeShown } from '../store/roomSlice.js';
import { sendEvent } from '../utils/socket.js';

// The two things a player can do during a game. While one request is on its way,
// further clicks are ignored, so a double click cannot send the same move twice.
export function useGameActions() {
  const dispatch = useDispatch();
  const [isSending, setIsSending] = useState(false);

  async function send(eventName, payload) {
    if (isSending) return;
    setIsSending(true);
    try {
      await sendEvent(eventName, payload);
    } catch (error) {
      dispatch(noticeShown(error.message));
    } finally {
      setIsSending(false);
    }
  }

  return {
    isSending,
    chooseStat: (stat) => send('round:choose-stat', { stat }),
    playCard: () => send('round:play-card'),
  };
}
