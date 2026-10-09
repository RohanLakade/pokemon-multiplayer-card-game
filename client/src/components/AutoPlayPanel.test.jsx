// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import AutoPlayPanel from './AutoPlayPanel.jsx';

afterEach(cleanup);

describe('AutoPlayPanel', () => {
  it('lets a player switch auto-play on', async () => {
    const onToggle = vi.fn();
    render(<AutoPlayPanel isOn={false} onToggle={onToggle} />);

    await userEvent.click(screen.getByRole('button', { name: 'I need to step away' }));

    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('says auto-play is on and lets the player take control back', async () => {
    const onToggle = vi.fn();
    render(<AutoPlayPanel isOn onToggle={onToggle} />);

    expect(screen.getByText('Auto-play is on. Your moves are made for you.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Take control back' }));

    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('cannot be used while it is disabled', () => {
    render(<AutoPlayPanel isOn={false} disabled onToggle={() => {}} />);

    expect(screen.getByRole('button', { name: 'I need to step away' })).toBeDisabled();
  });
});
