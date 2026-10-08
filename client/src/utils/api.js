import { SERVER_URL } from './config.js';

// Plain fetch, no extra library. On failure it throws an Error with a message that is fine
// to show to the player, and with the server's error code (for example ROOM_NOT_FOUND).
async function request(path, options) {
  let response;
  try {
    response = await fetch(`${SERVER_URL}${path}`, options);
  } catch {
    throw new Error('Cannot reach the game server. Is it running?');
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw Object.assign(new Error(body?.error?.message ?? 'Something went wrong'), {
      code: body?.error?.code,
    });
  }
  return body;
}

export function createRoom() {
  return request('/api/rooms', { method: 'POST' });
}

export function fetchRoom(code) {
  return request(`/api/rooms/${encodeURIComponent(code)}`);
}
