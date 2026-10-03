// The people in a room. Status is written as text ("Online"), never shown by color alone.
function PlayerList({ players, hostId, youId }) {
  return (
    <ul
      aria-label="Players in this room"
      className="divide-y divide-white/10 rounded-xl border border-white/10 bg-panel"
    >
      {players.map((player) => (
        <li key={player.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="font-medium">
            {player.name}
            {player.id === youId && (
              <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">You</span>
            )}
          </span>
          <span className="flex items-center gap-3 text-sm">
            {player.id === hostId && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-ink">
                Host
              </span>
            )}
            <span className={player.connected ? 'text-emerald-300' : 'text-amber-300'}>
              {player.connected ? 'Online' : 'Offline'}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default PlayerList;
