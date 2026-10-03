import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { MAX_PLAYERS } from '@pokemon-game/shared';
import { GameRuleError } from './gameErrors.js';

// Compares two tokens without leaking, through timing, how many characters matched.
function tokensMatch(a, b) {
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}

// Adds a new player to a room that is still in the lobby. The first player becomes the host.
export function addPlayer(room, name, socketId) {
  if (room.status !== 'lobby') {
    throw new GameRuleError('GAME_IN_PROGRESS', 'This game has already started');
  }
  if (room.players.length >= MAX_PLAYERS) {
    throw new GameRuleError('ROOM_FULL', 'This room is full');
  }
  const nameTaken = room.players.some((player) => player.name.toLowerCase() === name.toLowerCase());
  if (nameTaken) {
    throw new GameRuleError('NAME_TAKEN', 'Someone in this room already uses that name');
  }

  const player = {
    id: randomUUID(), // public: other players see it
    name,
    sessionToken: randomBytes(32).toString('hex'), // private: only this player ever gets it
    socketId,
    connected: true,
  };

  room.players.push(player);
  if (!room.hostId) room.hostId = player.id;
  return player;
}

export function findPlayer(room, playerId) {
  return room.players.find((player) => player.id === playerId) ?? null;
}

// A player comes back with their session token. Returns the player and the socket they
// used before, so the caller can close an old connection that is still open.
export function reconnectPlayer(room, sessionToken, socketId) {
  const player = room.players.find((candidate) =>
    tokensMatch(candidate.sessionToken, sessionToken),
  );
  if (!player) {
    throw new GameRuleError('INVALID_SESSION', 'Your session has expired, please join again');
  }

  const previousSocketId = player.socketId;
  player.socketId = socketId;
  player.connected = true;
  return { player, previousSocketId };
}

export function markDisconnected(player) {
  player.connected = false;
  player.socketId = null;
}

// Removes a player. If the host left, the next player becomes host.
export function removePlayer(room, playerId) {
  room.players = room.players.filter((player) => player.id !== playerId);
  if (room.hostId === playerId) {
    room.hostId = room.players[0]?.id ?? null;
  }
}

// The part of a player that everyone in the room may see. Never the session token.
export function toPublicPlayer(player) {
  return { id: player.id, name: player.name, connected: player.connected };
}
