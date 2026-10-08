import { describe, it, expect } from 'vitest';
import roomReducer, {
  joined,
  restoreFinished,
  roomStateReceived,
  playerConnectionChanged,
  noticeShown,
  noticeCleared,
  roomLeft,
  selectIsHost,
} from './roomSlice.js';

const roomState = {
  code: 'ABC234',
  status: 'lobby',
  hostId: 'p1',
  deckSize: 15,
  players: [
    { id: 'p1', name: 'Ash', connected: true },
    { id: 'p2', name: 'Misty', connected: true },
  ],
  you: { playerId: 'p2' },
};

describe('roomSlice', () => {
  it('stores the private session after joining', () => {
    const state = roomReducer(
      undefined,
      joined({ code: 'ABC234', playerId: 'p2', sessionToken: 'secret' }),
    );

    expect(state.code).toBe('ABC234');
    expect(state.sessionToken).toBe('secret');
  });

  it('copies the room, including the deck size, from a room:state event', () => {
    const state = roomReducer(undefined, roomStateReceived(roomState));

    expect(state.players).toHaveLength(2);
    expect(state.hostId).toBe('p1');
    expect(state.playerId).toBe('p2');
    expect(state.status).toBe('lobby');
    expect(state.deckSize).toBe(15);
  });

  it('starts with the default deck size of 20', () => {
    expect(roomReducer(undefined, { type: 'unknown' }).deckSize).toBe(20);
  });

  it('knows whether this player is the host', () => {
    const asGuest = { room: roomReducer(undefined, roomStateReceived(roomState)) };
    const asHost = {
      room: roomReducer(undefined, roomStateReceived({ ...roomState, you: { playerId: 'p1' } })),
    };

    expect(selectIsHost(asGuest)).toBe(false);
    expect(selectIsHost(asHost)).toBe(true);
  });

  it('marks a player offline or online', () => {
    let state = roomReducer(undefined, roomStateReceived(roomState));
    state = roomReducer(state, playerConnectionChanged({ playerId: 'p1', connected: false }));

    expect(state.players[0].connected).toBe(false);
  });

  it('shows and clears a notice', () => {
    let state = roomReducer(undefined, noticeShown('Something happened'));
    expect(state.notice).toBe('Something happened');

    state = roomReducer(state, noticeCleared());
    expect(state.notice).toBeNull();
  });

  it('forgets everything when the player leaves', () => {
    let state = roomReducer(undefined, roomStateReceived(roomState));
    state = roomReducer(state, roomLeft());

    expect(state.code).toBeNull();
    expect(state.players).toEqual([]);
    expect(state.deckSize).toBe(20);
  });

  it('stops waiting for a restored seat when the restore is finished or the player leaves', () => {
    const waiting = { ...roomReducer(undefined, { type: 'unknown' }), restoring: true };

    expect(roomReducer(waiting, restoreFinished()).restoring).toBe(false);
    expect(roomReducer(waiting, roomLeft()).restoring).toBe(false);
  });
});
