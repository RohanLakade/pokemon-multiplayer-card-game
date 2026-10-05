import {
  DECK_SIZES,
  DEFAULT_DECK_SIZE,
  HAND_SIZE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  isStatKey,
} from '@pokemon-game/shared';
import { defaultRandom, pickRandom } from '../utils/random.js';
import { dealDecks } from './dealService.js';
import { GameRuleError } from './gameErrors.js';
import { findGameWinnerIds, findRoundWinnerId } from './rulesService.js';

export const PHASES = {
  CHOOSING_STAT: 'choosing-stat', // the leader has not picked a stat yet
  CHOOSING_CARDS: 'choosing-cards', // everyone picks a card, in secret
  FINISHED: 'finished',
};

// ---------- helpers (not exported) ----------

function findPlayer(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  if (!player) {
    throw new GameRuleError('NOT_IN_GAME', 'You are not part of this game');
  }
  return player;
}

function requirePhase(game, phase) {
  if (game.phase !== phase) {
    throw new GameRuleError('WRONG_PHASE', 'That action is not allowed right now');
  }
}

function hasPicked(game, playerId) {
  return game.picks.some((pick) => pick.playerId === playerId);
}

// Everybody has picked: reveal the cards together, score the round, refill the hands.
function resolveRound(game) {
  // Listed in seat order, so the order does not show who picked first
  const plays = game.players.map((player) => {
    const pick = game.picks.find((candidate) => candidate.playerId === player.id);
    return { playerId: player.id, card: player.hand.find((card) => card.id === pick.cardId) };
  });

  const winnerId = findRoundWinnerId(game.chosenStat, plays);
  if (winnerId) {
    findPlayer(game, winnerId).roundWins += 1;
  }

  const result = {
    round: game.round,
    stat: game.chosenStat,
    plays: plays.map(({ playerId, card }) => ({
      playerId,
      card,
      value: card.stats[game.chosenStat],
    })),
    winnerId, // null means a tie
    nextLeaderId: winnerId ?? game.leaderId, // on a tie the same leader goes again
  };

  // Played cards are discarded for good. Each player draws one new card while their pile lasts,
  // so the hand stays at 5 cards, then shrinks at the end of the game.
  for (const { playerId, card } of plays) {
    const player = findPlayer(game, playerId);
    player.hand = player.hand.filter((handCard) => handCard.id !== card.id);

    const drawnCard = player.drawPile.shift();
    if (drawnCard) player.hand.push(drawnCard);
  }

  game.picks = [];
  game.chosenStat = null;

  if (game.round >= game.deckSize) {
    game.phase = PHASES.FINISHED;
  } else {
    game.round += 1;
    game.leaderId = result.nextLeaderId;
    game.phase = PHASES.CHOOSING_STAT;
  }

  return result;
}

// ---------- actions ----------

// players looks like [{ id, name }]. The ids come from the server, never from the client.
// The game lasts as many rounds as the deck has cards.
export function createGame(
  players,
  allCards,
  deckSize = DEFAULT_DECK_SIZE,
  random = defaultRandom,
) {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new GameRuleError(
      'INVALID_PLAYER_COUNT',
      `A game needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players`,
    );
  }
  if (!DECK_SIZES.includes(deckSize)) {
    throw new GameRuleError('INVALID_DECK_SIZE', 'That deck size is not allowed');
  }

  const decks = dealDecks(allCards, players.length, deckSize, random);

  return {
    players: players.map((player, index) => ({
      id: player.id,
      name: player.name,
      hand: decks[index].slice(0, HAND_SIZE), // the 5 cards this player can play now
      drawPile: decks[index].slice(HAND_SIZE), // hidden: never sent to any client
      roundWins: 0,
    })),
    deckSize,
    leaderId: pickRandom(players, random).id, // random leader for round 1
    round: 1,
    phase: PHASES.CHOOSING_STAT,
    chosenStat: null,
    picks: [], // secret picks this round: [{ playerId, cardId }]
  };
}

// The leader picks the stat. Nobody's card is revealed yet.
export function chooseStat(game, playerId, statKey) {
  requirePhase(game, PHASES.CHOOSING_STAT);
  const leader = findPlayer(game, playerId);

  if (leader.id !== game.leaderId) {
    throw new GameRuleError('NOT_LEADER', 'Only the round leader can choose the stat');
  }
  if (!isStatKey(statKey)) {
    throw new GameRuleError('INVALID_STAT', 'That stat does not exist');
  }

  game.chosenStat = statKey;
  game.phase = PHASES.CHOOSING_CARDS;
  return { stat: statKey };
}

// A player secretly picks a card from their hand. When the last pick arrives, the round is scored.
// "result" is null until the round is complete. "finalResult" is null until the game is over.
export function chooseCard(game, playerId, cardId) {
  requirePhase(game, PHASES.CHOOSING_CARDS);
  const player = findPlayer(game, playerId);

  if (hasPicked(game, player.id)) {
    throw new GameRuleError('ALREADY_PICKED', 'You already picked a card this round');
  }
  if (!player.hand.some((card) => card.id === cardId)) {
    throw new GameRuleError('CARD_NOT_IN_HAND', 'That card is not in your hand');
  }

  game.picks.push({ playerId: player.id, cardId });

  if (game.picks.length < game.players.length) {
    return { result: null, finalResult: null };
  }

  const result = resolveRound(game);
  const finalResult = game.phase === PHASES.FINISHED ? getFinalResult(game) : null;
  return { result, finalResult };
}

export function getFinalResult(game) {
  if (game.phase !== PHASES.FINISHED) {
    throw new GameRuleError('GAME_NOT_FINISHED', 'The game is not over yet');
  }

  return {
    winnerIds: findGameWinnerIds(game.players),
    scores: game.players.map(({ id, name, roundWins }) => ({ playerId: id, name, roundWins })),
  };
}

// ---------- the turn timer needs these ----------

// Who still has to do something before the game can move on?
export function getPendingPlayerIds(game) {
  if (game.phase === PHASES.CHOOSING_STAT) {
    return [game.leaderId];
  }
  if (game.phase === PHASES.CHOOSING_CARDS) {
    return game.players.filter((player) => !hasPicked(game, player.id)).map((player) => player.id);
  }
  return [];
}

// When time runs out, the card for a player who did not pick is chosen at random.
export function getRandomCardId(game, playerId, random = defaultRandom) {
  return pickRandom(findPlayer(game, playerId).hand, random).id;
}

// ---------- what each side may see ----------

// Safe to send to every player: no hands, no piles and no picks. Only how many cards are left.
export function getPublicState(game) {
  return {
    phase: game.phase,
    round: game.round,
    totalRounds: game.deckSize,
    leaderId: game.leaderId,
    chosenStat: game.chosenStat,
    players: game.players.map((player) => ({
      id: player.id,
      name: player.name,
      roundWins: player.roundWins,
      hasPicked: hasPicked(game, player.id),
      handSize: player.hand.length,
      cardsLeft: player.hand.length + player.drawPile.length,
    })),
  };
}

// Sent only to that one player: their own hand, their own pick and what they may do.
export function getPrivateView(game, playerId) {
  const player = findPlayer(game, playerId);
  const pick = game.picks.find((candidate) => candidate.playerId === playerId);

  return {
    hand: player.hand,
    pickedCardId: pick ? pick.cardId : null,
    canChooseStat: game.phase === PHASES.CHOOSING_STAT && game.leaderId === playerId,
    canChooseCard: game.phase === PHASES.CHOOSING_CARDS && !pick,
  };
}
