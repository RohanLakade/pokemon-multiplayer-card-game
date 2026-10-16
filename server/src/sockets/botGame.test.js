import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRoom, findRoom } from '../services/roomsService.js';
import { createTestKit, emitWithAck, waitFor } from './testHelpers.js';

const kit = createTestKit();
let url; // the computer pauses only 30 ms, so these tests are quick

beforeAll(async () => {
  url = await kit.startServer({ botThinkMs: 30 });
});

afterAll(() => kit.stopAll());

// Waits for a room:state that matches, however many other room:state events come first
function waitForState(socket, matches) {
  return new Promise((resolve) => {
    function handler(state) {
      if (!matches(state)) return;
      socket.off('room:state', handler);
      resolve(state);
    }
    socket.on('room:state', handler);
  });
}

// A room with one human (the host) and the computer, set to a 10-card game
async function newRoomWithBot() {
  const room = createRoom();
  const alice = await kit.joinNewPlayer(url, room.code, 'Alice');
  await emitWithAck(alice.socket, 'room:set-deck-size', { deckSize: 10 });

  const added = await emitWithAck(alice.socket, 'room:add-bot');
  expect(added.ok).toBe(true);
  return { room, alice };
}

describe('adding the computer player', () => {
  it('lets only the host add one computer, which everybody sees as a computer', async () => {
    const room = createRoom();
    const alice = await kit.joinNewPlayer(url, room.code, 'Alice');
    const bob = await kit.joinNewPlayer(url, room.code, 'Bob');

    const notHost = await emitWithAck(bob.socket, 'room:add-bot');
    expect(notHost.error.code).toBe('NOT_HOST');

    const bobSeesBot = waitForState(bob.socket, (state) =>
      state.players.some((player) => player.isBot),
    );
    const added = await emitWithAck(alice.socket, 'room:add-bot');
    expect(added.ok).toBe(true);

    const state = await bobSeesBot;
    const bot = state.players.find((player) => player.isBot);
    expect(bot).toMatchObject({ name: 'Computer', connected: true, autoPlay: true });
    expect(state.hostId).toBe(alice.playerId);
    expect(JSON.stringify(state)).not.toContain('sessionToken"');

    const again = await emitWithAck(alice.socket, 'room:add-bot');
    expect(again.error.code).toBe('BOT_ALREADY_ADDED');
  });
});

describe('playing against the computer', () => {
  it('lets a human and the computer play a round: the computer moves by itself', async () => {
    const { alice } = await newRoomWithBot();

    const roundSeen = waitFor(alice.socket, 'round:started');
    const statSeen = waitFor(alice.socket, 'round:stat-chosen');
    const resultSeen = waitFor(alice.socket, 'round:result');
    const started = await emitWithAck(alice.socket, 'game:start');
    expect(started.ok).toBe(true);

    // Whoever leads chooses the stat: if it is the computer, it does so after its pause
    const round = await roundSeen;
    if (round.leaderId === alice.playerId) {
      const chosen = await emitWithAck(alice.socket, 'round:choose-stat', { stat: 'speed' });
      expect(chosen.ok).toBe(true);
    }
    expect((await statSeen).stat).toBeDefined();

    const picked = await emitWithAck(alice.socket, 'round:choose-card', {
      cardId: round.you.hand[0].id,
    });
    expect(picked.ok).toBe(true);

    // The computer picked its card too, so the round was scored with two cards
    const result = await resultSeen;
    expect(result.plays).toHaveLength(2);
    expect(result.plays.map((play) => play.playerId)).toContain(alice.playerId);
  });

  it('plays a whole game, and "play again" keeps the computer, with the human as host', async () => {
    const { alice } = await newRoomWithBot();

    const over = waitFor(alice.socket, 'game:over');
    const started = await emitWithAck(alice.socket, 'game:start');
    expect(started.ok).toBe(true);

    // The human steps away too, so the server plays both sides until the end
    await emitWithAck(alice.socket, 'player:set-auto-play', { enabled: true });
    const final = await over;
    expect(final.scores).toHaveLength(2);

    const lobbySeen = waitForState(alice.socket, (state) => state.status === 'lobby');
    const again = await emitWithAck(alice.socket, 'game:play-again');
    expect(again.ok).toBe(true);

    const state = await lobbySeen;
    const bot = state.players.find((player) => player.isBot);
    expect(bot).toMatchObject({ connected: true, autoPlay: true });
    expect(state.hostId).toBe(alice.playerId);
    expect(state.players.find((player) => player.id === alice.playerId).autoPlay).toBe(false);
  }, 20000);
});

describe('cleaning up', () => {
  it('deletes the room when the only human leaves the lobby', async () => {
    const { room, alice } = await newRoomWithBot();

    await emitWithAck(alice.socket, 'room:leave');

    expect(findRoom(room.code)).toBeNull();
  });

  it('deletes the room when the only human leaves a running game', async () => {
    const { room, alice } = await newRoomWithBot();
    await emitWithAck(alice.socket, 'game:start');

    await emitWithAck(alice.socket, 'room:leave');

    expect(findRoom(room.code)).toBeNull();
  });
});
