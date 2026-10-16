// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Scoreboard from './Scoreboard.jsx';

afterEach(cleanup);

const players = [
  { id: 'p1', name: 'Ash', roundWins: 2, hasPicked: true, handSize: 5, cardsLeft: 7 },
  { id: 'p2', name: 'Misty', roundWins: 1, hasPicked: false, handSize: 1, cardsLeft: 1 },
];

describe('Scoreboard', () => {
  it('shows each player with their round wins and cards left', () => {
    render(<Scoreboard players={players} leaderId="p1" youId="p2" phase="choosing-stat" />);

    const [ash, misty] = screen.getAllByRole('listitem');
    expect(ash).toHaveTextContent(/Ash/);
    expect(ash).toHaveTextContent(/2\s*rounds won/);
    expect(ash).toHaveTextContent(/7\s*cards left/);
    expect(misty).toHaveTextContent(/1\s*round won/);
    expect(misty).toHaveTextContent(/1\s*card left/);
  });

  it('shows who leads and who is choosing the stat', () => {
    render(<Scoreboard players={players} leaderId="p1" youId="p2" phase="choosing-stat" />);

    expect(screen.getByText('Leader · Choosing stat…')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('shows who has picked a card and who is offline', () => {
    render(
      <Scoreboard
        players={players}
        leaderId="p1"
        youId="p2"
        phase="choosing-cards"
        offlineIds={['p2']}
      />,
    );

    expect(screen.getByText('Leader · Picked')).toBeInTheDocument();
    expect(screen.getByText('Choosing… · Offline')).toBeInTheDocument();
  });

  it('writes "Auto-play" next to a player whose moves are made for them', () => {
    render(
      <Scoreboard
        players={players}
        leaderId="p1"
        youId="p1"
        phase="choosing-cards"
        autoPlayIds={['p2']}
      />,
    );

    expect(screen.getByText('Choosing… · Auto-play')).toBeInTheDocument();
  });

  it('writes "Computer" next to the computer player', () => {
    render(
      <Scoreboard
        players={players}
        leaderId="p1"
        youId="p1"
        phase="choosing-cards"
        botIds={['p2']}
      />,
    );

    expect(screen.getByText('Computer · Choosing…')).toBeInTheDocument();
  });
});
