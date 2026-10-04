import { PHASES } from './gameService.js';

// Who still has to do something before the game can move on?
export function getPendingPlayerIds(game) {
  if (game.phase === PHASES.CHOOSING_STAT) {
    return [game.leaderId];
  }

  if (game.phase === PHASES.PLAYING_CARDS) {
    const playedIds = new Set(game.plays.map((play) => play.playerId));
    return game.players.filter((player) => !playedIds.has(player.id)).map((player) => player.id);
  }

  return [];
}

// The timer lives on the room object: room.turnTimer (the timeout), room.turnEndsAt (when it
// fires) and room.turnStep (which step of the game it belongs to).
export function clearTurnTimer(room) {
  clearTimeout(room.turnTimer);
  room.turnTimer = null;
  room.turnEndsAt = null;
  room.turnStep = null;
}

export function setTurnTimer(room, step, ms, onTimeout) {
  clearTurnTimer(room);
  room.turnStep = step;
  room.turnEndsAt = Date.now() + ms;
  room.turnTimer = setTimeout(onTimeout, ms);
  // A waiting game timer must not keep the whole server process alive
  room.turnTimer.unref?.();
}

// Whole seconds left on the clock, or null when no timer is running.
export function getTurnSecondsLeft(room, now = Date.now()) {
  if (!room.turnTimer) return null;
  return Math.max(0, Math.ceil((room.turnEndsAt - now) / 1000));
}
