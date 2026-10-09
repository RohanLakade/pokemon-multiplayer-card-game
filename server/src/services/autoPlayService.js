import { STATS } from '@pokemon-game/shared';
import { isBetter } from './rulesService.js';

// The "smart" choices for a player on auto-play, and for a turn that ran out.
// allCards is the whole roster: it tells us how strong a value is.
export function createAutoPlayer(allCards) {
  // How strong is this value for this stat, compared with every card? 0 means weaker than all
  // of them, 1 means stronger than all of them. For rank the LOWER number is the stronger one.
  function strength(statKey, value) {
    let beaten = 0;
    for (const card of allCards) {
      const other = card.stats[statKey];
      if (other === value) beaten += 0.5;
      else if (isBetter(statKey, value, other)) beaten += 1;
    }
    return beaten / allCards.length;
  }

  // The card with the best value for the stat (the first of them when tied)
  function chooseCardId(hand, statKey) {
    let best = hand[0];
    for (const card of hand) {
      if (isBetter(statKey, card.stats[statKey], best.stats[statKey])) best = card;
    }
    return best.id;
  }

  // The stat where the player's best card is strongest compared with all cards
  function chooseStat(hand) {
    let bestStat = STATS[0].key;
    let bestStrength = -1;

    for (const { key } of STATS) {
      const bestCard = hand.find((card) => card.id === chooseCardId(hand, key));
      const value = strength(key, bestCard.stats[key]);

      if (value > bestStrength) {
        bestStrength = value;
        bestStat = key;
      }
    }
    return bestStat;
  }

  return { chooseCardId, chooseStat };
}
