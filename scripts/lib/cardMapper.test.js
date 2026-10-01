import { describe, it, expect } from 'vitest';
import {
  getCategory,
  mapStats,
  pickImage,
  buildDisplayName,
  toCard,
  hasAllStats,
} from './cardMapper.js';

describe('getCategory', () => {
  it('treats a default form as base', () => {
    expect(getCategory({ name: 'bulbasaur', is_default: true })).toBe('base');
  });

  it('detects Megas, including X and Y', () => {
    expect(getCategory({ name: 'venusaur-mega', is_default: false })).toBe('mega');
    expect(getCategory({ name: 'charizard-mega-x', is_default: false })).toBe('mega');
  });

  it('detects regional forms', () => {
    expect(getCategory({ name: 'ninetales-alola', is_default: false })).toBe('regional');
    expect(getCategory({ name: 'tauros-paldea-combat-breed', is_default: false })).toBe('regional');
  });

  it('detects Gigantamax forms', () => {
    expect(getCategory({ name: 'pikachu-gmax', is_default: false })).toBe('gigantamax');
  });

  it('skips battle-only extras and other non-default forms', () => {
    expect(getCategory({ name: 'pikachu-alola-cap', is_default: false })).toBeNull();
    expect(getCategory({ name: 'raticate-totem-alola', is_default: false })).toBeNull();
    expect(getCategory({ name: 'darmanitan-galar-zen', is_default: false })).toBeNull();
    expect(getCategory({ name: 'deoxys-attack', is_default: false })).toBeNull();
  });
});

describe('mapStats', () => {
  it('maps API stat names to camelCase keys', () => {
    const result = mapStats([
      { base_stat: 45, stat: { name: 'special-attack' } },
      { base_stat: 60, stat: { name: 'hp' } },
    ]);
    expect(result).toEqual({ specialAttack: 45, hp: 60 });
  });
});

describe('pickImage', () => {
  it('prefers official artwork', () => {
    const pokemon = {
      pokemonsprites: [
        {
          sprites: {
            front_default: 'small.png',
            other: { 'official-artwork': { front_default: 'big.png' } },
          },
        },
      ],
    };
    expect(pickImage(pokemon)).toBe('big.png');
  });

  it('falls back to front_default', () => {
    const pokemon = {
      pokemonsprites: [{ sprites: { front_default: 'small.png' } }],
    };
    expect(pickImage(pokemon)).toBe('small.png');
  });

  it('handles sprites that arrive as a JSON string', () => {
    const sprites = JSON.stringify({ front_default: 'from-string.png' });
    expect(pickImage({ pokemonsprites: [{ sprites }] })).toBe('from-string.png');
  });

  it('returns null when there is no image', () => {
    expect(pickImage({ pokemonsprites: [] })).toBeNull();
  });
});

describe('buildDisplayName', () => {
  it('keeps the plain name for base cards', () => {
    expect(buildDisplayName('bulbasaur', 'bulbasaur', 'base')).toBe('Bulbasaur');
  });

  it('puts the form first for Megas, with the X or Y at the end', () => {
    expect(buildDisplayName('venusaur', 'venusaur-mega', 'mega')).toBe('Mega Venusaur');
    expect(buildDisplayName('charizard', 'charizard-mega-x', 'mega')).toBe('Mega Charizard X');
  });

  it('names regional and Gigantamax forms', () => {
    expect(buildDisplayName('raichu', 'raichu-alola', 'regional')).toBe('Alolan Raichu');
    expect(buildDisplayName('pikachu', 'pikachu-gmax', 'gigantamax')).toBe('Gigantamax Pikachu');
  });
});

describe('toCard', () => {
  const stats = [
    { base_stat: 80, stat: { name: 'hp' } },
    { base_stat: 100, stat: { name: 'attack' } },
    { base_stat: 123, stat: { name: 'defense' } },
    { base_stat: 122, stat: { name: 'special-attack' } },
    { base_stat: 120, stat: { name: 'special-defense' } },
    { base_stat: 80, stat: { name: 'speed' } },
  ];

  it('uses the species id as rank for a form with a 10000+ id', () => {
    const species = { id: 3, name: 'venusaur' };
    const pokemon = {
      id: 10033,
      name: 'venusaur-mega',
      is_default: false,
      pokemonstats: stats,
      pokemonsprites: [{ sprites: { front_default: 'mega.png' } }],
    };

    const card = toCard(species, pokemon);

    expect(card.stats.rank).toBe(3);
    expect(card.speciesId).toBe(3);
    expect(card.id).toBe(10033);
    expect(hasAllStats(card)).toBe(true);
  });

  it('returns null for Pokémon that are not cards', () => {
    const species = { id: 25, name: 'pikachu' };
    const pokemon = {
      id: 1,
      name: 'pikachu-alola-cap',
      is_default: false,
      pokemonstats: [],
    };
    expect(toCard(species, pokemon)).toBeNull();
  });
});
