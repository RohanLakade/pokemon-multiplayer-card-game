import { describe, it, expect } from 'vitest';
import roomReducer, {
  joined,
  restoreFinished,
  roomStateReceived,
  playerConnectionChanged,
  playerAutoPlayChanged,
  timerChanged,
  noticeShown,
  noticeCleared,
  roomLeft,
  selectIsHost,
  selectMyAutoPlay,
} from './roomSlice.js';

const roomState = {
  code: 'ABC234',
  status: 'lobby',
  hostId: 'p1',
  deckSize: 15,
  turnSeconds: 60,
  timer: { on: true, startedBy: 'p1', startedByName: 'Ash' },
  players: [
    { id: 'p1', name: 'Ash', connected: true, autoPlay: false },
    { id: 'p2', name: 'Misty', connected: true, autoPlay: false },
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

  it('copies the room, its settings and the timer from a room:state event', () => {
    const state = roomReducer(undefined, roomStateReceived(roomState));

    expect(state.players).toHaveLength(2);
    expect(state.hostId).toBe('p1');
    expect(state.playerId).toBe('p2');
    expect(state.status).toBe('lobby');
    expect(state.deckSize).toBe(15);
    expect(state.turnSeconds).toBe(60);
    expect(state.timer).toEqual({ on: true, startedBy: 'p1', startedByName: 'Ash' });
  });

  it('starts with the default settings and the timer off', () => {
    const state = roomReducer(undefined, { type: 'unknown' });

    expect(state.deckSize).toBe(20);
    expect(state.turnSeconds).toBe(90);
    expect(state.timer.on).toBe(false);
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

  it('follows auto-play, and knows when this player is on auto-play', () => {
    let state = roomReducer(undefined, roomStateReceived(roomState));
    expect(selectMyAutoPlay({ room: state })).toBe(false);

    state = roomReducer(state, playerAutoPlayChanged({ playerId: 'p2', enabled: true }));
    expect(state.players[1].autoPlay).toBe(true);
    expect(selectMyAutoPlay({ room: state })).toBe(true);

    state = roomReducer(state, playerAutoPlayChanged({ playerId: 'p2', enabled: false }));
    expect(selectMyAutoPlay({ room: state })).toBe(false);
  });

  it('follows the timer being started and stopped', () => {
    let state = roomReducer(
      undefined,
      timerChanged({ on: true, startedBy: 'p2', startedByName: 'Misty', turnSecondsLeft: 60 }),
    );
    expect(state.timer).toEqual({ on: true, startedBy: 'p2', startedByName: 'Misty' });

    state = roomReducer(
      state,
      timerChanged({ on: false, startedBy: null, startedByName: null, turnSecondsLeft: null }),
    );
    expect(state.timer.on).toBe(false);
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
    expect(state.timer.on).toBe(false);
  });

  it('stops waiting for a restored seat when the restore is finished or the player leaves', () => {
    const waiting = { ...roomReducer(undefined, { type: 'unknown' }), restoring: true };

    expect(roomReducer(waiting, restoreFinished()).restoring).toBe(false);
    expect(roomReducer(waiting, roomLeft()).restoring).toBe(false);
  });
});
