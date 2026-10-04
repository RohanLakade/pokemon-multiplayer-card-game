import { joinRoomPayloadSchema } from '@pokemon-game/shared';
import { findRoom, deleteRoom } from '../services/roomsService.js';
import {
  addPlayer,
  findPlayer,
  reconnectPlayer,
  markDisconnected,
  removePlayer,
} from '../services/lobbyService.js';
import { GameRuleError } from '../services/gameErrors.js';
import { getContext } from './context.js';
import { emitToEachPlayer, sendRoomState } from './emitters.js';

// Only these failures count towards the "too many failed joins" limit.
// Normal mistakes (room full, name taken) do not.
const COUNTED_FAILURES = new Set(['ROOM_NOT_FOUND', 'VALIDATION_ERROR', 'INVALID_SESSION']);

// The same player is back (after a refresh, a lost connection, or in a second tab).
function reconnect(io, room, sessionToken, socket) {
  const { player, previousSocketId } = reconnectPlayer(room, sessionToken, socket.id);

  // Close the old connection if it is still open: only one connection may own a player.
  // The same socket joining twice must never close itself.
  const oldSocket =
    previousSocketId && previousSocketId !== socket.id
      ? io.sockets.sockets.get(previousSocketId)
      : null;

  if (oldSocket) {
    oldSocket.emit('error', {
      code: 'SESSION_REPLACED',
      message: 'This session was opened somewhere else',
    });
    oldSocket.disconnect();
  }

  emitToEachPlayer(io, room, 'player:reconnected', () => ({ playerId: player.id }), player.id);
  return player;
}

// A player leaves for good (lobby) or drops out for now (game in progress).
function leaveRoom(io, socket, room, player, flow) {
  socket.data.roomCode = null;
  socket.data.playerId = null;

  if (room.status === 'lobby') {
    removePlayer(room, player.id);

    if (room.players.length === 0) {
      deleteRoom(room.code);
      return;
    }
    sendRoomState(io, room);
    return;
  }

  // During a game the seat is kept, so the player can return with their session token
  markDisconnected(player);

  if (room.status === 'finished' && room.players.every((member) => !member.connected)) {
    deleteRoom(room.code);
    return;
  }

  emitToEachPlayer(io, room, 'player:disconnected', () => ({ playerId: player.id }));
  sendRoomState(io, room);
  // The game must not wait for someone who is gone: play their card, or shorten the clock
  flow.handlePlayerAway(io, room);
}

export function registerRoomHandlers({ io, socket, on, failedJoins, clientIp, flow }) {
  on(
    'room:join',
    {
      schema: joinRoomPayloadSchema,
      onFailure: (error) => {
        if (COUNTED_FAILURES.has(error.code)) failedJoins.hit(clientIp);
      },
    },
    (payload) => {
      if (failedJoins.isBlocked(clientIp)) {
        throw new GameRuleError('RATE_LIMITED', 'Too many failed attempts, please try again later');
      }
      if (socket.data.roomCode) {
        throw new GameRuleError('ALREADY_IN_ROOM', 'You are already in a room');
      }

      const room = findRoom(payload.code);
      if (!room) {
        throw new GameRuleError('ROOM_NOT_FOUND', 'Room not found');
      }

      const player = payload.sessionToken
        ? reconnect(io, room, payload.sessionToken, socket)
        : addPlayer(room, payload.playerName, socket.id);

      socket.data.roomCode = room.code;
      socket.data.playerId = player.id;
      sendRoomState(io, room);

      // A returning player may be the one the game was waiting for (or the first one back)
      if (payload.sessionToken) flow.handlePlayerBack(io, room);

      // The session token is private, so it only goes back to this player, in the acknowledgement
      return { playerId: player.id, sessionToken: player.sessionToken, roomCode: room.code };
    },
  );

  on('room:leave', {}, () => {
    const { room, player } = getContext(socket);
    leaveRoom(io, socket, room, player, flow);
    return {};
  });

  socket.on('disconnect', () => {
    const { roomCode, playerId } = socket.data;
    const room = roomCode ? findRoom(roomCode) : null;
    const player = room ? findPlayer(room, playerId) : null;

    // Ignore sockets that never joined, already left, or were replaced by a newer connection
    if (!room || !player || player.socketId !== socket.id) return;

    leaveRoom(io, socket, room, player, flow);
  });
}
