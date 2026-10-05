import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MAX_PLAYERS } from '@pokemon-game/shared';
import { createRoom } from '../services/roomsService.js';
import { createTestKit, emitWithAck, waitFor } from './testHelpers.js';

const kit = createTestKit();
let url;

beforeAll(async () => {
  url = await kit.startServer();
});

afterAll(() => kit.stopAll());

describe('lobby', () => {
  it('lets players join, makes the first one host, and keeps session tokens private', async () => {
    const room = createRoom();
    const alice = await kit.joinNewPlayer(url, room.code, 'Alice');

    expect(alice.ok).toBe(true);
    expect(alice.sessionToken).toMatch(/^[a-f0-9]{64}$/);

    const aliceSeesState = waitFor(alice.socket, 'room:state');
    const bob = await kit.joinNewPlayer(url, room.code, 'Bob');
    const state = await aliceSeesState;

    expect(state.players.map((player) => player.name)).toEqual(['Alice', 'Bob']);
    expect(state.hostId).toBe(alice.playerId);
    expect(state.you.playerId).toBe(alice.playerId);
    expect(state.deckSize).toBe(20);
    expect(JSON.stringify(state)).not.toContain(bob.sessionToken);
    expect(JSON.stringify(state)).not.toContain(alice.sessionToken);
  });

  it('removes a player who disconnects while still in the lobby', async () => {
    const room = createRoom();
    const alice = await kit.joinNewPlayer(url, room.code, 'Alice');
    const bob = await kit.joinNewPlayer(url, room.code, 'Bob');

    const aliceSeesState = waitFor(alice.socket, 'room:state');
    bob.socket.disconnect();
    const state = await aliceSeesState;

    expect(state.players.map((player) => player.name)).toEqual(['Alice']);
    expect(state.hostId).toBe(alice.playerId);
  });

  it('rejects bad joins with clear codes', async () => {
    const room = createRoom();
    await kit.joinNewPlayer(url, room.code, 'Alice');

    const socket = await kit.connectClient(url);
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
      const player = await kit.joinNewPlayer(url, room.code, `Player ${i}`);
      expect(player.ok).toBe(true);
    }

    const extra = await kit.joinNewPlayer(url, room.code, 'Extra');

    expect(extra.ok).toBe(false);
    expect(extra.error.code).toBe('ROOM_FULL');
  });

  it('lets the host choose the deck size and shows it to everyone', async () => {
    const room = createRoom();
    const alice = await kit.joinNewPlayer(url, room.code, 'Alice');
    const bob = await kit.joinNewPlayer(url, room.code, 'Bob');

    const bobSeesState = waitFor(bob.socket, 'room:state');
    const response = await emitWithAck(alice.socket, 'room:set-deck-size', { deckSize: 15 });

    expect(response.ok).toBe(true);
    expect((await bobSeesState).deckSize).toBe(15);

    const notHost = await emitWithAck(bob.socket, 'room:set-deck-size', { deckSize: 10 });
    const notAllowed = await emitWithAck(alice.socket, 'room:set-deck-size', { deckSize: 12 });

    expect(notHost.error.code).toBe('NOT_HOST');
    expect(notAllowed.error.code).toBe('VALIDATION_ERROR');
  });

  it('lets only the host start, and not with a single player', async () => {
    const room = createRoom();
    const alice = await kit.joinNewPlayer(url, room.code, 'Alice');

    const alone = await emitWithAck(alice.socket, 'game:start');
    expect(alone.error.code).toBe('NOT_ENOUGH_PLAYERS');

    const bob = await kit.joinNewPlayer(url, room.code, 'Bob');
    const notHost = await emitWithAck(bob.socket, 'game:start');
    expect(notHost.error.code).toBe('NOT_HOST');
  });
});

describe('playing a game', () => {
  it('deals private hands, keeps picks secret and reveals the cards together', async () => {
    const { rounds, leader, other } = await kit.startTwoPlayerGame(url);

    const leaderHand = rounds[leader.playerId].you.hand;
    const otherHand = rounds[other.playerId].you.hand;

    // Each player holds 5 cards of their own, and only the leader may choose the stat
    expect(leaderHand).toHaveLength(5);
    expect(otherHand).toHaveLength(5);
    const handIds = [...leaderHand, ...otherHand].map((card) => card.id);
    expect(new Set(handIds).size).toBe(10);
    expect(rounds[leader.playerId].you.canChooseStat).toBe(true);
    expect(rounds[other.playerId].you.canChooseStat).toBe(false);
    expect(rounds[leader.playerId].you.canChooseCard).toBe(false);

    // Keep a log of everything the other player receives, to check for leaks later
    const received = [];
    other.socket.onAny((event, payload) => received.push({ event, payload }));

    // Nobody can pick a card before the stat is chosen
    const tooEarly = await emitWithAck(other.socket, 'round:choose-card', {
      cardId: otherHand[0].id,
    });
    expect(tooEarly.error.code).toBe('WRONG_PHASE');

    // A non-leader cannot choose the stat, even when pretending to be the leader
    const spoof = await emitWithAck(other.socket, 'round:choose-stat', {
      stat: 'hp',
      playerId: leader.playerId,
    });
    expect(spoof.error.code).toBe('NOT_LEADER');

    const invalid = await emitWithAck(leader.socket, 'round:choose-stat', { stat: 'luck' });
    expect(invalid.error.code).toBe('VALIDATION_ERROR');

    // The leader chooses the stat: only the stat is announced, no card is revealed
    const statForOther = waitFor(other.socket, 'round:stat-chosen');
    const chosen = await emitWithAck(leader.socket, 'round:choose-stat', { stat: 'attack' });
    expect(chosen.ok).toBe(true);

    const statChosen = await statForOther;
    expect(statChosen.stat).toBe('attack');
    expect(statChosen.card).toBeUndefined();
    expect(statChosen.you.canChooseCard).toBe(true);

    // A card that is not in your own hand is refused
    const notMine = await emitWithAck(other.socket, 'round:choose-card', {
      cardId: leaderHand[0].id,
    });
    expect(notMine.error.code).toBe('CARD_NOT_IN_HAND');

    // The other player picks first: the leader hears THAT they picked, but not which card
    const pickedCard = otherHand[1];
    const pickSeenByLeader = waitFor(leader.socket, 'round:card-picked');
    const firstPick = await emitWithAck(other.socket, 'round:choose-card', {
      cardId: pickedCard.id,
    });
    expect(firstPick.ok).toBe(true);

    const picked = await pickSeenByLeader;
    expect(picked.playerId).toBe(other.playerId);
    expect(JSON.stringify(picked)).not.toContain(pickedCard.name);

    // Nothing about the leader's hand has reached the other player so far
    const beforeReveal = JSON.stringify(received);
    for (const card of leaderHand) {
      expect(beforeReveal).not.toContain(`"id":${card.id},`);
    }

    // The leader picks last: now all cards are revealed together
    const leaderPick = leaderHand[2];
    const resultForOther = waitFor(other.socket, 'round:result');
    const nextRoundForOther = waitFor(other.socket, 'round:started');
    const lastPick = await emitWithAck(leader.socket, 'round:choose-card', {
      cardId: leaderPick.id,
    });
    expect(lastPick.ok).toBe(true);

    const result = await resultForOther;
    const byPlayer = Object.fromEntries(result.plays.map((play) => [play.playerId, play]));
    expect(result.plays).toHaveLength(2);
    expect(byPlayer[leader.playerId].card.id).toBe(leaderPick.id);
    expect(byPlayer[other.playerId].card.id).toBe(pickedCard.id);

    const [first, second] = result.plays;
    const expectedWinner =
      first.value === second.value
        ? null
        : first.value > second.value
          ? first.playerId
          : second.playerId;
    expect(result.winnerId).toBe(expectedWinner);

    // The hand is refilled: the played card is replaced and the other four stay
    const nextRound = await nextRoundForOther;
    const newHandIds = nextRound.you.hand.map((card) => card.id);
    expect(nextRound.round).toBe(2);
    expect(newHandIds).toHaveLength(5);
    expect(newHandIds).not.toContain(pickedCard.id);
    for (const card of otherHand.filter((handCard) => handCard.id !== pickedCard.id)) {
      expect(newHandIds).toContain(card.id);
    }

    // A draw pile was never sent to a player
    expect(JSON.stringify(received)).not.toContain('"drawPile"');
  });

  it('refuses new players and deck size changes once the game has started', async () => {
    const { room, alice, bob } = await kit.startTwoPlayerGame(url);
    const host = alice; // the first player to join is the host

    const late = await kit.joinNewPlayer(url, room.code, 'Late');
    const resize = await emitWithAck(host.socket, 'room:set-deck-size', { deckSize: 20 });

    expect(bob.ok).toBe(true);
    expect(late.ok).toBe(false);
    expect(late.error.code).toBe('GAME_IN_PROGRESS');
    expect(resize.error.code).toBe('GAME_IN_PROGRESS');
  });
});

describe('reconnecting', () => {
  it('keeps a player slot during a game and restores it with the session token', async () => {
    const { room, alice, bob } = await kit.startTwoPlayerGame(url);

    const aliceSeesDrop = waitFor(alice.socket, 'player:disconnected');
    bob.socket.disconnect();
    expect((await aliceSeesDrop).playerId).toBe(bob.playerId);

    const aliceSeesReturn = waitFor(alice.socket, 'player:reconnected');
    const newSocket = await kit.connectClient(url);
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
    expect(state.private.hand).toHaveLength(5);
    expect(state.game.totalRounds).toBe(10);
  });
});

describe('limits', () => {
  it('rate-limits a socket that sends too many events', async () => {
    const client = await kit.connectClient(url);
    const codes = [];
    const allReceived = new Promise((resolve) => {
      client.on('error', (info) => {
        codes.push(info.code);
        if (codes.length === 40) resolve();
      });
    });

    for (let i = 0; i < 40; i += 1) client.emit('round:choose-card', { cardId: 1 });
    await allReceived;

    expect(codes[0]).toBe('NOT_IN_ROOM');
    expect(codes).toContain('RATE_LIMITED');
  });

  it('blocks an IP address after too many failed joins', async () => {
    const ownUrl = await kit.startServer(); // its own server, so other tests keep their counters
    const client = await kit.connectClient(ownUrl);

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
