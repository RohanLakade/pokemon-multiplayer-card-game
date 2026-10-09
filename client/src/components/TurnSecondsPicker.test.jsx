// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import TurnSecondsPicker from './TurnSecondsPicker.jsx';

afterEach(cleanup);

describe('TurnSecondsPicker', () => {
  it('offers 30, 60 and 90 seconds and shows the current choice', () => {
    render(<TurnSecondsPicker value={60} onChange={() => {}} />);

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: /^60s/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^90s/ })).not.toBeChecked();
  });

  it('reports the choice as a number', async () => {
    const onChange = vi.fn();
    render(<TurnSecondsPicker value={90} onChange={onChange} />);

    await userEvent.click(screen.getByRole('radio', { name: /^30s/ }));

    expect(onChange).toHaveBeenCalledWith(30);
  });
});
