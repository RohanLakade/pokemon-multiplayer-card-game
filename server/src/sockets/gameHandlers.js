import { MIN_PLAYERS, chooseStatPayloadSchema } from '@pokemon-game/shared';
import { getPrivateView } from '../services/gameService.js';
import { GameRuleError } from '../services/gameErrors.js';
import { getContext } from './context.js';

function requireGame(room) {
  if (!room.game) {
    throw new GameRuleError('GAME_NOT_STARTED', 'The game has not started yet');
  }
}

// These handlers only check who is asking and whether it is allowed.
// Running the game (events, scoring, the turn timer) is the job of "flow" (gameFlow.js).
export function registerGameHandlers({ io, socket, on, cards, flow }) {
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

    flow.startGame(io, room, cards);
    return {};
  });

  on('round:choose-stat', { schema: chooseStatPayloadSchema }, ({ stat }) => {
    const { room, player } = getContext(socket);
    requireGame(room);

    flow.handleChooseStat(io, room, player, stat);
    return { you: getPrivateView(room.game, player.id) };
  });

  on('round:play-card', {}, () => {
    const { room, player } = getContext(socket);
    requireGame(room);

    flow.handlePlayCard(io, room, player);
    return { you: getPrivateView(room.game, player.id) };
  });
}
