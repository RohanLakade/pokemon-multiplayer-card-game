import { z } from 'zod';
import {
  DECK_SIZES,
  TURN_SECONDS_OPTIONS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  DEFAULT_CARDS_LIMIT,
  MAX_CARDS_LIMIT,
  PLAYER_NAME_MIN_LENGTH,
  PLAYER_NAME_MAX_LENGTH,
  SESSION_TOKEN_LENGTH,
} from './constants.js';
import { STAT_KEYS } from './stats.js';

// ---------- REST ----------

// ?limit=&offset= on GET /api/cards.
// Query strings are always text, so z.coerce turns "20" into the number 20.
export const cardsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_CARDS_LIMIT).default(DEFAULT_CARDS_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
});

// :id on GET /api/cards/:id
export const cardIdParamsSchema = z.object({
  id: z.coerce.number().int().min(1),
});

const roomCodePattern = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

// People type room codes, so trim spaces and upper-case before checking the format.
export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(roomCodePattern, 'Invalid room code');

// :code on GET /api/rooms/:code
export const roomCodeParamsSchema = z.object({
  code: roomCodeSchema,
});

// ---------- Socket.IO payloads ----------

// Letters (any language), accent marks, numbers, spaces, dots, dashes and underscores,
// with at least one letter or number. No < > & or quotes, so a name can never carry HTML.
const playerNamePattern = /^(?=.*[\p{L}\p{N}])[\p{L}\p{M}\p{N} _.-]+$/u;

export const playerNameSchema = z
  .string()
  .trim()
  .min(PLAYER_NAME_MIN_LENGTH)
  .max(PLAYER_NAME_MAX_LENGTH)
  .regex(playerNamePattern, 'Use letters, numbers, spaces, dots, dashes or underscores');

export const sessionTokenSchema = z
  .string()
  .regex(new RegExp(`^[a-f0-9]{${SESSION_TOKEN_LENGTH}}$`), 'Invalid session token');

// room:join. A new player sends a playerName. A returning player sends their sessionToken.
export const joinRoomPayloadSchema = z
  .object({
    code: roomCodeSchema,
    playerName: playerNameSchema.optional(),
    sessionToken: sessionTokenSchema.optional(),
  })
  .refine(
    (data) => data.playerName !== undefined || data.sessionToken !== undefined,
    'Send a playerName to join, or a sessionToken to reconnect',
  );

// room:set-deck-size. Only the host may send it, and only in the lobby.
export const setDeckSizePayloadSchema = z.object({
  deckSize: z
    .number()
    .int()
    .refine((value) => DECK_SIZES.includes(value), `Choose one of: ${DECK_SIZES.join(', ')}`),
});

// room:set-turn-seconds. Only the host may send it, and only in the lobby.
export const setTurnSecondsPayloadSchema = z.object({
  turnSeconds: z
    .number()
    .int()
    .refine(
      (value) => TURN_SECONDS_OPTIONS.includes(value),
      `Choose one of: ${TURN_SECONDS_OPTIONS.join(', ')}`,
    ),
});

// player:set-auto-play. A player switches their own auto-play on or off.
export const setAutoPlayPayloadSchema = z.object({
  enabled: z.boolean(),
});

// timer:set. Any player may switch the turn timer on, during a running game.
export const setTimerPayloadSchema = z.object({
  enabled: z.boolean(),
});

// round:choose-stat. Who is choosing is never in the payload: the server knows the socket.
export const chooseStatPayloadSchema = z.object({
  stat: z.enum(STAT_KEYS),
});

// round:choose-card. The card must be in the sender's own hand, which the server checks.
export const chooseCardPayloadSchema = z.object({
  cardId: z.number().int().positive(),
});
