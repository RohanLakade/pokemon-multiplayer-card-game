import {
  MIN_PLAYERS,
  chooseCardPayloadSchema,
  chooseStatPayloadSchema,
  setAutoPlayPayloadSchema,
  setTimerPayloadSchema,
} from '@pokemon-game/shared';
import { getPrivateView } from '../services/matchService.js';
import { GameRuleError } from '../services/gameErrors.js';
import { getContext } from './context.js';

function requireGame(room) {
  if (!room.game) {
    throw new GameRuleError('GAME_NOT_STARTED', 'The game has not started yet');
  }
}

function requirePlaying(room) {
  requireGame(room);
  if (room.status !== 'playing') {
    throw new GameRuleError('WRONG_PHASE', 'That action is not allowed right now');
  }
}

// These handlers only check who is asking and whether it is allowed.
// Running the game (events, scoring, the turn timer, auto-play) is the job of "flow" (gameFlow.js).
export function registerGameHandlers({ io, socket, on, flow }) {
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

    flow.startGame(io, room);
    return {};
  });

  on('round:choose-stat', { schema: chooseStatPayloadSchema }, ({ stat }) => {
    const { room, player } = getContext(socket);
    requireGame(room);

    flow.handleChooseStat(io, room, player, stat);
    return { you: getPrivateView(room.game, player.id) };
  });

  on('round:choose-card', { schema: chooseCardPayloadSchema }, ({ cardId }) => {
    const { room, player } = getContext(socket);
    requireGame(room);

    flow.handleChooseCard(io, room, player, cardId);
    return { you: getPrivateView(room.game, player.id) };
  });

  // A player steps away on purpose: while it is on, their moves are made for them at once
  on('player:set-auto-play', { schema: setAutoPlayPayloadSchema }, ({ enabled }) => {
    const { room, player } = getContext(socket);
    requirePlaying(room);

    flow.handleSetAutoPlay(io, room, player, enabled);
    return { you: getPrivateView(room.game, player.id) };
  });

  // Any player starts the turn timer. Only the player who started it can stop it.
  on('timer:set', { schema: setTimerPayloadSchema }, ({ enabled }) => {
    const { room, player } = getContext(socket);
    requirePlaying(room);

    flow.handleSetTimer(io, room, player, enabled);
    return {};
  });
}
