// Game rules that both the server and the client need to know.
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

// Each player holds a hand of 5 cards, and the host chooses the deck size.
// The game lasts as many rounds as the deck has cards.
export const HAND_SIZE = 5;
export const DECK_SIZES = [10, 15, 20];
export const DEFAULT_DECK_SIZE = 20;

// The turn timer is optional: a game starts with it off, and any player can switch it on.
// The host chooses in the lobby how long each step (choosing a stat, then everyone choosing
// a card) lasts once the timer is on.
export const TURN_SECONDS_OPTIONS = [30, 60, 90];
export const DEFAULT_TURN_SECONDS = 90;

// A player whose turn ran out this many times in a row is switched to auto-play
export const MISSED_TURNS_BEFORE_AUTO_PLAY = 2;

// The computer opponent: its name, and how long it "thinks" before each move, so the reveal
// does not happen the instant a human picks.
export const BOT_NAME = 'Computer';
export const BOT_THINK_MS = 1000;

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
