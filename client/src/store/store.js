import { configureStore } from '@reduxjs/toolkit';
import roomReducer from './roomSlice.js';
import gameReducer from './gameSlice.js';

export const store = configureStore({
  reducer: {
    room: roomReducer,
    game: gameReducer,
  },
});
