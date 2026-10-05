// Pokémon are grouped into 4 tiers by their Base Stat Total (BST): the sum of the six
// base stats (rank is not part of it). Every deck gets the same number of cards from each
// tier, so nobody can end up with a deck of legendaries while someone else gets only
// weak first stages.
export const TIERS = ['S', 'A', 'B', 'C']; // strongest first

// The lowest BST a card needs to belong to a tier
export const TIER_MIN_BST = { S: 580, A: 480, B: 380, C: 0 };

// How many cards of each tier a deck has, per deck size. Each recipe adds up to its deck size.
// About a fifth of every deck is tier S, so everyone holds some strong cards.
export const DECK_RECIPES = {
  10: { S: 2, A: 4, B: 2, C: 2 },
  15: { S: 3, A: 5, B: 4, C: 3 },
  20: { S: 4, A: 7, B: 5, C: 4 },
};

export function getBst(stats) {
  return (
    stats.hp +
    stats.attack +
    stats.defense +
    stats.specialAttack +
    stats.specialDefense +
    stats.speed
  );
}

// The first tier (from the strongest) whose minimum the BST reaches. Tier C starts at 0,
// so every card has a tier.
export function getTier(bst) {
  return TIERS.find((tier) => bst >= TIER_MIN_BST[tier]);
}
