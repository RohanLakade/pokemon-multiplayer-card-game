import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearTurnTimer, getTurnSecondsLeft, setTurnTimer } from './turnService.js';

describe('turn timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls the function when time is up and reports the seconds left', () => {
    const room = {};
    const onTimeout = vi.fn();

    setTurnTimer(room, '1:choosing-stat', 30000, onTimeout);
    expect(getTurnSecondsLeft(room)).toBe(30);
    expect(room.turnStep).toBe('1:choosing-stat');

    vi.advanceTimersByTime(12500);
    expect(getTurnSecondsLeft(room)).toBe(18); // 17.5 seconds, rounded up
    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(17500);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does nothing after the timer is cleared', () => {
    const room = {};
    const onTimeout = vi.fn();

    setTurnTimer(room, '1:choosing-stat', 1000, onTimeout);
    clearTurnTimer(room);
    vi.advanceTimersByTime(5000);

    expect(onTimeout).not.toHaveBeenCalled();
    expect(getTurnSecondsLeft(room)).toBeNull();
    expect(room.turnStep).toBeNull();
  });

  it('replaces an earlier timer when a new one is set', () => {
    const room = {};
    const first = vi.fn();
    const second = vi.fn();

    setTurnTimer(room, '1:choosing-stat', 1000, first);
    setTurnTimer(room, '1:choosing-cards', 1000, second);
    vi.advanceTimersByTime(1000);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
