import { ROUNDS_PER_GAME } from '@pokemon-game/shared';
import { getPublicState, getPrivateView, getFinalResult } from '../services/gameService.js';
import { toPublicPlayer } from '../services/lobbyService.js';

// Sends one event to every connected player in the room, except "exceptPlayerId" if given.
// buildPayload(player) lets each player receive their own private data.
// Every socket automatically belongs to a Socket.IO room named after its own id,
// so io.to(socketId) reaches exactly one player.
export function emitToEachPlayer(io, room, eventName, buildPayload, exceptPlayerId = null) {
  for (const player of room.players) {
    if (player.connected && player.socketId && player.id !== exceptPlayerId) {
      io.to(player.socketId).emit(eventName, buildPayload(player));
    }
  }
}

// Everything a player needs to draw the room from scratch (also used after reconnecting).
export function buildRoomState(room, playerId) {
  return {
    code: room.code,
    status: room.status,
    hostId: room.hostId,
    players: room.players.map(toPublicPlayer),
    you: { playerId },
    game: room.game ? getPublicState(room.game) : null,
    private: room.game ? getPrivateView(room.game, playerId) : null,
    finalResult: room.status === 'finished' ? getFinalResult(room.game) : null,
  };
}

export function sendRoomState(io, room) {
  emitToEachPlayer(io, room, 'room:state', (player) => buildRoomState(room, player.id));
}

// A new round begins. Each player receives only THEIR OWN current card.
export function sendRoundStarted(io, room) {
  const { game } = room;

  emitToEachPlayer(io, room, 'round:started', (player) => ({
    round: game.round,
    totalRounds: ROUNDS_PER_GAME,
    leaderId: game.leaderId,
    you: getPrivateView(game, player.id),
  }));
}
