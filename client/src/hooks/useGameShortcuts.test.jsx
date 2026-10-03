// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useGameShortcuts } from './useGameShortcuts.js';

afterEach(cleanup);

function setup(options = {}) {
  const onChooseStat = vi.fn();
  const onPlayCard = vi.fn();
  renderHook(() =>
    useGameShortcuts({
      canChooseStat: true,
      canPlayCard: true,
      onChooseStat,
      onPlayCard,
      ...options,
    }),
  );
  return { onChooseStat, onPlayCard };
}

describe('useGameShortcuts', () => {
  it('chooses the stat that matches the number key', async () => {
    const { onChooseStat } = setup();

    await userEvent.keyboard('3');
    await userEvent.keyboard('7');

    expect(onChooseStat).toHaveBeenNthCalledWith(1, 'defense');
    expect(onChooseStat).toHaveBeenNthCalledWith(2, 'rank');
  });

  it('plays the card with the P key', async () => {
    const { onPlayCard } = setup();

    await userEvent.keyboard('p');

    expect(onPlayCard).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the player is not allowed to act', async () => {
    const { onChooseStat, onPlayCard } = setup({ canChooseStat: false, canPlayCard: false });

    await userEvent.keyboard('3p');

    expect(onChooseStat).not.toHaveBeenCalled();
    expect(onPlayCard).not.toHaveBeenCalled();
  });

  it('ignores other keys', async () => {
    const { onChooseStat, onPlayCard } = setup();

    await userEvent.keyboard('9x0');

    expect(onChooseStat).not.toHaveBeenCalled();
    expect(onPlayCard).not.toHaveBeenCalled();
  });

  it('ignores keys typed into an input field', async () => {
    const { onChooseStat } = setup();
    const { getByLabelText } = render(<input aria-label="name" />);

    await userEvent.click(getByLabelText('name'));
    await userEvent.keyboard('3');

    expect(onChooseStat).not.toHaveBeenCalled();
  });
});
