// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useKeyboardShortcuts } from './useKeyboardShortcuts.js';

afterEach(cleanup);

function setup(shortcuts, enabled = true) {
  renderHook(() => useKeyboardShortcuts(shortcuts, enabled));
}

describe('useKeyboardShortcuts', () => {
  it('runs the action of the pressed key, whatever the letter case', async () => {
    const play = vi.fn();
    setup({ p: play });

    await userEvent.keyboard('p');
    await userEvent.keyboard('P');

    expect(play).toHaveBeenCalledTimes(2);
  });

  it('ignores keys that have no action', async () => {
    const play = vi.fn();
    setup({ p: play });

    await userEvent.keyboard('x9');

    expect(play).not.toHaveBeenCalled();
  });

  it('does nothing when it is switched off', async () => {
    const play = vi.fn();
    setup({ p: play }, false);

    await userEvent.keyboard('p');

    expect(play).not.toHaveBeenCalled();
  });

  it('ignores keys typed into a text field', async () => {
    const play = vi.fn();
    setup({ p: play });
    const { getByLabelText } = render(<input aria-label="name" />);

    await userEvent.click(getByLabelText('name'));
    await userEvent.keyboard('p');

    expect(play).not.toHaveBeenCalled();
  });

  it('still works while a radio button has the focus', async () => {
    const choose = vi.fn();
    setup({ 2: choose });
    const { getByLabelText } = render(<input type="radio" aria-label="card" />);

    await userEvent.click(getByLabelText('card'));
    await userEvent.keyboard('2');

    expect(choose).toHaveBeenCalledTimes(1);
  });

  it('ignores a shortcut pressed together with Ctrl', async () => {
    const play = vi.fn();
    setup({ p: play });

    await userEvent.keyboard('{Control>}p{/Control}');

    expect(play).not.toHaveBeenCalled();
  });
});
