import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { STAT_KEYS, TURN_SECONDS } from '@pokemon-game/shared';
import { createTestKit, emitWithAck, waitFor } from './testHelpers.js';

const kit = createTestKit();
let normalUrl; // 30 second turns
let fastUrl; // 1 second turns
let shortUrl; // 2 second turns

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeAll(async () => {
  normalUrl = await kit.startServer();
  fastUrl = await kit.startServer({ turnSeconds: 1 });
  shortUrl = await kit.startServer({ turnSeconds: 2 });
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
  it('plays the card of a non-leader who went offline, at once', async () => {
    const { leader, other } = await kit.startTwoPlayerGame(normalUrl);

    const droppedSeen = waitFor(leader.socket, 'player:disconnected');
    other.socket.disconnect();
    await droppedSeen;

    const result = waitFor(leader.socket, 'round:result');
    const response = await emitWithAck(leader.socket, 'round:choose-stat', { stat: 'speed' });

    expect(response.ok).toBe(true);
    expect((await result).plays).toHaveLength(2);
  });

  it('gives a leader who went offline the full time before choosing a stat for them', async () => {
    const { leader, other } = await kit.startTwoPlayerGame(shortUrl);

    const statChosen = waitFor(other.socket, 'round:stat-chosen');
    const roundResult = waitFor(other.socket, 'round:result');
    leader.socket.disconnect();

    // Half way through the 2 seconds nothing has been chosen for the offline leader yet...
    const early = await Promise.race([
      statChosen.then(() => 'chosen'),
      delay(1000).then(() => 'waiting'),
    ]);
    expect(early).toBe('waiting');

    // ...but when the full time is up, a stat is chosen and the round carries on
    await statChosen;
    const result = await roundResult;
    expect(result.plays).toHaveLength(2);
  }, 10000);
});
