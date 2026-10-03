import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  connection: 'idle', // 'idle' | 'connecting' | 'connected' | 'lost'
  code: null,
  playerId: null,
  sessionToken: null, // private: only this browser has it
  status: null, // 'lobby' | 'playing' | 'finished'
  hostId: null,
  players: [], // [{ id, name, connected }]
  notice: null, // a message shown at the top of the page, such as an error
};

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    connectionChanged(state, action) {
      state.connection = action.payload;
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

    noticeShown(state, action) {
      state.notice = action.payload;
    },

    noticeCleared(state) {
      state.notice = null;
    },

    roomLeft() {
      return initialState;
    },
  },
});

export const {
  connectionChanged,
  joined,
  roomStateReceived,
  roomStatusChanged,
  playerConnectionChanged,
  noticeShown,
  noticeCleared,
  roomLeft,
} = roomSlice.actions;

export const selectIsHost = (state) =>
  state.room.playerId !== null && state.room.hostId === state.room.playerId;

export default roomSlice.reducer;
