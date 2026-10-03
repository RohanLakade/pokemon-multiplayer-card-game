import { useState } from 'react';
import { STATS } from '@pokemon-game/shared';
import { CATEGORY_STYLES } from '../utils/statStyles.js';
import StatRow from './StatRow.jsx';

// One Pokémon card.
//   onSelectStat  when given, every stat is a button the player can press
//   highlightStat the stat that was chosen this round (shown with a ring)
//   compact       a smaller card for the table
function PokemonCard({ card, onSelectStat, highlightStat = null, compact = false }) {
  const [imageFailed, setImageFailed] = useState(false);
  const category = CATEGORY_STYLES[card.category];
  const imageSize = compact ? 96 : 176;
  const showImage = card.image && !imageFailed;

  return (
    <article
      aria-label={`${card.displayName} card`}
      className={`animate-card-flip rounded-2xl border-2 bg-panel ${category.border} ${
        compact ? 'w-full max-w-56 p-2' : 'w-full max-w-xs p-4'
      }`}
    >
      <header className="flex items-start justify-between gap-2">
        <h3 className={`leading-tight font-bold ${compact ? 'text-sm' : 'text-lg'}`}>
          {card.displayName}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-white ${category.badge}`}
        >
          {category.label}
        </span>
      </header>

      {/* Fixed width and height stop the page from jumping while images load */}
      <div
        className="my-2 flex items-center justify-center rounded-xl bg-panel-light"
        style={{ height: imageSize + 16 }}
      >
        {showImage ? (
          <img
            src={card.image}
            alt={`${card.displayName} official artwork`}
            width={imageSize}
            height={imageSize}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="object-contain"
          />
        ) : (
          <div
            role="img"
            aria-label={`No artwork for ${card.displayName}`}
            className="text-4xl text-slate-500"
          >
            ?
          </div>
        )}
      </div>

      <ul className="space-y-0.5">
        {STATS.map((stat, index) => (
          <StatRow
            key={stat.key}
            stat={stat}
            value={card.stats[stat.key]}
            isChosen={highlightStat === stat.key}
            compact={compact}
            shortcut={onSelectStat ? index + 1 : undefined}
            onSelect={onSelectStat}
          />
        ))}
      </ul>
    </article>
  );
}

export default PokemonCard;
