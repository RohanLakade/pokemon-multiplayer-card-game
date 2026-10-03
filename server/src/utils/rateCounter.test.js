import { describe, it, expect } from 'vitest';
import { createRateCounter } from './rateCounter.js';

describe('createRateCounter', () => {
  it('allows hits up to the limit, then refuses', () => {
    const counter = createRateCounter({ limit: 3, windowMs: 1000 });

    expect(counter.hit('a', 0)).toBe(true);
    expect(counter.hit('a', 1)).toBe(true);
    expect(counter.hit('a', 2)).toBe(true);
    expect(counter.hit('a', 3)).toBe(false);
  });

  it('counts each key separately', () => {
    const counter = createRateCounter({ limit: 1, windowMs: 1000 });

    expect(counter.hit('a', 0)).toBe(true);
    expect(counter.hit('b', 0)).toBe(true);
    expect(counter.hit('a', 1)).toBe(false);
  });

  it('starts a new window after the time is up', () => {
    const counter = createRateCounter({ limit: 1, windowMs: 1000 });

    counter.hit('a', 0);
    expect(counter.hit('a', 500)).toBe(false);
    expect(counter.hit('a', 1000)).toBe(true);
  });

  it('reports blocked keys without counting, and can forget a key', () => {
    const counter = createRateCounter({ limit: 2, windowMs: 1000 });

    expect(counter.isBlocked('a', 0)).toBe(false);
    counter.hit('a', 0);
    counter.hit('a', 1);
    expect(counter.isBlocked('a', 2)).toBe(true);

    counter.reset('a');
    expect(counter.isBlocked('a', 2)).toBe(false);
  });
});
