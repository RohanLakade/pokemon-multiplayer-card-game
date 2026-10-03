import { MIN_PLAYERS, chooseStatPayloadSchema } from '@pokemon-game/shared';
import {
  createGame,
  chooseStat,
  playCard,
  getPublicState,
  getPrivateView,
} from '../services/gameService.js';
import { GameRuleError } from '../services/gameErrors.js';
import { getContext } from './context.js';
import { emitToEachPlayer, sendRoundStarted } from './emitters.js';

function requireGame(room) {
  if (!room.game) {
    throw new GameRuleError('GAME_NOT_STARTED', 'The game has not started yet');
  }
}

function toScores(game) {
  return getPublicState(game).players.map(({ id, name, roundWins }) => ({
    playerId: id,
    name,
    roundWins,
  }));
}

export function registerGameHandlers({ io, socket, on, cards }) {
  on('game:start', {}, () => {
    const { room, player } = getContext(socket);

    if (room.hostId !== player.id) {
      throw new GameRuleError('NOT_HOST', 'Only the host can start the game');
    }
    if (room.status !== 'lobby') {
      throw new GameRuleError('GAME_IN_PROGRESS', 'The game has already started');
    }
    if (room.players.length < MIN_PLAYERS) {
      throw new GameRuleError('NOT_ENOUGH_PLAYERS', `At least ${MIN_PLAYERS} players are needed`);
    }

    room.game = createGame(
      room.players.map(({ id, name }) => ({ id, name })),
      cards,
    );
    room.status = 'playing';

    emitToEachPlayer(io, room, 'game:started', () => ({ game: getPublicState(room.game) }));
    sendRoundStarted(io, room);
    return {};
  });

  on('round:choose-stat', { schema: chooseStatPayloadSchema }, ({ stat }) => {
    const { room, player } = getContext(socket);
    requireGame(room);

    // chooseStat checks that this player is the leader and that the stat is allowed
    const { card } = chooseStat(room.game, player.id, stat);

    // The leader's card is now revealed to everyone; each player gets their updated options
    emitToEachPlayer(io, room, 'round:stat-chosen', (member) => ({
      round: room.game.round,
      leaderId: player.id,
      stat,
      card,
      you: getPrivateView(room.game, member.id),
    }));

    return { you: getPrivateView(room.game, player.id) };
  });

  on('round:play-card', {}, () => {
    const { room, player } = getContext(socket);
    requireGame(room);

    const round = room.game.round; // read before playing: a finished round moves the game on
    const { card, result, finalResult } = playCard(room.game, player.id);

    emitToEachPlayer(io, room, 'round:card-played', () => ({
      round,
      playerId: player.id,
      card,
    }));

    if (result) {
      emitToEachPlayer(io, room, 'round:result', () => ({
        ...result,
        scores: toScores(room.game),
      }));

      if (finalResult) {
        room.status = 'finished';
        emitToEachPlayer(io, room, 'game:over', () => finalResult);
      } else {
        sendRoundStarted(io, room);
      }
    }

    return { you: getPrivateView(room.game, player.id) };
  });
}
