import { STATS } from '@pokemon-game/shared';

// Makes decks equally strong on what actually decides rounds: the 7 stats.
// Balancing only the Base Stat Total is not enough, because equal totals can hide very
// different decks (one with all the best cards, another with none).

const STAT_COUNT = STATS.length;
const HIGHEST_BST = 800; // only used to scale the BST feature to about 0..1
const MAX_SWAPS = 100;

// Computed once per roster (the roster is the same array for the whole life of the server)
const featureCache = new WeakMap();

// For every card and stat: what share of ALL cards does it beat? 0 is the weakest, 1 the strongest.
// A tie counts as half. For rank the LOWER number is the stronger one.
function computeStrengths(allCards) {
  const strengths = new Map(allCards.map((card) => [card.id, new Array(STAT_COUNT)]));

  STATS.forEach(({ key, lowerWins }, index) => {
    for (const card of allCards) {
      const value = card.stats[key];
      let beaten = 0;

      for (const other of allCards) {
        const otherValue = other.stats[key];
        if (otherValue === value) beaten += 0.5;
        else if (lowerWins ? value < otherValue : value > otherValue) beaten += 1;
      }
      strengths.get(card.id)[index] = beaten / allCards.length;
    }
  });
  return strengths;
}

// card id -> 15 numbers: 7 strengths, 7 peaks (strength to the 4th power, so that very strong
// cards weigh much more) and the scaled BST. Every number is something a deck's total can be
// compared on.
export function getCardFeatures(allCards) {
  const cached = featureCache.get(allCards);
  if (cached) return cached;

  const strengths = computeStrengths(allCards);
  const features = new Map();
  for (const card of allCards) {
    const own = strengths.get(card.id);
    features.set(card.id, [...own, ...own.map((value) => value ** 4), card.bst / HIGHEST_BST]);
  }

  featureCache.set(allCards, features);
  return features;
}

function sumFeatures(deck, features) {
  const sums = new Array(features.get(deck[0].id).length).fill(0);
  for (const card of deck) {
    features.get(card.id).forEach((value, index) => {
      sums[index] += value;
    });
  }
  return sums;
}

// How uneven the decks are: for every feature, the distance between the best and worst deck.
function getCost(deckSums) {
  let cost = 0;
  for (let feature = 0; feature < deckSums[0].length; feature += 1) {
    let min = Infinity;
    let max = -Infinity;
    for (const sums of deckSums) {
      min = Math.min(min, sums[feature]);
      max = Math.max(max, sums[feature]);
    }
    cost += max - min;
  }
  return cost;
}

// The biggest difference, in any of the 7 stats, between the best and worst deck, as a difference
// in average card strength. 0 is perfectly level. 0.10 means the best deck's cards beat 10% more
// of the roster, on average, than the worst deck's cards do.
export function getStatGap(decks, features) {
  const deckSums = decks.map((deck) => sumFeatures(deck, features));
  let gap = 0;

  for (let stat = 0; stat < STAT_COUNT; stat += 1) {
    const values = deckSums.map((sums) => sums[stat]);
    gap = Math.max(gap, (Math.max(...values) - Math.min(...values)) / decks[0].length);
  }
  return gap;
}

// Swaps cards of the SAME tier between decks, always the swap that makes the decks most level,
// until no swap helps. The tier recipe of every deck stays exactly the same. Changes the decks
// in place.
export function balanceDecks(decks, features) {
  const deckSums = decks.map((deck) => sumFeatures(deck, features));
  let currentCost = getCost(deckSums);

  for (let swaps = 0; swaps < MAX_SWAPS; swaps += 1) {
    let best = null;

    for (let a = 0; a < decks.length; a += 1) {
      for (let b = a + 1; b < decks.length; b += 1) {
        for (let i = 0; i < decks[a].length; i += 1) {
          for (let j = 0; j < decks[b].length; j += 1) {
            if (decks[a][i].tier !== decks[b][j].tier) continue;

            const fromA = features.get(decks[a][i].id);
            const fromB = features.get(decks[b][j].id);
            const newA = deckSums[a].map((sum, f) => sum - fromA[f] + fromB[f]);
            const newB = deckSums[b].map((sum, f) => sum - fromB[f] + fromA[f]);

            const trial = [...deckSums];
            trial[a] = newA;
            trial[b] = newB;
            const cost = getCost(trial);

            if (cost < (best ? best.cost : currentCost) - 1e-9) {
              best = { a, b, i, j, cost, newA, newB };
            }
          }
        }
      }
    }

    if (!best) break; // no swap makes the decks more level

    const { a, b, i, j } = best;
    [decks[a][i], decks[b][j]] = [decks[b][j], decks[a][i]];
    deckSums[a] = best.newA;
    deckSums[b] = best.newB;
    currentCost = best.cost;
  }

  return decks;
}
