// The one sentence that tells the player what is happening and what to do next.
export function getTurnMessage({
  phase,
  canChooseStat,
  canPlayCard,
  leaderName,
  statLabel,
  playedCount,
  playerCount,
}) {
  if (phase === 'finished') return 'The game is over';
  if (canChooseStat) return 'You lead this round. Choose a stat on your card.';
  if (phase === 'choosing-stat') return `Waiting for ${leaderName} to choose a stat…`;
  if (canPlayCard) return `${leaderName} chose ${statLabel}. Play your card.`;
  return `Waiting for the other players (${playedCount} of ${playerCount} have played)…`;
}
