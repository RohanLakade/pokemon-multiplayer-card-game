import { useEffect } from 'react';
import { STATS } from '@pokemon-game/shared';

// Keyboard play: keys 1 to 7 choose a stat (in the order shown on the card), P plays the card.
export function useGameShortcuts({ canChooseStat, canPlayCard, onChooseStat, onPlayCard }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;

      // Typing in a field, or using the result dialog, must never trigger a move
      const isInsideControl =
        event.target instanceof Element && event.target.closest('input, textarea, select, dialog');
      if (isInsideControl) return;

      // Number("3") - 1 is 2, the third stat. Any other key gives NaN or -1: no stat.
      const stat = STATS[Number(event.key) - 1];
      if (canChooseStat && stat) {
        onChooseStat(stat.key);
        return;
      }
      if (canPlayCard && event.key.toLowerCase() === 'p') {
        onPlayCard();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canChooseStat, canPlayCard, onChooseStat, onPlayCard]);
}
