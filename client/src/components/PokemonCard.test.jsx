// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  bst: 318,
  tier: 'C',
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
  it('shows the name, category, tier, artwork and all 7 stats', () => {
    render(<PokemonCard card={bulbasaur} />);

    expect(screen.getByRole('heading', { name: 'Bulbasaur' })).toBeInTheDocument();
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.getByText('Tier C')).toBeInTheDocument();
    expect(screen.getByText('Base stat total 318')).toBeInTheDocument();
    expect(screen.getByAltText('Bulbasaur official artwork')).toHaveAttribute('width', '176');
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByText('#1')).toBeInTheDocument(); // rank is shown as a Pokédex number
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
