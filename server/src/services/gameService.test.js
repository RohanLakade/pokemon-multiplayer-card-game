import { describe, it, expect } from 'vitest';
import { ROUNDS_PER_GAME } from '@pokemon-game/shared';
import {
  PHASES,
  createGame,
  chooseStat,
  playCard,
  getPublicState,
  getPrivateView,
  getFinalResult,
} from './gameService.js';
import { GameRuleError } from './gameErrors.js';

const PLAYERS = [
  { id: 'p1', name: 'Ash' },
  { id: 'p2', name: 'Misty' },
  { id: 'p3', name: 'Brock' },
];

function makeCard(id, stats = {}) {
  return {
    id,
    name: `card-${id}`,
    displayName: `Card ${id}`,
    category: 'base',
    speciesId: id,
    image: null,
    stats: {
      hp: 50,
      attack: 50,
      defense: 50,
      specialAttack: 50,
      specialDefense: 50,
      speed: 50,
      rank: id,
      ...stats,
    },
  };
}

// One card per round; the attack values decide who wins each attack round
function makeDeck(startId, attackValues) {
  return attackValues.map((attack, index) => makeCard(startId + index, { attack }));
}

function repeat(value, times) {
  return Array.from({ length: times }, () => value);
}

// Creates a real game, then swaps in decks we control so results are predictable
function setupGame(attackByPlayer, leaderId = 'p1', players = PLAYERS) {
  const roster = Array.from({ length: 200 }, (_, index) => makeCard(1000 + index));
  const game = createGame(players, roster);

  players.forEach((player, index) => {
    game.players[index].deck = makeDeck((index + 1) * 100, attackByPlayer[player.id]);
  });
  game.leaderId = leaderId;
  return game;
}

// The leader picks "statKey", everyone else plays. Returns the last playCard outcome.
function playRound(game, statKey = 'attack') {
  const leaderId = game.leaderId; // read once: the leader changes when the round ends
  chooseStat(game, leaderId, statKey);

  let outcome;
  for (const player of game.players) {
    if (player.id !== leaderId) outcome = playCard(game, player.id);
  }
  return outcome;
}

function expectRuleError(action, code) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(GameRuleError);
    expect(error.code).toBe(code);
    return;
  }
  throw new Error(`Expected a GameRuleError with code ${code}`);
}

describe('createGame', () => {
  it('starts at round 1 with 20 unique hidden cards each and a random leader', () => {
    const roster = Array.from({ length: 200 }, (_, index) => makeCard(index + 1));
    const game = createGame(PLAYERS, roster);

    expect(game.round).toBe(1);
    expect(game.phase).toBe(PHASES.CHOOSING_STAT);
    expect(PLAYERS.map((player) => player.id)).toContain(game.leaderId);

    const allIds = game.players.flatMap((player) => player.deck.map((card) => card.id));
    expect(allIds).toHaveLength(60);
    expect(new Set(allIds).size).toBe(60);
  });

  it('rejects too few or too many players', () => {
    const roster = Array.from({ length: 200 }, (_, index) => makeCard(index + 1));
    const seven = Array.from({ length: 7 }, (_, index) => ({ id: `p${index}`, name: 'X' }));

    expectRuleError(() => createGame([PLAYERS[0]], roster), 'INVALID_PLAYER_COUNT');
    expectRuleError(() => createGame(seven, roster), 'INVALID_PLAYER_COUNT');
  });
});

describe('chooseStat and playCard validation', () => {
  it('only lets the leader choose, and only a real stat', () => {
    const game = setupGame({ p1: repeat(50, 20), p2: repeat(50, 20), p3: repeat(50, 20) });

    expectRuleError(() => chooseStat(game, 'p2', 'attack'), 'NOT_LEADER');
    expectRuleError(() => chooseStat(game, 'p1', 'luck'), 'INVALID_STAT');
    expectRuleError(() => chooseStat(game, 'nobody', 'attack'), 'NOT_IN_GAME');

    chooseStat(game, 'p1', 'attack');
    expect(game.phase).toBe(PHASES.PLAYING_CARDS);
  });

  it('does not let anyone play before the stat is chosen', () => {
    const game = setupGame({ p1: repeat(50, 20), p2: repeat(50, 20), p3: repeat(50, 20) });
    expectRuleError(() => playCard(game, 'p2'), 'WRONG_PHASE');
  });

  it('does not let a player play twice, the leader included', () => {
    const game = setupGame({ p1: repeat(50, 20), p2: repeat(50, 20), p3: repeat(50, 20) });
    chooseStat(game, 'p1', 'attack');
    playCard(game, 'p2');

    expectRuleError(() => playCard(game, 'p2'), 'ALREADY_PLAYED');
    expectRuleError(() => playCard(game, 'p1'), 'ALREADY_PLAYED');
  });

  it('does not let the leader choose a stat twice', () => {
    const game = setupGame({ p1: repeat(50, 20), p2: repeat(50, 20), p3: repeat(50, 20) });
    chooseStat(game, 'p1', 'attack');
    expectRuleError(() => chooseStat(game, 'p1', 'speed'), 'WRONG_PHASE');
  });
});

describe('scoring a round', () => {
  it('gives the round to the highest value, and that player leads next', () => {
    const game = setupGame({
      p1: [80, ...repeat(50, 19)],
      p2: [90, ...repeat(50, 19)],
      p3: [70, ...repeat(50, 19)],
    });

    const { result } = playRound(game);

    expect(result.winnerId).toBe('p2');
    expect(result.plays.map((entry) => entry.value)).toEqual([80, 90, 70]);
    expect(game.players[1].roundWins).toBe(1);
    expect(game.leaderId).toBe('p2');
    expect(game.round).toBe(2);
    expect(game.phase).toBe(PHASES.CHOOSING_STAT);
  });

  it('gives a rank round to the lowest rank', () => {
    const game = setupGame({ p1: repeat(50, 20), p2: repeat(50, 20), p3: repeat(50, 20) });
    // Deck ids start at 100, 200 and 300, so rank equals the card id
    game.players[1].deck[0] = makeCard(3, { rank: 3 });

    const { result } = playRound(game, 'rank');

    expect(result.winnerId).toBe('p2');
  });

  it('scores nothing on a tie, uses up the cards, and the same leader goes again', () => {
    const game = setupGame({
      p1: [80, ...repeat(50, 19)],
      p2: [80, ...repeat(50, 19)],
      p3: [10, ...repeat(50, 19)],
    });

    const { result } = playRound(game);

    expect(result.winnerId).toBeNull();
    expect(game.players.every((player) => player.roundWins === 0)).toBe(true);
    expect(game.leaderId).toBe('p1');
    expect(game.round).toBe(2);
    // round 2 uses the next card, so the tied cards are gone for good
    expect(getPrivateView(game, 'p1').currentCard.id).toBe(101);
  });
});

describe('hidden information', () => {
  it('only reveals the leader card after the stat is chosen', () => {
    const game = setupGame({ p1: repeat(50, 20), p2: repeat(50, 20), p3: repeat(50, 20) });

    expect(getPublicState(game).playedCards).toEqual([]);

    chooseStat(game, 'p1', 'attack');
    const state = getPublicState(game);

    expect(state.playedCards).toHaveLength(1);
    expect(state.playedCards[0].playerId).toBe('p1');
    expect(state.chosenStat).toBe('attack');
  });

  it('never puts a deck or an unplayed card in the public state', () => {
    const game = setupGame({ p1: repeat(50, 20), p2: repeat(50, 20), p3: repeat(50, 20) });
    chooseStat(game, 'p1', 'attack');

    const text = JSON.stringify(getPublicState(game));

    expect(text).not.toContain('deck');
    expect(text).not.toContain('card-200'); // p2's first card
    expect(text).not.toContain('card-300'); // p3's first card
    expect(text).toContain('card-100'); // p1's card is public once played
  });

  it('gives each player only their own current card', () => {
    const game = setupGame({ p1: repeat(50, 20), p2: repeat(50, 20), p3: repeat(50, 20) });

    expect(getPrivateView(game, 'p2').currentCard.id).toBe(200);
    expect(getPrivateView(game, 'p3').currentCard.id).toBe(300);
  });

  it('shows what each player may do and hides a card once it is played', () => {
    const game = setupGame({ p1: repeat(50, 20), p2: repeat(50, 20), p3: repeat(50, 20) });

    expect(getPrivateView(game, 'p1').canChooseStat).toBe(true);
    expect(getPrivateView(game, 'p2').canChooseStat).toBe(false);
    expect(getPrivateView(game, 'p2').canPlayCard).toBe(false);

    chooseStat(game, 'p1', 'attack');
    expect(getPrivateView(game, 'p1').currentCard).toBeNull(); // already revealed
    expect(getPrivateView(game, 'p2').canPlayCard).toBe(true);

    playCard(game, 'p2');
    expect(getPrivateView(game, 'p2').currentCard).toBeNull();
    expect(getPrivateView(game, 'p2').canPlayCard).toBe(false);
  });
});

describe('a full game', () => {
  it('ends after 20 rounds and names the player with the most wins', () => {
    const game = setupGame({ p1: repeat(100, 20), p2: repeat(50, 20), p3: repeat(10, 20) });

    let outcome;
    for (let round = 1; round <= ROUNDS_PER_GAME; round += 1) {
      outcome = playRound(game);
    }

    expect(game.phase).toBe(PHASES.FINISHED);
    expect(outcome.finalResult.winnerIds).toEqual(['p1']);
    expect(getFinalResult(game).scores[0]).toEqual({ playerId: 'p1', name: 'Ash', roundWins: 20 });
  });

  it('shares the win when two players finish level', () => {
    const twoPlayers = PLAYERS.slice(0, 2);
    const game = setupGame(
      {
        p1: [...repeat(100, 10), ...repeat(1, 10)],
        p2: [...repeat(1, 10), ...repeat(100, 10)],
      },
      'p1',
      twoPlayers,
    );

    let outcome;
    for (let round = 1; round <= ROUNDS_PER_GAME; round += 1) {
      outcome = playRound(game);
    }

    expect(outcome.finalResult.winnerIds).toEqual(['p1', 'p2']);
  });

  it('shares the win between everyone when every round was a tie', () => {
    const game = setupGame({ p1: repeat(50, 20), p2: repeat(50, 20), p3: repeat(50, 20) });

    let outcome;
    for (let round = 1; round <= ROUNDS_PER_GAME; round += 1) {
      outcome = playRound(game);
    }

    expect(outcome.finalResult.winnerIds).toEqual(['p1', 'p2', 'p3']);
  });

  it('allows no more moves once the game is over', () => {
    const game = setupGame({ p1: repeat(100, 20), p2: repeat(50, 20), p3: repeat(10, 20) });
    for (let round = 1; round <= ROUNDS_PER_GAME; round += 1) playRound(game);

    expectRuleError(() => chooseStat(game, 'p1', 'attack'), 'WRONG_PHASE');
    expectRuleError(() => playCard(game, 'p2'), 'WRONG_PHASE');
    expect(getPrivateView(game, 'p1').currentCard).toBeNull();
  });

  it('refuses to report a final result before the game is over', () => {
    const game = setupGame({ p1: repeat(50, 20), p2: repeat(50, 20), p3: repeat(50, 20) });
    expectRuleError(() => getFinalResult(game), 'GAME_NOT_FINISHED');
  });
});
