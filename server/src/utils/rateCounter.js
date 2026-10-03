// A small fixed-window counter: "at most `limit` hits per `windowMs` for each key".
// Used for socket events (key = socket id) and failed room joins (key = IP address).
export function createRateCounter({ limit, windowMs }) {
  const entries = new Map(); // key -> { count, resetAt }

  function getEntry(key, now) {
    const entry = entries.get(key);
    return entry && entry.resetAt > now ? entry : null;
  }

  // Forget windows that have ended, so the map cannot grow forever
  function prune(now) {
    for (const [key, entry] of entries) {
      if (entry.resetAt <= now) entries.delete(key);
    }
  }

  return {
    // Counts one hit. Returns false when this window's limit is already used up.
    hit(key, now = Date.now()) {
      if (entries.size > 1000) prune(now);

      const entry = getEntry(key, now);
      if (!entry) {
        entries.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      if (entry.count >= limit) return false;

      entry.count += 1;
      return true;
    },

    // Is this key over its limit right now? Does not count a hit.
    isBlocked(key, now = Date.now()) {
      const entry = getEntry(key, now);
      return entry !== null && entry.count >= limit;
    },

    reset(key) {
      entries.delete(key);
    },
  };
}
