import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as connect } from 'socket.io-client';
import { MAX_PLAYERS } from '@pokemon-game/shared';
import { createHttpServer } from '../createHttpServer.js';
import { getAllCards } from '../services/cardsService.js';
import { createRoom } from '../services/roomsService.js';

const config = { clientOrigin: 'http://localhost:5173', trustProxy: 0 };

const servers = [];
const clients = [];
let mainUrl;

// Starts a real server (REST + sockets) on a random free port
async function startTestServer() {
  const cards = await getAllCards();
  const { httpServer, io } = createHttpServer(config, cards);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  servers.push(io);
  return `http://127.0.0.1:${httpServer.address().port}`;
}

function connectClient(url = mainUrl) {
  return new Promise((resolve, reject) => {
    const socket = connect(url, { transports: ['websocket'], forceNew: true });
    clients.push(socket);
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

function emitWithAck(socket, event, payload = {}) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

function waitFor(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

async function joinNewPlayer(code, name, url) {
  const socket = await connectClient(url);
  const response = await emitWithAck(socket, 'room:join', { code, playerName: name });
  return { socket, ...response };
}

// Two players in a room, game started, first round dealt
async function startTwoPlayerGame() {
  const room = createRoom();
  const alice = await joinNewPlayer(room.code, 'Alice');
  const bob = await joinNewPlayer(room.code, 'Bob');

  const aliceRound = waitFor(alice.socket, 'round:started');
  const bobRound = waitFor(bob.socket, 'round:started');
  const started = await emitWithAck(alice.socket, 'game:start');
  expect(started.ok).toBe(true);

  const rounds = { [alice.playerId]: await aliceRound, [bob.playerId]: await bobRound };
  const leader = rounds[alice.playerId].leaderId === alice.playerId ? alice : bob;
  const other = leader === alice ? bob : alice;

  return { room, alice, bob, rounds, leader, other };
}

beforeAll(async () => {
  mainUrl = await startTestServer();
});

afterAll(async () => {
  for (const client of clients) client.disconnect();
  await Promise.all(servers.map((io) => new Promise((resolve) => io.close(resolve))));
});

describe('lobby', () => {
  it('lets players join, makes the first one host, and keeps session tokens private', async () => {
    const room = createRoom();
    const alice = await joinNewPlayer(room.code, 'Alice');

    expect(alice.ok).toBe(true);
    expect(alice.sessionToken).toMatch(/^[a-f0-9]{64}$/);

    const aliceSeesState = waitFor(alice.socket, 'room:state');
    const bob = await joinNewPlayer(room.code, 'Bob');
    const state = await aliceSeesState;

    expect(state.players.map((player) => player.name)).toEqual(['Alice', 'Bob']);
    expect(state.hostId).toBe(alice.playerId);
    expect(state.you.playerId).toBe(alice.playerId);
    expect(JSON.stringify(state)).not.toContain(bob.sessionToken);
    expect(JSON.stringify(state)).not.toContain(alice.sessionToken);
  });

  it('removes a player who disconnects while still in the lobby', async () => {
    const room = createRoom();
    const alice = await joinNewPlayer(room.code, 'Alice');
    const bob = await joinNewPlayer(room.code, 'Bob');

    const aliceSeesState = waitFor(alice.socket, 'room:state');
    bob.socket.disconnect();
    const state = await aliceSeesState;

    expect(state.players.map((player) => player.name)).toEqual(['Alice']);
    expect(state.hostId).toBe(alice.playerId);
  });

  it('rejects bad joins with clear codes', async () => {
    const room = createRoom();
    await joinNewPlayer(room.code, 'Alice');

    const socket = await connectClient();
    const unknownRoom = await emitWithAck(socket, 'room:join', {
      code: 'ZZZZZZ',
      playerName: 'Eve',
    });
    const badName = await emitWithAck(socket, 'room:join', { code: room.code, playerName: '<b>' });
    const nameTaken = await emitWithAck(socket, 'room:join', {
      code: room.code,
      playerName: 'alice',
    });
    const badToken = await emitWithAck(socket, 'room:join', {
      code: room.code,
      sessionToken: 'a'.repeat(64),
    });

    expect(unknownRoom.error.code).toBe('ROOM_NOT_FOUND');
    expect(badName.error.code).toBe('VALIDATION_ERROR');
    expect(nameTaken.error.code).toBe('NAME_TAKEN');
    expect(badToken.error.code).toBe('INVALID_SESSION');
  });

  it('refuses a player beyond the maximum', async () => {
    const room = createRoom();
    for (let i = 0; i < MAX_PLAYERS; i += 1) {
      const player = await joinNewPlayer(room.code, `Player ${i}`);
      expect(player.ok).toBe(true);
    }

    const extra = await joinNewPlayer(room.code, 'Extra');

    expect(extra.ok).toBe(false);
    expect(extra.error.code).toBe('ROOM_FULL');
  });

  it('lets only the host start, and not with a single player', async () => {
    const room = createRoom();
    const alice = await joinNewPlayer(room.code, 'Alice');

    const alone = await emitWithAck(alice.socket, 'game:start');
    expect(alone.error.code).toBe('NOT_ENOUGH_PLAYERS');

    const bob = await joinNewPlayer(room.code, 'Bob');
    const notHost = await emitWithAck(bob.socket, 'game:start');
    expect(notHost.error.code).toBe('NOT_HOST');
  });
});

describe('playing a game', () => {
  it('deals private cards, lets only the leader choose, and scores the round', async () => {
    const { alice, bob, rounds, leader, other } = await startTwoPlayerGame();

    // Everyone sees the same round, but each player holds a different, private card
    expect(rounds[alice.playerId].round).toBe(1);
    expect(rounds[alice.playerId].you.currentCard.id).not.toBe(
      rounds[bob.playerId].you.currentCard.id,
    );
    expect(rounds[leader.playerId].you.canChooseStat).toBe(true);
    expect(rounds[other.playerId].you.canChooseStat).toBe(false);

    // Keep a log of everything the other player receives, to check for leaks later
    const received = [];
    other.socket.onAny((event, payload) => received.push(payload));

    // A non-leader cannot choose, even when pretending to be the leader
    const spoof = await emitWithAck(other.socket, 'round:choose-stat', {
      stat: 'hp',
      playerId: leader.playerId,
    });
    expect(spoof.error.code).toBe('NOT_LEADER');

    const invalid = await emitWithAck(leader.socket, 'round:choose-stat', { stat: 'luck' });
    expect(invalid.error.code).toBe('VALIDATION_ERROR');

    // The leader chooses: their card is revealed and the other player may now play
    const chosenForOther = waitFor(other.socket, 'round:stat-chosen');
    const chosen = await emitWithAck(leader.socket, 'round:choose-stat', { stat: 'attack' });
    expect(chosen.ok).toBe(true);

    const statChosen = await chosenForOther;
    expect(statChosen.stat).toBe('attack');
    expect(statChosen.card.id).toBe(rounds[leader.playerId].you.currentCard.id);
    expect(statChosen.you.canPlayCard).toBe(true);

    // The other player plays: the round is scored and round 2 starts
    const resultForLeader = waitFor(leader.socket, 'round:result');
    const nextRound = waitFor(other.socket, 'round:started');
    const played = await emitWithAck(other.socket, 'round:play-card');
    expect(played.ok).toBe(true);

    const result = await resultForLeader;
    const [first, second] = result.plays;
    const expectedWinner =
      first.value === second.value
        ? null
        : first.value > second.value
          ? first.playerId
          : second.playerId;

    expect(result.plays).toHaveLength(2);
    expect(result.winnerId).toBe(expectedWinner);
    expect(result.scores).toHaveLength(2);
    expect((await nextRound).round).toBe(2);

    // A deck was never sent to a player
    expect(JSON.stringify(received)).not.toContain('"deck"');
  });

  it('refuses new players once the game has started', async () => {
    const { room } = await startTwoPlayerGame();

    const late = await joinNewPlayer(room.code, 'Late');

    expect(late.ok).toBe(false);
    expect(late.error.code).toBe('GAME_IN_PROGRESS');
  });
});

describe('reconnecting', () => {
  it('keeps a player slot during a game and restores it with the session token', async () => {
    const { room, alice, bob } = await startTwoPlayerGame();

    const aliceSeesDrop = waitFor(alice.socket, 'player:disconnected');
    bob.socket.disconnect();
    expect((await aliceSeesDrop).playerId).toBe(bob.playerId);

    const aliceSeesReturn = waitFor(alice.socket, 'player:reconnected');
    const newSocket = await connectClient();
    const newState = waitFor(newSocket, 'room:state');
    const response = await emitWithAck(newSocket, 'room:join', {
      code: room.code,
      sessionToken: bob.sessionToken,
    });

    expect(response.ok).toBe(true);
    expect(response.playerId).toBe(bob.playerId);
    expect((await aliceSeesReturn).playerId).toBe(bob.playerId);

    const state = await newState;
    expect(state.status).toBe('playing');
    expect(state.you.playerId).toBe(bob.playerId);
    expect(state.private.currentCard).not.toBeNull();
  });
});

describe('limits', () => {
  it('rate-limits a socket that sends too many events', async () => {
    const client = await connectClient();
    const codes = [];
    const allReceived = new Promise((resolve) => {
      client.on('error', (info) => {
        codes.push(info.code);
        if (codes.length === 40) resolve();
      });
    });

    for (let i = 0; i < 40; i += 1) client.emit('round:play-card');
    await allReceived;

    expect(codes[0]).toBe('NOT_IN_ROOM');
    expect(codes).toContain('RATE_LIMITED');
  });

  it('blocks an IP address after too many failed joins', async () => {
    const url = await startTestServer(); // its own server, so other tests keep their counters
    const client = await connectClient(url);

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const response = await emitWithAck(client, 'room:join', {
        code: 'ZZZZZZ',
        playerName: 'Eve',
      });
      expect(response.error.code).toBe('ROOM_NOT_FOUND');
    }

    const blocked = await emitWithAck(client, 'room:join', { code: 'ZZZZZZ', playerName: 'Eve' });
    expect(blocked.error.code).toBe('RATE_LIMITED');
  });
});
