import { describe, it, expect } from 'vitest';
import { cardsQuerySchema, cardIdParamsSchema, roomCodeSchema } from './schemas.js';

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
