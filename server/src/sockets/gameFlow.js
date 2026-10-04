import { AWAY_TURN_SECONDS, STAT_KEYS, TURN_SECONDS } from '@pokemon-game/shared';
import {
  PHASES,
  chooseStat,
  createGame,
  getPrivateView,
  getPublicState,
  playCard,
} from '../services/gameService.js';
import { findPlayer } from '../services/lobbyService.js';
import { findRoom } from '../services/roomsService.js';
import {
  clearTurnTimer,
  getPendingPlayerIds,
  getTurnSecondsLeft,
  setTurnTimer,
} from '../services/turnService.js';
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
export function createGameFlow({
  turnSeconds = TURN_SECONDS,
  awaySeconds = AWAY_TURN_SECONDS,
} = {}) {
  const turnMs = turnSeconds * 1000;
  const awayMs = awaySeconds * 1000;

  function isAway(room, playerId) {
    return !findPlayer(room, playerId)?.connected;
  }

  // Players who are here get the full turn. If everyone we wait for is offline, the wait is short.
  function getTurnMs(room) {
    const pending = getPendingPlayerIds(room.game);
    const everyoneAway = pending.length > 0 && pending.every((id) => isAway(room, id));
    return everyoneAway ? awayMs : turnMs;
  }

  // Makes sure a clock is running for the current step of the game.
  // Calling it again during the same step keeps the running clock (so a flaky connection
  // cannot stretch everyone's time), except that it shortens the clock when only away players remain.
  function startTurn(io, room) {
    const { game } = room;

    if (game.phase === PHASES.FINISHED) {
      clearTurnTimer(room);
      return;
    }

    const step = `${game.round}:${game.phase}`;
    const ms = getTurnMs(room);
    const msLeft = room.turnTimer ? room.turnEndsAt - Date.now() : Infinity;

    if (room.turnStep === step && msLeft <= ms) return;

    setTurnTimer(room, step, ms, () => {
      try {
        handleTimeout(io, room);
      } catch (error) {
        console.error(error); // a failed timer must never crash the server
      }
    });
  }

  // Time is up: choose a stat for a leader who did not, and play for everyone who did not play.
  function handleTimeout(io, room) {
    room.turnTimer = null; // this timer has fired
    if (findRoom(room.code) !== room) return;

    const { game } = room;

    if (game.phase === PHASES.CHOOSING_STAT) {
      const leader = findPlayer(room, game.leaderId);
      performChooseStat(io, room, leader, pickRandom(STAT_KEYS));
    } else if (game.phase === PHASES.PLAYING_CARDS) {
      for (const playerId of getPendingPlayerIds(game)) {
        performPlayCard(io, room, findPlayer(room, playerId));
      }
    }

    playForAwayPlayers(io, room);
  }

  function performChooseStat(io, room, player, stat) {
    const { card } = chooseStat(room.game, player.id, stat);
    startTurn(io, room); // the step changed: now the other players are being waited for

    emitToEachPlayer(io, room, 'round:stat-chosen', (member) => ({
      round: room.game.round,
      leaderId: player.id,
      stat,
      card,
      turnSecondsLeft: getTurnSecondsLeft(room),
      you: getPrivateView(room.game, member.id),
    }));
  }

  function performPlayCard(io, room, player) {
    const round = room.game.round; // read before playing: a scored round moves the game on
    const { card, result, finalResult } = playCard(room.game, player.id);
    startTurn(io, room); // a new round (or the end of the game) starts a new step

    emitToEachPlayer(io, room, 'round:card-played', () => ({
      round,
      playerId: player.id,
      card,
    }));

    if (!result) return;

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

  // Playing a card involves no decision, so for a player who is offline we simply play it.
  function playForAwayPlayers(io, room) {
    while (room.game.phase === PHASES.PLAYING_CARDS) {
      const awayId = getPendingPlayerIds(room.game).find((id) => isAway(room, id));
      if (!awayId) return;

      performPlayCard(io, room, findPlayer(room, awayId));
    }
  }

  return {
    startGame(io, room, cards) {
      room.game = createGame(
        room.players.map(({ id, name }) => ({ id, name })),
        cards,
      );
      room.status = 'playing';

      startTurn(io, room); // start the clock first, so the events can tell players the time left
      emitToEachPlayer(io, room, 'game:started', () => ({ game: getPublicState(room.game) }));
      sendRoundStarted(io, room);
    },

    handleChooseStat(io, room, player, stat) {
      performChooseStat(io, room, player, stat);
      playForAwayPlayers(io, room);
    },

    handlePlayCard(io, room, player) {
      performPlayCard(io, room, player);
      playForAwayPlayers(io, room);
    },

    // A player just went offline
    handlePlayerAway(io, room) {
      if (!room.game || room.game.phase === PHASES.FINISHED) return;

      // With nobody connected there is nobody to wait for or to play against: freeze the game
      if (room.players.every((player) => !player.connected)) {
        clearTurnTimer(room);
        return;
      }

      playForAwayPlayers(io, room);
      startTurn(io, room);
    },

    // A player came back (this also restarts the clock if the game was frozen)
    handlePlayerBack(io, room) {
      if (!room.game || room.game.phase === PHASES.FINISHED) return;
      startTurn(io, room);
    },
  };
}
