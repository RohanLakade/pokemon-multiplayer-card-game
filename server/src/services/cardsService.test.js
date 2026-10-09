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

describe('rank is the id of the card itself', () => {
  it('gives Venusaur rank 3 and Mega Venusaur rank 10033', async () => {
    expect((await findCardById(3)).stats.rank).toBe(3);
    expect((await findCardById(10033)).stats.rank).toBe(10033);
  });

  it('gives every card its own id as rank', async () => {
    const cards = await getAllCards();

    for (const card of cards) {
      expect(card.stats.rank).toBe(card.id);
    }
  });

  it('ranks every form after every base Pokémon, so a base card wins a Rank round', async () => {
    const cards = await getAllCards();
    const baseRanks = cards
      .filter((card) => card.category === 'base')
      .map((card) => card.stats.rank);
    const formRanks = cards
      .filter((card) => card.category !== 'base')
      .map((card) => card.stats.rank);

    expect(Math.max(...baseRanks)).toBeLessThan(Math.min(...formRanks));
  });
});
