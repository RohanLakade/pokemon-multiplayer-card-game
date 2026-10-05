// Game rules that both the server and the client need to know.
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

// The first version of the game (a fixed 20-card deck, no hand). They stay until the new
// game logic replaces the old one (reply 2 of the redesign), then they are removed.
export const CARDS_PER_PLAYER = 20;
export const ROUNDS_PER_GAME = CARDS_PER_PLAYER;

// The new game: each player holds a hand of 5 cards, and the host chooses the deck size.
// The game lasts as many rounds as the deck has cards.
export const HAND_SIZE = 5;
export const DECK_SIZES = [10, 15, 20];
export const DEFAULT_DECK_SIZE = 20;

// Room codes: 6 characters from an alphabet without look-alikes (no 0/O and no 1/I).
// 32 characters over 6 places is about a billion possible codes.
export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Paging for GET /api/cards
export const DEFAULT_CARDS_LIMIT = 20;
export const MAX_CARDS_LIMIT = 100;

// Player names, and session tokens (32 random bytes written as 64 hex characters)
export const PLAYER_NAME_MIN_LENGTH = 2;
export const PLAYER_NAME_MAX_LENGTH = 20;
export const SESSION_TOKEN_LENGTH = 64;

// Turn timer: each step (choosing a stat, then playing the cards) gets this many seconds,
// whether the player is online or not
export const TURN_SECONDS = 30;
