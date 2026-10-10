import { SERVER_URL } from './config.js';

// The free Render server falls asleep after 15 minutes without traffic, and waking it takes
// around a minute. Calling the health route as soon as the page opens starts that early, while
// the player is still typing their name. The answer does not matter, so errors are ignored.
export function wakeServer() {
  fetch(`${SERVER_URL}/api/health`).catch(() => {});
}
