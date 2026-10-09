import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { privateViewUpdated } from '../store/gameSlice.js';
import { noticeShown } from '../store/roomSlice.js';
import { sendEvent } from '../utils/socket.js';

// The things a player can do during a game. While one request is on its way,
// further clicks are ignored, so a double tap cannot send the same move twice.
export function useGameActions() {
  const dispatch = useDispatch();
  const [isSending, setIsSending] = useState(false);

  async function send(eventName, payload) {
    if (isSending) return;
    setIsSending(true);
    try {
      const response = await sendEvent(eventName, payload);
      // The answer carries this player's updated hand and options, which updates the screen
      if (response.you) dispatch(privateViewUpdated(response.you));
    } catch (error) {
      dispatch(noticeShown(error.message));
    } finally {
      setIsSending(false);
    }
  }

  return {
    isSending,
    chooseStat: (stat) => send('round:choose-stat', { stat }),
    chooseCard: (cardId) => send('round:choose-card', { cardId }),
    setTimer: (enabled) => send('timer:set', { enabled }),
    setAutoPlay: (enabled) => send('player:set-auto-play', { enabled }),
  };
}
