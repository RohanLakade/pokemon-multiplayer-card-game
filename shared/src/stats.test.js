import { describe, it, expect } from 'vitest';
import { STATS, STAT_KEYS, isStatKey, lowerWins } from './stats.js';

describe('stats', () => {
  it('has exactly 7 stats', () => {
    expect(STATS).toHaveLength(7);
    expect(STAT_KEYS).toEqual([
      'hp',
      'attack',
      'defense',
      'specialAttack',
      'specialDefense',
      'speed',
      'rank',
    ]);
  });

  it('only rank is won by the lower value', () => {
    expect(lowerWins('rank')).toBe(true);
    expect(lowerWins('hp')).toBe(false);
    expect(lowerWins('speed')).toBe(false);
  });

  it('recognises valid stat keys only', () => {
    expect(isStatKey('attack')).toBe(true);
    expect(isStatKey('special-attack')).toBe(false);
    expect(isStatKey('luck')).toBe(false);
  });
});
