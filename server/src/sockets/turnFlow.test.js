import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { STAT_KEYS, TURN_SECONDS } from '@pokemon-game/shared';
import { createTestKit, emitWithAck, waitFor } from './testHelpers.js';

const kit = createTestKit();
let normalUrl; // 20 second turns
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

  it('chooses a stat, then a card for everyone, when time runs out', async () => {
    const { alice } = await kit.startTwoPlayerGame(fastUrl);

    const [chosen, result] = await Promise.all([
      waitFor(alice.socket, 'round:stat-chosen'),
      waitFor(alice.socket, 'round:result'),
    ]);

    expect(STAT_KEYS).toContain(chosen.stat);
    expect(result.plays).toHaveLength(2);
  }, 10000);
});

describe('players who are offline', () => {
  it('gives an offline leader the full time before choosing a stat for them', async () => {
    const { leader, other } = await kit.startTwoPlayerGame(shortUrl);

    const statChosen = waitFor(other.socket, 'round:stat-chosen');
    leader.socket.disconnect();

    // Half way through the 2 seconds nothing has been chosen for the offline leader yet...
    const early = await Promise.race([
      statChosen.then(() => 'chosen'),
      delay(1000).then(() => 'waiting'),
    ]);
    expect(early).toBe('waiting');

    // ...but when the full time is up, a stat is chosen and the round carries on
    expect((await statChosen).stat).toBeDefined();
  }, 10000);

  it('does not pick a card for an offline non-leader until their time runs out', async () => {
    const { rounds, leader, other } = await kit.startTwoPlayerGame(shortUrl);

    const droppedSeen = waitFor(leader.socket, 'player:disconnected');
    other.socket.disconnect();
    await droppedSeen;

    // The leader does everything they can: choose the stat, then pick a card
    const chosen = await emitWithAck(leader.socket, 'round:choose-stat', { stat: 'speed' });
    expect(chosen.ok).toBe(true);

    const result = waitFor(leader.socket, 'round:result');
    const handCard = rounds[leader.playerId].you.hand[0];
    const picked = await emitWithAck(leader.socket, 'round:choose-card', { cardId: handCard.id });
    expect(picked.ok).toBe(true);

    // The offline player still has their time, so the round is not scored yet...
    const early = await Promise.race([
      result.then(() => 'result'),
      delay(1000).then(() => 'waiting'),
    ]);
    expect(early).toBe('waiting');

    // ...and when their time is up, a random card is picked for them
    expect((await result).plays).toHaveLength(2);
  }, 10000);
});
