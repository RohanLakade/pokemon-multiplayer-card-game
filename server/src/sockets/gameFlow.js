import { BOT_THINK_MS, MISSED_TURNS_BEFORE_AUTO_PLAY } from '@pokemon-game/shared';
import { createAutoPlayer } from '../services/autoPlayService.js';
import { GameRuleError } from '../services/gameErrors.js';
import { findPlayer, humanPlayers } from '../services/lobbyService.js';
import {
  PHASES,
  chooseCard,
  chooseStat,
  createGame,
  getPendingPlayerIds,
  getPrivateView,
  getPublicState,
} from '../services/matchService.js';
import { findRoom } from '../services/roomsService.js';
import { clearTurnTimer, getTurnSecondsLeft, setTurnTimer } from '../services/turnService.js';
import { emitToEachPlayer, getTimerInfo, sendRoundStarted } from './emitters.js';

function toScores(game) {
  return getPublicState(game).players.map(({ id, name, roundWins }) => ({
    playerId: id,
    name,
    roundWins,
  }));
}

// Runs a game: applies moves, sends the events, keeps the optional turn clock going and makes
// the moves of players on auto-play and of the computer player. Every move, whether a player,
// the timer, auto-play or the computer made it, goes through here. "cards" is the card roster.
// "turnSeconds" is optional and replaces the room's setting (tests use 1 second turns).
// "botThinkMs" is how long the computer pauses before a move (tests use a short pause).
export function createGameFlow({
  cards,
  turnSeconds: turnSecondsOverride,
  botThinkMs = BOT_THINK_MS,
} = {}) {
  const autoPlayer = createAutoPlayer(cards);

  function getTurnMs(room) {
    return (turnSecondsOverride ?? room.turnSeconds) * 1000;
  }

  // Makes sure the right clock state exists for the current step of the game:
  //   timer off or game over: no clock at all (the game simply waits)
  //   timer on: every step gets the full time. A clock that already runs for this step is left
  //   alone, so nobody can stretch or shorten it by disconnecting and reconnecting.
  function startTurn(io, room) {
    const { game } = room;

    if (game.phase === PHASES.FINISHED || !room.timerOn) {
      clearTurnTimer(room);
      return;
    }

    const step = `${game.round}:${game.phase}`;
    if (room.turnStep === step && room.turnTimer) return;

    setTurnTimer(room, step, getTurnMs(room), () => {
      try {
        handleTimeout(io, room);
      } catch (error) {
        console.error(error); // a failed timer must never crash the server
      }
    });
  }

  function setAutoPlay(io, room, player, enabled) {
    if (player.autoPlay === enabled) return;

    player.autoPlay = enabled;
    if (!enabled) player.missedTurns = 0;
    emitToEachPlayer(io, room, 'player:auto-play-changed', () => ({
      playerId: player.id,
      enabled,
    }));
  }

  // The turn ran out for this player: count it, and after enough in a row switch them to auto-play
  function registerMissedTurn(io, room, player) {
    player.missedTurns += 1;
    if (player.missedTurns >= MISSED_TURNS_BEFORE_AUTO_PLAY) {
      setAutoPlay(io, room, player, true);
    }
  }

  function chooseStatFor(room, player) {
    return autoPlayer.chooseStat(getPrivateView(room.game, player.id).hand);
  }

  function chooseCardFor(room, player) {
    const { hand } = getPrivateView(room.game, player.id);
    return autoPlayer.chooseCardId(hand, room.game.chosenStat);
  }

  // Time is up: choose the stat for a leader who did not, and a card for everyone who has not
  // picked one. The choice is the smart one, the same for players who are online and offline.
  function handleTimeout(io, room) {
    room.turnTimer = null; // this timer has fired
    if (findRoom(room.code) !== room) return;

    const { game } = room;

    if (game.phase === PHASES.CHOOSING_STAT) {
      const leader = findPlayer(room, game.leaderId);
      registerMissedTurn(io, room, leader);
      performChooseStat(io, room, leader, chooseStatFor(room, leader));
    } else if (game.phase === PHASES.CHOOSING_CARDS) {
      for (const playerId of getPendingPlayerIds(game)) {
        const player = findPlayer(room, playerId);
        registerMissedTurn(io, room, player);
        performChooseCard(io, room, player, chooseCardFor(room, player));
      }
    }

    runAutoPlayers(io, room);
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

  // The smart move for a player who has to move now: choose the stat, or pick a card
  function makeMove(io, room, player) {
    if (room.game.phase === PHASES.CHOOSING_STAT) {
      performChooseStat(io, room, player, chooseStatFor(room, player));
    } else {
      performChooseCard(io, room, player, chooseCardFor(room, player));
    }
  }

  // The computer waits a moment, makes ONE move, and then looks at what is pending again.
  // Only one pause runs at a time per room.
  function scheduleBot(io, room) {
    if (room.botTimer || room.game.phase === PHASES.FINISHED) return;

    const botId = getPendingPlayerIds(room.game).find((id) => findPlayer(room, id)?.isBot);
    if (!botId) return;

    room.botTimer = setTimeout(() => {
      room.botTimer = null; // this pause is over
      try {
        handleBotTurn(io, room, botId);
      } catch (error) {
        console.error(error); // a failed move must never crash the server
      }
    }, botThinkMs);
    room.botTimer.unref?.();
  }

  function handleBotTurn(io, room, botId) {
    // The room may be gone, or the game over, or sent back to the lobby, during the pause
    if (findRoom(room.code) !== room || room.status !== 'playing' || !room.game) return;

    const bot = findPlayer(room, botId);
    if (bot && getPendingPlayerIds(room.game).includes(botId)) {
      makeMove(io, room, bot);
    }
    runAutoPlayers(io, room);
  }

  // Human players on auto-play move at once, so nobody waits for the clock. Each move can
  // advance the game and make another auto-play player the one we wait for, so we keep going.
  // The computer player is not moved here: it thinks first (see scheduleBot).
  function runAutoPlayers(io, room) {
    while (room.game.phase !== PHASES.FINISHED) {
      const playerId = getPendingPlayerIds(room.game).find((id) => {
        const player = findPlayer(room, id);
        return player?.autoPlay && !player.isBot;
      });
      if (!playerId) break;

      makeMove(io, room, findPlayer(room, playerId));
    }

    scheduleBot(io, room);
  }

  // Can this player stop the timer? The player who started it can. If that player is offline or
  // has left, anyone can, so the timer can never get stuck on.
  function canStopTimer(room, player) {
    const starter = room.timerStartedBy ? findPlayer(room, room.timerStartedBy) : null;
    const starterIsHere = starter && starter.connected && !starter.hasLeft;
    return !starterIsHere || starter.id === player.id;
  }

  return {
    startGame(io, room) {
      room.game = createGame(
        room.players.map(({ id, name }) => ({ id, name })),
        cards,
        room.deckSize,
      );
      room.status = 'playing';
      room.timerOn = false; // every game starts without a timer
      room.timerStartedBy = null;

      startTurn(io, room);
      emitToEachPlayer(io, room, 'game:started', () => ({ game: getPublicState(room.game) }));
      sendRoundStarted(io, room);
      runAutoPlayers(io, room); // the computer may be the first leader
    },

    // A move made by the player themselves also clears their missed turns
    handleChooseStat(io, room, player, stat) {
      player.missedTurns = 0;
      performChooseStat(io, room, player, stat);
      runAutoPlayers(io, room);
    },

    handleChooseCard(io, room, player, cardId) {
      player.missedTurns = 0;
      performChooseCard(io, room, player, cardId);
      runAutoPlayers(io, room);
    },

    // The player switched auto-play on or off, or left on purpose (which switches it on)
    handleSetAutoPlay(io, room, player, enabled) {
      setAutoPlay(io, room, player, enabled);
      if (enabled) runAutoPlayers(io, room);
    },

    // Any player may switch the turn timer on. It then runs for everybody, with a fresh full
    // clock for the current step. Only the player who started it may stop it.
    handleSetTimer(io, room, player, enabled) {
      if (room.status !== 'playing') {
        throw new GameRuleError('WRONG_PHASE', 'That action is not allowed right now');
      }

      if (enabled) {
        if (room.timerOn) {
          throw new GameRuleError('TIMER_ALREADY_ON', 'The timer is already running');
        }
        room.timerOn = true;
        room.timerStartedBy = player.id;
      } else {
        if (!room.timerOn) {
          throw new GameRuleError('TIMER_NOT_ON', 'The timer is not running');
        }
        if (!canStopTimer(room, player)) {
          throw new GameRuleError(
            'NOT_TIMER_STARTER',
            'Only the player who started the timer can stop it',
          );
        }
        room.timerOn = false;
        room.timerStartedBy = null;
      }

      startTurn(io, room); // starts a fresh clock, or removes the running one
      emitToEachPlayer(io, room, 'timer:changed', () => ({
        ...getTimerInfo(room),
        turnSecondsLeft: getTurnSecondsLeft(room),
      }));
    },

    // A player disconnected without choosing to leave. If the timer is on, their time keeps
    // running: they may come back and choose.
    handlePlayerAway(io, room) {
      if (!room.game || room.game.phase === PHASES.FINISHED) return;

      // With no human connected there is nobody to wait for or to play against: freeze the game
      if (humanPlayers(room).every((player) => !player.connected)) {
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
