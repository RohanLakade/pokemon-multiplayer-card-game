import { readFile } from 'node:fs/promises';
import { describe, it, expect } from 'vitest';
import { MAX_PLAYERS, CARDS_PER_PLAYER } from '@pokemon-game/shared';
import { dealDecks } from './deckService.js';
import { GameRuleError } from './gameErrors.js';

function makeCards(count) {
  return Array.from({ length: count }, (_, index) => ({ id: index + 1 }));
}

describe('dealDecks', () => {
  it('gives each player a deck of the right size', () => {
    const decks = dealDecks(makeCards(100), 3, 20);

    expect(decks).toHaveLength(3);
    for (const deck of decks) expect(deck).toHaveLength(20);
  });

  it('never deals the same card twice', () => {
    const decks = dealDecks(makeCards(100), 3, 20);
    const ids = decks.flat().map((card) => card.id);

    expect(new Set(ids).size).toBe(60);
  });

  it('throws when there are not enough cards', () => {
    expect(() => dealDecks(makeCards(50), 3, 20)).toThrow(GameRuleError);
    expect(() => dealDecks(makeCards(50), 3, 20)).toThrow(/not enough cards/i);
  });
});

describe('the real card roster', () => {
  it('is big enough for the largest game and every card is playable', async () => {
    const file = new URL('../../data/cards.json', import.meta.url);
    const cards = JSON.parse(await readFile(file, 'utf-8'));

    expect(cards.length).toBeGreaterThanOrEqual(MAX_PLAYERS * CARDS_PER_PLAYER);
    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);

    for (const card of cards) {
      expect(Object.keys(card.stats)).toHaveLength(7);
    }
  });
});
