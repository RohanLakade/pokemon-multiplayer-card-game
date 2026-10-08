// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Countdown from './Countdown.jsx';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Countdown', () => {
  it('counts down once per second and stops at zero', () => {
    render(<Countdown seconds={2} />);
    expect(screen.getByRole('timer')).toHaveTextContent('Time left: 2s');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('Time left: 1s');

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('Time left: 0s');
  });

  it('can show a different label', () => {
    render(<Countdown seconds={5} label="Next round in" />);

    expect(screen.getByRole('timer')).toHaveTextContent('Next round in: 5s');
  });

  it('shows nothing when no timer is running', () => {
    render(<Countdown seconds={null} />);

    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });
});
