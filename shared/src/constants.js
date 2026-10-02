// Game rules that both the server and the client need to know.
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const CARDS_PER_PLAYER = 20;

// Every player plays exactly one card per round, so a game lasts as long as one deck.
export const ROUNDS_PER_GAME = CARDS_PER_PLAYER;
