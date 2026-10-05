import { DECK_RECIPES, TIERS } from '@pokemon-game/shared';
import { defaultRandom, shuffle } from '../utils/random.js';
import { GameRuleError } from './gameErrors.js';

// If the strongest and weakest deck differ by more than 6%, the cards are dealt again
const MAX_BST_SPREAD = 0.06;
const MAX_ATTEMPTS = 10;

// Deals sorted cards so that totals stay level: 0, 1, 2 then 2, 1, 0, then 0, 1, 2 again.
function snakeIndex(position, playerCount) {
  const lap = Math.floor(position / playerCount);
  const offset = position % playerCount;
  return lap % 2 === 0 ? offset : playerCount - 1 - offset;
}

// One attempt at dealing every player a deck that follows the recipe.
function dealOnce(allCards, playerCount, recipe, random) {
  const usedSpecies = new Set();
  const decks = Array.from({ length: playerCount }, () => []);

  // Strongest tier first: it has the fewest cards, so it should choose first
  for (const tier of TIERS) {
    const needed = recipe[tier] * playerCount;
    const chosen = [];

    for (const card of shuffle(
      allCards.filter((candidate) => candidate.tier === tier),
      random,
    )) {
      if (chosen.length === needed) break;
      if (usedSpecies.has(card.speciesId)) continue; // one card per species in a game
      usedSpecies.add(card.speciesId);
      chosen.push(card);
    }

    if (chosen.length < needed) {
      throw new GameRuleError(
        'NOT_ENOUGH_CARDS',
        `There are not enough tier ${tier} cards for this game`,
      );
    }

    // Best card first, dealt in snake order, so every deck gets a similar total
    chosen
      .sort((a, b) => b.bst - a.bst)
      .forEach((card, position) => decks[snakeIndex(position, playerCount)].push(card));
  }

  // Which player gets which deck, and the order of the cards in a deck, are random
  return shuffle(decks, random).map((deck) => shuffle(deck, random));
}

// How far apart the strongest and weakest deck are, as a share of the average deck.
function getBstSpread(decks) {
  const totals = decks.map((deck) => deck.reduce((sum, card) => sum + card.bst, 0));
  const average = totals.reduce((sum, total) => sum + total, 0) / totals.length;
  return (Math.max(...totals) - Math.min(...totals)) / average;
}

// Deals one hidden deck of "deckSize" cards to every player. Every deck has the same number of
// cards from each tier, and no Pokémon species appears twice in the whole game.
export function dealDecks(allCards, playerCount, deckSize, random = defaultRandom) {
  const recipe = DECK_RECIPES[deckSize];
  if (!recipe) {
    throw new GameRuleError('INVALID_DECK_SIZE', 'That deck size is not allowed');
  }

  let best = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const decks = dealOnce(allCards, playerCount, recipe, random);
    const spread = getBstSpread(decks);

    if (spread <= MAX_BST_SPREAD) return decks;
    if (!best || spread < best.spread) best = { decks, spread };
  }

  return best.decks; // no attempt was within the limit: use the most level one
}
