import { describe, it, expect } from 'vitest';
import { MAX_PLAYERS } from '@pokemon-game/shared';
import {
  addBot,
  addPlayer,
  findPlayer,
  humanPlayers,
  reconnectPlayer,
  markDisconnected,
  removePlayer,
  resetForNewGame,
  toPublicPlayer,
} from './lobbyService.js';
import { GameRuleError } from './gameErrors.js';

function makeRoom(overrides = {}) {
  return { code: 'ABC234', status: 'lobby', hostId: null, players: [], game: null, ...overrides };
}

function expectRuleError(action, code) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(GameRuleError);
    expect(error.code).toBe(code);
    return;
  }
  throw new Error(`Expected a GameRuleError with code ${code}`);
}

describe('addPlayer', () => {
  it('makes the first player the host and gives each player a private 64-character token', () => {
    const room = makeRoom();
    const ash = addPlayer(room, 'Ash', 'socket-1');
    const misty = addPlayer(room, 'Misty', 'socket-2');

    expect(room.hostId).toBe(ash.id);
    expect(ash.id).not.toBe(misty.id);
    expect(ash.sessionToken).toMatch(/^[a-f0-9]{64}$/);
    expect(ash.sessionToken).not.toBe(misty.sessionToken);
  });

  it('starts a player with auto-play off and no missed turns', () => {
    const player = addPlayer(makeRoom(), 'Ash', 'socket-1');

    expect(player).toMatchObject({
      autoPlay: false,
      missedTurns: 0,
      hasLeft: false,
      isBot: false,
    });
  });

  it('rejects a name that is already used, ignoring upper and lower case', () => {
    const room = makeRoom();
    addPlayer(room, 'Ash', 'socket-1');

    expectRuleError(() => addPlayer(room, 'ash', 'socket-2'), 'NAME_TAKEN');
  });

  it('rejects a new player when the room is full or the game has started', () => {
    const fullRoom = makeRoom();
    for (let i = 0; i < MAX_PLAYERS; i += 1) addPlayer(fullRoom, `Player ${i}`, `socket-${i}`);
    expectRuleError(() => addPlayer(fullRoom, 'Late', 'socket-x'), 'ROOM_FULL');

    const startedRoom = makeRoom({ status: 'playing' });
    expectRuleError(() => addPlayer(startedRoom, 'Late', 'socket-y'), 'GAME_IN_PROGRESS');
  });
});

describe('addBot', () => {
  it('adds one computer player that is always here, on auto-play, and never the host', () => {
    const room = makeRoom();
    const ash = addPlayer(room, 'Ash', 'socket-1');

    const bot = addBot(room);

    expect(bot).toMatchObject({
      name: 'Computer',
      isBot: true,
      connected: true,
      autoPlay: true,
      socketId: null,
    });
    expect(room.hostId).toBe(ash.id);
    expect(humanPlayers(room)).toEqual([ash]);
  });

  it('allows only one computer player, and only in a lobby that is not full', () => {
    const room = makeRoom();
    addPlayer(room, 'Ash', 'socket-1');
    addBot(room);
    expectRuleError(() => addBot(room), 'BOT_ALREADY_ADDED');

    expectRuleError(() => addBot(makeRoom({ status: 'playing' })), 'GAME_IN_PROGRESS');

    const fullRoom = makeRoom();
    for (let i = 0; i < MAX_PLAYERS; i += 1) addPlayer(fullRoom, `Player ${i}`, `socket-${i}`);
    expectRuleError(() => addBot(fullRoom), 'ROOM_FULL');
  });

  it('uses another name when a human is already called Computer', () => {
    const room = makeRoom();
    addPlayer(room, 'computer', 'socket-1');

    expect(addBot(room).name).toBe('Computer (bot)');
  });

  it('passes the host role to the next human, never to the computer', () => {
    const room = makeRoom();
    const ash = addPlayer(room, 'Ash', 'socket-1');
    addBot(room);
    const misty = addPlayer(room, 'Misty', 'socket-2');

    removePlayer(room, ash.id);
    expect(room.hostId).toBe(misty.id);

    removePlayer(room, misty.id);
    expect(room.hostId).toBeNull();
    expect(room.players).toHaveLength(1); // only the computer is left
  });
});

describe('removePlayer', () => {
  it('passes the host role to the next player', () => {
    const room = makeRoom();
    const ash = addPlayer(room, 'Ash', 'socket-1');
    const misty = addPlayer(room, 'Misty', 'socket-2');

    removePlayer(room, ash.id);

    expect(room.hostId).toBe(misty.id);
    expect(room.players).toHaveLength(1);
  });

  it('leaves no host when the last player leaves', () => {
    const room = makeRoom();
    const ash = addPlayer(room, 'Ash', 'socket-1');

    removePlayer(room, ash.id);

    expect(room.hostId).toBeNull();
  });
});

describe('reconnectPlayer', () => {
  it('finds the player by token, rebinds the socket and returns the old one', () => {
    const room = makeRoom();
    const ash = addPlayer(room, 'Ash', 'socket-1');
    markDisconnected(ash);

    const result = reconnectPlayer(room, ash.sessionToken, 'socket-2');

    expect(result.player.id).toBe(ash.id);
    expect(result.previousSocketId).toBeNull();
    expect(ash.socketId).toBe('socket-2');
    expect(ash.connected).toBe(true);
  });

  it('reports the previous socket when the player is still connected elsewhere', () => {
    const room = makeRoom();
    const ash = addPlayer(room, 'Ash', 'socket-1');

    const result = reconnectPlayer(room, ash.sessionToken, 'socket-2');

    expect(result.previousSocketId).toBe('socket-1');
  });

  it('turns auto-play off and forgets missed turns and leaving', () => {
    const room = makeRoom();
    const ash = addPlayer(room, 'Ash', 'socket-1');
    markDisconnected(ash);
    Object.assign(ash, { autoPlay: true, missedTurns: 2, hasLeft: true });

    reconnectPlayer(room, ash.sessionToken, 'socket-2');

    expect(ash).toMatchObject({ autoPlay: false, missedTurns: 0, hasLeft: false });
  });

  it('rejects a token that belongs to nobody', () => {
    const room = makeRoom();
    addPlayer(room, 'Ash', 'socket-1');

    expectRuleError(() => reconnectPlayer(room, 'b'.repeat(64), 'socket-2'), 'INVALID_SESSION');
  });
});

describe('resetForNewGame', () => {
  it('goes back to the lobby with the players who are still connected', () => {
    const room = makeRoom();
    const ash = addPlayer(room, 'Ash', 'socket-1');
    const misty = addPlayer(room, 'Misty', 'socket-2');
    Object.assign(room, {
      status: 'finished',
      game: { phase: 'finished' },
      timerOn: true,
      timerStartedBy: ash.id,
    });
    Object.assign(ash, { autoPlay: true, missedTurns: 2 });
    markDisconnected(misty);

    resetForNewGame(room);

    expect(room.status).toBe('lobby');
    expect(room.game).toBeNull();
    expect(room.timerOn).toBe(false);
    expect(room.timerStartedBy).toBeNull();
    expect(room.players.map((player) => player.name)).toEqual(['Ash']);
    expect(ash).toMatchObject({ autoPlay: false, missedTurns: 0, hasLeft: false });
  });

  it('passes the host role to a player who is still here', () => {
    const room = makeRoom();
    const ash = addPlayer(room, 'Ash', 'socket-1');
    const misty = addPlayer(room, 'Misty', 'socket-2');
    room.status = 'finished';
    markDisconnected(ash);

    resetForNewGame(room);

    expect(room.hostId).toBe(misty.id);
  });

  it('keeps the computer seated and on auto-play, and never makes it the host', () => {
    const room = makeRoom();
    const ash = addPlayer(room, 'Ash', 'socket-1');
    const bot = addBot(room);
    Object.assign(room, { status: 'finished', game: { phase: 'finished' } });
    markDisconnected(ash);
    const misty = addPlayer(makeRoom(), 'Misty', 'socket-2'); // a player of another room: unused
    expect(misty.isBot).toBe(false);

    resetForNewGame(room);

    // The only human was offline, so only the computer is left, and there is no host
    expect(room.players).toEqual([bot]);
    expect(bot.autoPlay).toBe(true);
    expect(room.hostId).toBeNull();
  });
});

describe('public player data', () => {
  it('never includes the session token', () => {
    const room = makeRoom();
    const ash = addPlayer(room, 'Ash', 'socket-1');

    expect(toPublicPlayer(ash)).toEqual({
      id: ash.id,
      name: 'Ash',
      connected: true,
      autoPlay: false,
      isBot: false,
    });
    expect(findPlayer(room, ash.id)).toBe(ash);
  });

  it('says which player is the computer', () => {
    const bot = addBot(makeRoom());

    expect(toPublicPlayer(bot)).toMatchObject({ name: 'Computer', isBot: true });
    expect(JSON.stringify(toPublicPlayer(bot))).not.toContain('sessionToken');
  });
});
