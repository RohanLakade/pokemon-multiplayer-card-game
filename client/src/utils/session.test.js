// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  SESSION_STORAGE_KEY,
  clearSession,
  getSessionToRestore,
  loadSession,
  saveSession,
} from './session.js';

afterEach(() => {
  sessionStorage.clear();
  window.history.pushState({}, '', '/');
});

const seat = { code: 'ABC234', sessionToken: 'a'.repeat(64) };

describe('session storage', () => {
  it('saves, loads and clears a seat', () => {
    saveSession(seat);
    expect(loadSession()).toEqual(seat);

    clearSession();
    expect(loadSession()).toBeNull();
  });

  it('ignores damaged or incomplete data', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'not json');
    expect(loadSession()).toBeNull();

    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ code: 'ABC234' }));
    expect(loadSession()).toBeNull();
  });
});

describe('getSessionToRestore', () => {
  it('returns the seat on a room page', () => {
    saveSession(seat);

    for (const path of ['/lobby/ABC234', '/game/ABC234', '/result/ABC234']) {
      window.history.pushState({}, '', path);
      expect(getSessionToRestore()).toEqual(seat);
    }
  });

  it('returns nothing on the home page or any other page', () => {
    saveSession(seat);

    window.history.pushState({}, '', '/');
    expect(getSessionToRestore()).toBeNull();

    window.history.pushState({}, '', '/about');
    expect(getSessionToRestore()).toBeNull();
  });
});
