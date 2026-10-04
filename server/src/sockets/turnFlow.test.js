import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { STAT_KEYS, TURN_SECONDS } from '@pokemon-game/shared';
import { createTestKit, emitWithAck, waitFor } from './testHelpers.js';

const kit = createTestKit();
let normalUrl; // 30 second turns
let fastUrl; // 1 second turns, so the timer tests are quick

beforeAll(async () => {
  normalUrl = await kit.startServer();
  fastUrl = await kit.startServer({ turnSeconds: 1, awayTurnSeconds: 1 });
});

afterAll(() => kit.stopAll());

describe('turn timer', () => {
  it('tells every player how much time is left', async () => {
    const { rounds } = await kit.startTwoPlayerGame(normalUrl);

    for (const round of Object.values(rounds)) {
      expect(round.turnSecondsLeft).toBeGreaterThan(0);
      expect(round.turnSecondsLeft).toBeLessThanOrEqual(TURN_SECONDS);
    }
  });

  it('chooses a stat and plays the cards by itself when time runs out', async () => {
    const { alice } = await kit.startTwoPlayerGame(fastUrl);

    const [chosen, result] = await Promise.all([
      waitFor(alice.socket, 'round:stat-chosen'),
      waitFor(alice.socket, 'round:result'),
    ]);

    expect(STAT_KEYS).toContain(chosen.stat);
    expect(result.plays).toHaveLength(2);
  }, 10000);
});

describe('players who are away', () => {
  it('plays the card of a player who went offline, at once', async () => {
    const { leader, other } = await kit.startTwoPlayerGame(normalUrl);

    const droppedSeen = waitFor(leader.socket, 'player:disconnected');
    other.socket.disconnect();
    await droppedSeen;

    const result = waitFor(leader.socket, 'round:result');
    const response = await emitWithAck(leader.socket, 'round:choose-stat', { stat: 'speed' });

    expect(response.ok).toBe(true);
    expect((await result).plays).toHaveLength(2);
  });

  it('chooses a stat for a leader who went offline, after a short wait', async () => {
    const { leader, other } = await kit.startTwoPlayerGame(fastUrl);

    leader.socket.disconnect();
    const result = await waitFor(other.socket, 'round:result');

    expect(result.plays).toHaveLength(2);
  }, 10000);
});
