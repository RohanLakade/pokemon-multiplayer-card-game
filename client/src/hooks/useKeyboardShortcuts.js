import { useEffect } from 'react';

// Typing in a text field, or using a dialog, must never trigger a shortcut.
// Radio buttons and checkboxes are fine: arrow keys and shortcuts can work together there.
const IGNORED_TARGETS =
  'input:not([type="radio"]):not([type="checkbox"]), textarea, select, dialog, [contenteditable="true"]';

// shortcuts is an object like { '1': selectFirst, p: playCard }. Keys are lower case.
export function useKeyboardShortcuts(shortcuts, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;

    function handleKeyDown(event) {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest(IGNORED_TARGETS)) return;

      const action = shortcuts[event.key.toLowerCase()];
      if (action) action();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}
