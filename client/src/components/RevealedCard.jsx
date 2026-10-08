import { formatStatValue } from '../utils/statStyles.js';
import CardArt from './CardArt.jsx';

// One player's card in the round result: small artwork, who played it, and its value for the stat.
function RevealedCard({ card, value, stat, playerName, isYou, isWinner }) {
  return (
    <li
      className={`flex items-center gap-3 rounded-xl p-3 ${
        isWinner ? 'bg-accent/20 ring-2 ring-accent' : 'bg-panel-light'
      }`}
    >
      <CardArt card={card} size={56} decorative />

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-slate-400">
          {playerName}
          {isYou && ' (you)'}
        </p>
        <p className="truncate font-semibold">{card.displayName}</p>
        <p className="text-xs text-slate-300">Tier {card.tier}</p>
      </div>

      <div className="text-right">
        <p className="text-2xl font-extrabold tabular-nums">{formatStatValue(stat, value)}</p>
        {isWinner && <p className="text-xs font-semibold text-accent uppercase">Winner</p>}
      </div>
    </li>
  );
}

export default RevealedCard;
