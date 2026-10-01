// Pure functions that turn raw PokéAPI data into game cards. No network, no files,
// so they are easy to unit test.

const STAT_KEYS = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  speed: 'speed',
};

// Words in a form name that we turn into a readable prefix
const TAG_WORDS = {
  mega: 'Mega',
  gmax: 'Gigantamax',
  alola: 'Alolan',
  galar: 'Galarian',
  hisui: 'Hisuian',
  paldea: 'Paldean',
};

// Battle-only or event extras that match our name filters but are not real cards
const EXCLUDED = /-(totem|cap|zen)(-|$)/;
const REGIONAL = /-(alola|galar|hisui|paldea)(-|$)/;

// Returns 'base', 'mega', 'regional', 'gigantamax', or null if the Pokémon is not a card
export function getCategory(pokemon) {
  const { name, is_default } = pokemon;

  if (EXCLUDED.test(name)) return null;
  if (/-mega(-|$)/.test(name)) return 'mega';
  if (/-gmax$/.test(name)) return 'gigantamax';
  if (REGIONAL.test(name)) return 'regional';
  if (is_default) return 'base';
  return null;
}

export function mapStats(pokemonstats) {
  const stats = {};
  for (const { base_stat, stat } of pokemonstats) {
    const key = STAT_KEYS[stat.name];
    if (key) stats[key] = base_stat;
  }
  return stats;
}

// The API can return sprites as an object or as a JSON string, so handle both
function parseSprites(rawSprites) {
  if (typeof rawSprites !== 'string') return rawSprites;
  try {
    return JSON.parse(rawSprites);
  } catch {
    return null;
  }
}

export function pickImage(pokemon) {
  const sprites = parseSprites(pokemon.pokemonsprites?.[0]?.sprites);
  return sprites?.other?.['official-artwork']?.front_default ?? sprites?.front_default ?? null;
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// "venusaur" + "venusaur-mega" -> "Mega Venusaur"
export function buildDisplayName(speciesName, pokemonName, category) {
  const baseName = speciesName.split('-').map(capitalize).join(' ');
  if (category === 'base') return baseName;

  const suffix = pokemonName.startsWith(`${speciesName}-`)
    ? pokemonName.slice(speciesName.length + 1)
    : '';
  const words = suffix.split('-').filter(Boolean);
  const tag = words.find((word) => TAG_WORDS[word]);
  const extras = words.filter((word) => word !== tag).map(capitalize);

  return [TAG_WORDS[tag], baseName, ...extras].filter(Boolean).join(' ');
}

// Rank is the SPECIES number, never the form id (forms have ids of 10000 and up)
export function toCard(species, pokemon) {
  const category = getCategory(pokemon);
  if (!category) return null;

  return {
    id: pokemon.id,
    name: pokemon.name,
    displayName: buildDisplayName(species.name, pokemon.name, category),
    category,
    speciesId: species.id,
    image: pickImage(pokemon),
    stats: { ...mapStats(pokemon.pokemonstats), rank: species.id },
  };
}

// A playable card needs all 7 stats (6 base stats plus rank)
export function hasAllStats(card) {
  return Object.keys(card.stats).length === 7;
}

export function buildCards(speciesList) {
  const cards = [];
  for (const species of speciesList) {
    for (const pokemon of species.pokemons) {
      const card = toCard(species, pokemon);
      if (card) cards.push(card);
    }
  }
  return cards;
}
