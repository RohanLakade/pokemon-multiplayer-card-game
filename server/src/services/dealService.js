import { DECK_RECIPES, TIERS } from '@pokemon-game/shared';
import { defaultRandom, shuffle } from '../utils/random.js';
import { balanceDecks, getCardFeatures, getStatGap } from './deckBalance.js';
import { GameRuleError } from './gameErrors.js';

// A deal is fair enough when the strongest and weakest deck differ by at most 6% in total
// strength (BST), and by at most 0.10 in any single stat (see getStatGap). Otherwise the cards
// are dealt again, and the most level attempt is used if none of them is good enough.
const MAX_BST_SPREAD = 0.06;
const MAX_STAT_GAP = 0.1;
const MAX_ATTEMPTS = 10;

// Deals sorted cards so that totals stay level: 0, 1, 2 then 2, 1, 0, then 0, 1, 2 again.
function snakeIndex(position, playerCount) {
  const lap = Math.floor(position / playerCount);
  const offset = position % playerCount;
  return lap % 2 === 0 ? offset : playerCount - 1 - offset;
}

// Picks the cards of one tier for the whole game. The tier is shuffled first, so every card has
// the same chance. Every form (Venusaur, Mega Venusaur, Gigantamax Venusaur) is its own card.
// A card is only ever picked once, because it appears once in the shuffled list.
function pickTierCards(allCards, tier, needed, random) {
  const inTier = allCards.filter((card) => card.tier === tier);

  if (inTier.length < needed) {
    throw new GameRuleError(
      'NOT_ENOUGH_CARDS',
      `There are not enough tier ${tier} cards for this game`,
    );
  }
  return shuffle(inTier, random).slice(0, needed);
}

// One attempt at dealing every player a deck that follows the recipe.
function dealOnce(allCards, playerCount, recipe, random) {
  const decks = Array.from({ length: playerCount }, () => []);

  for (const tier of TIERS) {
    const chosen = pickTierCards(allCards, tier, recipe[tier] * playerCount, random);

    // Best card first, dealt in snake order, so every deck gets a similar total
    chosen
      .sort((a, b) => b.bst - a.bst)
      .forEach((card, position) => decks[snakeIndex(position, playerCount)].push(card));
  }
  return decks;
}

// How far apart the strongest and weakest deck are, as a share of the average deck.
function getBstSpread(decks) {
  const totals = decks.map((deck) => deck.reduce((sum, card) => sum + card.bst, 0));
  const average = totals.reduce((sum, total) => sum + total, 0) / totals.length;
  return (Math.max(...totals) - Math.min(...totals)) / average;
}

// Deals one hidden deck of "deckSize" cards to every player. Every deck has the same number of
// cards from each tier, no card appears twice in the whole game, and the decks are balanced on
// all 7 stats, not only on total strength.
export function dealDecks(allCards, playerCount, deckSize, random = defaultRandom) {
  const recipe = DECK_RECIPES[deckSize];
  if (!recipe) {
    throw new GameRuleError('INVALID_DECK_SIZE', 'That deck size is not allowed');
  }

  let best = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const decks = dealOnce(allCards, playerCount, recipe, random);
    balanceDecks(decks, getCardFeatures(allCards));

    // 1 or less means "good enough". The attempt with the lowest score is kept as a fallback.
    const score = Math.max(
      getBstSpread(decks) / MAX_BST_SPREAD,
      getStatGap(decks, getCardFeatures(allCards)) / MAX_STAT_GAP,
    );
    if (!best || score < best.score) best = { decks, score };
    if (score <= 1) break;
  }

  // Which player gets which deck, and the order of the cards in a deck, are random
  return shuffle(best.decks, random).map((deck) => shuffle(deck, random));
}
