// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import PokemonCard from './PokemonCard.jsx';

afterEach(cleanup);

const bulbasaur = {
  id: 1,
  name: 'bulbasaur',
  displayName: 'Bulbasaur',
  category: 'base',
  speciesId: 1,
  image: 'https://example.com/1.png',
  stats: {
    hp: 45,
    attack: 49,
    defense: 49,
    specialAttack: 65,
    specialDefense: 65,
    speed: 45,
    rank: 1,
  },
};

describe('PokemonCard', () => {
  it('shows the name, category, artwork and all 7 stats', () => {
    render(<PokemonCard card={bulbasaur} />);

    expect(screen.getByRole('heading', { name: 'Bulbasaur' })).toBeInTheDocument();
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.getByAltText('Bulbasaur official artwork')).toHaveAttribute('width', '176');
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByText('#1')).toBeInTheDocument(); // rank is shown as a Pokédex number
  });

  it('has no buttons when the stats cannot be chosen', () => {
    render(<PokemonCard card={bulbasaur} />);

    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('turns every stat into a clearly named button when a stat can be chosen', async () => {
    const onSelectStat = vi.fn();
    render(<PokemonCard card={bulbasaur} onSelectStat={onSelectStat} />);

    expect(screen.getAllByRole('button')).toHaveLength(7);
    expect(
      screen.getByRole('button', { name: 'Choose Rank, number 1, lower wins' }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Choose Attack, value 49' }));

    expect(onSelectStat).toHaveBeenCalledWith('attack');
  });

  it('marks the stat that was chosen this round', () => {
    render(<PokemonCard card={bulbasaur} highlightStat="speed" />);

    expect(screen.getByText('Speed').closest('li')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('HP').closest('li')).not.toHaveAttribute('aria-current');
  });

  it('shows a placeholder when the artwork cannot be loaded', () => {
    render(<PokemonCard card={bulbasaur} />);

    fireEvent.error(screen.getByAltText('Bulbasaur official artwork'));

    expect(screen.queryByAltText('Bulbasaur official artwork')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'No artwork for Bulbasaur' })).toBeInTheDocument();
  });
});
