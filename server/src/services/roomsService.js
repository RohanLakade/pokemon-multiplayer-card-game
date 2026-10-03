import { randomInt } from 'node:crypto';
import { MAX_PLAYERS, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@pokemon-game/shared';

const MAX_ROOMS = 500;
const ROOM_LIFETIME_MS = 2 * 60 * 60 * 1000; // old rooms are cleaned up after 2 hours

// Rooms live in memory only: code -> room. Step 5 adds players and games to a room.
const rooms = new Map();

// crypto.randomInt is unpredictable, so codes cannot be guessed from earlier ones.
function makeCode() {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

function removeExpiredRooms(now) {
  for (const [code, room] of rooms) {
    if (now - room.createdAt > ROOM_LIFETIME_MS) rooms.delete(code);
  }
}

// Returns the new room, or null when the server already holds too many rooms.
export function createRoom(now = Date.now()) {
  removeExpiredRooms(now);
  if (rooms.size >= MAX_ROOMS) return null;

  let code = makeCode();
  while (rooms.has(code)) code = makeCode();

  const room = { code, createdAt: now, status: 'lobby', players: [] };
  rooms.set(code, room);
  return room;
}

export function findRoom(code) {
  return rooms.get(code) ?? null;
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
