import { describe, it, expect } from 'vitest';
import { createAutoPlayer } from './autoPlayService.js';

function makeCard(id, stats = {}) {
  return {
    id,
    stats: {
      hp: 50,
      attack: 50,
      defense: 50,
      specialAttack: 50,
      specialDefense: 50,
      speed: 50,
      rank: id,
      ...stats,
    },
  };
}

// 10 cards: attack goes 10, 20 ... 100 and rank goes 1, 2 ... 10
const roster = Array.from({ length: 10 }, (_, index) =>
  makeCard(index + 1, { attack: (index + 1) * 10 }),
);
const autoPlayer = createAutoPlayer(roster);

describe('chooseCardId', () => {
  it('picks the card with the highest value for a normal stat', () => {
    const hand = [roster[1], roster[7], roster[3]]; // attack 20, 80, 40

    expect(autoPlayer.chooseCardId(hand, 'attack')).toBe(8);
  });

  it('picks the card with the lowest number for rank', () => {
    const hand = [roster[4], roster[1], roster[8]]; // rank 5, 2, 9

    expect(autoPlayer.chooseCardId(hand, 'rank')).toBe(2);
  });

  it('picks the first card when they are tied', () => {
    const hand = [roster[2], makeCard(99, { attack: 30 })];

    expect(autoPlayer.chooseCardId(hand, 'attack')).toBe(3);
  });
});

describe('chooseStat', () => {
  it('chooses the stat where the best card is strong compared with all cards', () => {
    const hand = [roster[9]]; // attack 100 (the highest), rank 10 (the worst)

    expect(autoPlayer.chooseStat(hand)).toBe('attack');
  });

  it('chooses rank when the hand has a card with a very low number', () => {
    const hand = [roster[0]]; // attack 10 (the lowest), rank 1 (the best)

    expect(autoPlayer.chooseStat(hand)).toBe('rank');
  });

  it('looks at the best card of the whole hand, not just the first one', () => {
    const hand = [roster[0], roster[9]]; // one great for rank, one great for attack

    expect(['attack', 'rank']).toContain(autoPlayer.chooseStat(hand));
  });
});
