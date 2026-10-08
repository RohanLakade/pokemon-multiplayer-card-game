// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import StatPicker from './StatPicker.jsx';

afterEach(cleanup);

describe('StatPicker', () => {
  it('offers all 7 stats as buttons and says that a low rank wins', () => {
    render(<StatPicker onChoose={() => {}} />);

    expect(screen.getAllByRole('button')).toHaveLength(7);
    expect(
      screen.getByRole('button', { name: 'Choose Rank, lowest number wins' }),
    ).toBeInTheDocument();
  });

  it('chooses the stat that is clicked', async () => {
    const onChoose = vi.fn();
    render(<StatPicker onChoose={onChoose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Choose Speed' }));

    expect(onChoose).toHaveBeenCalledWith('speed');
  });

  it('chooses a stat with the number keys', async () => {
    const onChoose = vi.fn();
    render(<StatPicker onChoose={onChoose} />);

    await userEvent.keyboard('3');
    await userEvent.keyboard('7');

    expect(onChoose).toHaveBeenNthCalledWith(1, 'defense');
    expect(onChoose).toHaveBeenNthCalledWith(2, 'rank');
  });

  it('does nothing while it is disabled', async () => {
    const onChoose = vi.fn();
    render(<StatPicker onChoose={onChoose} disabled />);

    await userEvent.keyboard('3');
    await userEvent.click(screen.getByRole('button', { name: 'Choose Speed' }));

    expect(onChoose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Choose Speed' })).toBeDisabled();
  });
});
