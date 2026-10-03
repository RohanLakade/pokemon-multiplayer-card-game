import { describe, it, expect } from 'vitest';
import { loadConfig } from './env.js';

describe('loadConfig', () => {
  it('reads the settings and applies defaults', () => {
    const config = loadConfig({ CLIENT_ORIGIN: 'http://localhost:5173' });

    expect(config).toEqual({ port: 3000, clientOrigin: 'http://localhost:5173', trustProxy: 0 });
  });

  it('turns text into numbers and drops a trailing slash from the origin', () => {
    const config = loadConfig({
      PORT: '8080',
      TRUST_PROXY: '1',
      CLIENT_ORIGIN: 'https://my-game.onrender.com/',
    });

    expect(config).toEqual({
      port: 8080,
      clientOrigin: 'https://my-game.onrender.com',
      trustProxy: 1,
    });
  });

  it('refuses to start without a client origin and names the variable', () => {
    expect(() => loadConfig({})).toThrow(/CLIENT_ORIGIN/);
  });

  it('rejects an invalid port', () => {
    expect(() => loadConfig({ CLIENT_ORIGIN: 'http://localhost:5173', PORT: '99999' })).toThrow(
      /PORT/,
    );
  });
});
