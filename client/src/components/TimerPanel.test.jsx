// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import TimerPanel from './TimerPanel.jsx';

afterEach(cleanup);

const players = [
  { id: 'p1', name: 'Ash', connected: true },
  { id: 'p2', name: 'Misty', connected: true },
];
const off = { on: false, startedBy: null, startedByName: null };
const startedByMisty = { on: true, startedBy: 'p2', startedByName: 'Misty' };

function setup(timer, { youId = 'p1', playerList = players } = {}) {
  const onToggle = vi.fn();
  render(
    <TimerPanel
      timer={timer}
      turnSeconds={60}
      youId={youId}
      players={playerList}
      onToggle={onToggle}
    />,
  );
  return { onToggle };
}

describe('TimerPanel', () => {
  it('says the timer is off and lets any player start it', async () => {
    const { onToggle } = setup(off);

    expect(screen.getByText('The timer is off')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start the timer (60s per step)' }));

    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('shows who started the timer, and that only they can stop it', () => {
    setup(startedByMisty);

    expect(screen.getByText('Timer started by Misty')).toBeInTheDocument();
    expect(screen.getByText('Only Misty can stop it.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('lets the player who started it stop it', async () => {
    const { onToggle } = setup(startedByMisty, { youId: 'p2' });

    expect(screen.getByText('Timer started by Misty (you)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Stop the timer' }));

    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('lets anyone stop it when the player who started it is offline', () => {
    const offline = [players[0], { ...players[1], connected: false }];
    setup(startedByMisty, { playerList: offline });

    expect(screen.getByRole('button', { name: 'Stop the timer' })).toBeInTheDocument();
  });
});
