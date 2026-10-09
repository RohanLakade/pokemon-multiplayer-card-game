// One line of words about what a player is doing. Never color alone.
function getStatus(player, { leaderId, phase, isOffline, isAutoPlay }) {
  const status = [];
  const isLeader = player.id === leaderId;

  if (isLeader) status.push('Leader');
  if (phase === 'choosing-stat' && isLeader) status.push('Choosing stat…');
  if (phase === 'choosing-cards') status.push(player.hasPicked ? 'Picked' : 'Choosing…');
  if (isAutoPlay) status.push('Auto-play');
  if (isOffline) status.push('Offline');

  return status.join(' · ');
}

// Everyone's round wins, how many cards they have left, and what they are doing right now.
function Scoreboard({ players, leaderId, youId, phase, offlineIds = [], autoPlayIds = [] }) {
  return (
    <ul aria-label="Scoreboard" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {players.map((player) => (
        <li key={player.id} className="rounded-xl border border-white/10 bg-panel px-3 py-2">
          <p className="truncate font-medium">
            {player.name}
            {player.id === youId && (
              <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">You</span>
            )}
          </p>
          <p className="text-sm text-slate-300">
            <span className="text-lg font-bold text-accent">{player.roundWins}</span>{' '}
            {player.roundWins === 1 ? 'round won' : 'rounds won'}
          </p>
          <p className="text-xs text-slate-400">
            {player.cardsLeft} {player.cardsLeft === 1 ? 'card' : 'cards'} left
          </p>
          <p className="min-h-4 text-xs text-slate-300">
            {getStatus(player, {
              leaderId,
              phase,
              isOffline: offlineIds.includes(player.id),
              isAutoPlay: autoPlayIds.includes(player.id),
            })}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default Scoreboard;
