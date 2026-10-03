// Game rules that both the server and the client need to know.
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const CARDS_PER_PLAYER = 20;

// Every player plays exactly one card per round, so a game lasts as long as one deck.
export const ROUNDS_PER_GAME = CARDS_PER_PLAYER;

// Room codes: 6 characters from an alphabet without look-alikes (no 0/O and no 1/I).
// 32 characters over 6 places is about a billion possible codes.
export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Paging for GET /api/cards
export const DEFAULT_CARDS_LIMIT = 20;
export const MAX_CARDS_LIMIT = 100;
