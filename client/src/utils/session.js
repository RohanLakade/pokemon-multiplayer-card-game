export const SESSION_STORAGE_KEY = 'pokemon-card-battle-session';

// sessionStorage belongs to ONE browser tab and disappears when the tab closes.
// That matches what a seat is: it belongs to this tab, so a second tab cannot take it by accident.
export function saveSession(session) {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage can be switched off (for example in private mode). Then a refresh cannot rejoin.
  }
}

export function loadSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY));
    return saved?.code && saved?.sessionToken ? saved : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is not available
  }
}

// On a page load: is there a saved seat AND are we on a room page (lobby, game or result)?
// Only then do we try to sit back down. On the home page a saved seat is simply forgotten.
export function getSessionToRestore() {
  if (typeof window === 'undefined') return null;

  const isRoomPage = /^\/(lobby|game|result)\//.test(window.location.pathname);
  return isRoomPage ? loadSession() : null;
}
