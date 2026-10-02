import { randomInt } from 'node:crypto';

// Returns a whole number from 0 up to (but not including) max.
// crypto.randomInt is unpredictable, unlike Math.random, so players cannot guess a deal.
export function defaultRandom(max) {
  return randomInt(max);
}

// Fisher-Yates shuffle. Returns a new array and leaves the original untouched.
// "random" can be replaced in tests to get a predictable order.
export function shuffle(items, random = defaultRandom) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = random(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickRandom(items, random = defaultRandom) {
  return items[random(items.length)];
}
