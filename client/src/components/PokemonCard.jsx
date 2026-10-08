import { STATS } from '@pokemon-game/shared';
import { CATEGORY_STYLES } from '../utils/statStyles.js';
import CardArt from './CardArt.jsx';
import StatRow from './StatRow.jsx';

// One Pokémon card in full. highlightStat is the stat chosen this round (shown with a ring).
function PokemonCard({ card, highlightStat = null }) {
  const category = CATEGORY_STYLES[card.category];

  return (
    <article
      aria-label={`${card.displayName} card`}
      className={`animate-card-flip w-full max-w-xs rounded-2xl border-2 bg-panel p-4 ${category.border}`}
    >
      <header className="flex items-start justify-between gap-2">
        <h3 className="text-lg leading-tight font-bold">{card.displayName}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-white ${category.badge}`}
        >
          {category.label}
        </span>
      </header>

      <div className="my-2 flex h-48 items-center justify-center rounded-xl bg-panel-light">
        <CardArt card={card} size={176} />
      </div>

      <p className="mb-2 flex items-center justify-between text-sm text-slate-300">
        <span>Tier {card.tier}</span>
        <span>Base stat total {card.bst}</span>
      </p>

      <ul className="space-y-0.5">
        {STATS.map((stat) => (
          <StatRow
            key={stat.key}
            stat={stat}
            value={card.stats[stat.key]}
            isChosen={highlightStat === stat.key}
          />
        ))}
      </ul>
    </article>
  );
}

export default PokemonCard;
