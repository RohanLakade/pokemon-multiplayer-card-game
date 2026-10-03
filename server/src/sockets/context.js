import { findRoom } from '../services/roomsService.js';
import { findPlayer } from '../services/lobbyService.js';
import { GameRuleError } from '../services/gameErrors.js';

// Who is this socket? The answer comes from what the SERVER stored when the socket joined,
// never from anything the client sends, so a player cannot pretend to be someone else.
export function getContext(socket) {
  const { roomCode, playerId } = socket.data;

  const room = roomCode ? findRoom(roomCode) : null;
  const player = room ? findPlayer(room, playerId) : null;

  // A socket that was replaced by a newer connection no longer owns the player
  if (!room || !player || player.socketId !== socket.id) {
    throw new GameRuleError('NOT_IN_ROOM', 'You are not in a room');
  }
  return { room, player };
}
