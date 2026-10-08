export const SESSION_STORAGE_KEY = 'pokemon-card-battle-session';

// localStorage survives closing the tab and the browser, so a player can come back to a game
// that is still running. (The server decides whether the seat is still valid.)
export function saveSession(session) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage can be switched off (for example in private mode). Then rejoining later is not possible.
  }
}

export function loadSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY));
    return saved?.code && saved?.sessionToken ? saved : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is not available
  }
}

// On a page load: is there a saved seat AND are we on a room page (lobby, game or result)?
// Only then do we try to sit back down straight away. On the home page the player decides,
// using the "Rejoin" banner.
export function getSessionToRestore() {
  if (typeof window === 'undefined') return null;

  const isRoomPage = /^\/(lobby|game|result)\//.test(window.location.pathname);
  return isRoomPage ? loadSession() : null;
}
