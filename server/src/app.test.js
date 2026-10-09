import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MAX_PLAYERS } from '@pokemon-game/shared';
import { createApp } from './app.js';

const CLIENT_ORIGIN = 'http://localhost:5173';

// Starts a real server on a random free port, so the tests use real HTTP requests
async function startServer() {
  const app = createApp({ clientOrigin: CLIENT_ORIGIN, trustProxy: 0 });
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

function stopServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

describe('REST API', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    ({ server, baseUrl } = await startServer());
  });

  afterAll(() => stopServer(server));

  async function getJson(path, options) {
    const response = await fetch(`${baseUrl}${path}`, options);
    return { response, body: await response.json() };
  }

  describe('health', () => {
    it('answers ok', async () => {
      const { response, body } = await getJson('/api/health');

      expect(response.status).toBe(200);
      expect(body).toEqual({ status: 'ok' });
    });
  });

  describe('cards', () => {
    it('lists the first 20 cards by default', async () => {
      const { response, body } = await getJson('/api/cards');

      expect(response.status).toBe(200);
      expect(body.limit).toBe(20);
      expect(body.offset).toBe(0);
      expect(body.cards).toHaveLength(20);
      expect(body.cards[0].id).toBe(1);
      expect(body.total).toBeGreaterThanOrEqual(160);
    });

    it('supports limit and offset', async () => {
      const { body } = await getJson('/api/cards?limit=5&offset=2');

      expect(body.cards).toHaveLength(5);
      expect(body.cards[0].id).toBe(3);
    });

    it('rejects a limit that is too small or too large', async () => {
      for (const limit of ['0', '101']) {
        const { response, body } = await getJson(`/api/cards?limit=${limit}`);

        expect(response.status).toBe(400);
        expect(body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('returns one card by id, and a form ranks by its own id', async () => {
      const venusaur = await getJson('/api/cards/3');
      const mega = await getJson('/api/cards/10033');

      expect(venusaur.body.name).toBe('venusaur');
      expect(venusaur.body.stats.rank).toBe(3);
      expect(mega.body.name).toBe('venusaur-mega');
      expect(mega.body.stats.rank).toBe(10033);
    });

    it('answers 404 for an unknown card and 400 for a bad id', async () => {
      const missing = await getJson('/api/cards/99999999');
      const bad = await getJson('/api/cards/abc');

      expect(missing.response.status).toBe(404);
      expect(missing.body.error.code).toBe('CARD_NOT_FOUND');
      expect(bad.response.status).toBe(400);
    });
  });

  describe('rooms', () => {
    it('creates a room with a 6-character code and lets you look it up', async () => {
      const created = await getJson('/api/rooms', { method: 'POST' });

      expect(created.response.status).toBe(201);
      expect(created.body.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

      const found = await getJson(`/api/rooms/${created.body.code}`);

      expect(found.response.status).toBe(200);
      expect(found.body).toEqual({
        code: created.body.code,
        status: 'lobby',
        playerCount: 0,
        maxPlayers: MAX_PLAYERS,
      });
    });

    it('accepts a lower-case code', async () => {
      const created = await getJson('/api/rooms', { method: 'POST' });
      const found = await getJson(`/api/rooms/${created.body.code.toLowerCase()}`);

      expect(found.response.status).toBe(200);
    });

    it('answers 404 for a room that does not exist and 400 for a badly formed code', async () => {
      const missing = await getJson('/api/rooms/ZZZZZZ');
      const bad = await getJson('/api/rooms/abc');

      expect(missing.response.status).toBe(404);
      expect(missing.body.error.code).toBe('ROOM_NOT_FOUND');
      expect(bad.response.status).toBe(400);
      expect(bad.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('errors and security', () => {
    it('answers unknown routes with a JSON 404', async () => {
      const { response, body } = await getJson('/api/nope');

      expect(response.status).toBe(404);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('rejects invalid JSON without leaking details', async () => {
      const { response, body } = await getJson('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{bad json',
      });

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('INVALID_JSON');
      expect(Object.keys(body)).toEqual(['error']);
      expect(JSON.stringify(body)).not.toMatch(/stack|node_modules/);
    });

    it('rejects a request body that is too large', async () => {
      const { response, body } = await getJson('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ junk: 'x'.repeat(20000) }),
      });

      expect(response.status).toBe(413);
      expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
    });

    it('only allows the client origin and sends security headers', async () => {
      const response = await fetch(`${baseUrl}/api/health`);

      expect(response.headers.get('access-control-allow-origin')).toBe(CLIENT_ORIGIN);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-powered-by')).toBeNull();
    });
  });
});

describe('rate limiting', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    ({ server, baseUrl } = await startServer());
  });

  afterAll(() => stopServer(server));

  it('blocks repeated failed room lookups', async () => {
    let blockedAt = null;
    let blockedBody = null;

    for (let attempt = 1; attempt <= 30; attempt += 1) {
      const response = await fetch(`${baseUrl}/api/rooms/ZZZZZZ`);
      if (response.status === 429) {
        blockedAt = attempt;
        blockedBody = await response.json();
        break;
      }
    }

    expect(blockedAt).not.toBeNull();
    expect(blockedAt).toBeLessThanOrEqual(25);
    expect(blockedBody.error.code).toBe('RATE_LIMITED');
  });
});
