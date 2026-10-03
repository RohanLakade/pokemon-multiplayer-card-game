// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import TextField from './TextField.jsx';

afterEach(cleanup);

describe('TextField', () => {
  it('links the label to the input', () => {
    render(<TextField label="Your name" />);

    expect(screen.getByLabelText('Your name')).toBeInTheDocument();
  });

  it('marks the field invalid and links the error message to it', () => {
    render(<TextField label="Your name" error="Too short" />);

    const input = screen.getByLabelText('Your name');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Too short');
  });

  it('shows a hint without marking the field invalid', () => {
    render(<TextField label="Your name" hint="2 to 20 characters" />);

    const input = screen.getByLabelText('Your name');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).toHaveAccessibleDescription('2 to 20 characters');
  });
});
