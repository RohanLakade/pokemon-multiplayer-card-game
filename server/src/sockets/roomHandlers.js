import {
  joinRoomPayloadSchema,
  setDeckSizePayloadSchema,
  setTurnSecondsPayloadSchema,
} from '@pokemon-game/shared';
import { findRoom, deleteRoom, touchPresence } from '../services/roomsService.js';
import {
  addPlayer,
  findPlayer,
  reconnectPlayer,
  markDisconnected,
  removePlayer,
  resetForNewGame,
} from '../services/lobbyService.js';
import { clearTurnTimer } from '../services/turnService.js';
import { GameRuleError } from '../services/gameErrors.js';
import { getContext } from './context.js';
import { emitToEachPlayer, sendRoomState } from './emitters.js';

// Only these failures count towards the "too many failed joins" limit.
// Normal mistakes (room full, name taken) do not.
const COUNTED_FAILURES = new Set(['ROOM_NOT_FOUND', 'VALIDATION_ERROR', 'INVALID_SESSION']);

// Settings can only be changed by the host, before the game starts.
function requireHostInLobby(room, player, what) {
  if (room.hostId !== player.id) {
    throw new GameRuleError('NOT_HOST', `Only the host can choose ${what}`);
  }
  if (room.status !== 'lobby') {
    throw new GameRuleError('GAME_IN_PROGRESS', 'The game has already started');
  }
}

// The same player is back (after a refresh, a reopened tab, a lost connection, or in a second tab).
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

// A player goes away. onPurpose is true when they clicked "leave" (not when the connection dropped).
function leaveRoom(io, socket, room, player, flow, { onPurpose = false } = {}) {
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

  // During a game (and after it) the seat is kept, so the player can return with their token
  markDisconnected(player);
  touchPresence(room);
  if (onPurpose) player.hasLeft = true;

  // Everybody left on purpose: nobody can come back, so the room is deleted at once
  if (room.players.every((member) => member.hasLeft)) {
    deleteRoom(room.code);
    return;
  }

  emitToEachPlayer(io, room, 'player:disconnected', () => ({ playerId: player.id }));
  sendRoomState(io, room);

  if (onPurpose && room.status === 'playing') {
    // The player chose to leave: their moves are made for them at once until they come back
    flow.handleSetAutoPlay(io, room, player, true);
  } else {
    // A dropped connection keeps the full time (if the timer is on): they may come back
    flow.handlePlayerAway(io, room);
  }
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
      touchPresence(room);
      sendRoomState(io, room);

      // A returning player may be the one the game was waiting for (or the first one back)
      if (payload.sessionToken) flow.handlePlayerBack(io, room);

      // The session token is private, so it only goes back to this player, in the acknowledgement
      return { playerId: player.id, sessionToken: player.sessionToken, roomCode: room.code };
    },
  );

  // The host chooses how many cards each player gets (10, 15 or 20). Everyone sees it.
  on('room:set-deck-size', { schema: setDeckSizePayloadSchema }, ({ deckSize }) => {
    const { room, player } = getContext(socket);
    requireHostInLobby(room, player, 'the deck size');

    room.deckSize = deckSize;
    sendRoomState(io, room);
    return {};
  });

  // The host chooses how long each turn lasts once the timer is on (30, 60 or 90 seconds).
  on('room:set-turn-seconds', { schema: setTurnSecondsPayloadSchema }, ({ turnSeconds }) => {
    const { room, player } = getContext(socket);
    requireHostInLobby(room, player, 'the turn length');

    room.turnSeconds = turnSeconds;
    sendRoomState(io, room);
    return {};
  });

  // After a game: everybody goes back to the lobby of the same room. Normally only the host may
  // do it. If the host is offline, a player who is here may take over, so the group is not stuck.
  on('game:play-again', {}, () => {
    const { room, player } = getContext(socket);

    if (room.status !== 'finished') {
      throw new GameRuleError('GAME_NOT_FINISHED', 'The game is not over yet');
    }
    if (player.id !== room.hostId) {
      if (findPlayer(room, room.hostId)?.connected) {
        throw new GameRuleError('NOT_HOST', 'Only the host can start a new game');
      }
      room.hostId = player.id;
    }

    clearTurnTimer(room);
    resetForNewGame(room);
    touchPresence(room);
    sendRoomState(io, room);
    return {};
  });

  on('room:leave', {}, () => {
    const { room, player } = getContext(socket);
    leaveRoom(io, socket, room, player, flow, { onPurpose: true });
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
