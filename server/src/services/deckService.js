import { shuffle, defaultRandom } from '../utils/random.js';
import { GameRuleError } from './gameErrors.js';

// Deals one hidden deck per player.
// The whole roster is shuffled once, then cut into equal piles. A card can only
// appear in one pile, so every card in a game is unique.
export function dealDecks(allCards, playerCount, cardsPerPlayer, random = defaultRandom) {
  const cardsNeeded = playerCount * cardsPerPlayer;

  if (allCards.length < cardsNeeded) {
    throw new GameRuleError('NOT_ENOUGH_CARDS', 'There are not enough cards for this game');
  }

  const dealtCards = shuffle(allCards, random).slice(0, cardsNeeded);

  return Array.from({ length: playerCount }, (_, index) =>
    dealtCards.slice(index * cardsPerPlayer, (index + 1) * cardsPerPlayer),
  );
}
