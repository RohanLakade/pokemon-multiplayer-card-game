import { rateLimit } from 'express-rate-limit';

function rateLimitMessage(text) {
  return { error: { code: 'RATE_LIMITED', message: text } };
}

// Each call creates fresh counters, so every app instance (and every test) starts at zero.
export function createRateLimiters() {
  const common = { standardHeaders: 'draft-8', legacyHeaders: false };

  return {
    // Every /api request: 100 per minute per IP address
    api: rateLimit({
      ...common,
      windowMs: 60 * 1000,
      limit: 100,
      message: rateLimitMessage('Too many requests, please slow down'),
    }),

    // Rooms use server memory, so creating them has a tighter limit
    createRoom: rateLimit({
      ...common,
      windowMs: 60 * 1000,
      limit: 10,
      message: rateLimitMessage('Too many rooms created, please wait a minute'),
    }),

    // Only FAILED lookups count (wrong or invalid code), which slows down code guessing.
    // skipSuccessfulRequests removes successful lookups from the count.
    failedJoin: rateLimit({
      ...common,
      windowMs: 15 * 60 * 1000,
      limit: 20,
      skipSuccessfulRequests: true,
      message: rateLimitMessage('Too many failed attempts, please try again later'),
    }),
  };
}
