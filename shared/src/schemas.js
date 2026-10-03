import { z } from 'zod';
import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  DEFAULT_CARDS_LIMIT,
  MAX_CARDS_LIMIT,
} from './constants.js';

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
