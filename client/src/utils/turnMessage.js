// The one sentence that tells the player what is happening and what to do next.
export function getTurnMessage({
  phase,
  canChooseStat,
  canChooseCard,
  leaderName,
  statLabel,
  pickedCount,
  playerCount,
}) {
  if (phase === 'finished') return 'The game is over';

  if (phase === 'choosing-stat') {
    return canChooseStat
      ? 'You lead this round. Choose a stat.'
      : `Waiting for ${leaderName} to choose a stat…`;
  }

  if (canChooseCard) return `${leaderName} chose ${statLabel}. Pick a card from your hand.`;
  return `Waiting for the other players (${pickedCount} of ${playerCount} have picked)…`;
}
