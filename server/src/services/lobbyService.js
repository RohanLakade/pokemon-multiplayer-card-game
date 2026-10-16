import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { BOT_NAME, MAX_PLAYERS } from '@pokemon-game/shared';
import { GameRuleError } from './gameErrors.js';

// Compares two tokens without leaking, through timing, how many characters matched.
function tokensMatch(a, b) {
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}

// The people in a room. The computer player never counts for hosting, cleanup or presence.
export function humanPlayers(room) {
  return room.players.filter((player) => !player.isBot);
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
    autoPlay: false, // true: the server makes this player's moves at once
    missedTurns: 0, // turns in a row that ran out without a move from this player
    hasLeft: false, // true: left a running game on purpose (not just disconnected)
    isBot: false,
  };

  room.players.push(player);
  if (!room.hostId) room.hostId = player.id;
  return player;
}

// Adds the computer opponent to a lobby. It has no connection: the server plays for it, using the
// same auto-play as a player who stepped away. It is never the host. A room has at most one.
export function addBot(room) {
  if (room.status !== 'lobby') {
    throw new GameRuleError('GAME_IN_PROGRESS', 'This game has already started');
  }
  if (room.players.length >= MAX_PLAYERS) {
    throw new GameRuleError('ROOM_FULL', 'This room is full');
  }
  if (room.players.some((player) => player.isBot)) {
    throw new GameRuleError('BOT_ALREADY_ADDED', 'The computer player is already in this room');
  }

  const nameTaken = room.players.some(
    (player) => player.name.toLowerCase() === BOT_NAME.toLowerCase(),
  );
  const bot = {
    id: randomUUID(),
    name: nameTaken ? `${BOT_NAME} (bot)` : BOT_NAME,
    sessionToken: randomBytes(32).toString('hex'), // never sent to anyone
    socketId: null,
    connected: true, // always "here": the server is the one playing
    autoPlay: true,
    missedTurns: 0,
    hasLeft: false,
    isBot: true,
  };

  room.players.push(bot);
  return bot;
}

export function findPlayer(room, playerId) {
  return room.players.find((player) => player.id === playerId) ?? null;
}

// A player comes back with their session token. Returns the player and the socket they
// used before, so the caller can close an old connection that is still open.
// Coming back always turns auto-play off and forgets earlier missed turns.
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
  player.autoPlay = false;
  player.missedTurns = 0;
  player.hasLeft = false;
  return { player, previousSocketId };
}

export function markDisconnected(player) {
  player.connected = false;
  player.socketId = null;
}

// Removes a player. If the host left, the next human becomes host (never the computer).
export function removePlayer(room, playerId) {
  room.players = room.players.filter((player) => player.id !== playerId);
  if (room.hostId === playerId) {
    room.hostId = humanPlayers(room)[0]?.id ?? null;
  }
}

// After a game ends: back to the lobby with the players who are still connected.
// Players who left are removed. The host's settings (deck size, turn length) stay, and the
// computer player stays seated, still on auto-play.
export function resetForNewGame(room) {
  room.players = room.players.filter((player) => player.connected);

  for (const player of room.players) {
    player.autoPlay = player.isBot;
    player.missedTurns = 0;
    player.hasLeft = false;
  }

  if (!room.players.some((player) => player.id === room.hostId)) {
    room.hostId = humanPlayers(room)[0]?.id ?? null;
  }

  room.game = null;
  room.status = 'lobby';
  room.timerOn = false;
  room.timerStartedBy = null;
}

// The part of a player that everyone in the room may see. Never the session token.
export function toPublicPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    connected: player.connected,
    autoPlay: player.autoPlay,
    isBot: player.isBot,
  };
}
