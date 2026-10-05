import { readFile } from 'node:fs/promises';
import { getBst, getTier } from '@pokemon-game/shared';

const CARDS_FILE = new URL('../../data/cards.json', import.meta.url);

// Adds the Base Stat Total and the tier to a card. This happens here, when the file is
// loaded, so changing a tier limit never needs the card build script (and the internet) again.
function addTier(card) {
  const bst = getBst(card.stats);
  return { ...card, bst, tier: getTier(bst) };
}

// The file is read once and kept in memory. We store the promise, so two requests
// arriving at the same moment still cause only one read.
let cardsPromise = null;

function loadCards() {
  cardsPromise ??= readFile(CARDS_FILE, 'utf-8').then((text) => {
    const cards = JSON.parse(text).map(addTier);
    return { cards, byId: new Map(cards.map((card) => [card.id, card])) };
  });
  return cardsPromise;
}

export async function getAllCards() {
  return (await loadCards()).cards;
}

export async function listCards(limit, offset) {
  const { cards } = await loadCards();
  return { total: cards.length, limit, offset, cards: cards.slice(offset, offset + limit) };
}

export async function findCardById(id) {
  return (await loadCards()).byId.get(id) ?? null;
}
