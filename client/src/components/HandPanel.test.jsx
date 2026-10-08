// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import HandPanel from './HandPanel.jsx';

afterEach(cleanup);

function makeCard(id, displayName, tier, speed, category = 'base') {
  return {
    id,
    name: displayName.toLowerCase(),
    displayName,
    category,
    speciesId: id,
    image: null,
    bst: 400,
    tier,
    stats: {
      hp: 50,
      attack: 50,
      defense: 50,
      specialAttack: 50,
      specialDefense: 50,
      speed,
      rank: id,
    },
  };
}

const hand = [
  makeCard(1, 'Bulbasaur', 'C', 45),
  makeCard(4, 'Charmander', 'C', 65),
  makeCard(10033, 'Mega Venusaur', 'S', 80, 'mega'),
];

function setup(props = {}) {
  const onPlay = vi.fn();
  render(
    <HandPanel
      hand={hand}
      chosenStat={null}
      pickedCardId={null}
      canChooseCard
      onPlay={onPlay}
      {...props}
    />,
  );
  return { onPlay };
}

describe('HandPanel', () => {
  it('shows every card in the strip and the first one in full', () => {
    setup();

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'Bulbasaur, tier C' })).toBeChecked();
    expect(screen.getByRole('heading', { name: 'Bulbasaur' })).toBeInTheDocument();
  });

  it('shows another card in full when it is selected', async () => {
    setup();

    await userEvent.click(screen.getByRole('radio', { name: /Charmander/ }));

    expect(screen.getByRole('heading', { name: 'Charmander' })).toBeInTheDocument();
  });

  it('shows the chosen stat of every card in the strip', () => {
    setup({ chosenStat: 'speed' });

    expect(screen.getByRole('radio', { name: 'Bulbasaur, tier C, Speed 45' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Charmander, tier C, Speed 65' })).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: 'Mega Venusaur, tier S, Speed 80' }),
    ).toBeInTheDocument();
  });

  it('plays the card that is selected', async () => {
    const { onPlay } = setup();

    await userEvent.click(screen.getByRole('radio', { name: /Charmander/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Play Charmander' }));

    expect(onPlay).toHaveBeenCalledWith(4);
  });

  it('selects with the number keys and plays with P', async () => {
    const { onPlay } = setup();

    await userEvent.keyboard('2');
    expect(screen.getByRole('heading', { name: 'Charmander' })).toBeInTheDocument();

    await userEvent.keyboard('p');
    expect(onPlay).toHaveBeenCalledWith(4);
  });

  it('cannot play, and ignores the keys, when no card may be chosen yet', async () => {
    const { onPlay } = setup({ canChooseCard: false });

    await userEvent.keyboard('2p');

    expect(screen.queryByRole('button', { name: /Play/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bulbasaur' })).toBeInTheDocument();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it('shows which card was picked and waits for the others', () => {
    setup({ canChooseCard: false, pickedCardId: 4 });

    expect(screen.getByRole('radio', { name: /Charmander/ })).toBeChecked();
    expect(
      screen.getByText('You picked Charmander. Waiting for the other players…'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Play/ })).not.toBeInTheDocument();
  });
});
