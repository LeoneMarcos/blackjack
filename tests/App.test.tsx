// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../src/App';

afterEach(() => {
  cleanup();
});

describe('Blackjack app shell', () => {
  it('renders the game and exposes the rules dialog flow', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Blackjack', level: 1 })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'View game rules' }));
    expect(screen.getByRole('dialog', { name: 'Game rules' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Close game rules' }));
    expect(screen.queryByRole('dialog', { name: 'Game rules' })).toBeNull();
  });
});
