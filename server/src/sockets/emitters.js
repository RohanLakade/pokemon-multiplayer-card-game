import { getPublicState, getPrivateView, getFinalResult } from '../services/matchService.js';
import { findPlayer, toPublicPlayer } from '../services/lobbyService.js';
import { getTurnSecondsLeft } from '../services/turnService.js';

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

// Is the turn timer on, and who switched it on? Everyone in the room may know this.
export function getTimerInfo(room) {
  const starter = room.timerStartedBy ? findPlayer(room, room.timerStartedBy) : null;

  return {
    on: room.timerOn,
    startedBy: starter?.id ?? null,
    startedByName: starter?.name ?? null,
  };
}

// Everything a player needs to draw the room from scratch (also used after reconnecting).
export function buildRoomState(room, playerId) {
  return {
    code: room.code,
    status: room.status,
    hostId: room.hostId,
    deckSize: room.deckSize,
    turnSeconds: room.turnSeconds,
    timer: getTimerInfo(room),
    players: room.players.map(toPublicPlayer),
    you: { playerId },
    game: room.game ? getPublicState(room.game) : null,
    private: room.game ? getPrivateView(room.game, playerId) : null,
    finalResult: room.status === 'finished' ? getFinalResult(room.game) : null,
    turnSecondsLeft: getTurnSecondsLeft(room),
  };
}

export function sendRoomState(io, room) {
  emitToEachPlayer(io, room, 'room:state', (player) => buildRoomState(room, player.id));
}

// A new round begins. Each player receives only THEIR OWN hand.
// turnSecondsLeft is null while the timer is off.
export function sendRoundStarted(io, room) {
  const { game } = room;

  emitToEachPlayer(io, room, 'round:started', (player) => ({
    round: game.round,
    totalRounds: game.deckSize,
    leaderId: game.leaderId,
    turnSecondsLeft: getTurnSecondsLeft(room),
    you: getPrivateView(game, player.id),
  }));
}
