// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import ZoomableArt from './ZoomableArt.jsx';

// jsdom may not implement the native dialog methods, so we give it a simple version
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

afterEach(cleanup);

const bulbasaur = { id: 1, displayName: 'Bulbasaur', image: 'https://example.com/1.png' };

describe('ZoomableArt', () => {
  it('shows the small artwork, and no large image until it is tapped', () => {
    render(<ZoomableArt card={bulbasaur} size={176} />);

    expect(screen.getByAltText('Bulbasaur official artwork')).toBeInTheDocument();
    expect(screen.queryByAltText('Bulbasaur artwork, large view')).not.toBeInTheDocument();
  });

  it('opens the large image when the artwork is tapped, and closes it again', async () => {
    render(<ZoomableArt card={bulbasaur} size={176} />);

    await userEvent.click(screen.getByRole('button', { name: 'View Bulbasaur artwork larger' }));
    expect(screen.getByAltText('Bulbasaur artwork, large view')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Close'));
    expect(screen.queryByAltText('Bulbasaur artwork, large view')).not.toBeInTheDocument();
  });

  it('has nothing to tap when the card has no image', () => {
    render(<ZoomableArt card={{ ...bulbasaur, image: null }} size={176} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'No artwork for Bulbasaur' })).toBeInTheDocument();
  });
});
