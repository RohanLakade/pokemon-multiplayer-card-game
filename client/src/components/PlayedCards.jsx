import PokemonCard from './PokemonCard.jsx';

// One slot per player. A slot shows the player's card once they have played it.
function PlayedCards({ players, playedCards, chosenStat, leaderId, youId }) {
  return (
    <ul aria-label="Cards on the table" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {players.map((player) => {
        const played = playedCards.find((entry) => entry.playerId === player.id);
        const isLeader = player.id === leaderId;

        return (
          <li key={player.id} className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium">
              {player.name}
              {player.id === youId && ' (you)'}
              {isLeader && (
                <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-ink">
                  Leader
                </span>
              )}
            </p>

            {played ? (
              <PokemonCard
                key={played.card.id}
                card={played.card}
                compact
                highlightStat={chosenStat}
              />
            ) : (
              <div className="flex h-40 w-full max-w-56 items-center justify-center rounded-2xl border-2 border-dashed border-white/20 px-2 text-center text-sm text-slate-400">
                {isLeader ? 'Choosing a stat…' : 'Waiting…'}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default PlayedCards;
