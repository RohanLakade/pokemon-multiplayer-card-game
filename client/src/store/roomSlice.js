import { createSlice } from '@reduxjs/toolkit';
import { DEFAULT_DECK_SIZE, DEFAULT_TURN_SECONDS } from '@pokemon-game/shared';
import { getSessionToRestore } from '../utils/session.js';

const emptyState = {
  connection: 'idle', // 'idle' | 'connecting' | 'connected' | 'lost'
  restoring: false, // true while we take our seat again after a page refresh
  code: null,
  playerId: null,
  sessionToken: null, // private: only this browser has it
  status: null, // 'lobby' | 'playing' | 'finished'
  hostId: null,
  deckSize: DEFAULT_DECK_SIZE, // cards per player, chosen by the host
  turnSeconds: DEFAULT_TURN_SECONDS, // seconds per step once the timer is on, chosen by the host
  timer: { on: false, startedBy: null, startedByName: null }, // the optional turn timer
  players: [], // [{ id, name, connected, autoPlay }]
  notice: null, // a message shown at the top of the page, such as an error
};

// On a page load we may be about to rejoin a saved seat, so screens should wait
const initialState = { ...emptyState, restoring: getSessionToRestore() !== null };

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    connectionChanged(state, action) {
      state.connection = action.payload;
    },

    restoreFinished(state) {
      state.restoring = false;
    },

    // The server's answer to room:join
    joined(state, action) {
      const { code, playerId, sessionToken } = action.payload;
      state.code = code;
      state.playerId = playerId;
      state.sessionToken = sessionToken;
    },

    // The server's room:state event
    roomStateReceived(state, action) {
      const room = action.payload;
      state.code = room.code;
      state.status = room.status;
      state.hostId = room.hostId;
      state.deckSize = room.deckSize;
      state.turnSeconds = room.turnSeconds;
      state.timer = room.timer ?? emptyState.timer;
      state.players = room.players;
      state.playerId = room.you.playerId;
    },

    roomStatusChanged(state, action) {
      state.status = action.payload;
    },

    playerConnectionChanged(state, action) {
      const { playerId, connected } = action.payload;
      const player = state.players.find((candidate) => candidate.id === playerId);
      if (player) player.connected = connected;
    },

    playerAutoPlayChanged(state, action) {
      const { playerId, enabled } = action.payload;
      const player = state.players.find((candidate) => candidate.id === playerId);
      if (player) player.autoPlay = enabled;
    },

    // The server's timer:changed event: somebody started or stopped the turn timer
    timerChanged(state, action) {
      const { on, startedBy, startedByName } = action.payload;
      state.timer = { on, startedBy, startedByName };
    },

    noticeShown(state, action) {
      state.notice = action.payload;
    },

    noticeCleared(state) {
      state.notice = null;
    },

    roomLeft() {
      return emptyState;
    },
  },
});

export const {
  connectionChanged,
  restoreFinished,
  joined,
  roomStateReceived,
  roomStatusChanged,
  playerConnectionChanged,
  playerAutoPlayChanged,
  timerChanged,
  noticeShown,
  noticeCleared,
  roomLeft,
} = roomSlice.actions;

export const selectIsHost = (state) =>
  state.room.playerId !== null && state.room.hostId === state.room.playerId;

// Is this player on auto-play right now?
export const selectMyAutoPlay = (state) =>
  state.room.players.find((player) => player.id === state.room.playerId)?.autoPlay === true;

export default roomSlice.reducer;
