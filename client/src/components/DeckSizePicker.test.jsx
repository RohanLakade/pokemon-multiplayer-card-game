// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import DeckSizePicker from './DeckSizePicker.jsx';

afterEach(cleanup);

describe('DeckSizePicker', () => {
  it('offers 10, 15 and 20 cards and shows the current choice', () => {
    render(<DeckSizePicker value={15} onChange={() => {}} />);

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: /^15/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^10/ })).not.toBeChecked();
  });

  it('reports the size the host chooses, as a number', async () => {
    const onChange = vi.fn();
    render(<DeckSizePicker value={20} onChange={onChange} />);

    await userEvent.click(screen.getByRole('radio', { name: /^10/ }));

    expect(onChange).toHaveBeenCalledWith(10);
  });

  it('cannot be changed when it is disabled', () => {
    render(<DeckSizePicker value={20} onChange={() => {}} disabled />);

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled();
    }
  });
});
