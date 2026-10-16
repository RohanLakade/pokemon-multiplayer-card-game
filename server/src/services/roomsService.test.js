import { describe, it, expect } from 'vitest';
import { createRoom, deleteRoom, findRoom, touchPresence } from './roomsService.js';

describe('rooms', () => {
  it('starts as an empty lobby with the default settings and the timer off', () => {
    const room = createRoom();

    expect(room).toMatchObject({
      status: 'lobby',
      players: [],
      deckSize: 20,
      turnSeconds: 90,
      timerOn: false,
      timerStartedBy: null,
      emptySince: null,
      botTimer: null,
    });
    expect(findRoom(room.code)).toBe(room);
  });

  it('deletes a room on request', () => {
    const room = createRoom();

    deleteRoom(room.code);

    expect(findRoom(room.code)).toBeNull();
  });
});

describe('presence', () => {
  it('remembers since when nobody has been connected, and forgets it when someone is', () => {
    const room = createRoom();

    room.players = [{ connected: false }];
    touchPresence(room, 1000);
    expect(room.emptySince).toBe(1000);

    room.players = [{ connected: false }, { connected: true }];
    touchPresence(room, 2000);
    expect(room.emptySince).toBeNull();
  });

  it('does not count the computer player as somebody being here', () => {
    const room = createRoom();

    room.players = [
      { connected: false, isBot: false },
      { connected: true, isBot: true },
    ];
    touchPresence(room, 1000);

    expect(room.emptySince).toBe(1000);
  });

  it('forgets a room that nobody came back to for more than 10 minutes', () => {
    const room = createRoom();
    room.players = [{ connected: false }];
    touchPresence(room, 1000);

    expect(findRoom(room.code, 1000 + 5 * 60 * 1000)).toBe(room);
    expect(findRoom(room.code, 1000 + 11 * 60 * 1000)).toBeNull();
  });
});
