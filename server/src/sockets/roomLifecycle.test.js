import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRoom, findRoom } from '../services/roomsService.js';
import { createTestKit, emitWithAck, waitFor } from './testHelpers.js';

const kit = createTestKit();
let url; // the timer is off in every game, unless a test switches it on
let fastUrl; // 1 second turns

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

// Both players switch to auto-play, so the whole game is played by the server, at once
async function playWholeGame({ alice, leader, other }) {
  const over = waitFor(alice.socket, 'game:over');
  await emitWithAck(other.socket, 'player:set-auto-play', { enabled: true });
  await emitWithAck(leader.socket, 'player:set-auto-play', { enabled: true });
  await over;
}

beforeAll(async () => {
  url = await kit.startServer();
  fastUrl = await kit.startServer({ turnSeconds: 1 });
});

afterAll(() => kit.stopAll());

describe('lobby settings', () => {
  it('lets the host choose the turn length and shows it to everyone', async () => {
    const room = createRoom();
    const alice = await kit.joinNewPlayer(url, room.code, 'Alice');
    const bob = await kit.joinNewPlayer(url, room.code, 'Bob');

    const bobSeesState = waitForState(bob.socket, (state) => state.turnSeconds === 30);
    const response = await emitWithAck(alice.socket, 'room:set-turn-seconds', { turnSeconds: 30 });

    expect(response.ok).toBe(true);
    expect((await bobSeesState).turnSeconds).toBe(30);

    const notHost = await emitWithAck(bob.socket, 'room:set-turn-seconds', { turnSeconds: 60 });
    const notAllowed = await emitWithAck(alice.socket, 'room:set-turn-seconds', {
      turnSeconds: 45,
    });

    expect(notHost.error.code).toBe('NOT_HOST');
    expect(notAllowed.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('leaving a running game', () => {
  it('keeps the seat of a player who leaves, switches auto-play on, and lets them rejoin', async () => {
    const { room, leader, other } = await kit.startTwoPlayerGame(url);

    const droppedSeen = waitFor(leader.socket, 'player:disconnected');
    const autoPlaySeen = waitFor(leader.socket, 'player:auto-play-changed');
    const left = await emitWithAck(other.socket, 'room:leave');

    expect(left.ok).toBe(true);
    expect((await droppedSeen).playerId).toBe(other.playerId);
    expect(await autoPlaySeen).toEqual({ playerId: other.playerId, enabled: true });

    // The same player comes back with their token: auto-play is off again
    const returnSeen = waitFor(leader.socket, 'player:reconnected');
    const socket = await kit.connectClient(url);
    const stateSeen = waitFor(socket, 'room:state');
    const response = await emitWithAck(socket, 'room:join', {
      code: room.code,
      sessionToken: other.sessionToken,
    });

    expect(response.ok).toBe(true);
    expect(response.playerId).toBe(other.playerId);
    expect((await returnSeen).playerId).toBe(other.playerId);

    const state = await stateSeen;
    const back = state.players.find((player) => player.id === other.playerId);
    expect(back).toMatchObject({ connected: true, autoPlay: false });
  });

  it('plays the cards of a player who left at once, without waiting for any clock', async () => {
    const { rounds, leader, other } = await kit.startTwoPlayerGame(url);
    await emitWithAck(other.socket, 'room:leave');

    const result = waitFor(leader.socket, 'round:result');
    const chosen = await emitWithAck(leader.socket, 'round:choose-stat', { stat: 'speed' });
    expect(chosen.ok).toBe(true);

    const handCard = rounds[leader.playerId].you.hand[0];
    const picked = await emitWithAck(leader.socket, 'round:choose-card', { cardId: handCard.id });
    expect(picked.ok).toBe(true);

    expect((await result).plays).toHaveLength(2);
  });

  it('chooses the stat at once when the leader leaves', async () => {
    const { leader, other } = await kit.startTwoPlayerGame(url);

    const statChosen = waitFor(other.socket, 'round:stat-chosen');
    await emitWithAck(leader.socket, 'room:leave');

    expect((await statChosen).leaderId).toBe(leader.playerId);
  });

  it('keeps the room when everyone merely disconnects, so a refresh cannot destroy the game', async () => {
    const { room, alice, bob } = await kit.startTwoPlayerGame(url);

    alice.socket.disconnect();
    bob.socket.disconnect();
    await delay(200);

    expect(findRoom(room.code)).not.toBeNull();

    const socket = await kit.connectClient(url);
    const response = await emitWithAck(socket, 'room:join', {
      code: room.code,
      sessionToken: alice.sessionToken,
    });
    expect(response.ok).toBe(true);
  });

  it('deletes the room at once when every player has left on purpose', async () => {
    const { room, alice, bob } = await kit.startTwoPlayerGame(url);

    await emitWithAck(alice.socket, 'room:leave');
    expect(findRoom(room.code)).not.toBeNull();

    await emitWithAck(bob.socket, 'room:leave');
    expect(findRoom(room.code)).toBeNull();
  });
});

describe('auto-play', () => {
  it('lets a connected player switch auto-play on and off', async () => {
    const { leader, other } = await kit.startTwoPlayerGame(url);

    const onSeen = waitFor(leader.socket, 'player:auto-play-changed');
    const on = await emitWithAck(other.socket, 'player:set-auto-play', { enabled: true });
    expect(on.ok).toBe(true);
    expect(await onSeen).toEqual({ playerId: other.playerId, enabled: true });

    const offSeen = waitFor(leader.socket, 'player:auto-play-changed');
    await emitWithAck(other.socket, 'player:set-auto-play', { enabled: false });
    expect(await offSeen).toEqual({ playerId: other.playerId, enabled: false });
  });

  it('switches a player to auto-play after two turns in a row that ran out', async () => {
    const { leader } = await kit.startTwoPlayerGame(fastUrl, { startTimer: true });

    // The leader lets both the stat step and the card step run out in round 1
    const change = await waitFor(leader.socket, 'player:auto-play-changed');

    expect(change).toEqual({ playerId: leader.playerId, enabled: true });
  }, 10000);
});

describe('play again', () => {
  it('takes everyone back to the lobby of the same room when the host asks', async () => {
    const game = await kit.startTwoPlayerGame(url);
    const { alice, bob } = game;

    const tooEarly = await emitWithAck(alice.socket, 'game:play-again');
    expect(tooEarly.error.code).toBe('GAME_NOT_FINISHED');

    await playWholeGame(game);

    const notHost = await emitWithAck(bob.socket, 'game:play-again');
    expect(notHost.error.code).toBe('NOT_HOST');

    const bobSeesLobby = waitForState(bob.socket, (state) => state.status === 'lobby');
    const response = await emitWithAck(alice.socket, 'game:play-again');
    expect(response.ok).toBe(true);

    const state = await bobSeesLobby;
    expect(state.game).toBeNull();
    expect(state.finalResult).toBeNull();
    expect(state.deckSize).toBe(10); // the settings stay
    expect(state.timer.on).toBe(false);
    expect(state.players.map((player) => player.name)).toEqual(['Alice', 'Bob']);
    expect(state.players.every((player) => player.autoPlay === false)).toBe(true);
  });

  it('leaves out players who left before the next game', async () => {
    const game = await kit.startTwoPlayerGame(url);
    const { alice, bob } = game;
    await playWholeGame(game);

    await emitWithAck(bob.socket, 'room:leave');

    const aliceSeesLobby = waitForState(alice.socket, (state) => state.status === 'lobby');
    await emitWithAck(alice.socket, 'game:play-again');

    const state = await aliceSeesLobby;
    expect(state.players.map((player) => player.name)).toEqual(['Alice']);
  });
});
