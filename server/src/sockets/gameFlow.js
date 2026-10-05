import { STAT_KEYS, TURN_SECONDS } from '@pokemon-game/shared';
import {
  PHASES,
  chooseCard,
  chooseStat,
  createGame,
  getPendingPlayerIds,
  getPrivateView,
  getPublicState,
  getRandomCardId,
} from '../services/matchService.js';
import { findPlayer } from '../services/lobbyService.js';
import { findRoom } from '../services/roomsService.js';
import { clearTurnTimer, getTurnSecondsLeft, setTurnTimer } from '../services/turnService.js';
import { pickRandom } from '../utils/random.js';
import { emitToEachPlayer, sendRoundStarted } from './emitters.js';

function toScores(game) {
  return getPublicState(game).players.map(({ id, name, roundWins }) => ({
    playerId: id,
    name,
    roundWins,
  }));
}

// Runs a game: applies moves, sends the events, and keeps the turn clock going.
// Every move, whether a player made it or the timer made it for them, goes through here.
export function createGameFlow({ turnSeconds = TURN_SECONDS } = {}) {
  const turnMs = turnSeconds * 1000;

  // Makes sure a clock is running for the current step of the game. Every step gets the full
  // time. If the step already has a running clock it is left alone, so nobody can stretch or
  // shorten it by disconnecting and reconnecting.
  function startTurn(io, room) {
    const { game } = room;

    if (game.phase === PHASES.FINISHED) {
      clearTurnTimer(room);
      return;
    }

    const step = `${game.round}:${game.phase}`;
    if (room.turnStep === step && room.turnTimer) return;

    setTurnTimer(room, step, turnMs, () => {
      try {
        handleTimeout(io, room);
      } catch (error) {
        console.error(error); // a failed timer must never crash the server
      }
    });
  }

  // Time is up: choose a stat for a leader who did not, and a random card for everyone who has
  // not picked one yet. This is the same for players who are online and offline.
  function handleTimeout(io, room) {
    room.turnTimer = null; // this timer has fired
    if (findRoom(room.code) !== room) return;

    const { game } = room;

    if (game.phase === PHASES.CHOOSING_STAT) {
      const leader = findPlayer(room, game.leaderId);
      performChooseStat(io, room, leader, pickRandom(STAT_KEYS));
    } else if (game.phase === PHASES.CHOOSING_CARDS) {
      for (const playerId of getPendingPlayerIds(game)) {
        const cardId = getRandomCardId(game, playerId);
        performChooseCard(io, room, findPlayer(room, playerId), cardId);
      }
    }
  }

  function performChooseStat(io, room, player, stat) {
    chooseStat(room.game, player.id, stat);
    startTurn(io, room); // the step changed: everybody now gets a fresh full clock to pick a card

    emitToEachPlayer(io, room, 'round:stat-chosen', (member) => ({
      round: room.game.round,
      leaderId: player.id,
      stat,
      turnSecondsLeft: getTurnSecondsLeft(room),
      you: getPrivateView(room.game, member.id),
    }));
  }

  function performChooseCard(io, room, player, cardId) {
    const round = room.game.round; // read before picking: a scored round moves the game on
    const { result, finalResult } = chooseCard(room.game, player.id, cardId);
    startTurn(io, room); // a new round (or the end of the game) starts a new step

    // Everybody learns THAT this player picked, never WHICH card
    emitToEachPlayer(io, room, 'round:card-picked', () => ({ round, playerId: player.id }));

    if (!result) return;

    // The last pick arrived: all cards are revealed together
    emitToEachPlayer(io, room, 'round:result', () => ({
      ...result,
      scores: toScores(room.game),
    }));

    if (finalResult) {
      room.status = 'finished';
      emitToEachPlayer(io, room, 'game:over', () => finalResult);
    } else {
      sendRoundStarted(io, room);
    }
  }

  return {
    startGame(io, room, cards) {
      room.game = createGame(
        room.players.map(({ id, name }) => ({ id, name })),
        cards,
        room.deckSize,
      );
      room.status = 'playing';

      startTurn(io, room); // start the clock first, so the events can tell players the time left
      emitToEachPlayer(io, room, 'game:started', () => ({ game: getPublicState(room.game) }));
      sendRoundStarted(io, room);
    },

    handleChooseStat(io, room, player, stat) {
      performChooseStat(io, room, player, stat);
    },

    handleChooseCard(io, room, player, cardId) {
      performChooseCard(io, room, player, cardId);
    },

    // A player just went offline. Their time keeps running: they may come back and choose.
    handlePlayerAway(io, room) {
      if (!room.game || room.game.phase === PHASES.FINISHED) return;

      // With nobody connected there is nobody to wait for or to play against: freeze the game
      if (room.players.every((player) => !player.connected)) {
        clearTurnTimer(room);
      }
    },

    // A player came back
    handlePlayerBack(io, room) {
      if (!room.game || room.game.phase === PHASES.FINISHED) return;

      startTurn(io, room); // restarts the clock (with the full time) if the game was frozen
    },
  };
}
