import { describe, it, expect } from 'vitest';
import { DECK_SIZES } from './constants.js';
import { DECK_RECIPES, TIERS, getBst, getTier } from './tiers.js';

const bulbasaur = {
  hp: 45,
  attack: 49,
  defense: 49,
  specialAttack: 65,
  specialDefense: 65,
  speed: 45,
  rank: 1,
};
const megaCharizardX = {
  hp: 78,
  attack: 130,
  defense: 111,
  specialAttack: 130,
  specialDefense: 85,
  speed: 100,
  rank: 6,
};
const pidgeot = {
  hp: 83,
  attack: 80,
  defense: 75,
  specialAttack: 70,
  specialDefense: 70,
  speed: 101,
  rank: 18,
};

describe('getBst', () => {
  it('adds the six base stats and ignores rank', () => {
    expect(getBst(bulbasaur)).toBe(318);
    expect(getBst(megaCharizardX)).toBe(634);
    expect(getBst(pidgeot)).toBe(479);
  });
});

describe('getTier', () => {
  it('puts weak, mid and strong Pokémon in the right tiers', () => {
    expect(getTier(getBst(bulbasaur))).toBe('C');
    expect(getTier(getBst(pidgeot))).toBe('B'); // 479 is just below tier A
    expect(getTier(getBst(megaCharizardX))).toBe('S');
  });

  it('changes tier exactly at each limit', () => {
    expect(getTier(579)).toBe('A');
    expect(getTier(580)).toBe('S');
    expect(getTier(480)).toBe('A');
    expect(getTier(479)).toBe('B');
    expect(getTier(380)).toBe('B');
    expect(getTier(379)).toBe('C');
    expect(getTier(0)).toBe('C');
  });
});

describe('deck recipes', () => {
  it('has a recipe for every deck size, and each one adds up to its deck size', () => {
    for (const deckSize of DECK_SIZES) {
      const recipe = DECK_RECIPES[deckSize];
      const total = TIERS.reduce((sum, tier) => sum + recipe[tier], 0);

      expect(total).toBe(deckSize);
    }
  });
});
