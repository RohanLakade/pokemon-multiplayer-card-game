import { describe, it, expect } from 'vitest';
import { TIERS, getBst } from '@pokemon-game/shared';
import { findCardById, getAllCards } from './cardsService.js';

describe('cards with tiers', () => {
  it('gives every card its Base Stat Total and a tier', async () => {
    const cards = await getAllCards();

    for (const card of cards) {
      expect(card.bst).toBe(getBst(card.stats));
      expect(TIERS).toContain(card.tier);
    }
  });

  it('puts a Mega Charizard X in tier S and Bulbasaur in tier C', async () => {
    expect((await findCardById(10034)).tier).toBe('S');
    expect((await findCardById(1)).tier).toBe('C');
  });

  it('has cards in every tier', async () => {
    const cards = await getAllCards();

    for (const tier of TIERS) {
      expect(cards.filter((card) => card.tier === tier).length).toBeGreaterThan(0);
    }
  });
});
