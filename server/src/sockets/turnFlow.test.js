import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DEFAULT_TURN_SECONDS, STAT_KEYS } from '@pokemon-game/shared';
import { createTestKit, emitWithAck, waitFor } from './testHelpers.js';

const kit = createTestKit();
let normalUrl; // the default turn length: 90 seconds
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

describe('the timer toggle', () => {
  it('starts every game with the timer off, so nothing runs out', async () => {
    const { rounds, leader } = await kit.startTwoPlayerGame(fastUrl);

    for (const round of Object.values(rounds)) {
      expect(round.turnSecondsLeft).toBeNull();
    }

    // With 1 second turns a timer would have chosen a stat long ago
    const statChosen = waitFor(leader.socket, 'round:stat-chosen');
    const early = await Promise.race([
      statChosen.then(() => 'chosen'),
      delay(2500).then(() => 'waiting'),
    ]);
    expect(early).toBe('waiting');
  }, 10000);

  it('lets any player start it, and tells everyone who did and how much time is left', async () => {
    const { alice, leader, other } = await kit.startTwoPlayerGame(normalUrl);

    const seenByLeader = waitFor(leader.socket, 'timer:changed');
    const started = await emitWithAck(other.socket, 'timer:set', { enabled: true });
    expect(started.ok).toBe(true);

    const change = await seenByLeader;
    expect(change).toMatchObject({
      on: true,
      startedBy: other.playerId,
      startedByName: other === alice ? 'Alice' : 'Bob',
    });
    expect(change.turnSecondsLeft).toBeGreaterThan(0);
    expect(change.turnSecondsLeft).toBeLessThanOrEqual(DEFAULT_TURN_SECONDS);

    const again = await emitWithAck(leader.socket, 'timer:set', { enabled: true });
    expect(again.error.code).toBe('TIMER_ALREADY_ON');
  });

  it('lets only the player who started it stop it', async () => {
    const { leader, other } = await kit.startTwoPlayerGame(normalUrl);
    await emitWithAck(other.socket, 'timer:set', { enabled: true });

    const refused = await emitWithAck(leader.socket, 'timer:set', { enabled: false });
    expect(refused.error.code).toBe('NOT_TIMER_STARTER');

    const stoppedSeen = waitFor(leader.socket, 'timer:changed');
    const stopped = await emitWithAck(other.socket, 'timer:set', { enabled: false });
    expect(stopped.ok).toBe(true);
    expect(await stoppedSeen).toMatchObject({ on: false, startedBy: null, turnSecondsLeft: null });

    const notRunning = await emitWithAck(other.socket, 'timer:set', { enabled: false });
    expect(notRunning.error.code).toBe('TIMER_NOT_ON');
  });

  it('lets anyone stop it when the player who started it is offline', async () => {
    const { leader, other } = await kit.startTwoPlayerGame(normalUrl);
    await emitWithAck(other.socket, 'timer:set', { enabled: true });

    const droppedSeen = waitFor(leader.socket, 'player:disconnected');
    other.socket.disconnect();
    await droppedSeen;

    const stopped = await emitWithAck(leader.socket, 'timer:set', { enabled: false });
    expect(stopped.ok).toBe(true);
  });

  it('shows the timer to a player who comes back', async () => {
    const { room, other } = await kit.startTwoPlayerGame(normalUrl);
    await emitWithAck(other.socket, 'timer:set', { enabled: true });
    other.socket.disconnect();

    const socket = await kit.connectClient(normalUrl);
    const stateSeen = waitFor(socket, 'room:state');
    await emitWithAck(socket, 'room:join', {
      code: room.code,
      sessionToken: other.sessionToken,
    });

    const state = await stateSeen;
    expect(state.timer).toMatchObject({ on: true, startedBy: other.playerId });
    expect(state.turnSecondsLeft).toBeGreaterThan(0);
  });
});

describe('turn timer', () => {
  it('chooses a stat, then a card for everyone, when time runs out', async () => {
    const { alice } = await kit.startTwoPlayerGame(fastUrl, { startTimer: true });

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
    await emitWithAck(other.socket, 'timer:set', { enabled: true });

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
    await emitWithAck(leader.socket, 'timer:set', { enabled: true });

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

    // ...and when their time is up, a card is picked for them
    expect((await result).plays).toHaveLength(2);
  }, 10000);
});
