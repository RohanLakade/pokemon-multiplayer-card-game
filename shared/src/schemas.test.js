import { describe, it, expect } from 'vitest';
import {
  cardsQuerySchema,
  cardIdParamsSchema,
  roomCodeSchema,
  playerNameSchema,
  joinRoomPayloadSchema,
  setDeckSizePayloadSchema,
  chooseStatPayloadSchema,
  chooseCardPayloadSchema,
} from './schemas.js';

describe('cardsQuerySchema', () => {
  it('uses defaults when nothing is sent', () => {
    expect(cardsQuerySchema.parse({})).toEqual({ limit: 20, offset: 0 });
  });

  it('turns text into numbers', () => {
    expect(cardsQuerySchema.parse({ limit: '5', offset: '10' })).toEqual({ limit: 5, offset: 10 });
  });

  it('rejects values outside the allowed range or not numbers', () => {
    expect(cardsQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
    expect(cardsQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(cardsQuerySchema.safeParse({ offset: '-1' }).success).toBe(false);
    expect(cardsQuerySchema.safeParse({ limit: 'abc' }).success).toBe(false);
  });
});

describe('cardIdParamsSchema', () => {
  it('accepts a positive whole number', () => {
    expect(cardIdParamsSchema.parse({ id: '25' })).toEqual({ id: 25 });
  });

  it('rejects zero, decimals and text', () => {
    expect(cardIdParamsSchema.safeParse({ id: '0' }).success).toBe(false);
    expect(cardIdParamsSchema.safeParse({ id: '1.5' }).success).toBe(false);
    expect(cardIdParamsSchema.safeParse({ id: 'abc' }).success).toBe(false);
  });
});

describe('roomCodeSchema', () => {
  it('trims and upper-cases the code', () => {
    expect(roomCodeSchema.parse(' abc234 ')).toBe('ABC234');
  });

  it('rejects wrong length and look-alike characters', () => {
    expect(roomCodeSchema.safeParse('ABC12').success).toBe(false);
    expect(roomCodeSchema.safeParse('ABCDEI').success).toBe(false);
    expect(roomCodeSchema.safeParse('ABCDE0').success).toBe(false);
  });
});

describe('playerNameSchema', () => {
  it('accepts normal names, including accents, and trims spaces', () => {
    expect(playerNameSchema.parse('Ash')).toBe('Ash');
    expect(playerNameSchema.parse('  José_2  ')).toBe('José_2');
    expect(playerNameSchema.parse('Misty K.')).toBe('Misty K.');
  });

  it('rejects names that are too short, too long or contain markup', () => {
    expect(playerNameSchema.safeParse('A').success).toBe(false);
    expect(playerNameSchema.safeParse('x'.repeat(21)).success).toBe(false);
    expect(playerNameSchema.safeParse('<script>').success).toBe(false);
    expect(playerNameSchema.safeParse('Ash & Co').success).toBe(false);
  });

  it('rejects names without a letter or number', () => {
    expect(playerNameSchema.safeParse('..').success).toBe(false);
    expect(playerNameSchema.safeParse('   ').success).toBe(false);
  });
});

describe('joinRoomPayloadSchema', () => {
  const token = 'a'.repeat(64);

  it('accepts a new player with a name', () => {
    const result = joinRoomPayloadSchema.parse({ code: 'abc234', playerName: 'Ash' });
    expect(result).toEqual({ code: 'ABC234', playerName: 'Ash' });
  });

  it('accepts a returning player with a token', () => {
    expect(joinRoomPayloadSchema.safeParse({ code: 'ABC234', sessionToken: token }).success).toBe(
      true,
    );
  });

  it('rejects a payload with neither a name nor a token', () => {
    expect(joinRoomPayloadSchema.safeParse({ code: 'ABC234' }).success).toBe(false);
  });

  it('rejects a malformed token or code', () => {
    expect(joinRoomPayloadSchema.safeParse({ code: 'ABC234', sessionToken: 'short' }).success).toBe(
      false,
    );
    expect(joinRoomPayloadSchema.safeParse({ code: 'nope', playerName: 'Ash' }).success).toBe(
      false,
    );
  });
});

describe('setDeckSizePayloadSchema', () => {
  it('accepts only the allowed deck sizes', () => {
    for (const deckSize of [10, 15, 20]) {
      expect(setDeckSizePayloadSchema.safeParse({ deckSize }).success).toBe(true);
    }
    expect(setDeckSizePayloadSchema.safeParse({ deckSize: 12 }).success).toBe(false);
    expect(setDeckSizePayloadSchema.safeParse({ deckSize: '10' }).success).toBe(false);
    expect(setDeckSizePayloadSchema.safeParse({}).success).toBe(false);
  });
});

describe('chooseStatPayloadSchema', () => {
  it('accepts a real stat and ignores extra fields such as a player id', () => {
    expect(chooseStatPayloadSchema.parse({ stat: 'specialAttack', playerId: 'someone' })).toEqual({
      stat: 'specialAttack',
    });
  });

  it('rejects an unknown stat or a missing one', () => {
    expect(chooseStatPayloadSchema.safeParse({ stat: 'special-attack' }).success).toBe(false);
    expect(chooseStatPayloadSchema.safeParse({}).success).toBe(false);
  });
});

describe('chooseCardPayloadSchema', () => {
  it('accepts a card id', () => {
    expect(chooseCardPayloadSchema.parse({ cardId: 10033 })).toEqual({ cardId: 10033 });
  });

  it('rejects ids that are text, decimals, zero or missing', () => {
    expect(chooseCardPayloadSchema.safeParse({ cardId: '5' }).success).toBe(false);
    expect(chooseCardPayloadSchema.safeParse({ cardId: 1.5 }).success).toBe(false);
    expect(chooseCardPayloadSchema.safeParse({ cardId: 0 }).success).toBe(false);
    expect(chooseCardPayloadSchema.safeParse({}).success).toBe(false);
  });
});
