import {
  MIN_PLAYERS,
  MAX_PLAYERS,
  CARDS_PER_PLAYER,
  ROUNDS_PER_GAME,
  isStatKey,
} from '@pokemon-game/shared';
import { dealDecks } from './deckService.js';
import { findRoundWinnerId, findGameWinnerIds } from './rulesService.js';
import { GameRuleError } from './gameErrors.js';
import { defaultRandom, pickRandom } from '../utils/random.js';

export const PHASES = {
  CHOOSING_STAT: 'choosing-stat', // the leader has not picked a stat yet
  PLAYING_CARDS: 'playing-cards', // waiting for the other players' cards
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

function hasPlayed(game, playerId) {
  return game.plays.some((play) => play.playerId === playerId);
}

// Every round uses the next card in each deck: round 1 -> index 0, round 2 -> index 1, ...
function currentCardOf(game, player) {
  return player.deck[game.round - 1];
}

// Scores the round, then either moves to the next round or ends the game.
function resolveRound(game) {
  const winnerId = findRoundWinnerId(game.chosenStat, game.plays);
  if (winnerId) {
    findPlayer(game, winnerId).roundWins += 1;
  }

  const result = {
    round: game.round,
    stat: game.chosenStat,
    plays: game.plays.map(({ playerId, card }) => ({
      playerId,
      card,
      value: card.stats[game.chosenStat],
    })),
    winnerId, // null means a tie
    nextLeaderId: winnerId ?? game.leaderId, // on a tie the same leader goes again
  };

  game.plays = [];
  game.chosenStat = null;

  if (game.round >= ROUNDS_PER_GAME) {
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
export function createGame(players, allCards, random = defaultRandom) {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new GameRuleError(
      'INVALID_PLAYER_COUNT',
      `A game needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players`,
    );
  }

  const decks = dealDecks(allCards, players.length, CARDS_PER_PLAYER, random);

  return {
    players: players.map((player, index) => ({
      id: player.id,
      name: player.name,
      deck: decks[index], // hidden: never send this to any client
      roundWins: 0,
    })),
    leaderId: pickRandom(players, random).id, // random leader for round 1
    round: 1,
    phase: PHASES.CHOOSING_STAT,
    chosenStat: null,
    plays: [], // cards revealed so far this round: [{ playerId, card }]
  };
}

// The leader picks a stat. Their current card is played (revealed) at the same time.
export function chooseStat(game, playerId, statKey) {
  requirePhase(game, PHASES.CHOOSING_STAT);
  const leader = findPlayer(game, playerId);

  if (leader.id !== game.leaderId) {
    throw new GameRuleError('NOT_LEADER', 'Only the round leader can choose the stat');
  }
  if (!isStatKey(statKey)) {
    throw new GameRuleError('INVALID_STAT', 'That stat does not exist');
  }

  const card = currentCardOf(game, leader);
  game.chosenStat = statKey;
  game.plays.push({ playerId: leader.id, card });
  game.phase = PHASES.PLAYING_CARDS;

  return { stat: statKey, card };
}

// Another player plays their current card. When the last card arrives, the round is scored.
// "result" is null until the round is complete. "finalResult" is null until the game is over.
export function playCard(game, playerId) {
  requirePhase(game, PHASES.PLAYING_CARDS);
  const player = findPlayer(game, playerId);

  if (hasPlayed(game, player.id)) {
    throw new GameRuleError('ALREADY_PLAYED', 'You already played a card this round');
  }

  const card = currentCardOf(game, player);
  game.plays.push({ playerId: player.id, card });

  if (game.plays.length < game.players.length) {
    return { card, result: null, finalResult: null };
  }

  const result = resolveRound(game);
  const finalResult = game.phase === PHASES.FINISHED ? getFinalResult(game) : null;
  return { card, result, finalResult };
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

// ---------- what each side may see ----------

// Safe to send to every player: no decks, only cards that were already played.
export function getPublicState(game) {
  return {
    phase: game.phase,
    round: game.round,
    totalRounds: ROUNDS_PER_GAME,
    leaderId: game.leaderId,
    chosenStat: game.chosenStat,
    players: game.players.map((player) => ({
      id: player.id,
      name: player.name,
      roundWins: player.roundWins,
      hasPlayed: hasPlayed(game, player.id),
    })),
    playedCards: game.plays.map(({ playerId, card }) => ({ playerId, card })),
  };
}

// Sent only to that one player: their own current card and what they may do.
export function getPrivateView(game, playerId) {
  const player = findPlayer(game, playerId);
  const alreadyPlayed = hasPlayed(game, playerId);
  const isFinished = game.phase === PHASES.FINISHED;

  return {
    currentCard: isFinished || alreadyPlayed ? null : currentCardOf(game, player),
    canChooseStat: game.phase === PHASES.CHOOSING_STAT && game.leaderId === playerId,
    canPlayCard: game.phase === PHASES.PLAYING_CARDS && !alreadyPlayed,
  };
}
