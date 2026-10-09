import { describe, it, expect } from 'vitest';
import {
  setAutoPlayPayloadSchema,
  setTimerPayloadSchema,
  setTurnSecondsPayloadSchema,
} from './schemas.js';

describe('setTurnSecondsPayloadSchema', () => {
  it('accepts only 30, 60 and 90 seconds', () => {
    for (const turnSeconds of [30, 60, 90]) {
      expect(setTurnSecondsPayloadSchema.safeParse({ turnSeconds }).success).toBe(true);
    }
    expect(setTurnSecondsPayloadSchema.safeParse({ turnSeconds: 45 }).success).toBe(false);
    expect(setTurnSecondsPayloadSchema.safeParse({ turnSeconds: '60' }).success).toBe(false);
    expect(setTurnSecondsPayloadSchema.safeParse({}).success).toBe(false);
  });
});

describe('on/off payloads', () => {
  it('accept true or false only', () => {
    for (const schema of [setAutoPlayPayloadSchema, setTimerPayloadSchema]) {
      expect(schema.safeParse({ enabled: true }).success).toBe(true);
      expect(schema.safeParse({ enabled: false }).success).toBe(true);
      expect(schema.safeParse({ enabled: 'yes' }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    }
  });
});
