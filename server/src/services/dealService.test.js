import { describe, it, expect } from 'vitest';
import { DECK_RECIPES, DECK_SIZES, TIERS } from '@pokemon-game/shared';
import { getAllCards } from './cardsService.js';
import { dealDecks } from './dealService.js';
import { GameRuleError } from './gameErrors.js';

// The biggest game: dealing for it proves the roster is big enough
const LARGEST_GAME = 8;

function totalBst(deck) {
  return deck.reduce((sum, card) => sum + card.bst, 0);
}

describe('dealDecks with the real card roster', () => {
  for (const deckSize of DECK_SIZES) {
    for (const playerCount of [2, 5, LARGEST_GAME]) {
      it(`deals ${playerCount} fair decks of ${deckSize} cards`, async () => {
        const cards = await getAllCards();
        const decks = dealDecks(cards, playerCount, deckSize);

        expect(decks).toHaveLength(playerCount);

        // Every deck follows the recipe: the right number of cards from each tier
        for (const deck of decks) {
          expect(deck).toHaveLength(deckSize);
          for (const tier of TIERS) {
            const inTier = deck.filter((card) => card.tier === tier);
            expect(inTier).toHaveLength(DECK_RECIPES[deckSize][tier]);
          }
        }

        // No card, and no Pokémon species, appears twice in the whole game
        const dealt = decks.flat();
        expect(new Set(dealt.map((card) => card.id)).size).toBe(dealt.length);
        expect(new Set(dealt.map((card) => card.speciesId)).size).toBe(dealt.length);

        // The strongest and weakest deck are close in total strength
        const totals = decks.map(totalBst);
        const average = totals.reduce((sum, total) => sum + total, 0) / totals.length;
        expect((Math.max(...totals) - Math.min(...totals)) / average).toBeLessThan(0.08);
      });
    }
  }
});

describe('dealDecks rules', () => {
  it('rejects a deck size that is not allowed', async () => {
    const cards = await getAllCards();

    expect(() => dealDecks(cards, 3, 12)).toThrow(GameRuleError);
    expect(() => dealDecks(cards, 3, 12)).toThrow(/deck size/i);
  });

  it('throws when the roster has too few cards of a tier', () => {
    const tinyRoster = Array.from({ length: 5 }, (_, index) => ({
      id: index + 1,
      speciesId: index + 1,
      tier: 'S',
      bst: 600,
    }));

    expect(() => dealDecks(tinyRoster, 2, 10)).toThrow(/not enough tier/i);
  });

  it('deals different decks each time', async () => {
    const cards = await getAllCards();
    const first = dealDecks(cards, 3, 10)
      .flat()
      .map((card) => card.id);
    const second = dealDecks(cards, 3, 10)
      .flat()
      .map((card) => card.id);

    expect(first).not.toEqual(second);
  });

  it('does not keep dealing the same cards: many games show many different Pokémon', async () => {
    const cards = await getAllCards();
    const seen = new Set();

    for (let game = 0; game < 40; game += 1) {
      for (const card of dealDecks(cards, 2, 10).flat()) seen.add(card.id);
    }

    expect(seen.size).toBeGreaterThan(250);
  });
});
