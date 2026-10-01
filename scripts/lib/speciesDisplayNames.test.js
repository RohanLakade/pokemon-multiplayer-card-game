import { describe, it, expect } from 'vitest';
import { buildDisplayName } from './cardMapper.js';

describe('species display name overrides', () => {
  it('uses the real name for species with punctuation', () => {
    expect(buildDisplayName('farfetchd', 'farfetchd', 'base')).toBe("Farfetch'd");
    expect(buildDisplayName('ho-oh', 'ho-oh', 'base')).toBe('Ho-Oh');
    expect(buildDisplayName('mr-mime', 'mr-mime', 'base')).toBe('Mr. Mime');
    expect(buildDisplayName('type-null', 'type-null', 'base')).toBe('Type: Null');
  });

  it('keeps the override when a form prefix is added', () => {
    expect(buildDisplayName('farfetchd', 'farfetchd-galar', 'regional')).toBe(
      "Galarian Farfetch'd",
    );
    expect(buildDisplayName('mr-mime', 'mr-mime-galar', 'regional')).toBe('Galarian Mr. Mime');
  });

  it('still capitalises normal names', () => {
    expect(buildDisplayName('bulbasaur', 'bulbasaur', 'base')).toBe('Bulbasaur');
  });
});
