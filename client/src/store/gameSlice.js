import { createSlice } from '@reduxjs/toolkit';
import { ROUNDS_PER_GAME } from '@pokemon-game/shared';

const initialState = {
  phase: null, // 'choosing-stat' | 'playing-cards' | 'finished'
  round: 0,
  totalRounds: ROUNDS_PER_GAME,
  leaderId: null,
  chosenStat: null,
  players: [], // [{ id, name, roundWins, hasPlayed }]
  playedCards: [], // cards revealed this round: [{ playerId, card }]
  myCard: null, // this player's own current card (the server never sends anyone else's)
  canChooseStat: false,
  canPlayCard: false,
  turnSecondsLeft: null, // seconds the server's turn clock had left when the last event arrived
  lastResult: null, // the round that was just scored; the screen shows it until dismissed
  finalResult: null, // { winnerIds, scores } once the game is over
};

// What everybody may see
function applyPublicState(state, game) {
  state.phase = game.phase;
  state.round = game.round;
  state.totalRounds = game.totalRounds;
  state.leaderId = game.leaderId;
  state.chosenStat = game.chosenStat;
  state.players = game.players;
  state.playedCards = game.playedCards;
}

// What only this player may see and do
function applyPrivateView(state, view) {
  state.myCard = view.currentCard;
  state.canChooseStat = view.canChooseStat;
  state.canPlayCard = view.canPlayCard;
}

function markPlayed(state, playerId) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (player) player.hasPlayed = true;
}

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    gameStarted(state, action) {
      Object.assign(state, initialState);
      applyPublicState(state, action.payload.game);
    },

    roundStarted(state, action) {
      const { round, totalRounds, leaderId, turnSecondsLeft, you } = action.payload;
      state.phase = 'choosing-stat';
      state.round = round;
      state.totalRounds = totalRounds;
      state.leaderId = leaderId;
      state.chosenStat = null;
      state.playedCards = [];
      state.turnSecondsLeft = turnSecondsLeft ?? null;
      for (const player of state.players) player.hasPlayed = false;
      applyPrivateView(state, you);
    },

    statChosen(state, action) {
      const { leaderId, stat, card, turnSecondsLeft, you } = action.payload;
      state.phase = 'playing-cards';
      state.chosenStat = stat;
      state.playedCards = [{ playerId: leaderId, card }];
      state.turnSecondsLeft = turnSecondsLeft ?? null;
      markPlayed(state, leaderId);
      applyPrivateView(state, you);
    },

    cardPlayed(state, action) {
      const { playerId, card } = action.payload;
      const alreadyShown = state.playedCards.some((played) => played.playerId === playerId);
      if (!alreadyShown) state.playedCards.push({ playerId, card });
      markPlayed(state, playerId);
    },

    roundResult(state, action) {
      state.lastResult = action.payload;
      for (const score of action.payload.scores) {
        const player = state.players.find((candidate) => candidate.id === score.playerId);
        if (player) player.roundWins = score.roundWins;
      }
    },

    roundResultDismissed(state) {
      state.lastResult = null;
    },

    gameOver(state, action) {
      state.finalResult = action.payload;
      state.phase = 'finished';
      state.myCard = null;
      state.canChooseStat = false;
      state.canPlayCard = false;
      state.turnSecondsLeft = null;
    },

    // Rebuilds everything from a full room:state (used when a player comes back)
    gameSynced(state, action) {
      const roomState = action.payload;
      applyPublicState(state, roomState.game);
      if (roomState.private) applyPrivateView(state, roomState.private);
      state.turnSecondsLeft = roomState.turnSecondsLeft ?? null;
      state.finalResult = roomState.finalResult;
    },

    gameReset() {
      return initialState;
    },
  },
});

export const {
  gameStarted,
  roundStarted,
  statChosen,
  cardPlayed,
  roundResult,
  roundResultDismissed,
  gameOver,
  gameSynced,
  gameReset,
} = gameSlice.actions;

export default gameSlice.reducer;
