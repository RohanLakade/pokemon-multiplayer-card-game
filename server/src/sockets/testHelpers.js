import { expect } from 'vitest';
import { io as connect } from 'socket.io-client';
import { createHttpServer } from '../createHttpServer.js';
import { getAllCards } from '../services/cardsService.js';
import { createRoom } from '../services/roomsService.js';

export function emitWithAck(socket, event, payload = {}) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

export function waitFor(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

// Starts real servers and real socket clients for one test file, and stops them all afterwards.
export function createTestKit() {
  const servers = [];
  const clients = [];

  // configOverrides lets a test use short turns: { turnSeconds: 1, awayTurnSeconds: 1 }
  async function startServer(configOverrides = {}) {
    const cards = await getAllCards();
    const config = { clientOrigin: 'http://localhost:5173', trustProxy: 0, ...configOverrides };
    const { httpServer, io } = createHttpServer(config, cards);

    await new Promise((resolve) => httpServer.listen(0, resolve));
    servers.push(io);
    return `http://127.0.0.1:${httpServer.address().port}`;
  }

  function connectClient(url) {
    return new Promise((resolve, reject) => {
      const socket = connect(url, { transports: ['websocket'], forceNew: true });
      clients.push(socket);
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', reject);
    });
  }

  async function joinNewPlayer(url, code, name) {
    const socket = await connectClient(url);
    const response = await emitWithAck(socket, 'room:join', { code, playerName: name });
    return { socket, ...response };
  }

  // Two players in a room, game started, first round dealt
  async function startTwoPlayerGame(url) {
    const room = createRoom();
    const alice = await joinNewPlayer(url, room.code, 'Alice');
    const bob = await joinNewPlayer(url, room.code, 'Bob');

    const aliceRound = waitFor(alice.socket, 'round:started');
    const bobRound = waitFor(bob.socket, 'round:started');
    const started = await emitWithAck(alice.socket, 'game:start');
    expect(started.ok).toBe(true);

    const rounds = { [alice.playerId]: await aliceRound, [bob.playerId]: await bobRound };
    const leader = rounds[alice.playerId].leaderId === alice.playerId ? alice : bob;
    const other = leader === alice ? bob : alice;

    return { room, alice, bob, rounds, leader, other };
  }

  async function stopAll() {
    for (const client of clients) client.disconnect();
    await Promise.all(servers.map((io) => new Promise((resolve) => io.close(resolve))));
  }

  return { startServer, connectClient, joinNewPlayer, startTwoPlayerGame, stopAll };
}
