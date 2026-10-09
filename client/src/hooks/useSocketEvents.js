import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { socket } from '../utils/socket.js';
import {
  connectionChanged,
  noticeShown,
  playerAutoPlayChanged,
  playerConnectionChanged,
  roomStateReceived,
  roomStatusChanged,
  timerChanged,
} from '../store/roomSlice.js';
import {
  cardPicked,
  gameOver,
  gameReset,
  gameStarted,
  gameSynced,
  roundResult,
  roundStarted,
  statChosen,
  turnClockUpdated,
} from '../store/gameSlice.js';

// Listens to every event the server can send and turns each one into a Redux action.
// Called once, in App. Screens never talk to the socket for incoming data: they read the store.
export function useSocketEvents() {
  const dispatch = useDispatch();

  useEffect(() => {
    const handlers = {
      connect: () => dispatch(connectionChanged('connected')),

      disconnect: (reason) => {
        // "io client disconnect" means WE left on purpose, which is not a problem
        if (reason !== 'io client disconnect') dispatch(connectionChanged('lost'));
      },

      'room:state': (state) => {
        dispatch(roomStateReceived(state));
        // A room without a game is a lobby (also after "play again"): forget the old game
        if (state.game) dispatch(gameSynced(state));
        else dispatch(gameReset());
      },

      'game:started': ({ game }) => {
        // Store the game FIRST: changing the room status sends the lobby to the game screen
        dispatch(gameStarted({ game }));
        dispatch(roomStatusChanged('playing'));
      },

      'round:started': (payload) => dispatch(roundStarted(payload)),
      'round:stat-chosen': (payload) => dispatch(statChosen(payload)),
      'round:card-picked': (payload) => dispatch(cardPicked(payload)),
      'round:result': (payload) => dispatch(roundResult(payload)),

      'game:over': (payload) => {
        dispatch(gameOver(payload));
        dispatch(roomStatusChanged('finished'));
      },

      'player:disconnected': ({ playerId }) =>
        dispatch(playerConnectionChanged({ playerId, connected: false })),
      'player:reconnected': ({ playerId }) =>
        dispatch(playerConnectionChanged({ playerId, connected: true })),
      'player:auto-play-changed': (payload) => dispatch(playerAutoPlayChanged(payload)),

      // Somebody started or stopped the turn timer: show who, and start or remove the countdown
      'timer:changed': (payload) => {
        dispatch(timerChanged(payload));
        dispatch(turnClockUpdated(payload.turnSecondsLeft));
      },

      // Most errors are shown by the code that sent the request. This one has no request.
      error: (info) => {
        if (info.code === 'SESSION_REPLACED') dispatch(noticeShown(info.message));
      },
    };

    for (const [eventName, handler] of Object.entries(handlers)) {
      socket.on(eventName, handler);
    }

    // Cleanup: stop listening when the component goes away (React StrictMode runs this in dev)
    return () => {
      for (const [eventName, handler] of Object.entries(handlers)) {
        socket.off(eventName, handler);
      }
    };
  }, [dispatch]);
}
