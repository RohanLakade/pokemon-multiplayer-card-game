import { createSlice } from '@reduxjs/toolkit';
import { DEFAULT_DECK_SIZE, HAND_SIZE } from '@pokemon-game/shared';

const initialState = {
  phase: null, // 'choosing-stat' | 'choosing-cards' | 'finished'
  round: 0,
  totalRounds: DEFAULT_DECK_SIZE,
  leaderId: null,
  chosenStat: null,
  players: [], // [{ id, name, roundWins, hasPicked, handSize, cardsLeft }]
  hand: [], // this player's own cards (the server never sends anyone else's)
  pickedCardId: null, // the card this player picked this round, if any
  canChooseStat: false,
  canChooseCard: false,
  turnSecondsLeft: null, // seconds the server's turn clock had left when the last event arrived
  lastResult: null, // the round that was just scored; the screen shows it until it closes
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
}

// What only this player may see and do
function applyPrivateView(state, view) {
  state.hand = view.hand;
  state.pickedCardId = view.pickedCardId;
  state.canChooseStat = view.canChooseStat;
  state.canChooseCard = view.canChooseCard;
}

function markPicked(state, playerId) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (player) player.hasPicked = true;
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
      state.turnSecondsLeft = turnSecondsLeft ?? null;
      for (const player of state.players) player.hasPicked = false;
      applyPrivateView(state, you);
    },

    statChosen(state, action) {
      const { stat, turnSecondsLeft, you } = action.payload;
      state.phase = 'choosing-cards';
      state.chosenStat = stat;
      state.turnSecondsLeft = turnSecondsLeft ?? null;
      applyPrivateView(state, you);
    },

    // Somebody picked a card. We only learn THAT they picked, never which card.
    cardPicked(state, action) {
      markPicked(state, action.payload.playerId);
    },

    // The server's answer to our own move, so the screen reflects it straight away
    privateViewUpdated(state, action) {
      applyPrivateView(state, action.payload);
    },

    roundResult(state, action) {
      state.lastResult = action.payload;

      for (const player of state.players) {
        const score = action.payload.scores.find((entry) => entry.playerId === player.id);
        if (score) player.roundWins = score.roundWins;

        // Every player plays exactly one card per round, so everyone has one card fewer
        player.cardsLeft = Math.max(0, player.cardsLeft - 1);
        player.handSize = Math.min(HAND_SIZE, player.cardsLeft);
      }
    },

    roundResultDismissed(state) {
      state.lastResult = null;
    },

    gameOver(state, action) {
      state.finalResult = action.payload;
      state.phase = 'finished';
      state.hand = [];
      state.pickedCardId = null;
      state.canChooseStat = false;
      state.canChooseCard = false;
      state.turnSecondsLeft = null;
    },

    // Rebuilds everything from a full room:state (used when a player comes back)
    gameSynced(state, action) {
      const roomState = action.payload;
      applyPublicState(state, roomState.game);
      applyPrivateView(state, roomState.private);
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
  cardPicked,
  privateViewUpdated,
  roundResult,
  roundResultDismissed,
  gameOver,
  gameSynced,
  gameReset,
} = gameSlice.actions;

export default gameSlice.reducer;
