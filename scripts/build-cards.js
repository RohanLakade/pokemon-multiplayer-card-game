// Run once with `npm run build:cards`. Fetches Pokémon from PokéAPI and writes
// server/data/cards.json. The server never calls PokéAPI at runtime.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchAllSpecies } from './lib/pokeapi.js';
import { buildCards, hasAllStats } from './lib/cardMapper.js';

// Resolved from this file's location, so it works from any working directory
const OUTPUT_FILE = fileURLToPath(new URL('../server/data/cards.json', import.meta.url));
const MIN_BASE_CARDS = 1025;

function countByCategory(cards) {
  const counts = { base: 0, mega: 0, regional: 0, gigantamax: 0 };
  for (const card of cards) counts[card.category] += 1;
  return counts;
}

async function main() {
  const species = await fetchAllSpecies();
  const allCards = buildCards(species);

  // Cards without all 7 stats cannot be played, so list them and leave them out
  const incomplete = allCards.filter((card) => !hasAllStats(card));
  const cards = allCards.filter(hasAllStats);
  if (incomplete.length > 0) {
    console.warn(`Skipped ${incomplete.length} cards with missing stats:`);
    for (const card of incomplete) console.warn(`  - ${card.name}`);
  }

  const withoutImage = cards.filter((card) => card.image === null);
  if (withoutImage.length > 0) {
    console.warn(`${withoutImage.length} cards have no image:`);
    for (const card of withoutImage) console.warn(`  - ${card.name}`);
  }

  // Every card in a game must be unique, so ids must be unique here too
  const uniqueIds = new Set(cards.map((card) => card.id));
  if (uniqueIds.size !== cards.length) {
    throw new Error('Duplicate card ids found');
  }

  const counts = countByCategory(cards);
  console.log('Cards per category:', counts, 'Total:', cards.length);

  if (counts.base < MIN_BASE_CARDS) {
    throw new Error(`Expected at least ${MIN_BASE_CARDS} base cards but got ${counts.base}`);
  }

  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, JSON.stringify(cards, null, 2));
  console.log(`Wrote ${cards.length} cards to ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
