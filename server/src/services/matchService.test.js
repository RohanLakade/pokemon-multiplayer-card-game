import { describe, it, expect } from 'vitest';
import { HAND_SIZE, MAX_PLAYERS } from '@pokemon-game/shared';
import {
  PHASES,
  chooseCard,
  chooseStat,
  createGame,
  getFinalResult,
  getPendingPlayerIds,
  getPrivateView,
  getPublicState,
  getRandomCardId,
} from './matchService.js';
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
    bst: 300,
    tier: 'C',
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

// A roster big enough to deal real tiered decks: 50 cards in each of the 4 tiers
function makeRoster() {
  const roster = [];
  let id = 1000;
  for (const [tierIndex, tier] of ['S', 'A', 'B', 'C'].entries()) {
    for (let i = 0; i < 50; i += 1) {
      roster.push({ ...makeCard(id), tier, bst: 700 - tierIndex * 100 - i });
      id += 1;
    }
  }
  return roster;
}

function repeat(value, times) {
  return Array.from({ length: times }, () => value);
}

// Creates a real game, then swaps in hands and piles we control, so results are predictable.
// attackByPlayer gives one attack value per card: the first 5 are the hand, the rest the pile.
// Card ids are 100.. for p1, 200.. for p2 and 300.. for p3.
function setupGame(attackByPlayer, { deckSize = 10, leaderId = 'p1', players = PLAYERS } = {}) {
  const game = createGame(players, makeRoster(), deckSize);

  players.forEach((player, index) => {
    const cards = attackByPlayer[player.id].map((attack, i) =>
      makeCard((index + 1) * 100 + i, { attack }),
    );
    game.players[index].hand = cards.slice(0, HAND_SIZE);
    game.players[index].drawPile = cards.slice(HAND_SIZE);
  });
  game.leaderId = leaderId;
  return game;
}

// The leader picks the stat, then every player picks the first card of their hand.
// Returns what the last pick returned (the round result).
function playRound(game, statKey = 'attack') {
  const leaderId = game.leaderId; // read once: the leader changes when the round ends
  chooseStat(game, leaderId, statKey);

  let outcome;
  for (const player of game.players) {
    outcome = chooseCard(game, player.id, player.hand[0].id);
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

const ALL_FIFTY = { p1: repeat(50, 10), p2: repeat(50, 10), p3: repeat(50, 10) };

describe('createGame', () => {
  it('deals each player a hand of 5 and a draw pile, with every card unique', () => {
    const game = createGame(PLAYERS, makeRoster(), 10);

    for (const player of game.players) {
      expect(player.hand).toHaveLength(5);
      expect(player.drawPile).toHaveLength(5);
    }
    const ids = game.players
      .flatMap((player) => [...player.hand, ...player.drawPile])
      .map((c) => c.id);
    expect(new Set(ids).size).toBe(30);

    expect(game.round).toBe(1);
    expect(game.phase).toBe(PHASES.CHOOSING_STAT);
    expect(PLAYERS.map((player) => player.id)).toContain(game.leaderId);
    expect(getPublicState(game).totalRounds).toBe(10);
  });

  it('rejects a wrong number of players or an unknown deck size', () => {
    const tooMany = Array.from({ length: MAX_PLAYERS + 1 }, (_, index) => ({
      id: `p${index}`,
      name: 'X',
    }));

    expectRuleError(() => createGame([PLAYERS[0]], makeRoster(), 10), 'INVALID_PLAYER_COUNT');
    expectRuleError(() => createGame(tooMany, makeRoster(), 10), 'INVALID_PLAYER_COUNT');
    expectRuleError(() => createGame(PLAYERS, makeRoster(), 12), 'INVALID_DECK_SIZE');
  });
});

describe('choosing the stat and the cards', () => {
  it('lets only the leader choose the stat, and only a real stat', () => {
    const game = setupGame(ALL_FIFTY);

    expectRuleError(() => chooseStat(game, 'p2', 'attack'), 'NOT_LEADER');
    expectRuleError(() => chooseStat(game, 'p1', 'luck'), 'INVALID_STAT');
    expectRuleError(() => chooseStat(game, 'nobody', 'attack'), 'NOT_IN_GAME');

    chooseStat(game, 'p1', 'attack');
    expect(game.phase).toBe(PHASES.CHOOSING_CARDS);
    expectRuleError(() => chooseStat(game, 'p1', 'speed'), 'WRONG_PHASE');
  });

  it('does not let anyone pick a card before the stat is chosen', () => {
    const game = setupGame(ALL_FIFTY);

    expectRuleError(() => chooseCard(game, 'p2', 200), 'WRONG_PHASE');
  });

  it("only accepts a card from the player's own hand, once", () => {
    const game = setupGame(ALL_FIFTY);
    chooseStat(game, 'p1', 'attack');

    expectRuleError(() => chooseCard(game, 'p1', 999), 'CARD_NOT_IN_HAND');
    expectRuleError(() => chooseCard(game, 'p1', 200), 'CARD_NOT_IN_HAND'); // p2's card
    expectRuleError(() => chooseCard(game, 'p1', 105), 'CARD_NOT_IN_HAND'); // still in the pile
    expectRuleError(() => chooseCard(game, 'nobody', 100), 'NOT_IN_GAME');

    chooseCard(game, 'p1', 100);
    expectRuleError(() => chooseCard(game, 'p1', 101), 'ALREADY_PICKED');
  });
});

describe('scoring a round', () => {
  it('gives the round to the highest value and refills only the played cards', () => {
    const game = setupGame({
      p1: [80, ...repeat(50, 9)],
      p2: [90, ...repeat(50, 9)],
      p3: [70, ...repeat(50, 9)],
    });

    const { result } = playRound(game);

    expect(result.winnerId).toBe('p2');
    expect(result.plays.map((play) => play.value)).toEqual([80, 90, 70]); // in seat order
    expect(game.players[1].roundWins).toBe(1);
    expect(game.leaderId).toBe('p2');
    expect(game.round).toBe(2);
    expect(game.phase).toBe(PHASES.CHOOSING_STAT);

    // p1 played card 100: the other four stay, and the top of the pile (105) joins the hand
    const [p1] = game.players;
    expect(p1.hand.map((card) => card.id)).toEqual([101, 102, 103, 104, 105]);
    expect(p1.drawPile).toHaveLength(4);
  });

  it('plays the card the player chose, not just the first one', () => {
    const game = setupGame({
      p1: [50, 50, 50, 999, ...repeat(50, 6)],
      p2: repeat(60, 10),
      p3: repeat(60, 10),
    });

    chooseStat(game, 'p1', 'attack');
    chooseCard(game, 'p2', 200);
    chooseCard(game, 'p3', 300);
    const { result } = chooseCard(game, 'p1', 103);

    expect(result.winnerId).toBe('p1');
    expect(result.plays[0].card.id).toBe(103);
    expect(game.players[0].hand.map((card) => card.id)).toEqual([100, 101, 102, 104, 105]);
  });

  it('gives a rank round to the lowest rank', () => {
    const game = setupGame(ALL_FIFTY);
    game.players[1].hand[0] = makeCard(3, { rank: 3 }); // a low Pokédex number

    const { result } = playRound(game, 'rank');

    expect(result.winnerId).toBe('p2');
  });

  it('scores nothing on a tie, discards the cards, and the same leader goes again', () => {
    const game = setupGame({
      p1: [80, ...repeat(50, 9)],
      p2: [80, ...repeat(50, 9)],
      p3: [10, ...repeat(50, 9)],
    });

    const { result } = playRound(game);

    expect(result.winnerId).toBeNull();
    expect(game.players.every((player) => player.roundWins === 0)).toBe(true);
    expect(game.leaderId).toBe('p1');
    expect(game.round).toBe(2);
    expect(game.players[0].hand.map((card) => card.id)).toEqual([101, 102, 103, 104, 105]);
  });
});

describe('hidden information', () => {
  it('never puts hands, piles or picked cards in the public state', () => {
    const game = setupGame(ALL_FIFTY);
    chooseStat(game, 'p1', 'attack');
    chooseCard(game, 'p1', 100);

    const state = getPublicState(game);
    const text = JSON.stringify(state);

    expect(text).not.toContain('card-');
    expect(text).not.toContain('"hand"');
    expect(text).not.toContain('"drawPile"');
    expect(text).not.toContain('"cardId"');

    // Only the fact that p1 has picked, and how many cards everybody holds
    expect(state.players[0].hasPicked).toBe(true);
    expect(state.players[1].hasPicked).toBe(false);
    expect(state.players[0]).toMatchObject({ handSize: 5, cardsLeft: 10 });
  });

  it('gives each player only their own hand and pick', () => {
    const game = setupGame(ALL_FIFTY);
    chooseStat(game, 'p1', 'attack');
    chooseCard(game, 'p1', 102);

    const p1 = getPrivateView(game, 'p1');
    const p2 = getPrivateView(game, 'p2');

    expect(p1.hand.map((card) => card.id)).toEqual([100, 101, 102, 103, 104]);
    expect(p2.hand.map((card) => card.id)).toEqual([200, 201, 202, 203, 204]);
    expect(p1.pickedCardId).toBe(102);
    expect(p2.pickedCardId).toBeNull();
    expect(p1.canChooseCard).toBe(false);
    expect(p2.canChooseCard).toBe(true);
  });

  it('says who may choose the stat', () => {
    const game = setupGame(ALL_FIFTY);

    expect(getPrivateView(game, 'p1').canChooseStat).toBe(true);
    expect(getPrivateView(game, 'p2').canChooseStat).toBe(false);
    expect(getPrivateView(game, 'p1').canChooseCard).toBe(false); // the stat comes first
  });
});

describe('who the game is waiting for', () => {
  it('waits for the leader, then for everyone who has not picked', () => {
    const game = setupGame(ALL_FIFTY);
    expect(getPendingPlayerIds(game)).toEqual(['p1']);

    chooseStat(game, 'p1', 'attack');
    expect(getPendingPlayerIds(game)).toEqual(['p1', 'p2', 'p3']);

    chooseCard(game, 'p2', 200);
    expect(getPendingPlayerIds(game)).toEqual(['p1', 'p3']);
  });

  it('chooses a random card from the hand when asked', () => {
    const game = setupGame(ALL_FIFTY);

    expect(getRandomCardId(game, 'p1', () => 2)).toBe(102);
  });
});

describe('a whole game', () => {
  it('shrinks the hand at the end and finishes after as many rounds as the deck has cards', () => {
    const game = setupGame(ALL_FIFTY); // every round is a tie, so the leader never changes
    const handSizes = [];

    for (let round = 1; round <= 10; round += 1) {
      handSizes.push(game.players[0].hand.length);
      playRound(game);
    }

    expect(handSizes).toEqual([5, 5, 5, 5, 5, 5, 4, 3, 2, 1]);
    expect(game.phase).toBe(PHASES.FINISHED);
    expect(game.players.every((player) => player.hand.length === 0)).toBe(true);
  });

  it('names the player with the most round wins', () => {
    const game = setupGame({ p1: repeat(100, 10), p2: repeat(50, 10), p3: repeat(10, 10) });

    let outcome;
    for (let round = 1; round <= 10; round += 1) outcome = playRound(game);

    expect(outcome.finalResult.winnerIds).toEqual(['p1']);
    expect(getFinalResult(game).scores[0]).toEqual({ playerId: 'p1', name: 'Ash', roundWins: 10 });
  });

  it('lets players with the same total all win', () => {
    const twoPlayers = PLAYERS.slice(0, 2);
    const game = setupGame(
      {
        p1: [...repeat(100, 5), ...repeat(1, 5)],
        p2: [...repeat(1, 5), ...repeat(100, 5)],
      },
      { players: twoPlayers },
    );

    let outcome;
    for (let round = 1; round <= 10; round += 1) outcome = playRound(game);

    expect(outcome.finalResult.winnerIds).toEqual(['p1', 'p2']);
  });

  it('shares the win between everyone when every round was a tie', () => {
    const game = setupGame(ALL_FIFTY);

    let outcome;
    for (let round = 1; round <= 10; round += 1) outcome = playRound(game);

    expect(outcome.finalResult.winnerIds).toEqual(['p1', 'p2', 'p3']);
  });

  it('allows no more moves once the game is over, and no result before it', () => {
    const game = setupGame({ p1: repeat(100, 10), p2: repeat(50, 10), p3: repeat(10, 10) });
    expectRuleError(() => getFinalResult(game), 'GAME_NOT_FINISHED');

    for (let round = 1; round <= 10; round += 1) playRound(game);

    expectRuleError(() => chooseStat(game, 'p1', 'attack'), 'WRONG_PHASE');
    expectRuleError(() => chooseCard(game, 'p2', 200), 'WRONG_PHASE');
    expect(getPendingPlayerIds(game)).toEqual([]);
  });
});
