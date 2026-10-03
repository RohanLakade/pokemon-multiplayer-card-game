import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { socket } from '../utils/socket.js';
import {
  connectionChanged,
  noticeShown,
  playerConnectionChanged,
  roomStateReceived,
  roomStatusChanged,
} from '../store/roomSlice.js';
import {
  cardPlayed,
  gameOver,
  gameStarted,
  gameSynced,
  roundResult,
  roundStarted,
  statChosen,
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
        if (state.game) dispatch(gameSynced(state));
      },

      'game:started': ({ game }) => {
        // Store the game FIRST: changing the room status sends the lobby to the game screen
        dispatch(gameStarted({ game }));
        dispatch(roomStatusChanged('playing'));
      },

      'round:started': (payload) => dispatch(roundStarted(payload)),
      'round:stat-chosen': (payload) => dispatch(statChosen(payload)),
      'round:card-played': (payload) => dispatch(cardPlayed(payload)),
      'round:result': (payload) => dispatch(roundResult(payload)),

      'game:over': (payload) => {
        dispatch(gameOver(payload));
        dispatch(roomStatusChanged('finished'));
      },

      'player:disconnected': ({ playerId }) =>
        dispatch(playerConnectionChanged({ playerId, connected: false })),
      'player:reconnected': ({ playerId }) =>
        dispatch(playerConnectionChanged({ playerId, connected: true })),

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
