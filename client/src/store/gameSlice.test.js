import { describe, it, expect } from 'vitest';
import gameReducer, {
  gameStarted,
  gameSynced,
  roundStarted,
  statChosen,
  cardPicked,
  privateViewUpdated,
  roundResult,
  roundResultDismissed,
  gameOver,
  gameReset,
} from './gameSlice.js';

function makeCard(id, name) {
  return { id, name, displayName: name, tier: 'C', bst: 300, stats: {} };
}

const hand = [makeCard(1, 'Bulbasaur'), makeCard(4, 'Charmander')];

const publicGame = {
  phase: 'choosing-stat',
  round: 1,
  totalRounds: 10,
  leaderId: 'p1',
  chosenStat: null,
  players: [
    { id: 'p1', name: 'Ash', roundWins: 0, hasPicked: false, handSize: 5, cardsLeft: 10 },
    { id: 'p2', name: 'Misty', roundWins: 0, hasPicked: false, handSize: 5, cardsLeft: 10 },
  ],
};

// A game that has started and whose first round was dealt, with this player as the LEADER
function startedAsLeader() {
  const started = gameReducer(undefined, gameStarted({ game: publicGame }));
  return gameReducer(
    started,
    roundStarted({
      round: 1,
      totalRounds: 10,
      leaderId: 'p1',
      turnSecondsLeft: 25,
      you: { hand, pickedCardId: null, canChooseStat: true, canChooseCard: false },
    }),
  );
}

describe('gameSlice', () => {
  it('holds only this player hand when a round starts', () => {
    const state = startedAsLeader();

    expect(state.round).toBe(1);
    expect(state.leaderId).toBe('p1');
    expect(state.hand).toHaveLength(2);
    expect(state.canChooseStat).toBe(true);
    expect(state.canChooseCard).toBe(false);
    expect(state.turnSecondsLeft).toBe(25);
  });

  it('lets everyone choose a card once the stat is chosen', () => {
    const state = gameReducer(
      startedAsLeader(),
      statChosen({
        round: 1,
        leaderId: 'p1',
        stat: 'attack',
        turnSecondsLeft: 24,
        you: { hand, pickedCardId: null, canChooseStat: false, canChooseCard: true },
      }),
    );

    expect(state.phase).toBe('choosing-cards');
    expect(state.chosenStat).toBe('attack');
    expect(state.canChooseStat).toBe(false);
    expect(state.canChooseCard).toBe(true);
    expect(state.turnSecondsLeft).toBe(24);
  });

  it('marks who has picked, and keeps this player own pick from the server answer', () => {
    let state = startedAsLeader();
    state = gameReducer(state, cardPicked({ round: 1, playerId: 'p2' }));
    expect(state.players[1].hasPicked).toBe(true);
    expect(state.players[0].hasPicked).toBe(false);

    state = gameReducer(
      state,
      privateViewUpdated({ hand, pickedCardId: 4, canChooseStat: false, canChooseCard: false }),
    );
    expect(state.pickedCardId).toBe(4);
    expect(state.canChooseCard).toBe(false);
  });

  it('keeps the scored round for the result dialog, and counts the cards left', () => {
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
    expect(state.players[0].cardsLeft).toBe(9);
    expect(state.players[0].handSize).toBe(5);

    state = gameReducer(state, roundResultDismissed());
    expect(state.lastResult).toBeNull();
  });

  it('shrinks the hand size once the draw pile is empty', () => {
    const nearTheEnd = {
      ...publicGame,
      players: publicGame.players.map((player) => ({ ...player, cardsLeft: 5, handSize: 5 })),
    };
    let state = gameReducer(undefined, gameStarted({ game: nearTheEnd }));
    state = gameReducer(
      state,
      roundResult({
        round: 6,
        stat: 'speed',
        plays: [],
        winnerId: null,
        nextLeaderId: 'p1',
        scores: [],
      }),
    );

    expect(state.players[0].cardsLeft).toBe(4);
    expect(state.players[0].handSize).toBe(4);
  });

  it('stores the final result and switches the controls off', () => {
    const final = { winnerIds: ['p2'], scores: [] };
    let state = gameReducer(startedAsLeader(), gameOver(final));

    expect(state.phase).toBe('finished');
    expect(state.finalResult.winnerIds).toEqual(['p2']);
    expect(state.hand).toEqual([]);
    expect(state.canChooseStat).toBe(false);
    expect(state.turnSecondsLeft).toBeNull();

    state = gameReducer(state, gameReset());
    expect(state.phase).toBeNull();
  });

  it('rebuilds the whole game from a full room state after reconnecting', () => {
    const roomState = {
      game: { ...publicGame, round: 7, phase: 'choosing-cards', chosenStat: 'speed' },
      private: { hand, pickedCardId: 1, canChooseStat: false, canChooseCard: false },
      turnSecondsLeft: 12,
      finalResult: null,
    };
    const state = gameReducer(undefined, gameSynced(roomState));

    expect(state.round).toBe(7);
    expect(state.chosenStat).toBe('speed');
    expect(state.hand).toHaveLength(2);
    expect(state.pickedCardId).toBe(1);
    expect(state.turnSecondsLeft).toBe(12);
  });
});
