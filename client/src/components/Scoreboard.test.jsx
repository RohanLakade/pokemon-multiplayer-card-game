// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Scoreboard from './Scoreboard.jsx';

afterEach(cleanup);

const players = [
  { id: 'p1', name: 'Ash', roundWins: 2, hasPlayed: true },
  { id: 'p2', name: 'Misty', roundWins: 1, hasPlayed: false },
];

describe('Scoreboard', () => {
  it('shows each player with their round wins', () => {
    render(<Scoreboard players={players} leaderId="p1" youId="p2" />);

    const [ash, misty] = screen.getAllByRole('listitem');
    expect(ash).toHaveTextContent(/Ash/);
    expect(ash).toHaveTextContent(/2\s*rounds won/);
    expect(misty).toHaveTextContent(/1\s*round won/);
  });

  it('labels the leader, who has played, who is you and who is offline', () => {
    render(<Scoreboard players={players} leaderId="p1" youId="p2" offlineIds={['p2']} />);

    expect(screen.getByText('Leader · Played')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
  });
});
