import { describe, it, expect } from 'vitest';
import { balanceDecks, getCardFeatures, getStatGap } from './deckBalance.js';

function makeCard(id, attack, tier = 'A') {
  return {
    id,
    tier,
    bst: 400,
    stats: {
      hp: 50,
      attack,
      defense: 50,
      specialAttack: 50,
      specialDefense: 50,
      speed: 50,
      rank: id,
    },
  };
}

// 8 cards of one tier: attack 10, 20 ... 80
const roster = Array.from({ length: 8 }, (_, index) => makeCard(index + 1, (index + 1) * 10));

describe('getCardFeatures', () => {
  it('scores strong cards higher, and a low rank number as stronger', () => {
    const features = getCardFeatures(roster);
    const attackIndex = 1; // the second stat is attack
    const rankIndex = 6; // the seventh stat is rank

    expect(features.get(8)[attackIndex]).toBeGreaterThan(features.get(1)[attackIndex]);
    expect(features.get(1)[rankIndex]).toBeGreaterThan(features.get(8)[rankIndex]);
    expect(features.get(1)).toHaveLength(15);
  });

  it('keeps the result for the same roster', () => {
    expect(getCardFeatures(roster)).toBe(getCardFeatures(roster));
  });
});

describe('balanceDecks', () => {
  it('makes an unfair split level, without losing or adding any card', () => {
    const features = getCardFeatures(roster);
    const decks = [roster.slice(4), roster.slice(0, 4)]; // one deck has all the strong cards

    const gapBefore = getStatGap(decks, features);
    balanceDecks(decks, features);

    expect(getStatGap(decks, features)).toBeLessThan(gapBefore);
    expect(
      decks
        .flat()
        .map((card) => card.id)
        .sort((a, b) => a - b),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(decks.every((deck) => deck.length === 4)).toBe(true);
  });

  it('only swaps cards of the same tier', () => {
    const mixed = [
      makeCard(1, 10, 'S'),
      makeCard(2, 20, 'C'),
      makeCard(3, 80, 'S'),
      makeCard(4, 70, 'C'),
    ];
    const features = getCardFeatures(mixed);
    const decks = [
      [mixed[0], mixed[1]],
      [mixed[2], mixed[3]],
    ];

    balanceDecks(decks, features);

    for (const deck of decks) {
      expect(deck.map((card) => card.tier).sort()).toEqual(['C', 'S']);
    }
  });

  it('leaves decks that are already level alone', () => {
    const features = getCardFeatures(roster);
    const decks = [
      [roster[0], roster[7], roster[1], roster[6]],
      [roster[3], roster[4], roster[2], roster[5]],
    ];
    const before = decks.map((deck) => deck.map((card) => card.id));

    balanceDecks(decks, features);

    expect(getStatGap(decks, features)).toBeLessThan(0.1);
    expect(decks.flat()).toHaveLength(before.flat().length);
  });
});
