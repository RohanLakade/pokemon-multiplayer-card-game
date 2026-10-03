// Everyone's round wins. Status is written as words ("Leader", "Played", "Offline").
function Scoreboard({ players, leaderId, youId, offlineIds = [] }) {
  return (
    <ul aria-label="Scoreboard" className="flex flex-wrap gap-3">
      {players.map((player) => {
        const status = [
          player.id === leaderId && 'Leader',
          player.hasPlayed && 'Played',
          offlineIds.includes(player.id) && 'Offline',
        ].filter(Boolean);

        return (
          <li key={player.id} className="rounded-xl border border-white/10 bg-panel px-4 py-2">
            <p className="font-medium">
              {player.name}
              {player.id === youId && (
                <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">You</span>
              )}
            </p>
            <p className="text-sm text-slate-300">
              <span className="text-lg font-bold text-accent">{player.roundWins}</span>{' '}
              {player.roundWins === 1 ? 'round won' : 'rounds won'}
            </p>
            <p className="h-4 text-xs text-slate-400">{status.join(' · ')}</p>
          </li>
        );
      })}
    </ul>
  );
}

export default Scoreboard;
