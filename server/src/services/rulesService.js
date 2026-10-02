import { lowerWins } from '@pokemon-game/shared';

// Is value "a" better than value "b" for this stat? (rank: lower is better)
export function isBetter(statKey, a, b) {
  return lowerWins(statKey) ? a < b : a > b;
}

// plays looks like [{ playerId, card }]. Returns the winner's playerId,
// or null when the best value is shared (a tie, which scores nothing).
export function findRoundWinnerId(statKey, plays) {
  if (plays.length === 0) {
    throw new Error('Cannot find a winner without any plays');
  }

  let bestPlays = [plays[0]];

  for (const play of plays.slice(1)) {
    const value = play.card.stats[statKey];
    const bestValue = bestPlays[0].card.stats[statKey];

    if (value === bestValue) {
      bestPlays.push(play);
    } else if (isBetter(statKey, value, bestValue)) {
      bestPlays = [play];
    }
  }

  return bestPlays.length === 1 ? bestPlays[0].playerId : null;
}

// Most round wins takes the game. Several players on the top score share the win.
export function findGameWinnerIds(players) {
  const mostWins = Math.max(...players.map((player) => player.roundWins));
  return players.filter((player) => player.roundWins === mostWins).map((player) => player.id);
}
