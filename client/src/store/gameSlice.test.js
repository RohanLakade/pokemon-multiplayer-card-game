import { describe, it, expect } from 'vitest';
import gameReducer, {
  gameStarted,
  gameSynced,
  roundStarted,
  statChosen,
  cardPlayed,
  roundResult,
  roundResultDismissed,
  gameOver,
  gameReset,
} from './gameSlice.js';

function makeCard(id, name) {
  return { id, name, displayName: name, stats: {} };
}

const publicGame = {
  phase: 'choosing-stat',
  round: 1,
  totalRounds: 20,
  leaderId: 'p1',
  chosenStat: null,
  players: [
    { id: 'p1', name: 'Ash', roundWins: 0, hasPlayed: false },
    { id: 'p2', name: 'Misty', roundWins: 0, hasPlayed: false },
  ],
  playedCards: [],
};

// A game that has started and whose first round was dealt to the LEADER (p1)
function startedAsLeader() {
  const started = gameReducer(undefined, gameStarted({ game: publicGame }));
  return gameReducer(
    started,
    roundStarted({
      round: 1,
      totalRounds: 20,
      leaderId: 'p1',
      turnSecondsLeft: 30,
      you: { currentCard: makeCard(1, 'Bulbasaur'), canChooseStat: true, canPlayCard: false },
    }),
  );
}

describe('gameSlice', () => {
  it('holds only this player card when a round starts', () => {
    const state = startedAsLeader();

    expect(state.round).toBe(1);
    expect(state.leaderId).toBe('p1');
    expect(state.myCard.displayName).toBe('Bulbasaur');
    expect(state.canChooseStat).toBe(true);
    expect(state.playedCards).toEqual([]);
  });

  it('reveals the leader card and lets the others play when a stat is chosen', () => {
    const state = gameReducer(
      startedAsLeader(),
      statChosen({
        round: 1,
        leaderId: 'p1',
        stat: 'attack',
        card: makeCard(1, 'Bulbasaur'),
        turnSecondsLeft: 29,
        you: { currentCard: null, canChooseStat: false, canPlayCard: false },
      }),
    );

    expect(state.phase).toBe('playing-cards');
    expect(state.chosenStat).toBe('attack');
    expect(state.playedCards).toHaveLength(1);
    expect(state.players[0].hasPlayed).toBe(true);
    expect(state.myCard).toBeNull();
  });

  it('adds a played card once and marks who has played', () => {
    let state = startedAsLeader();
    const action = cardPlayed({ round: 1, playerId: 'p2', card: makeCard(4, 'Charmander') });
    state = gameReducer(state, action);
    state = gameReducer(state, action);

    expect(state.playedCards).toHaveLength(1);
    expect(state.players[1].hasPlayed).toBe(true);
  });

  it('keeps the time left that the server reported for each step', () => {
    let state = startedAsLeader();
    expect(state.turnSecondsLeft).toBe(30);

    state = gameReducer(
      state,
      statChosen({
        round: 1,
        leaderId: 'p1',
        stat: 'speed',
        card: makeCard(1, 'Bulbasaur'),
        turnSecondsLeft: 27,
        you: { currentCard: null, canChooseStat: false, canPlayCard: false },
      }),
    );
    expect(state.turnSecondsLeft).toBe(27);

    state = gameReducer(state, gameOver({ winnerIds: ['p1'], scores: [] }));
    expect(state.turnSecondsLeft).toBeNull();
  });

  it('keeps the scored round for the result dialog until it is dismissed', () => {
    const result = {
      round: 1,
      stat: 'attack',
      plays: [],
      winnerId: 'p2',
      nextLeaderId: 'p2',
      scores: [
        { playerId: 'p1', name: 'Ash', roundWins: 0 },
        { playerId: 'p2', name: 'Misty', roundWins: 1 },
      ],
    };
    let state = gameReducer(startedAsLeader(), roundResult(result));

    expect(state.lastResult.winnerId).toBe('p2');
    expect(state.players[1].roundWins).toBe(1);

    state = gameReducer(state, roundResultDismissed());
    expect(state.lastResult).toBeNull();
  });

  it('stores the final result and switches the turn controls off', () => {
    const final = { winnerIds: ['p2'], scores: [] };
    const state = gameReducer(startedAsLeader(), gameOver(final));

    expect(state.phase).toBe('finished');
    expect(state.finalResult.winnerIds).toEqual(['p2']);
    expect(state.canChooseStat).toBe(false);
    expect(state.myCard).toBeNull();
  });

  it('rebuilds the whole game from a full room state after reconnecting', () => {
    const roomState = {
      game: { ...publicGame, round: 7, phase: 'playing-cards', chosenStat: 'speed' },
      private: { currentCard: makeCard(9, 'Blastoise'), canChooseStat: false, canPlayCard: true },
      turnSecondsLeft: 12,
      finalResult: null,
    };
    const state = gameReducer(undefined, gameSynced(roomState));

    expect(state.round).toBe(7);
    expect(state.chosenStat).toBe('speed');
    expect(state.myCard.displayName).toBe('Blastoise');
    expect(state.canPlayCard).toBe(true);
    expect(state.turnSecondsLeft).toBe(12);
  });

  it('goes back to the start when reset', () => {
    const state = gameReducer(startedAsLeader(), gameReset());

    expect(state.phase).toBeNull();
    expect(state.round).toBe(0);
  });
});
