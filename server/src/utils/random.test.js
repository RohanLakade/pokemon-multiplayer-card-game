import { describe, it, expect } from 'vitest';
import { shuffle, pickRandom } from './random.js';

describe('shuffle', () => {
  it('keeps every item and does not change the original array', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = shuffle(original);

    expect([...result].sort()).toEqual(original);
    expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('gives a predictable order when random is replaced', () => {
    // random always returns 0, so each step swaps the current item with the first one
    expect(shuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
  });
});

describe('pickRandom', () => {
  it('returns the item at the index random chooses', () => {
    expect(pickRandom(['a', 'b', 'c'], () => 2)).toBe('c');
  });

  it('always returns one of the items with the real random function', () => {
    const items = ['a', 'b', 'c'];
    expect(items).toContain(pickRandom(items));
  });
});
