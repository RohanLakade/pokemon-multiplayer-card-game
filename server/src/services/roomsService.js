import { randomInt } from 'node:crypto';
import { MAX_PLAYERS, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@pokemon-game/shared';
import { clearTurnTimer } from './turnService.js';

const MAX_ROOMS = 500;
const ROOM_LIFETIME_MS = 2 * 60 * 60 * 1000; // rooms are cleaned up 2 hours after creation

// Rooms live in memory only: code -> room.
// room = { code, createdAt, status: 'lobby' | 'playing' | 'finished', hostId, players, game,
//          turnTimer, turnEndsAt, turnStep }  (the last three belong to the turn timer)
const rooms = new Map();

// crypto.randomInt is unpredictable, so codes cannot be guessed from earlier ones.
function makeCode() {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

// Forgets a room, and stops its turn timer so nothing fires for a room that no longer exists.
function discardRoom(room) {
  clearTurnTimer(room);
  rooms.delete(room.code);
}

function removeExpiredRooms(now) {
  for (const room of rooms.values()) {
    if (now - room.createdAt > ROOM_LIFETIME_MS) discardRoom(room);
  }
}

// Returns the new room, or null when the server already holds too many rooms.
export function createRoom(now = Date.now()) {
  removeExpiredRooms(now);
  if (rooms.size >= MAX_ROOMS) return null;

  let code = makeCode();
  while (rooms.has(code)) code = makeCode();

  const room = {
    code,
    createdAt: now,
    status: 'lobby',
    hostId: null,
    players: [],
    game: null,
    turnTimer: null,
    turnEndsAt: null,
    turnStep: null,
  };
  rooms.set(code, room);
  return room;
}

export function findRoom(code) {
  return rooms.get(code) ?? null;
}

export function deleteRoom(code) {
  const room = rooms.get(code);
  if (room) discardRoom(room);
}

// What the REST API may show about a room. Players' private data is never included.
export function toPublicRoom(room) {
  return {
    code: room.code,
    status: room.status,
    playerCount: room.players.length,
    maxPlayers: MAX_PLAYERS,
  };
}
